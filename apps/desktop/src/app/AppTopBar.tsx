import type { AppMode, ProviderMode } from "../types";

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
    <header className="grid h-[60px] w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(180px,320px)_auto] items-center gap-3 border-b border-[#c2c7ce]/60 bg-[#f8f9fa]/85 px-5 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        {!settingsOpen && (
          <div className="flex min-w-0 shrink rounded-full border border-[#c2c7ce]/60 bg-[#e7e8e9]/60 p-0.5">
            <button
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                appMode === "studio" ? "bg-white text-[#35607f] shadow-sm" : "text-[#72787e] hover:text-[#191c1d]"
              }`}
              onClick={() => onModeChange("studio")}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">construction</span>
              {t.studioMode}
            </button>
            <button
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                appMode === "runtime" ? "bg-white text-[#35607f] shadow-sm" : "text-[#72787e] hover:text-[#191c1d]"
              }`}
              onClick={() => onModeChange("runtime")}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
              {t.runtimeMode}
            </button>
          </div>
        )}
      </div>

      {settingsOpen || centerHidden ? <div /> : studioSaveVisible ? (
        <div className="mx-auto flex w-full max-w-[320px] min-w-0 justify-center">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#35607f] px-6 py-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(53,96,127,0.24)] transition hover:bg-[#2d526d] active:scale-[0.98]"
            onClick={onStudioSave}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {studioSaveLabel}
          </button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[320px] min-w-0 items-center gap-2 rounded-full border border-[#c2c7ce]/60 bg-white/80 px-2.5 py-1.5 shadow-sm">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${
              activeProviderMode === "local" ? "bg-[#c9e8cb] text-[#334d38]" : "bg-[#cae6ff] text-[#1c4b69]"
            }`}
          >
            {activeProviderMode === "local" ? providerText.localHeader : providerText.cloudHeader}
          </span>
          <span className="material-symbols-outlined shrink-0 text-sm text-[#4a654e]">{activeProviderIcon}</span>
          <span className="truncate text-[13px] font-semibold text-[#42474d]">
            {activeProviderLabel} / {activeModelLabel}
          </span>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          aria-label="Help"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#72787e] transition-all duration-200 ease-in-out hover:bg-[#f3f4f5]"
          type="button"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        {!settingsOpen && (
          <button
            aria-label={t.settings}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#72787e] transition-all duration-200 ease-in-out hover:bg-[#f3f4f5]"
            onClick={onEnterSettings}
            title={t.settings}
            type="button"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        )}
      </div>
    </header>
  );
}
