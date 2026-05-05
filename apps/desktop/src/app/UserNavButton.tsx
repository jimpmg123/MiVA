import type { AuthSession } from "../types";

export function UserNavButton({ authSession, onOpenAuth }: { authSession: AuthSession | null; onOpenAuth: () => void }) {
  return (
    <div className="grid gap-2 border-t border-[#c2c7ce]/40 p-4">
      <button
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#42474d] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
        type="button"
        onClick={onOpenAuth}
      >
        <span className="material-symbols-outlined text-[18px]">account_circle</span>
        {authSession ? authSession.user.displayName : "Sign in"}
      </button>
    </div>
  );
}
