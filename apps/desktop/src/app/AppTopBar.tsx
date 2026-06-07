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
  onOpenWebConsole: () => void;
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
  onOpenWebConsole,
  onStudioSave,
}: AppTopBarProps) {
  const desktopChrome = isTauriRuntime();
  const gridClass = desktopChrome
    ? "grid-cols-[minmax(0,1fr)_auto_auto_auto]"
    : "grid-cols-[minmax(0,1fr)_auto_auto]";
  const modelChipTitle = `${activeProviderLabel} / ${activeModelLabel}`;

  return (
    <header className="@container/topbar relative miva-topbar w-full min-w-0 shrink-0 px-4">
      {desktopChrome && <WindowDragLayer />}

      <div className={`relative z-10 grid h-full w-full items-center gap-2 pointer-events-none ${gridClass}`}>
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          {!settingsOpen && appMode !== "setup" && (
            <div className="flex shrink-0 rounded-full border border-[var(--miva-border)] bg-[var(--miva-topbar-segment-bg)] p-0.5 shadow-sm">
              <Button
                className={`flex h-7 min-h-7 shrink-0 items-center gap-0.5 rounded-full px-2 py-0 text-[10px] font-semibold leading-4 transition ${
                  appMode === "studio"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-sm"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("studio")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[12px]">construction</span>
                {t.studioMode}
              </Button>
              <Button
                className={`flex h-7 min-h-7 shrink-0 items-center gap-0.5 rounded-full px-2 py-0 text-[10px] font-semibold leading-4 transition ${
                  appMode === "runtime"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-sm"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("runtime")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[12px]">rocket_launch</span>
                {t.runtimeMode}
              </Button>
              <Button
                className={`flex h-7 min-h-7 shrink-0 items-center gap-0.5 rounded-full px-2 py-0 text-[10px] font-semibold leading-4 transition ${
                  appMode === "history"
                    ? "bg-[var(--miva-topbar-segment-active-bg)] text-[var(--miva-topbar-segment-active-text)] shadow-sm"
                    : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
                }`}
                onClick={() => onModeChange("history")}
                size="sm"
                variant="ghost"
              >
                <span className="material-symbols-outlined text-[12px]">history</span>
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
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--miva-primary)] px-4 py-1.5 text-[13px] font-bold text-[var(--miva-on-primary)] shadow-[var(--miva-shadow-md)] transition hover:bg-[var(--miva-primary-hover)] active:scale-[0.98]"
              onClick={onStudioSave}
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              {studioSaveLabel}
            </Button>
          </div>
        ) : (
          <div
            className="mx-auto flex w-fit min-w-0 max-w-[340px] items-center gap-1.5 rounded-full border border-[var(--miva-border)] bg-[var(--miva-topbar-chip-bg)] px-2 py-1 shadow-sm backdrop-blur @[840px]/topbar:w-full @[840px]/topbar:px-2"
            title={modelChipTitle}
          >
            <span
              className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-black tracking-[0.12em] ${
                activeProviderMode === "local"
                  ? "bg-[var(--miva-success-soft)] text-[var(--miva-success)]"
                  : "bg-[var(--miva-primary)] text-[var(--miva-on-primary)]"
              }`}
            >
              {activeProviderMode === "local" ? providerText.localHeader : providerText.cloudHeader}
            </span>
            <span className="material-symbols-outlined hidden shrink-0 text-[13px] text-[var(--miva-success)] @[840px]/topbar:inline">{activeProviderIcon}</span>
            <span className="hidden truncate text-[12px] font-semibold text-[var(--miva-topbar-chip-text)] @[840px]/topbar:inline">
              {modelChipTitle}
            </span>
          </div>
        )}

        <div className="pointer-events-auto flex shrink-0 items-center justify-end gap-0.5">
          <IconButton
            aria-label="Open MiVA web dashboard"
            className="h-7 w-7 min-h-7 min-w-7 shrink-0 rounded-full p-0 text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)]"
            onClick={onOpenWebConsole}
            title="MiVA web dashboard"
          >
            <span className="material-symbols-outlined text-[16px]">help_outline</span>
          </IconButton>
          {!settingsOpen && (
            <IconButton
              aria-label={t.settings}
              className="h-7 w-7 min-h-7 min-w-7 shrink-0 rounded-full p-0 text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)]"
              onClick={onEnterSettings}
              title={t.settings}
            >
              <span className="material-symbols-outlined text-[16px]">settings</span>
            </IconButton>
          )}
        </div>

        {desktopChrome && (
          <div className="pointer-events-auto -mr-0.5">
            <WindowControls />
          </div>
        )}
      </div>
    </header>
  );
}
