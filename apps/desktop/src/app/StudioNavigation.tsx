import type { AuthSession, StudioSection } from "../types";
import { BrandLogo } from "./BrandLogo";
import { SidebarToggleIcon } from "./SidebarToggleIcon";
import { UserNavButton } from "./UserNavButton";

type StudioSectionItem = { id: StudioSection; label: string; detail: string; icon: string };

type StudioNavigationProps = {
  authSession: AuthSession | null;
  editorExpanded: boolean;
  studioSection: StudioSection;
  studioSections: StudioSectionItem[];
  onEnterSettings: () => void;
  onEnterPersonalization: () => void;
  onOpenAuth: () => void;
  onOpenBilling: () => void;
  onOpenWebConsole: () => void;
  onSignOut: () => void;
  onStudioSectionChange: (section: StudioSection) => void;
  onToggleSidebar: () => void;
  promptSurveyAlertVisible: boolean;
};

export function StudioNavigation({
  authSession,
  editorExpanded,
  studioSection,
  studioSections,
  onEnterSettings,
  onEnterPersonalization,
  onOpenAuth,
  onOpenBilling,
  onOpenWebConsole,
  onSignOut,
  onStudioSectionChange,
  onToggleSidebar,
  promptSurveyAlertVisible,
}: StudioNavigationProps) {
  const librarySection = studioSections.find((section) => section.id === "myAssistants");
  const overviewSection = studioSections.find((section) => section.id === "overview");
  const editorSections = studioSections.filter((section) => section.id !== "myAssistants" && section.id !== "overview");
  const showPromptSurveyAlert = promptSurveyAlertVisible && editorExpanded;

  return (
    <aside className="miva-sidebar relative flex h-screen shrink-0 flex-col overflow-visible">
      <div className="miva-sidebar-header">
        <BrandLogo className="h-7 w-7 rounded-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="miva-sidebar-brand-title font-heading truncate">MiVA</h1>
          <p className="miva-nav-section-label truncate normal-case tracking-[0.08em]">Assistant Studio</p>
        </div>
        <button
          aria-label="Close navigation"
          className="miva-sidebar-toggle"
          onClick={onToggleSidebar}
          title="Close navigation"
          type="button"
        >
          <SidebarToggleIcon className="h-[16px] w-[16px]" />
        </button>
      </div>

      <nav className="miva-sidebar-nav">
        <p className="miva-nav-section-label px-2 pb-1.5">Studio</p>
        <div className="grid gap-0.5">
          {librarySection && (
            <button
              className={`miva-nav-item relative flex w-full items-center gap-2 rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-left font-semibold transition ${
                studioSection === "myAssistants"
                  ? "miva-nav-item-active"
                  : ""
              }`}
              onClick={() => onStudioSectionChange("myAssistants")}
              type="button"
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                studioSection === "myAssistants" ? "miva-nav-icon-active" : "miva-nav-icon"
              }`}>
                <span className="material-symbols-outlined text-[16px]">{librarySection.icon}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px]">{librarySection.label}</span>
                <span className="block truncate text-[10px] font-medium leading-4 opacity-70">{librarySection.detail}</span>
              </span>
            </button>
          )}

          <div
            className={`grid transition-all duration-300 ease-out ${
              editorExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-0.5 pt-0.5">
                {[...(overviewSection ? [overviewSection] : []), ...editorSections].map((section, index) => {
                  const active = studioSection === section.id;
                  const childOfOverview = section.id !== "overview";

                  return (
                    <div className="grid gap-1" key={section.id}>
                      <button
                        className={`miva-nav-item relative flex items-center rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-left font-semibold transition-all duration-300 ${
                          active ? "miva-nav-item-active" : ""
                        } ${editorExpanded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"} ${
                          childOfOverview ? "mr-1 w-[calc(100%-0.25rem)] gap-1.5 pl-3.5 text-[12px]" : "w-full gap-2"
                        }`}
                        onClick={() => onStudioSectionChange(section.id)}
                        style={{ transitionDelay: editorExpanded ? `${index * 35}ms` : "0ms" }}
                        type="button"
                      >
                        <span className={`grid shrink-0 place-items-center rounded-full transition-colors ${
                          active ? "miva-nav-icon-active" : "miva-nav-icon"
                        } ${childOfOverview ? "h-6 w-6" : "h-7 w-7"}`}>
                          <span className={`material-symbols-outlined ${
                            section.id === "googleWorkspace"
                              ? "text-[12px]"
                              : childOfOverview
                                ? "text-[14px]"
                                : "text-[16px]"
                          }`}>{section.icon}</span>
                        </span>
                        <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                          <span className="block truncate">{section.label}</span>
                        </span>
                        {promptSurveyAlertVisible && section.id === "prompts" ? (
                          <span className="material-symbols-outlined shrink-0 text-[16px] text-[var(--miva-danger)]">error</span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {showPromptSurveyAlert && (
        <div className="pointer-events-none absolute left-[calc(100%+12px)] top-[164px] z-[120] w-[280px] rounded-lg border border-[color:rgba(186,26,26,0.38)] bg-[var(--miva-danger-soft)] px-4 py-3 text-[12px] font-semibold leading-5 text-[var(--miva-danger-hover)] shadow-[var(--miva-shadow-md)] ring-1 ring-[color:rgba(186,26,26,0.12)]">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[17px] text-[var(--miva-danger)]">error</span>
            <span>Complete Prompts before saving this assistant.</span>
          </div>
        </div>
      )}

      <UserNavButton authSession={authSession} onEnterPersonalization={onEnterPersonalization} onEnterSettings={onEnterSettings} onOpenAuth={onOpenAuth} onOpenBilling={onOpenBilling} onOpenWebConsole={onOpenWebConsole} onSignOut={onSignOut} />
    </aside>
  );
}
