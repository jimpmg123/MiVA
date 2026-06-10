import type { AuthSession, StudioSection } from "../types";
import { BrandLogo } from "./BrandLogo";
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

const studioNavIconBySection: Partial<Record<StudioSection, string>> = {
  myAssistants: "ph-users",
  assistantStore: "ph-storefront",
  overview: "ph-house",
  models: "ph-cube",
  prompts: "ph-note-pencil",
  character: "ph-smiley",
  tts: "ph-microphone",
  googleWorkspace: "ph-squares-four",
  code: "ph-code",
  skills: "ph-book-open",
};

function getStudioNavIcon(section: StudioSectionItem) {
  return studioNavIconBySection[section.id] ?? "ph-circle";
}

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
  const storeSection = studioSections.find((section) => section.id === "assistantStore");
  const editorSections = studioSections.filter((section) => section.id !== "myAssistants" && section.id !== "assistantStore");
  const showEditorSections = editorExpanded && editorSections.length > 0;
  const showPromptSurveyAlert = promptSurveyAlertVisible && showEditorSections;

  return (
    <aside className="miva-studio-design relative flex h-screen w-full shrink-0 flex-col overflow-visible border-r border-slate-200 bg-white text-slate-900">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-7 w-7 rounded-lg" />
          <span className="min-w-0 truncate text-lg font-bold tracking-tight">
            MiVA <span className="font-normal text-slate-400">Studio</span>
          </span>
        </div>
        <button
          aria-label="Close navigation"
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onToggleSidebar}
          title="Close navigation"
          type="button"
        >
          <i className="ph ph-sidebar-simple text-lg" />
        </button>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {[librarySection, storeSection].filter((section): section is StudioSectionItem => Boolean(section)).map((section) => (
            <button
              key={section.id}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] font-medium leading-5 transition ${
                studioSection === section.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
              onClick={() => onStudioSectionChange(section.id)}
              type="button"
            >
              <i className={`ph ${getStudioNavIcon(section)} text-lg`} />
              <span className="min-w-0 truncate">{section.label}</span>
            </button>
          ))}
        </div>

        {showEditorSections && (
          <div
            className="pt-4"
          >
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Assistant setup</div>
            <div className="space-y-1">
              {editorSections.map((section) => {
                const active = studioSection === section.id;

                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] font-medium leading-5 transition ${
                      active ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                    key={section.id}
                    onClick={() => onStudioSectionChange(section.id)}
                    type="button"
                  >
                    <i className={`ph ${getStudioNavIcon(section)} text-lg`} />
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    {promptSurveyAlertVisible && section.id === "prompts" ? (
                      <i className="ph ph-warning-circle shrink-0 text-base text-[var(--miva-danger)]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {showPromptSurveyAlert && (
        <div className="pointer-events-none absolute left-[calc(100%+12px)] top-[164px] z-[120] w-[280px] rounded-lg border border-[color:rgba(186,26,26,0.38)] bg-[var(--miva-danger-soft)] px-4 py-3 text-[12px] font-semibold leading-5 text-[var(--miva-danger-hover)] shadow-[var(--miva-shadow-md)] ring-1 ring-[color:rgba(186,26,26,0.12)]">
          <div className="flex items-start gap-2">
            <i className="ph ph-warning-circle mt-0.5 shrink-0 text-[17px] text-[var(--miva-danger)]" />
            <span>Complete Prompts before saving this assistant.</span>
          </div>
        </div>
      )}

      <UserNavButton authSession={authSession} onEnterPersonalization={onEnterPersonalization} onEnterSettings={onEnterSettings} onOpenAuth={onOpenAuth} onOpenBilling={onOpenBilling} onOpenWebConsole={onOpenWebConsole} onSignOut={onSignOut} />
    </aside>
  );
}
