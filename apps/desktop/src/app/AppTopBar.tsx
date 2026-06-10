import { WindowControls, WindowDragLayer } from "../components/WindowControls";
import { SidebarToggleIcon } from "./SidebarToggleIcon";
import { isTauriRuntime } from "./tauri";

type AppTopBarProps = {
  activeAssistantName: string;
  activeAssistantSubtitle: string;
  memoryItemCount: number;
  runtimeActionsVisible: boolean;
  sidebarOpen: boolean;
  syncLabel: string;
  synced: boolean;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenModelUpload: () => void;
  onOpenStudio: () => void;
  onToggleSidebar: () => void;
};

export function AppTopBar({
  activeAssistantName,
  activeAssistantSubtitle,
  memoryItemCount,
  runtimeActionsVisible,
  sidebarOpen,
  syncLabel,
  synced,
  onNewChat,
  onOpenHistory,
  onOpenModelUpload,
  onOpenStudio,
  onToggleSidebar,
}: AppTopBarProps) {
  const desktopChrome = isTauriRuntime();
  const initials = getAssistantInitials(activeAssistantName);
  const memoryLabel = formatCompactCount(memoryItemCount);

  return (
    <header className="relative h-12 w-full shrink-0 border-b border-slate-200 bg-white pl-5 pr-36 text-slate-900">
      {desktopChrome && <WindowDragLayer />}

      <div className={`pointer-events-none relative z-10 flex h-full min-w-0 items-center gap-4 overflow-hidden ${runtimeActionsVisible ? "pr-[calc(20rem_+_18rem)]" : ""}`}>
        <div className="pointer-events-auto flex min-w-0 items-center gap-3">
          {!sidebarOpen && (
            <button
              aria-label="Open navigation"
              className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={onToggleSidebar}
              title="Open navigation"
              type="button"
            >
              <SidebarToggleIcon className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-600">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-bold leading-5 text-slate-900">{activeAssistantName}</h2>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">
                Active
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-slate-500">
              <span className="truncate">{activeAssistantSubtitle}</span>
              <span className="shrink-0 text-slate-300">|</span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <i className="ph ph-database text-xs text-slate-400" />
                {memoryLabel} Memory items
              </span>
              <span className="shrink-0 text-slate-300">|</span>
              <span className={`inline-flex shrink-0 items-center gap-1 ${synced ? "text-green-600" : "text-slate-400"}`}>
                <i className={`ph ${synced ? "ph-check-circle" : "ph-circle"} text-xs`} />
                {syncLabel}
              </span>
            </div>
          </div>
        </div>

        {runtimeActionsVisible && (
          <div className="pointer-events-auto absolute right-[calc(11rem_+_1px)] top-1/2 z-20 flex -translate-y-1/2 items-center gap-3">
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              onClick={onNewChat}
              type="button"
            >
              <i className="ph ph-plus text-sm text-slate-500" />
              New Chat
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <TopBarIconButton icon="ph-pencil-simple" label="Studio" onClick={onOpenStudio} />
            <TopBarIconButton icon="ph-upload-simple" label="Model Upload" onClick={onOpenModelUpload} />
            <TopBarIconButton icon="ph-clock-counter-clockwise" label="History" onClick={onOpenHistory} />
          </div>
        )}
      </div>
      {desktopChrome && <WindowControls className="pointer-events-auto absolute right-0 top-0 z-30 h-full" />}
    </header>
  );
}

function TopBarIconButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
      onClick={onClick}
      title={label}
      type="button"
    >
      <i className={`ph ${icon} text-lg`} />
    </button>
  );
}

function getAssistantInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const value = words.length >= 2
    ? `${words[0][0] ?? ""}${words[1][0] ?? ""}`
    : (words[0] ?? "AI").slice(0, 2);
  return value.toUpperCase();
}

function formatCompactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return String(value);
}
