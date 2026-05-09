import type { AppMode, AuthSession, SettingsSection, StepId } from "../types";
import { BrandLogo } from "./BrandLogo";
import { UserNavButton } from "./UserNavButton";

type SetupStepItem = { id: StepId; label: string; detail: string };
type SettingsSectionItem = { id: SettingsSection; label: string; detail: string; icon: string };

type SetupNavigationProps = {
  activeIndex: number;
  activeStep: StepId;
  authSession: AuthSession | null;
  settingsSection: SettingsSection;
  settingsSections: SettingsSectionItem[];
  steps: SetupStepItem[];
  t: Record<string, string>;
  onOpenAuth: () => void;
  onSettingsSectionChange: (section: SettingsSection) => void;
  onStepChange: (step: StepId) => void;
  onAppModeChange: (mode: AppMode) => void;
};

export function SetupNavigation({
  activeIndex,
  activeStep,
  authSession,
  settingsSection,
  settingsSections,
  steps,
  t,
  onOpenAuth,
  onSettingsSectionChange,
  onStepChange,
  onAppModeChange,
}: SetupNavigationProps) {
  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <BrandLogo />
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.setupFlowSubtitle}</p>
        </div>
      </div>

      <nav className="flex-1">
        {activeStep === "settings" ? (
          <div className="p-4">
            <p className="px-3 pb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">Settings</p>
            <div className="grid gap-1">
              {settingsSections.map((section) => {
                const active = settingsSection === section.id;

                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                      active ? "bg-[#cae6ff]/45 text-[#35607f]" : "text-[#72787e] hover:bg-[#e7e8e9] hover:text-[#191c1d]"
                    }`}
                    key={section.id}
                    onClick={() => onSettingsSectionChange(section.id)}
                    type="button"
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-full ${active ? "bg-[#35607f] text-white" : "bg-[#e1e3e4] text-[#72787e]"}`}>
                      <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
                    </span>
                    <span>
                      <span className="block">{section.label}</span>
                      <span className="block text-xs font-medium opacity-70">{section.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          steps.map((step, index) => {
            const active = step.id === activeStep;
            const completed = index < activeIndex;

            return (
              <button
                className={`flex w-full items-center gap-3 border-r-4 px-6 py-4 text-left text-sm font-semibold transition ${
                  active
                    ? "border-[#35607f] bg-[#cae6ff]/45 text-[#35607f]"
                    : completed
                      ? "border-transparent text-[#4a654e] hover:bg-[#e7e8e9]"
                      : "border-transparent text-[#72787e] hover:bg-[#e7e8e9]"
                }`}
                key={step.id}
                onClick={() => {
                  onAppModeChange("setup");
                  onStepChange(step.id);
                }}
                type="button"
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                    active ? "bg-[#35607f] text-white" : completed ? "bg-[#c9e8cb] text-[#334d38]" : "bg-[#e1e3e4] text-[#72787e]"
                  }`}
                >
                  {completed ? <span className="material-symbols-outlined text-[18px]">check</span> : String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block">{step.label}</span>
                  <span className="block text-xs font-medium opacity-70">{step.detail}</span>
                </span>
              </button>
            );
          })
        )}
      </nav>

      <UserNavButton authSession={authSession} onOpenAuth={onOpenAuth} />
    </aside>
  );
}
