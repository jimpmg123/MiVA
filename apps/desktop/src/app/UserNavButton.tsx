import type { AuthSession } from "../types";

export function UserNavButton({ authSession, onOpenAuth }: { authSession: AuthSession | null; onOpenAuth: () => void }) {
  return (
    <div className="grid gap-2 border-t border-[var(--miva-border)]/70 p-4">
      <button
        className="miva-nav-item flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition"
        type="button"
        onClick={onOpenAuth}
      >
        <span className="miva-nav-icon grid h-8 w-8 shrink-0 place-items-center rounded-full">
          <span className="material-symbols-outlined text-[18px]">account_circle</span>
        </span>
        <span className="min-w-0 truncate">{authSession ? authSession.user.displayName : "Sign in"}</span>
      </button>
    </div>
  );
}
