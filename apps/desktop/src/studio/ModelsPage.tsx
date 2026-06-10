import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "../i18n";
import type {
  CloudModelInfo,
  CloudProviderId,
  ModelDownloadProgress,
  ModelInfo,
  OllamaStatus,
  ProviderId,
  ProviderKeyState,
  ProviderMode,
} from "../types";
import { Badge, ModalBackdrop, ModalPanel } from "../components/ui";
import { ModelCardIcon, ModelCardIconOrFallback } from "../features/models/modelIcons";

type ProviderMeta = Record<ProviderId, { label: string; mode: ProviderMode; icon: string }>;

type ModelsPanelProps = {
  activeLocale: Locale;
  busyAction: string | null;
  cloudModelCatalog: CloudModelInfo[];
  downloadProgress: ModelDownloadProgress | null;
  installedModels: string[];
  modelCatalog: ModelInfo[];
  providerKeys: ProviderKeyState;
  providerMeta: ProviderMeta;
  providerText: Record<string, string>;
  selectedCloudModel: string;
  selectedModel: string;
  selectedProvider: ProviderId;
  signedIn: boolean;
  status: OllamaStatus | null;
  t: Record<string, string>;
  tauriRuntime: boolean;
  onCancelModelDownload: (modelName: string) => void;
  onDeleteModel: (modelName: string) => void;
  onDownloadModel: (modelName: string) => void;
  onOpenApiKeySettings: () => void;
  onSelectCloudModel: (provider: CloudProviderId, modelId: string) => void;
  onSelectLocalModel: (modelName: string) => void;
};

type RowStatus = "connected" | "installed" | "downloading" | "api_key_required" | "available";

type ModelRow = {
  id: string;
  name: string;
  label: string;
  provider: string;
  providerId: ProviderId;
  type: "Local" | "Cloud";
  description: string;
  specs: string;
  fit: string;
  category: string;
  status: RowStatus;
  isActive: boolean;
  iconKey: string;
  fallbackIcon?: string;
};

type SortMode = "modelType" | "user";
type TabKey = "all" | "local" | "cloud" | "installed";

const USER_ORDER_KEY = "miva.studio.models.userOrder.v1";

function loadUserOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveUserOrder(order: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_ORDER_KEY, JSON.stringify(order));
  } catch {
    // best-effort persistence
  }
}

