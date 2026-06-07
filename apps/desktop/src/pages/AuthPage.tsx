import type { DeviceAuthStart, AuthFlowState, AuthSession } from "../types";
import { isTauriRuntime } from "../app/tauri";
import { IconButton, Panel, PrimaryButton, SecondaryButton, StatusAlert } from "../components/ui";
import { WindowControls, WindowDragLayer } from "../components/WindowControls";

type AuthPageProps = {
  authFlowError: string | null;
  authFlowState: AuthFlowState;
  authSession: AuthSession | null;
  deviceAuthRequest: DeviceAuthStart | null;
  onClearAuthSession: () => void;
  onCloseAuth: () => void;
  onContinueLocalOnly: () => void;
  onOpenWebConsole: () => void;
  onStartBrowserSignIn: () => void;
};

export function AuthPage({
  authFlowError,
  authFlowState,
  authSession,
  deviceAuthRequest,
  onClearAuthSession,
  onCloseAuth,
  onContinueLocalOnly,
  onOpenWebConsole,
  onStartBrowserSignIn,
}: AuthPageProps) {
  const desktopChrome = isTauriRuntime();

  return (
    <main className="relative grid h-full w-full flex-1 place-items-center bg-[var(--miva-bg)] px-6 text-[var(--miva-text)]">
      {desktopChrome && (
        <div className="absolute inset-x-0 top-0 z-20 flex h-9 items-stretch border-b border-[var(--miva-border)] bg-[var(--miva-topbar-bg)] backdrop-blur">
          <WindowDragLayer className="absolute inset-0 z-0" />
          <div className="relative z-10 flex min-w-0 flex-1 items-center px-4 pointer-events-none">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">MiVA Desktop</span>
          </div>
          <div className="relative z-10 pointer-events-auto">
            <WindowControls className="mr-1" />
          </div>
        </div>
      )}
      <Panel className={`relative w-full max-w-[440px] px-8 pb-8 pt-9 shadow-[var(--miva-shadow-lg)] ${desktopChrome ? "mt-8" : ""}`}>
        <IconButton
          aria-label="Close sign in"
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-[var(--miva-text-soft)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
          type="button"
          onClick={onCloseAuth}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </IconButton>

        <div className="mb-8 pr-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">MiVA Account</p>
          <h1 className="mt-3 font-heading text-[30px] font-bold leading-9 tracking-[-0.02em] text-[var(--miva-text)]">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
            MiVA Desktop opens web login in your system browser, then receives a desktop session from the API.
          </p>
        </div>

        {authFlowState === "admin-web-only" ? (
          <div className="grid gap-5">
            <StatusAlert tone="neutral">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-primary)]">Web analytics only</p>
              <p className="mt-3 text-lg font-bold text-[var(--miva-text)]">Continue in the web console</p>
              <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
                Admin accounts are used only for MiVA web analytics. Desktop assistant creation and runtime stay unavailable for this account.
              </p>
            </StatusAlert>
            <PrimaryButton className="w-full justify-center" onClick={onOpenWebConsole}>
              Continue in web console
            </PrimaryButton>
          </div>
        ) : authSession ? (
          <div className="grid gap-5">
            <StatusAlert tone="success">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Connected Account</p>
              <p className="mt-3 text-lg font-bold text-[var(--miva-text)]">{authSession.user.displayName}</p>
              <p className="mt-1 text-sm text-[var(--miva-text-muted)]">{authSession.user.email}</p>
            </StatusAlert>
            <PrimaryButton className="w-full justify-center" onClick={onCloseAuth}>
              Continue to MiVA
            </PrimaryButton>
            <SecondaryButton className="w-full" onClick={onClearAuthSession}>
              Sign out
            </SecondaryButton>
          </div>
        ) : (
          <div className="grid gap-5">
            <PrimaryButton
              className="w-full justify-center"
              disabled={authFlowState === "opening" || authFlowState === "waiting"}
              onClick={onStartBrowserSignIn}
            >
              {authFlowState === "opening"
                ? "Opening browser..."
                : authFlowState === "waiting"
                  ? "Waiting for web login..."
                  : "Continue in browser"}
            </PrimaryButton>
            <SecondaryButton className="w-full justify-center" onClick={onContinueLocalOnly}>
              Continue without signing in
            </SecondaryButton>
            <StatusAlert tone="neutral">
              Local-only mode can run Ollama assistants on this computer. Sign in later to sync assistants and use cloud models.
            </StatusAlert>

            {deviceAuthRequest && authFlowState === "waiting" && (
              <StatusAlert tone="neutral">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-primary)]">Browser login waiting</p>
                <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">Complete sign-in in the browser window. MiVA Desktop will connect automatically.</p>
                <p className="mt-3 font-mono text-sm font-bold text-[var(--miva-text)]">Code: {deviceAuthRequest.userCode}</p>
              </StatusAlert>
            )}

            {authFlowError && (
              <StatusAlert tone="danger">{authFlowError}</StatusAlert>
            )}
          </div>
        )}
      </Panel>
    </main>
  );
}
