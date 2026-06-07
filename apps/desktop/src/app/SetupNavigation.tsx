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
    <aside className="miva-sidebar flex h-screen shrink-0 flex-col">
      <div className="miva-sidebar-header">
        <BrandLogo className="h-7 w-7 rounded-lg" />
        <div className="min-w-0">
          <h1 className="miva-sidebar-brand-title font-heading truncate">MiVA</h1>
          <p className="miva-nav-section-label truncate normal-case tracking-[0.08em]">{t.setupFlowSubtitle}</p>
        </div>
      </div>

      <nav className="miva-sidebar-nav">
        {activeStep === "settings" ? (
          <>
            <p className="miva-nav-section-label px-2 pb-1.5">Settings</p>
            <div className="grid gap-0.5">
              {settingsSections.map((section) => {
                const active = settingsSection === section.id;

                return (
                  <button
                    className={`miva-nav-item flex w-full items-center gap-2 rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-left font-semibold transition ${
                      active ? "miva-nav-item-active" : ""
                    }`}
                    key={section.id}
                    onClick={() => onSettingsSectionChange(section.id)}
                    type="button"
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${active ? "miva-nav-icon-active" : "miva-nav-icon"}`}>
                      <span className="material-symbols-outlined text-[16px]">{section.icon}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{section.label}</span>
                      <span className="block truncate text-[10px] font-medium leading-4 opacity-70">{section.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="miva-nav-section-label px-2 pb-1.5">Setup</p>
            <div className="grid gap-0.5">
              {steps.map((step, index) => {
                const active = step.id === activeStep;
                const completed = index < activeIndex;

                return (
                  <button
                    className={`miva-nav-item relative flex w-full items-center gap-2 rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-left font-semibold transition ${
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
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                        active ? "miva-nav-icon-active" : completed ? "miva-nav-icon-success" : "miva-nav-icon"
                      } ${active ? "miva-status-glow" : ""}`}
                    >
                      {completed ? (
                        <span className="material-symbols-outlined miva-nav-check-enter text-[16px]">check</span>
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{step.label}</span>
                      <span className="block truncate text-[10px] font-medium leading-4 opacity-70">{step.detail}</span>
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
