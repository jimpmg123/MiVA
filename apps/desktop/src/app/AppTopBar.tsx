import type { AppMode, ProviderMode } from "../types";
import { Button, IconButton } from "../components/ui";

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
  return (
    <header className="miva-topbar grid h-[60px] w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(180px,340px)_auto] items-center gap-3 px-5">
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        {!settingsOpen && appMode !== "setup" && (
          <div className="flex min-w-0 shrink rounded-full border border-[var(--miva-border)] bg-[rgba(238,243,247,0.82)] p-0.5 shadow-sm">
            <Button
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                appMode === "studio" ? "bg-white text-[var(--miva-primary)] shadow-sm" : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
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
                appMode === "runtime" ? "bg-white text-[var(--miva-primary)] shadow-sm" : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
              }`}
              onClick={() => onModeChange("runtime")}
              size="sm"
              variant="ghost"
            >
              <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
              {t.runtimeMode}
            </Button>
          </div>
        )}
      </div>

      {settingsOpen || centerHidden ? <div /> : studioSaveVisible ? (
        <div className="mx-auto flex w-full max-w-[320px] min-w-0 justify-center">
          <Button
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--miva-primary)] px-6 py-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(36,73,102,0.24)] transition hover:bg-[var(--miva-primary-hover)] active:scale-[0.98]"
            onClick={onStudioSave}
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {studioSaveLabel}
          </Button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[340px] min-w-0 items-center gap-2 rounded-full border border-[var(--miva-border)] bg-[rgba(255,255,255,0.82)] px-2.5 py-1.5 shadow-sm backdrop-blur">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${
              activeProviderMode === "local" ? "bg-[var(--miva-success-soft)] text-[var(--miva-success)]" : "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]"
            }`}
          >
            {activeProviderMode === "local" ? providerText.localHeader : providerText.cloudHeader}
          </span>
          <span className="material-symbols-outlined shrink-0 text-sm text-[var(--miva-success)]">{activeProviderIcon}</span>
          <span className="truncate text-[13px] font-semibold text-[var(--miva-text-muted)]">
            {activeProviderLabel} / {activeModelLabel}
          </span>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-end gap-2">
        <IconButton
          aria-label="Help"
          className="shrink-0 rounded-full text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)]"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </IconButton>
        {!settingsOpen && (
          <IconButton
            aria-label={t.settings}
            className="shrink-0 rounded-full text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)]"
            onClick={onEnterSettings}
            title={t.settings}
          >
            <span className="material-symbols-outlined">settings</span>
          </IconButton>
        )}
      </div>
    </header>
  );
}
