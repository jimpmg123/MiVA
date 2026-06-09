import { useMemo, useState } from "react";
import type { LibraryItem, LibraryItemType } from "../types";
import { Button, IconTile, Input, Panel } from "../components/ui";
import { openDocument } from "../features/documents/documentRuntime";

type LibraryPageProps = {
  items: LibraryItem[];
  loaded: boolean;
  onAddFiles: () => void;
  onLog: (message: string) => void;
};

type LibraryFilter = "all" | LibraryItemType;
type SortMode = "updatedAt" | "sizeBytes";
type ViewMode = "list" | "grid";

const filterOptions: Array<{ id: LibraryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "file", label: "Files" },
];

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes < 100 * 1024 ? 1 : 0)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000);

  if (dayDiff === 0) {
    return "Today";
  }
  if (dayDiff === 1) {
    return "Yesterday";
  }
  if (dayDiff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function getFileIcon(item: LibraryItem) {
  if (item.type === "image") {
    return "image";
  }

  switch (item.extension) {
    case "pdf":
      return "picture_as_pdf";
    case "csv":
    case "xls":
    case "xlsx":
      return "table";
    default:
      return "description";
  }
}

function matchesQuery(item: LibraryItem, query: string) {
  if (!query) {
    return true;
  }

  return [item.name, item.extension, item.path].join("\n").toLowerCase().includes(query);
}

export function LibraryPage({ items, loaded, onAddFiles, onLog }: LibraryPageProps) {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updatedAt");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => filter === "all" || item.type === filter)
      .filter((item) => matchesQuery(item, normalizedQuery))
      .sort((left, right) => (
        sortMode === "sizeBytes"
          ? right.sizeBytes - left.sizeBytes
          : right.updatedAt.localeCompare(left.updatedAt)
      ));
  }, [filter, items, normalizedQuery, sortMode]);

  const totalSize = items.reduce((sum, item) => sum + item.sizeBytes, 0);
  const imageCount = items.filter((item) => item.type === "image").length;
  const isEmpty = loaded && items.length === 0;
  const noResults = loaded && items.length > 0 && filteredItems.length === 0;

  async function openLibraryItem(item: LibraryItem) {
    try {
      await openDocument(item.path);
    } catch (error) {
      onLog(`Could not open ${item.name}: ${String(error)}`);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 pb-10">
      <section className="pt-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-heading text-[40px] font-semibold leading-none tracking-normal text-[var(--miva-text)]">Library</h1>
            <p className="mt-3 text-sm font-medium text-[var(--miva-text-muted)]">
              Files and images attached in Runtime, sorted by time and size.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[560px]">
            <div className="relative min-w-0 flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[var(--miva-text-soft)]">
                search
              </span>
              <Input
                aria-label="Search library"
                className="h-12 rounded-full bg-[var(--miva-surface)] pl-12 pr-4 text-base"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search library"
                type="search"
                value={query}
              />
            </div>
            <Button
              className="h-12 rounded-full bg-[#0f1115] px-5 text-base font-semibold text-white hover:bg-[#20242c]"
              onClick={onAddFiles}
            >
              Add files
              <span className="material-symbols-outlined text-[20px]">expand_more</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <LibraryMetric label="Items" value={String(items.length)} />
        <LibraryMetric label="Images" value={String(imageCount)} />
        <LibraryMetric label="Storage" value={formatFileSize(totalSize)} />
      </section>

      <Panel className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-[var(--miva-border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {filterOptions.map((option) => (
              <button
                className={`min-h-10 rounded-full px-5 text-sm font-semibold transition ${
                  filter === option.id
                    ? "bg-[var(--miva-surface-muted)] text-[var(--miva-text)] shadow-[inset_0_0_0_1px_var(--miva-border)]"
                    : "text-[var(--miva-text-muted)] hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-text)]"
                }`}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[var(--miva-text-muted)]">
            <button
              aria-label={`Sort by ${sortMode === "updatedAt" ? "size" : "modified date"}`}
              className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-text)]"
              onClick={() => setSortMode((current) => (current === "updatedAt" ? "sizeBytes" : "updatedAt"))}
              title={`Sort by ${sortMode === "updatedAt" ? "size" : "modified date"}`}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">sort</span>
            </button>
            <div className="h-8 w-px bg-[var(--miva-border)]" />
            <button
              aria-label="Grid view"
              className={`grid h-11 w-11 place-items-center rounded-full transition ${viewMode === "grid" ? "bg-[var(--miva-surface-muted)] text-[var(--miva-text)]" : "hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-text)]"}`}
              onClick={() => setViewMode("grid")}
              type="button"
            >
              <span className="material-symbols-outlined text-[23px]">grid_view</span>
            </button>
            <button
              aria-label="List view"
              className={`grid h-11 w-11 place-items-center rounded-full transition ${viewMode === "list" ? "bg-[var(--miva-surface-muted)] text-[var(--miva-text)]" : "hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-text)]"}`}
              onClick={() => setViewMode("list")}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">format_list_bulleted</span>
            </button>
          </div>
        </div>

        {!loaded ? (
          <LibraryLoading />
        ) : isEmpty || noResults ? (
          <div className="grid place-items-center px-6 py-20 text-center">
            <IconTile className="h-14 w-14" tone="neutral">
              <span className="material-symbols-outlined text-[28px]">{noResults ? "search_off" : "folder_open"}</span>
            </IconTile>
            <h2 className="mt-4 font-heading text-xl font-bold text-[var(--miva-text)]">
              {noResults ? "No matching files" : "No files yet"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--miva-text-muted)]">
              {noResults ? "Try another search term or switch the file filter." : "Attach images, PDFs, spreadsheets, or CSV files in Runtime to build this library."}
            </p>
          </div>
        ) : viewMode === "list" ? (
          <LibraryList items={filteredItems} onOpen={openLibraryItem} sortMode={sortMode} />
        ) : (
          <LibraryGrid items={filteredItems} onOpen={openLibraryItem} />
        )}
      </Panel>
    </div>
  );
}

function LibraryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] px-5 py-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-[var(--miva-text)]">{value}</p>
    </div>
  );
}

