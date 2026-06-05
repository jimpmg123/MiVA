import type { AppMode, ProviderMode } from "../types";
import { isTauriRuntime } from "./tauri";
import { Button, IconButton } from "../components/ui";
import { WindowControls, WindowDragLayer } from "../components/WindowControls";

type AppTopBarProps = {
  activeModelLabel: string;
  activeProviderIcon: string;
  activeProviderLabel: string;
  activeProviderMode: ProviderMode;
  appMode: AppMode;
  providerText: Record<string, string>;
  settingsOpen: boolean;
  centerHidden: boolean;
  studioSaveLabel: string;
  studioSaveVisible: boolean;
  t: Record<string, string>;
  onEnterSettings: () => void;
  onModeChange: (mode: AppMode) => void;
  onStudioSave: () => void;
};

export function AppTopBar({
  activeModelLabel,
  activeProviderIcon,
  activeProviderLabel,
  activeProviderMode,
  appMode,
  providerText,
  settingsOpen,
  centerHidden,
  studioSaveLabel,
  studioSaveVisible,
  t,
  onEnterSettings,
  onModeChange,
  onStudioSave,
}: AppTopBarProps) {
  const desktopChrome = isTauriRuntime();
  const gridClass = desktopChrome
    ? "grid-cols-[minmax(0,1fr)_minmax(180px,340px)_auto_auto]"
    : "grid-cols-[minmax(0,1fr)_minmax(180px,340px)_auto]";

  return (
    <header className="relative miva-topbar h-[60px] w-full min-w-0 shrink-0 px-5">
      {desktopChrome && <WindowDragLayer />}

      <div className={`relative z-10 grid h-full w-full items-center gap-3 pointer-events-none ${gridClass}`}>
        <div className="pointer-events-auto flex min-w-0 items-center gap-3">
          {!settingsOpen && appMode !== "setup" && (
            <div className="flex shrink-0 rounded-full border border-[var(--miva-border)] bg-[var(--miva-topbar-segment-bg)] p-0.5 shadow-sm">
              <Button
                className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  appMode === "studio"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-sm"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("studio")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[14px]">construction</span>
                {t.studioMode}
              </Button>
              <Button
                className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  appMode === "runtime"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-sm"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("runtime")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                {t.runtimeMode}
              </Button>
              <Button
                className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  appMode === "history"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-sm"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("history")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[14px]">history</span>
                {t.historyMode}
              </Button>
            </div>
          )}
        </div>

        {settingsOpen || centerHidden ? (
          <div />
        ) : studioSaveVisible ? (
          <div className="pointer-events-auto mx-auto flex w-full max-w-[320px] min-w-0 justify-center">
            <Button
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--miva-primary)] px-6 py-2 text-sm font-bold text-[var(--miva-on-primary)] shadow-[var(--miva-shadow-md)] transition hover:bg-[var(--miva-primary-hover)] active:scale-[0.98]"
              onClick={onStudioSave}
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {studioSaveLabel}
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[340px] min-w-0 items-center gap-2 rounded-full border border-[var(--miva-border)] bg-[var(--miva-topbar-chip-bg)] px-2.5 py-1.5 shadow-sm backdrop-blur">
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${
                activeProviderMode === "local"
                  ? "bg-[var(--miva-success-soft)] text-[var(--miva-success)]"
                  : "bg-[var(--miva-primary)] text-[var(--miva-on-primary)]"
              }`}
            >
              {activeProviderMode === "local" ? providerText.localHeader : providerText.cloudHeader}
            </span>
            <span className="material-symbols-outlined shrink-0 text-sm text-[var(--miva-success)]">{activeProviderIcon}</span>
            <span className="truncate text-[13px] font-semibold text-[var(--miva-topbar-chip-text)]">
              {activeProviderLabel} / {activeModelLabel}
            </span>
          </div>
        )}

        <div className="pointer-events-auto flex shrink-0 items-center justify-end gap-1">
          <IconButton
            aria-label="Help"
            className="h-8 w-8 shrink-0 rounded-full text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)]"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
          </IconButton>
          {!settingsOpen && (
            <IconButton
              aria-label={t.settings}
              className="h-8 w-8 shrink-0 rounded-full text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)]"
              onClick={onEnterSettings}
              title={t.settings}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </IconButton>
          )}
        </div>

        {desktopChrome && (
          <div className="pointer-events-auto -mr-1">
            <WindowControls />
          </div>
        )}
      </div>
    </header>
  );
}
