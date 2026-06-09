import { useEffect, useRef, useState } from "react";
import type { AuthSession } from "../types";

type UserNavButtonProps = {
  authSession: AuthSession | null;
  onEnterPersonalization: () => void;
  onEnterSettings: () => void;
  onOpenAuth: () => void;
  onOpenBilling: () => void;
  onOpenWebConsole: () => void;
  onSignOut: () => void;
};

export function UserNavButton({ authSession, onEnterPersonalization, onEnterSettings, onOpenAuth, onOpenBilling, onOpenWebConsole, onSignOut }: UserNavButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const displayName = authSession?.user.displayName || "Sign in";
  const email = authSession?.user.email ?? "";
  const initials = authSession?.user.displayName?.trim().slice(0, 2).toUpperCase() || "SI";

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <div className="miva-sidebar-footer" ref={containerRef}>
      {menuOpen && (
        <div className="absolute bottom-[calc(100%-0.75rem)] left-2 right-2 z-50 mb-1 overflow-hidden rounded-[18px] border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] p-1.5 shadow-[0_18px_44px_rgba(31,57,88,0.16)] backdrop-blur">
          <button
            className="flex w-full items-center gap-2.5 rounded-[13px] px-2 py-2 text-left transition hover:bg-[var(--miva-surface-muted)]"
            onClick={() => runMenuAction(onOpenAuth)}
            type="button"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#879494] text-[11px] font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-4 tracking-normal text-[var(--miva-text)]">{displayName}</span>
              <span className="block truncate text-[11px] leading-4 tracking-normal text-[var(--miva-text-muted)]">{email || "MiVA account"}</span>
            </span>
            <span className="material-symbols-outlined text-[20px] text-[var(--miva-text-muted)]">chevron_right</span>
          </button>

          <div className="my-1.5 h-px bg-[var(--miva-border)]" />

          <MenuButton icon="auto_awesome" label="Upgrade plan" onClick={() => runMenuAction(onOpenBilling)} />
          <MenuButton icon="tune" label="Personalization" onClick={() => runMenuAction(onEnterPersonalization)} />
          <MenuButton icon="account_circle" label="Profile" onClick={() => runMenuAction(onOpenAuth)} />
          <MenuButton icon="settings" label="Settings" onClick={() => runMenuAction(onEnterSettings)} />

          <div className="my-1.5 h-px bg-[var(--miva-border)]" />

          <MenuButton icon="help" label="Help" onClick={() => runMenuAction(onOpenWebConsole)} />
          <MenuButton icon={authSession ? "logout" : "login"} label={authSession ? "Log out" : "Log in"} onClick={() => runMenuAction(authSession ? onSignOut : onOpenAuth)} />
        </div>
      )}

      <button
        aria-expanded={menuOpen}
        className="miva-nav-item flex w-full items-center gap-2 rounded-[14px] bg-white/58 px-2 py-2 text-[13px] font-semibold transition hover:bg-white/78"
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#879494] text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate">{displayName}</span>
          <span className="block truncate text-[11px] font-normal text-[var(--miva-text-muted)]">{authSession ? "MiVA account" : "Local only"}</span>
        </span>
        <span className="material-symbols-outlined text-[18px] text-[var(--miva-text-muted)]">chevron_right</span>
      </button>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      className="flex min-h-9 w-full items-center gap-2.5 rounded-[11px] px-2.5 py-1.5 text-left text-[13px] font-medium leading-4 tracking-normal text-[var(--miva-text)] transition hover:bg-[var(--miva-surface-muted)]"
      onClick={onClick}
      type="button"
    >
      <span className="material-symbols-outlined w-7 shrink-0 text-center text-[21px] text-[var(--miva-text)]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
