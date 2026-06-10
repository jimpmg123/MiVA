import type { AuthSession } from "../types";
import { BrandLogo } from "./BrandLogo";
import { SidebarToggleIcon } from "./SidebarToggleIcon";
import { UserNavButton } from "./UserNavButton";

type HistoryNavigationProps = {
  authSession: AuthSession | null;
  onEnterPersonalization: () => void;
  onEnterSettings: () => void;
  onOpenAuth: () => void;
  onOpenBilling: () => void;
  onOpenRuntime: () => void;
  onOpenWebConsole: () => void;
  onSignOut: () => void;
  onToggleSidebar: () => void;
};

export function HistoryNavigation({ authSession, onEnterPersonalization, onEnterSettings, onOpenAuth, onOpenBilling, onOpenRuntime, onOpenWebConsole, onSignOut, onToggleSidebar }: HistoryNavigationProps) {
  return (
    <aside className="miva-sidebar flex h-screen shrink-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <button
          className="flex min-w-0 items-center gap-2 rounded-md text-left transition hover:text-blue-600"
          onClick={onOpenRuntime}
          title="Back to Runtime"
          type="button"
        >
          <BrandLogo className="h-7 w-7 rounded-lg" />
          <span className="min-w-0 truncate text-lg font-bold tracking-tight">
            MiVA <span className="font-normal text-slate-400">Runtime</span>
          </span>
        </button>
        <button
          aria-label="Close navigation"
          className="grid h-7 w-7 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onToggleSidebar}
          title="Close navigation"
          type="button"
        >
          <SidebarToggleIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3">
        <section className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">calendar_month</span>
            <div>
              <p className="text-[13px] font-bold text-[var(--miva-text)]">Date + assistant</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--miva-text-muted)]">
                Conversations are grouped by day, then by the assistant you talked with.
              </p>
            </div>
          </div>
        </section>
      </div>

      <UserNavButton authSession={authSession} onEnterPersonalization={onEnterPersonalization} onEnterSettings={onEnterSettings} onOpenAuth={onOpenAuth} onOpenBilling={onOpenBilling} onOpenWebConsole={onOpenWebConsole} onSignOut={onSignOut} />
    </aside>
  );
}
