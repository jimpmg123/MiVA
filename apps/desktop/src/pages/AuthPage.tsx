import type { DeviceAuthStart, AuthFlowState, AuthSession } from "../types";
import { PrimaryButton, SecondaryButton } from "../components/ui";

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
  return (
    <main className="grid h-full w-full flex-1 place-items-center bg-[#f8f9fa] px-6 text-[#191c1d]">
      <section className="w-full max-w-[440px] rounded-3xl border border-[#c2c7ce]/70 bg-white p-8 shadow-[0_24px_80px_rgba(53,96,127,0.16)]">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">MiVA Account</p>
            <h1 className="mt-3 font-heading text-[30px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              MiVA Desktop opens web login in your system browser, then receives a desktop session from the API.
            </p>
          </div>
          <button
            aria-label="Close sign in"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#72787e] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
            type="button"
            onClick={onCloseAuth}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {authFlowState === "admin-web-only" ? (
          <div className="grid gap-5">
            <div className="rounded-2xl border border-[#cae6ff] bg-[#eff8ff] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#35607f]">Web analytics only</p>
              <p className="mt-3 text-lg font-bold text-[#191c1d]">Continue in the web console</p>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Admin accounts are used only for MiVA web analytics. Desktop assistant creation and runtime stay unavailable for this account.
              </p>
            </div>
            <PrimaryButton className="w-full justify-center" onClick={onOpenWebConsole}>
              Continue in web console
            </PrimaryButton>
          </div>
        ) : authSession ? (
          <div className="grid gap-5">
            <div className="rounded-2xl bg-[#f3f4f5] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Connected Account</p>
              <p className="mt-3 text-lg font-bold text-[#191c1d]">{authSession.user.displayName}</p>
              <p className="mt-1 text-sm text-[#42474d]">{authSession.user.email}</p>
            </div>
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
            <p className="rounded-2xl bg-[#f3f4f5] p-4 text-sm leading-6 text-[#42474d]">
              Local-only mode can run Ollama assistants on this computer. Sign in later to sync assistants and use cloud models.
            </p>

            {deviceAuthRequest && authFlowState === "waiting" && (
              <div className="rounded-2xl border border-[#cae6ff] bg-[#eff8ff] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#35607f]">Browser login waiting</p>
                <p className="mt-2 text-sm leading-6 text-[#42474d]">Complete sign-in in the browser window. MiVA Desktop will connect automatically.</p>
                <p className="mt-3 font-mono text-sm font-bold text-[#191c1d]">Code: {deviceAuthRequest.userCode}</p>
              </div>
            )}

            {authFlowError && (
              <p className="rounded-2xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{authFlowError}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