function LibraryList({
  items,
  onOpen,
  sortMode,
}: {
  items: LibraryItem[];
  onOpen: (item: LibraryItem) => void;
  sortMode: SortMode;
}) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_150px_120px] gap-6 px-6 py-3 text-sm font-medium text-[var(--miva-text-muted)]">
        <button className="text-left" type="button">Name</button>
        <span className="inline-flex items-center gap-1">
          Modified {sortMode === "updatedAt" ? <span className="material-symbols-outlined text-[17px]">arrow_downward</span> : null}
        </span>
        <span>Size</span>
      </div>
      <div className="divide-y divide-[var(--miva-border)]">
        {items.map((item) => (
          <button
            className="grid w-full grid-cols-[minmax(0,1fr)_150px_120px] items-center gap-6 px-6 py-4 text-left transition hover:bg-[var(--miva-bg-soft)]"
            key={item.id}
            onClick={() => onOpen(item)}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-4">
              <LibraryThumb item={item} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-[var(--miva-text)]">{item.name}</span>
                <span className="block truncate text-xs font-medium text-[var(--miva-text-soft)]">{item.path}</span>
              </span>
            </span>
            <span className="text-sm font-medium text-[var(--miva-text-muted)]">{formatDateLabel(item.updatedAt)}</span>
            <span className="text-sm font-medium text-[var(--miva-text-muted)]">{formatFileSize(item.sizeBytes)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LibraryGrid({ items, onOpen }: { items: LibraryItem[]; onOpen: (item: LibraryItem) => void }) {
  return (
    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <button
          className="min-w-0 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4 text-left transition hover:border-[var(--miva-border-strong)] hover:bg-[var(--miva-bg-soft)]"
          key={item.id}
          onClick={() => onOpen(item)}
          type="button"
        >
          <div className="flex items-start gap-3">
            <LibraryThumb item={item} large />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[var(--miva-text)]">{item.name}</p>
              <p className="mt-1 text-xs font-medium text-[var(--miva-text-muted)]">{formatDateLabel(item.updatedAt)} - {formatFileSize(item.sizeBytes)}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function LibraryThumb({ item, large = false }: { item: LibraryItem; large?: boolean }) {
  const sizeClass = large ? "h-14 w-14" : "h-12 w-12";
  if (item.type === "image" && item.previewUrl) {
    return (
      <span className={`${sizeClass} shrink-0 overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)]`}>
        <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
      </span>
    );
  }

  return (
    <span className={`${sizeClass} grid shrink-0 place-items-center rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] text-[var(--miva-text-muted)]`}>
      <span className="material-symbols-outlined text-[24px]">{getFileIcon(item)}</span>
    </span>
  );
}

function LibraryLoading() {
  return (
    <div className="divide-y divide-[var(--miva-border)]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="grid grid-cols-[minmax(0,1fr)_150px_120px] items-center gap-6 px-6 py-4" key={index}>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-[var(--miva-surface-muted)]" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/3 rounded-full bg-[var(--miva-surface-muted)]" />
              <div className="mt-2 h-3 w-1/2 rounded-full bg-[var(--miva-surface-muted)]" />
            </div>
          </div>
          <div className="h-4 w-16 rounded-full bg-[var(--miva-surface-muted)]" />
          <div className="h-4 w-14 rounded-full bg-[var(--miva-surface-muted)]" />
        </div>
      ))}
    </div>
  );
}
