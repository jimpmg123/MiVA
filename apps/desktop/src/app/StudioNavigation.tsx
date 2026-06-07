import type { AuthSession, StudioSection } from "../types";
import { BrandLogo } from "./BrandLogo";
import { UserNavButton } from "./UserNavButton";

type StudioSectionItem = { id: StudioSection; label: string; detail: string; icon: string };

type StudioNavigationProps = {
  authSession: AuthSession | null;
  editorExpanded: boolean;
  studioSection: StudioSection;
  studioSections: StudioSectionItem[];
  onOpenAuth: () => void;
  onStudioSectionChange: (section: StudioSection) => void;
};

export function StudioNavigation({
  authSession,
  editorExpanded,
  studioSection,
  studioSections,
  onOpenAuth,
  onStudioSectionChange,
}: StudioNavigationProps) {
  const librarySection = studioSections.find((section) => section.id === "myAssistants");
  const overviewSection = studioSections.find((section) => section.id === "overview");
  const editorSections = studioSections.filter((section) => section.id !== "myAssistants" && section.id !== "overview");

  return (
    <aside className="miva-sidebar flex h-screen shrink-0 flex-col">
      <div className="miva-sidebar-header">
        <BrandLogo className="h-7 w-7 rounded-lg" />
        <div className="min-w-0">
          <h1 className="miva-sidebar-brand-title font-heading truncate">MiVA</h1>
          <p className="miva-nav-section-label truncate normal-case tracking-[0.08em]">Assistant Studio</p>
        </div>
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
                    <button
                      className={`miva-nav-item relative flex items-center rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-left font-semibold transition-all duration-300 ${
                        active ? "miva-nav-item-active" : ""
                      } ${editorExpanded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"} ${
                        childOfOverview ? "mr-1 w-[calc(100%-0.25rem)] gap-1.5 pl-3.5 text-[12px]" : "w-full gap-2"
                      }`}
                      key={section.id}
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
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <UserNavButton authSession={authSession} onOpenAuth={onOpenAuth} />
    </aside>
  );
}
