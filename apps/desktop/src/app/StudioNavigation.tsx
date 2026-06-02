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
    <aside className="miva-sidebar flex h-screen w-[250px] shrink-0 flex-col">
      <div className="flex h-[60px] items-center gap-3 border-b border-[var(--miva-border)]/70 px-6">
        <BrandLogo />
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[var(--miva-text)]">MiVA</h1>
          <p className="miva-nav-section-label">Assistant Studio</p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="miva-nav-section-label px-3 pb-3">Studio</p>
        <div className="grid gap-1">
          {librarySection && (
            <button
              className={`miva-nav-item relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                studioSection === "myAssistants"
                  ? "miva-nav-item-active"
                  : ""
              }`}
              onClick={() => onStudioSectionChange("myAssistants")}
              type="button"
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full ${
                studioSection === "myAssistants" ? "miva-nav-icon-active" : "miva-nav-icon"
              }`}>
                <span className="material-symbols-outlined text-[18px]">{librarySection.icon}</span>
              </span>
              <span className="min-w-0">
                <span className="block">{librarySection.label}</span>
                <span className="block text-xs font-medium opacity-70">{librarySection.detail}</span>
              </span>
            </button>
          )}

          <div
            className={`grid transition-all duration-300 ease-out ${
              editorExpanded ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-1 pt-1">
                {[...(overviewSection ? [overviewSection] : []), ...editorSections].map((section, index) => {
                  const active = studioSection === section.id;
                  const childOfOverview = section.id !== "overview";

                  return (
                    <button
                      className={`miva-nav-item relative flex items-center rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all duration-300 ${
                        active ? "miva-nav-item-active" : ""
                      } ${editorExpanded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"} ${
                        childOfOverview ? "mr-2 w-[calc(100%-0.5rem)] gap-2 pl-6 text-[12px]" : "w-full gap-3"
                      }`}
                      key={section.id}
                      onClick={() => onStudioSectionChange(section.id)}
                      style={{ transitionDelay: editorExpanded ? `${index * 35}ms` : "0ms" }}
                      type="button"
                    >
                      <span className={`grid shrink-0 place-items-center rounded-full transition-colors ${
                        active ? "miva-nav-icon-active" : "miva-nav-icon"
                      } ${childOfOverview ? "h-7 w-7" : "h-8 w-8"}`}>
                        <span className={`material-symbols-outlined ${childOfOverview ? "text-[16px]" : "text-[18px]"}`}>{section.icon}</span>
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
