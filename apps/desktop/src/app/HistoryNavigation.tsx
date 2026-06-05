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
    <aside className="miva-sidebar flex h-screen w-[250px] shrink-0 flex-col">
      <div className="flex h-[60px] items-center gap-3 border-b border-[var(--miva-border)]/70 px-6">
        <BrandLogo />
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[var(--miva-text)]">MiVA</h1>
          <p className="miva-nav-section-label">{t.historyConversationHistory}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <section className="rounded-xl border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-[var(--miva-primary)]">calendar_month</span>
            <div>
              <p className="text-sm font-bold text-[var(--miva-text)]">Date + assistant</p>
              <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">
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
