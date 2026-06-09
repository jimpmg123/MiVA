import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { buildWebConsoleUrl } from "../../config/endpoints";
import { getDeviceAuthStatus, getGoogleWorkspaceAuthUrl, startDeviceAuth } from "../cloud/client";
import { clearAuthSessionStorage, loadAuthSession, saveAuthSessionToStorage } from "./storage";
import type { AuthFlowState, AuthSession, DeviceAuthStart } from "../../types";

type UseAuthFlowOptions = {
  tauriRuntime: boolean;
  onLog: (message: string) => void;
  onClearCloudDevice: () => void;
  onContinueLocalOnly: () => void;
};

function loadDesktopAuthSession() {
  const session = loadAuthSession();
  if (session?.user.role === "admin") {
    clearAuthSessionStorage();
    return null;
  }
  return session;
}

export function useAuthFlow({
  tauriRuntime,
  onLog,
  onClearCloudDevice,
  onContinueLocalOnly,
}: UseAuthFlowOptions) {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadDesktopAuthSession());
  const [authFlowState, setAuthFlowState] = useState<AuthFlowState>("idle");
  const [authFlowError, setAuthFlowError] = useState<string | null>(null);
  const [deviceAuthRequest, setDeviceAuthRequest] = useState<DeviceAuthStart | null>(null);

  function saveAuthSession(session: AuthSession) {
    if (session.user.role === "admin") {
      clearAuthSessionStorage();
      setAuthSession(null);
      setDeviceAuthRequest(null);
      setAuthFlowState("admin-web-only");
      setAuthFlowError(null);
      onLog(`Desktop admin session rejected for ${session.user.email}.`);
      return;
    }

    saveAuthSessionToStorage(session);
    setAuthSession(session);
  }

  function clearAuthSession() {
    clearAuthSessionStorage();
    setAuthSession(null);
    onClearCloudDevice();
    setDeviceAuthRequest(null);
    setAuthFlowState("idle");
    setAuthFlowError(null);
  }

  function continueLocalOnly() {
    setAuthFlowState("idle");
    setAuthFlowError(null);
    setDeviceAuthRequest(null);
    onContinueLocalOnly();
  }

  async function startBrowserSignIn() {
    setAuthFlowState("opening");
    setAuthFlowError(null);

    try {
      const request = await startDeviceAuth();

      setDeviceAuthRequest(request);
      setAuthFlowState("waiting");

      try {
        if (tauriRuntime) {
          await openUrl(request.verificationUrl);
        } else {
          window.open(request.verificationUrl, "_blank", "noopener,noreferrer");
        }
      } catch (openError) {
        setAuthFlowError(`Browser did not open automatically. Open this URL manually: ${request.verificationUrl}`);
        onLog(`Browser open failed: ${String(openError)}`);
      }

      onLog("Opened MiVA web sign-in in the system browser.");
    } catch (error) {
      const message = `Could not start browser sign-in: ${String(error)}`;
      setAuthFlowState("error");
      setAuthFlowError(message);
      onLog(message);
    }
  }

  async function openWebConsole(page?: string) {
    const webConsoleUrl = buildWebConsoleUrl(page);

    try {
      if (tauriRuntime) {
        await openUrl(webConsoleUrl);
      } else {
        window.open(webConsoleUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setAuthFlowError(`Could not open web console. Open this URL manually: ${webConsoleUrl}`);
      onLog(`Web console open failed: ${String(error)}`);
    }
  }

  async function openWorkspaceConsent() {
    if (!authSession) {
      setAuthFlowError("Sign in to MiVA before connecting Google Workspace.");
      onLog("Workspace consent blocked because no MiVA account is signed in.");
      return;
    }

    let consentUrl = "";
    try {
      const { url } = await getGoogleWorkspaceAuthUrl({ authSession });
      consentUrl = url;
      if (tauriRuntime) {
        await openUrl(consentUrl);
      } else {
        window.open(consentUrl, "_blank", "noopener,noreferrer");
      }
      onLog("Opened Google Workspace permission consent in the system browser.");
    } catch (error) {
      setAuthFlowError(consentUrl ? `Could not open Google Workspace consent. Open this URL manually: ${consentUrl}` : `Could not start Google Workspace consent: ${String(error)}`);
      onLog(`Workspace consent open failed: ${String(error)}`);
    }
  }

  useEffect(() => {
    if (!deviceAuthRequest || authFlowState !== "waiting") {
      return;
    }

    let cancelled = false;
    const pollInterval = Math.max(1000, deviceAuthRequest.intervalMs || 1500);

    const pollDeviceAuth = async () => {
      try {
        const statusResponse = await getDeviceAuthStatus(deviceAuthRequest.deviceCode);

        if (cancelled) {
          return;
        }

        if (statusResponse.status === "authorized" && statusResponse.session) {
          saveAuthSession(statusResponse.session);
          setAuthFlowState("connected");
          setAuthFlowError(null);
          setDeviceAuthRequest(null);
          onLog(`Desktop session connected for ${statusResponse.session.user.email}.`);
          return;
        }

        if (statusResponse.status === "expired") {
          setAuthFlowState("error");
          setAuthFlowError("This desktop login request expired. Start sign-in again.");
          setDeviceAuthRequest(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthFlowState("error");
          setAuthFlowError(`Could not check sign-in status: ${String(error)}`);
        }
      }
    };

    void pollDeviceAuth();
    const intervalId = window.setInterval(() => void pollDeviceAuth(), pollInterval);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authFlowState, deviceAuthRequest, onLog]);

  return {
    authSession,
    authFlowState,
    authFlowError,
    deviceAuthRequest,
    clearAuthSession,
    continueLocalOnly,
    openWorkspaceConsent,
    openWebConsole,
    startBrowserSignIn,
  };
}
