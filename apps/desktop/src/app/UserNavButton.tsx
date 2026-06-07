import type { AuthSession } from "../types";

export function UserNavButton({ authSession, onOpenAuth }: { authSession: AuthSession | null; onOpenAuth: () => void }) {
  return (
    <div className="miva-sidebar-footer">
      <button
        className="miva-nav-item flex w-full items-center gap-2 rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-[13px] font-bold transition"
        type="button"
        onClick={onOpenAuth}
      >
        <span className="miva-nav-icon grid h-7 w-7 shrink-0 place-items-center rounded-full">
          <span className="material-symbols-outlined text-[16px]">account_circle</span>
        </span>
        <span className="min-w-0 truncate">{authSession ? authSession.user.displayName : "Sign in"}</span>
      </button>
    </div>
  );
}
