import type { AuthSession } from "../types";
import { BrandLogo } from "./BrandLogo";
import { UserNavButton } from "./UserNavButton";

type HistoryNavigationProps = {
  authSession: AuthSession | null;
  t: Record<string, string>;
  onOpenAuth: () => void;
};

export function HistoryNavigation({ authSession, t, onOpenAuth }: HistoryNavigationProps) {
  return (
    <aside className="miva-sidebar flex h-screen shrink-0 flex-col">
      <div className="miva-sidebar-header">
        <BrandLogo className="h-7 w-7 rounded-lg" />
        <div className="min-w-0">
          <h1 className="miva-sidebar-brand-title font-heading truncate">MiVA</h1>
          <p className="miva-nav-section-label truncate normal-case tracking-[0.08em]">{t.historyConversationHistory}</p>
        </div>
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

      <UserNavButton authSession={authSession} onOpenAuth={onOpenAuth} />
    </aside>
  );
}
