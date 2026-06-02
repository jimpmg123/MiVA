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
    <aside className="miva-sidebar flex h-screen w-[250px] shrink-0 flex-col">
      <div className="flex h-[60px] items-center gap-3 border-b border-[var(--miva-border)]/70 px-6">
        <BrandLogo />
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[var(--miva-text)]">MiVA</h1>
          <p className="miva-nav-section-label">{t.setupFlowSubtitle}</p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        {activeStep === "settings" ? (
          <>
            <p className="miva-nav-section-label px-3 pb-3">Settings</p>
            <div className="grid gap-1">
              {settingsSections.map((section) => {
                const active = settingsSection === section.id;

                return (
                  <button
                    className={`miva-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                      active ? "miva-nav-item-active" : ""
                    }`}
                    key={section.id}
                    onClick={() => onSettingsSectionChange(section.id)}
                    type="button"
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-full ${active ? "miva-nav-icon-active" : "miva-nav-icon"}`}>
                      <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block">{section.label}</span>
                      <span className="block text-xs font-medium opacity-70">{section.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="miva-nav-section-label px-3 pb-3">Setup</p>
            <div className="grid gap-1">
              {steps.map((step, index) => {
                const active = step.id === activeStep;
                const completed = index < activeIndex;

                return (
                  <button
                    className={`miva-nav-item relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                      active ? "miva-nav-item-active" : completed ? "text-[var(--miva-success)]" : ""
                    }`}
                    key={step.id}
                    onClick={() => {
                      onAppModeChange("setup");
                      onStepChange(step.id);
                    }}
                    type="button"
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-300 ${
                        active ? "miva-nav-icon-active" : completed ? "miva-nav-icon-success" : "miva-nav-icon"
                      } ${active ? "miva-status-glow" : ""}`}
                    >
                      {completed ? (
                        <span className="material-symbols-outlined miva-nav-check-enter text-[18px]">check</span>
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block">{step.label}</span>
                      <span className="block text-xs font-medium opacity-70">{step.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <UserNavButton authSession={authSession} onOpenAuth={onOpenAuth} />
    </aside>
  );
}
