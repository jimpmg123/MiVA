import type { AuthSession, StudioSection } from "../types";
import { BrandLogo } from "./BrandLogo";
import { UserNavButton } from "./UserNavButton";

type StudioSectionItem = { id: StudioSection; label: string; detail: string; icon: string };

type StudioNavigationProps = {
  authSession: AuthSession | null;
  studioSection: StudioSection;
  studioSections: StudioSectionItem[];
  onOpenAuth: () => void;
  onStudioSectionChange: (section: StudioSection) => void;
};

export function StudioNavigation({ authSession, studioSection, studioSections, onOpenAuth, onStudioSectionChange }: StudioNavigationProps) {
  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <BrandLogo />
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">Assistant Studio</p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="px-3 pb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">Studio</p>
        <div className="grid gap-1">
          {studioSections.map((section) => {
            const active = studioSection === section.id;
            const childOfOverview = section.id !== "myAssistants" && section.id !== "overview";

            return (
              <button
                className={`relative flex w-full items-center gap-3 rounded-xl py-3 text-left text-sm font-semibold transition ${
                  active ? "bg-[#cae6ff]/45 text-[#35607f]" : "text-[#72787e] hover:bg-[#e7e8e9] hover:text-[#191c1d]"
                } ${childOfOverview ? "ml-5 px-3" : "px-3"}`}
                key={section.id}
                onClick={() => onStudioSectionChange(section.id)}
                type="button"
              >
                {childOfOverview && (
                  <span className={`absolute -left-3 top-1/2 h-px w-3 ${active ? "bg-[#35607f]" : "bg-[#c2c7ce]"}`} />
                )}
                <span className={`grid place-items-center rounded-full ${
                  childOfOverview ? "h-7 w-7" : "h-8 w-8"
                } ${active ? "bg-[#35607f] text-white" : "bg-[#e1e3e4] text-[#72787e]"}`}>
                  <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
                </span>
                <span className="min-w-0">
                  <span className="block">{section.label}</span>
                  {!childOfOverview && <span className="block text-xs font-medium opacity-70">{section.detail}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <UserNavButton authSession={authSession} onOpenAuth={onOpenAuth} />
    </aside>
  );
}
