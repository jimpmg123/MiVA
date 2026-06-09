import type { AppMode, ProviderMode } from "../types";
import { isTauriRuntime } from "./tauri";
import { Button } from "../components/ui";
import { SidebarToggleIcon } from "./SidebarToggleIcon";
import { WindowControls, WindowDragLayer } from "../components/WindowControls";

type AppTopBarProps = {
  activeModelLabel: string;
  activeProviderIcon: string;
  activeProviderLabel: string;
  activeProviderMode: ProviderMode;
  appMode: AppMode;
  providerText: Record<string, string>;
  settingsOpen: boolean;
  sidebarOpen: boolean;
  centerHidden: boolean;
  studioSaveLabel: string;
  studioSaveVisible: boolean;
  t: Record<string, string>;
  onModeChange: (mode: AppMode) => void;
  onStudioSave: () => void;
  onToggleSidebar: () => void;
};

export function AppTopBar({
  activeModelLabel,
  activeProviderIcon,
  activeProviderLabel,
  activeProviderMode,
  appMode,
  providerText,
  settingsOpen,
  sidebarOpen,
  centerHidden,
  studioSaveLabel,
  studioSaveVisible,
  t,
  onModeChange,
  onStudioSave,
  onToggleSidebar,
}: AppTopBarProps) {
  const desktopChrome = isTauriRuntime();
  const gridClass = desktopChrome
    ? "grid-cols-[minmax(0,1fr)_auto_auto]"
    : "grid-cols-[minmax(0,1fr)_auto]";
  const modelChipTitle = `${activeProviderLabel} / ${activeModelLabel}`;

  return (
    <header className="@container/topbar relative miva-topbar w-full min-w-0 shrink-0 px-2">
      {desktopChrome && <WindowDragLayer />}

      <div className={`relative z-10 grid h-full w-full items-center gap-1.5 pointer-events-none ${gridClass}`}>
        <div className="pointer-events-none flex min-w-0 items-center gap-1.5 overflow-hidden">
          {!sidebarOpen && (
            <button
              aria-label="Open navigation"
              className="miva-sidebar-toggle pointer-events-auto"
              onClick={onToggleSidebar}
              title="Open navigation"
              type="button"
            >
              <SidebarToggleIcon className="h-[16px] w-[16px]" />
            </button>
          )}
          {!settingsOpen && appMode !== "setup" && (
            <div className="flex max-w-full shrink-0 rounded-[9px] border border-[var(--miva-border)] bg-[var(--miva-topbar-segment-bg)] p-0.5">
              <Button
                className={`pointer-events-auto flex !h-7 !min-h-7 shrink-0 items-center gap-1 rounded-[7px] !px-2 !py-0 !text-[10px] font-semibold leading-3 transition ${
                  appMode === "studio"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-[var(--miva-shadow-sm)]"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("studio")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[13px]">construction</span>
                {t.studioMode}
              </Button>
              <Button
                className={`pointer-events-auto flex !h-7 !min-h-7 shrink-0 items-center gap-1 rounded-[7px] !px-2 !py-0 !text-[10px] font-semibold leading-3 transition ${
                  appMode === "runtime"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-[var(--miva-shadow-sm)]"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("runtime")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[13px]">rocket_launch</span>
                {t.runtimeMode}
              </Button>
              <Button
                className={`pointer-events-auto flex !h-7 !min-h-7 shrink-0 items-center gap-1 rounded-[7px] !px-2 !py-0 !text-[10px] font-semibold leading-3 transition ${
                  appMode === "history"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-[var(--miva-shadow-sm)]"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("history")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[13px]">history</span>
                {t.historyMode}
              </Button>
              <Button
                className={`pointer-events-auto flex !h-7 !min-h-7 shrink-0 items-center gap-1 rounded-[7px] !px-2 !py-0 !text-[10px] font-semibold leading-3 transition ${
                  appMode === "library"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-[var(--miva-shadow-sm)]"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("library")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[13px]">folder_open</span>
                Library
              </Button>
            </div>
          )}
        </div>

        {settingsOpen || centerHidden ? (
          <div />
        ) : studioSaveVisible ? (
          <div className="pointer-events-none mx-auto flex w-full max-w-[260px] min-w-0 justify-center">
            <Button
              className="pointer-events-auto inline-flex !min-h-7 items-center gap-1 rounded-full bg-[var(--miva-primary)] !px-3 !py-1 !text-[11px] font-bold text-[var(--miva-on-primary)] shadow-[var(--miva-shadow-md)] transition hover:bg-[var(--miva-primary-hover)] active:scale-[0.98]"
              onClick={onStudioSave}
            >
              <span className="material-symbols-outlined text-[14px]">save</span>
              {studioSaveLabel}
            </Button>
          </div>
        ) : (
          <div
            className="mx-auto flex w-fit min-w-0 max-w-[280px] items-center gap-1.5 rounded-[8px] border border-[var(--miva-border)] bg-[var(--miva-topbar-chip-bg)] px-2 py-1 backdrop-blur @[840px]/topbar:w-full"
            title={modelChipTitle}
          >
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold tracking-[0.08em] ${
                activeProviderMode === "local"
                  ? "bg-[var(--miva-success-soft)] text-[var(--miva-success)]"
                  : "bg-[var(--miva-primary)] text-[var(--miva-on-primary)]"
              }`}
            >
              {activeProviderMode === "local" ? providerText.localHeader : providerText.cloudHeader}
            </span>
            <span className="material-symbols-outlined hidden shrink-0 text-[12px] text-[var(--miva-success)] @[840px]/topbar:inline">{activeProviderIcon}</span>
            <span className="hidden truncate text-[10px] font-semibold text-[var(--miva-topbar-chip-text)] @[840px]/topbar:inline">
              {modelChipTitle}
            </span>
          </div>
        )}

        {desktopChrome && (
          <div className="pointer-events-auto -mr-2 h-full">
            <WindowControls />
          </div>
        )}
      </div>
    </header>
  );
}