export function ModelsPanel({
  activeLocale,
  busyAction,
  cloudModelCatalog,
  downloadProgress,
  installedModels,
  modelCatalog,
  providerMeta,
  selectedCloudModel,
  selectedModel,
  selectedProvider,
  status,
  tauriRuntime,
  onCancelModelDownload,
  onDeleteModel,
  onDownloadModel,
  onOpenApiKeySettings,
  onSelectCloudModel,
  onSelectLocalModel,
}: ModelsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>(() => (loadUserOrder().length ? "user" : "modelType"));
  const [userOrder, setUserOrder] = useState<string[]>(() => loadUserOrder());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [insertBelow, setInsertBelow] = useState(false);
  const dragOverIdRef = useRef<string | null>(null);
  const insertBelowRef = useRef(false);
  const displayedOrderRef = useRef<string[]>([]);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghostStartRef = useRef({ x: 0, y: 0 });
  const tableRef = useRef<HTMLDivElement | null>(null);

  const downloadingName = downloadProgress && !downloadProgress.done && !downloadProgress.error ? downloadProgress.model : null;

  const allRows = useMemo<ModelRow[]>(() => {
    const localRows: ModelRow[] = modelCatalog.map((model) => {
      const installed = installedModels.includes(model.name);
      const active = selectedProvider === "ollama" && selectedModel === model.name;
      const isDownloading = downloadingName === model.name;
      const rowStatus: RowStatus = isDownloading ? "downloading" : installed ? "installed" : "available";
      return {
        id: `local:${model.id}`,
        name: model.name,
        label: model.label,
        provider: "Ollama",
        providerId: "ollama",
        type: "Local",
        description: model.summary[activeLocale],
        specs: model.downloadSizeLabel ?? "Ollama tag",
        fit: model.bestFor[activeLocale],
        category: model.category,
        status: rowStatus,
        isActive: active,
        iconKey: model.name,
      };
    });

    const cloudRows: ModelRow[] = cloudModelCatalog
      .filter((model) => model.id !== "custom-cloud")
      .map((model) => {
        const active = selectedProvider === model.provider && selectedCloudModel === model.id;
        // Built-in cloud providers ship with default API keys, so they are ready to use.
        const rowStatus: RowStatus = "connected";
        return {
          id: `cloud:${model.provider}:${model.id}`,
          name: model.id,
          label: model.label,
          provider: providerMeta[model.provider].label,
          providerId: model.provider,
          type: "Cloud",
          description: model.summary[activeLocale],
          specs: model.status[activeLocale],
          fit: model.bestFor[activeLocale],
          category: model.category,
          status: rowStatus,
          isActive: active,
          iconKey: `${model.provider} ${model.id} ${model.label}`,
          fallbackIcon: providerMeta[model.provider].icon,
        };
      });

    return [...localRows, ...cloudRows];
  }, [
    activeLocale,
    cloudModelCatalog,
    downloadingName,
    installedModels,
    modelCatalog,
    providerMeta,
    selectedCloudModel,
    selectedModel,
    selectedProvider,
  ]);

  // Keep the persisted user order in sync with the available models (append new ids, drop stale ones).
  useEffect(() => {
    const ids = allRows.map((row) => row.id);
    setUserOrder((current) => {
      const filtered = current.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !filtered.includes(id));
      const next = [...filtered, ...missing];
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }
      return next;
    });
  }, [allRows]);

  const sortedRows = useMemo(() => {
    const rows = [...allRows];
    if (sortBy === "user") {
      const indexOf = (id: string) => {
        const position = userOrder.indexOf(id);
        return position === -1 ? Number.MAX_SAFE_INTEGER : position;
      };
      rows.sort((a, b) => indexOf(a.id) - indexOf(b.id));
      return rows;
    }
    // Model Type: Cloud group first, then Local, alphabetical by label within each.
    rows.sort((a, b) => {
      if (a.type !== b.type) return a.type === "Cloud" ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    return rows;
  }, [allRows, sortBy, userOrder]);

  // Track the on-screen order so dragging reorders relative to what the user sees.
  displayedOrderRef.current = sortedRows.map((row) => row.id);

  const filteredRows = useMemo(() => {
    let rows = sortedRows;
    if (activeTab === "local") rows = rows.filter((row) => row.type === "Local");
    if (activeTab === "cloud") rows = rows.filter((row) => row.type === "Cloud");
    if (activeTab === "installed") {
      rows = rows.filter((row) => row.status === "connected" || row.status === "installed" || row.status === "downloading");
    }
    if (activeCategory) rows = rows.filter((row) => row.category === activeCategory);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter((row) => row.label.toLowerCase().includes(query) || row.name.toLowerCase().includes(query));
    }
    return rows;
  }, [sortedRows, activeTab, activeCategory, searchQuery]);

  const activeModel = useMemo(() => allRows.find((row) => row.isActive) ?? null, [allRows]);
  const detailsModel = detailsId ? allRows.find((row) => row.id === detailsId) ?? null : null;
  const pendingDeleteModel = pendingDeleteId ? allRows.find((row) => row.id === pendingDeleteId) ?? null : null;

  const counts = useMemo(() => {
    const installed = allRows.filter((row) => row.status === "connected" || row.status === "installed").length;
    const downloading = allRows.filter((row) => row.status === "downloading").length;
    const localInstalled = allRows.filter((row) => row.type === "Local" && (row.status === "installed" || row.status === "downloading")).length;
    return { total: allRows.length, installed, downloading, localInstalled };
  }, [allRows]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "local", label: "Local" },
    { key: "cloud", label: "Cloud" },
    { key: "installed", label: "Installed" },
  ];

  const categories = [
    { key: "lightweight", label: "Lightweight" },
    { key: "coding", label: "Coding" },
    { key: "reasoning", label: "Reasoning" },
  ];

  const toggleCategory = (key: string) => setActiveCategory((prev) => (prev === key ? null : key));

  const handleSelectRow = (row: ModelRow) => {
    if (row.type === "Local") {
      onSelectLocalModel(row.name);
    } else {
      onSelectCloudModel(row.providerId as CloudProviderId, row.name);
    }
  };

  const handleDownloadRow = (row: ModelRow) => {
    onSelectLocalModel(row.name);
    onDownloadModel(row.name);
  };

  const confirmDelete = () => {
    if (pendingDeleteModel) {
      onDeleteModel(pendingDeleteModel.name);
    }
    setPendingDeleteId(null);
  };

  // --- Drag reorder (pointer based; Tauri intercepts native HTML5 drag-drop) ---
  const draggingRow = draggingId ? allRows.find((row) => row.id === draggingId) ?? null : null;

  const moveGhost = (x: number, y: number) => {
    const el = ghostRef.current;
    if (el) {
      el.style.left = `${x + 14}px`;
      el.style.top = `${y + 12}px`;
    }
  };

  const startRowDrag = (rowId: string, x: number, y: number) => {
    ghostStartRef.current = { x, y };
    dragOverIdRef.current = rowId;
    setDragOverId(rowId);
    setDraggingId(rowId);
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMove = (event: MouseEvent) => {
      moveGhost(event.clientX, event.clientY);
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const rowElement = element?.closest<HTMLElement>("[data-model-row]");
      const id = rowElement?.getAttribute("data-model-row") ?? null;
      let below = false;
      if (rowElement) {
        const rect = rowElement.getBoundingClientRect();
        below = event.clientY > rect.top + rect.height / 2;
      }
      if (id !== dragOverIdRef.current) {
        dragOverIdRef.current = id;
        setDragOverId(id);
      }
      if (below !== insertBelowRef.current) {
        insertBelowRef.current = below;
        setInsertBelow(below);
      }
    };

    const finishDrag = () => {
      const source = draggingId;
      const target = dragOverIdRef.current;
      const below = insertBelowRef.current;
      if (source && target && source !== target) {
        setUserOrder(() => {
          const base = displayedOrderRef.current.length ? [...displayedOrderRef.current] : allRows.map((row) => row.id);
          const from = base.indexOf(source);
          if (from === -1 || base.indexOf(target) === -1) return base;
          base.splice(from, 1);
          const insertIndex = base.indexOf(target) + (below ? 1 : 0);
          base.splice(insertIndex, 0, source);
          saveUserOrder(base);
          return base;
        });
        setSortBy("user");
      }
      dragOverIdRef.current = null;
      setDragOverId(null);
      setDraggingId(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", finishDrag);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", finishDrag);
    };
  }, [draggingId, allRows]);

  const statusCell = (row: ModelRow) => {
    if (row.status === "connected") {
      return (
        <span
          className="inline-flex items-center gap-1 rounded border border-[var(--miva-success)]/30 bg-[var(--miva-success-surface)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-[var(--miva-success)]"
          title="Connected with a default key — enter your own API key for additional usage."
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span> Connected
        </span>
      );
    }
    if (row.status === "installed") {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-[var(--miva-border)] px-2 py-1 text-xs font-bold uppercase tracking-wide text-[var(--miva-text-muted)]">
          <span className="material-symbols-outlined text-[16px]">hard_drive</span> Installed
        </span>
      );
    }
    if (row.status === "api_key_required") {
      return (
        <span
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--miva-text-soft)]"
          title="Enter your own API key to enable this cloud model."
        >
          <span className="material-symbols-outlined text-[16px]">key</span> API Key required
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--miva-text-soft)]">
        <span className="material-symbols-outlined text-[16px]">cloud_download</span> Available
      </span>
    );
  };

  const canDownload = tauriRuntime && Boolean(status?.running) && busyAction === null;

  return (
    <div className="grid gap-4">
      {/* Local Runtime Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] px-4 py-2.5 shadow-[var(--miva-shadow-sm)]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 text-sm font-bold text-[var(--miva-text)]">
            <span className="material-symbols-outlined text-[18px] text-[var(--miva-text-soft)]">dns</span> Local Runtime Status
          </span>
          <Badge tone={status?.running ? "success" : "neutral"} glow={status?.running}>
            {status?.running ? "Connected" : "Offline"}
          </Badge>
          <span className="text-xs text-[var(--miva-text-muted)]">{counts.localInstalled} Local Models Installed</span>
          <span className="text-xs text-[var(--miva-text-muted)]">{counts.total} Models Listed</span>
          {counts.downloading > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--miva-warning)]">
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              {counts.downloading} Downloading
            </span>
          )}
        </div>
      </div>

      {/* Active Model Banner */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-[var(--miva-primary)]/30 bg-[var(--miva-primary-surface)] p-3 shadow-[var(--miva-shadow-sm)]">
        <span className="absolute inset-y-0 left-0 w-1 bg-[var(--miva-primary)]" />
        <div className="ml-2 flex items-center gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)]">
            {activeModel ? (
              <ModelCardIconOrFallback
                fallback={<span className="material-symbols-outlined text-[20px]">{activeModel.fallbackIcon ?? "smart_toy"}</span>}
                imageClassName="h-6 w-6"
                modelKey={activeModel.iconKey}
              />
            ) : (
              <span className="material-symbols-outlined text-[20px] text-[var(--miva-text-soft)]">smart_toy</span>
            )}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--miva-text)]">{activeModel?.label ?? "No model selected"}</h2>
              {activeModel && <Badge tone="action">{activeModel.type}</Badge>}
              {activeModel && <Badge tone="success">Active Model</Badge>}
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--miva-text-muted)]">
              <span className="font-medium text-[var(--miva-text)]">{activeModel?.provider ?? "—"}</span>
              {activeModel && (
                <>
                  <span className="text-[var(--miva-text-soft)]">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[var(--miva-warning)]">star</span>
                    Best fit: <strong className="text-[var(--miva-text)]">{activeModel.fit}</strong>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeModel && (
            <button
              type="button"
              onClick={() => setDetailsId(activeModel.id)}
              className="rounded border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-1.5 text-xs font-medium text-[var(--miva-text)] shadow-[var(--miva-shadow-sm)] transition hover:border-[var(--miva-primary)] hover:text-[var(--miva-primary)]"
            >
              Model Details
            </button>
          )}
          <button
            type="button"
            onClick={() => tableRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-1.5 rounded bg-[var(--miva-primary)] px-3 py-1.5 text-xs font-medium text-white shadow-[var(--miva-shadow-sm)] transition hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[16px]">swap_horiz</span> Change
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[var(--miva-primary-surface)] text-[var(--miva-primary)]"
                  : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className={`rounded border px-2.5 py-1.5 text-xs font-medium transition ${
                  activeCategory === cat.key
                    ? "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)] text-[var(--miva-primary)]"
                    : "border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-[var(--miva-text-soft)]">search</span>
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-48 rounded border border-[var(--miva-border)] bg-[var(--miva-surface)] py-1.5 pl-8 pr-3 text-xs text-[var(--miva-text)] shadow-[var(--miva-shadow-sm)] outline-none focus:border-[var(--miva-primary)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === "modelType" ? "user" : "modelType"))}
            className="flex items-center gap-1.5 rounded border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-1.5 text-xs font-medium text-[var(--miva-text)] shadow-[var(--miva-shadow-sm)] transition hover:border-[var(--miva-primary)]"
            title="Drag rows to set your own order (User)"
          >
            <span className="material-symbols-outlined text-[16px] text-[var(--miva-text-soft)]">sort</span>
            Sort: {sortBy === "modelType" ? "Model Type" : "User"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div ref={tableRef} className="flex min-h-0 flex-col">
        {/* Table */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] shadow-[var(--miva-shadow-sm)]">
          <div className="grid grid-cols-12 gap-4 border-b border-[var(--miva-border)] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-[var(--miva-text-soft)]">
            <div className="col-span-4">Model Name</div>
            <div className="col-span-2">Provider</div>
            <div className="col-span-2">Specs &amp; Fit</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="flex-1 divide-y divide-[var(--miva-border)] overflow-y-auto pr-2">
            {filteredRows.map((row) => {
              const isDragging = draggingId === row.id;
              const isDragOver = dragOverId === row.id && draggingId !== row.id;
              return (
                <div
                  key={row.id}
                  data-model-row={row.id}
                  className={`relative grid grid-cols-12 items-center gap-4 px-5 py-3 transition-colors ${
                    row.isActive ? "bg-[var(--miva-primary-surface)]" : "hover:bg-[var(--miva-primary-surface)]/40"
                  } ${isDragging ? "opacity-40" : ""} ${isDragOver ? "bg-[var(--miva-primary-surface)]/40" : ""} ${draggingId ? "select-none" : ""}`}
                >
                  {isDragOver && (
                    <span
                      className={`pointer-events-none absolute inset-x-3 z-10 h-0.5 rounded-full bg-[var(--miva-primary)]/70 ${insertBelow ? "-bottom-px" : "-top-px"}`}
                    />
                  )}
                  <div className="col-span-4 flex min-w-0 items-center gap-3">
                    <span
                      className="material-symbols-outlined cursor-grab text-[18px] text-[var(--miva-text-soft)] active:cursor-grabbing"
                      title="Drag to reorder"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        startRowDrag(row.id, event.clientX, event.clientY);
                      }}
                    >
                      drag_indicator
                    </span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded border border-[var(--miva-border)] bg-[var(--miva-surface)]">
                      {row.type === "Cloud" ? (
                        <ModelCardIconOrFallback
                          fallback={<span className="material-symbols-outlined text-[18px]">{row.fallbackIcon ?? "cloud"}</span>}
                          imageClassName="h-5 w-5"
                          modelKey={row.iconKey}
                        />
                      ) : (
                        <ModelCardIcon modelKey={row.iconKey} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-[var(--miva-text)]">{row.label}</h3>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                            row.type === "Cloud"
                              ? "border-[var(--miva-primary)]/30 bg-[var(--miva-primary-surface)] text-[var(--miva-primary)]"
                              : "border-[var(--miva-border)] text-[var(--miva-text-muted)]"
                          }`}
                        >
                          {row.type}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--miva-text-soft)]">{row.description}</p>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center gap-1.5 text-xs font-medium text-[var(--miva-text-muted)]">
                    {row.type === "Local" && <span className="material-symbols-outlined text-[16px] text-[var(--miva-text-soft)]">dns</span>}
                    {row.provider}
                  </div>

                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[var(--miva-text)]">{row.specs}</span>
                    <span className="text-xs font-medium text-[var(--miva-text-soft)]">{row.fit}</span>
                  </div>

                  {row.status === "downloading" ? (
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="flex-1 rounded border border-[var(--miva-warning)]/30 bg-[var(--miva-warning-soft)] p-1.5">
                        <div className="mb-1 flex justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1 uppercase tracking-wide text-[var(--miva-warning)]">
                            <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Downloading
                          </span>
                          <span className="text-[var(--miva-warning)]">{Math.round(downloadProgress?.percent ?? 0)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--miva-warning)]/20">
                          <div className="h-full rounded-full bg-[var(--miva-warning)] transition-all duration-500" style={{ width: `${Math.round(downloadProgress?.percent ?? 0)}%` }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCancelModelDownload(row.name)}
                        title="Cancel download (removes partial files)"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded text-[var(--miva-text-soft)] transition hover:bg-[var(--miva-danger-soft)] hover:text-[var(--miva-danger-hover)]"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="col-span-2 flex items-center">{statusCell(row)}</div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailsId(row.id)}
                          title="Model details"
                          className="grid h-8 w-8 place-items-center rounded text-[var(--miva-text-soft)] transition hover:bg-[var(--miva-primary-surface)] hover:text-[var(--miva-text)]"
                        >
                          <span className="material-symbols-outlined text-[18px]">info</span>
                        </button>

                        {/* Installed local model: trash + select */}
                        {row.type === "Local" && row.status === "installed" && !row.isActive && (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(row.id)}
                            title="Delete model"
                            className="grid h-8 w-8 place-items-center rounded text-[var(--miva-text-soft)] transition hover:bg-[var(--miva-danger-soft)] hover:text-[var(--miva-danger-hover)]"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}

                        {row.isActive ? (
                          <span className="ml-1 cursor-default rounded bg-[var(--miva-text-soft)] px-3 py-1.5 text-xs font-bold text-white">In Use</span>
                        ) : row.status === "available" ? (
                          <button
                            type="button"
                            disabled={!canDownload}
                            onClick={() => handleDownloadRow(row)}
                            className="ml-1 flex items-center gap-1.5 rounded bg-[var(--miva-primary)] px-3 py-1.5 text-xs font-bold text-white shadow-[var(--miva-shadow-sm)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span> Download
                          </button>
                        ) : row.status === "api_key_required" ? (
                          <button
                            type="button"
                            onClick={onOpenApiKeySettings}
                            className="ml-1 flex items-center gap-1.5 rounded border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-1.5 text-xs font-bold text-[var(--miva-text)] shadow-[var(--miva-shadow-sm)] transition hover:border-[var(--miva-primary)] hover:text-[var(--miva-primary)]"
                          >
                            <span className="material-symbols-outlined text-[16px]">key</span> Setup
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectRow(row)}
                            className="ml-1 rounded border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-1.5 text-xs font-bold text-[var(--miva-text)] shadow-[var(--miva-shadow-sm)] transition hover:border-[var(--miva-primary)] hover:text-[var(--miva-primary)]"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {filteredRows.length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-[var(--miva-text-soft)]">No models found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Drag ghost following the cursor */}
      {draggingRow && (
        <div
          ref={ghostRef}
          className="pointer-events-none fixed z-[60] opacity-80"
          style={{ left: ghostStartRef.current.x + 14, top: ghostStartRef.current.y + 12 }}
        >
          <div className="flex items-center gap-2 rounded-lg border border-[var(--miva-primary)]/40 bg-[var(--miva-surface)] px-3 py-2 shadow-[var(--miva-shadow-md)]">
            <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded border border-[var(--miva-border)] bg-[var(--miva-surface)]">
              {draggingRow.type === "Cloud" ? (
                <ModelCardIconOrFallback
                  fallback={<span className="material-symbols-outlined text-[16px]">{draggingRow.fallbackIcon ?? "cloud"}</span>}
                  imageClassName="h-4 w-4"
                  modelKey={draggingRow.iconKey}
                />
              ) : (
                <ModelCardIcon modelKey={draggingRow.iconKey} />
              )}
            </span>
            <span className="text-xs font-bold text-[var(--miva-text)]">{draggingRow.label}</span>
            <span className="material-symbols-outlined text-[16px] text-[var(--miva-text-soft)]">drag_indicator</span>
          </div>
        </div>
      )}

      {/* Details modal */}
      {detailsModel && (
        <ModalBackdrop>
          <ModalPanel className="w-96 max-w-full">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--miva-text)]">{detailsModel.label} Details</h3>
              <button
                type="button"
                onClick={() => setDetailsId(null)}
                className="grid h-7 w-7 place-items-center rounded text-[var(--miva-text-soft)] transition hover:bg-[var(--miva-primary-surface)] hover:text-[var(--miva-text)]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-2 text-sm text-[var(--miva-text-muted)]">
              <p><strong className="text-[var(--miva-text)]">Provider:</strong> {detailsModel.provider}</p>
              <p><strong className="text-[var(--miva-text)]">Type:</strong> {detailsModel.type}</p>
              <p><strong className="text-[var(--miva-text)]">Specs:</strong> {detailsModel.specs}</p>
              <p><strong className="text-[var(--miva-text)]">Best fit:</strong> {detailsModel.fit}</p>
              <p><strong className="text-[var(--miva-text)]">Description:</strong> {detailsModel.description}</p>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {/* Delete confirm modal */}
      {pendingDeleteModel && (
        <ModalBackdrop>
          <ModalPanel className="w-96 max-w-full">
            <h3 className="text-sm font-bold text-[var(--miva-text)]">Delete model</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Remove <strong className="text-[var(--miva-text)]">{pendingDeleteModel.label}</strong> from this computer? Downloaded files will be deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-1.5 text-sm font-medium text-[var(--miva-text)] transition hover:border-[var(--miva-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded bg-[var(--miva-danger)] px-3 py-1.5 text-sm font-bold text-white transition hover:bg-[var(--miva-danger-hover)]"
              >
                Delete
              </button>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </div>
  );
}
