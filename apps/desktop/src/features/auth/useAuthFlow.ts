import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getDeviceAuthStatus, startDeviceAuth } from "../cloud/client";
import { clearAuthSessionStorage, loadAuthSession, saveAuthSessionToStorage } from "./storage";
import type { AuthFlowState, AuthSession, DeviceAuthStart } from "../../types";

type UseAuthFlowOptions = {
  tauriRuntime: boolean;
  onLog: (message: string) => void;
  onClearCloudDevice: () => void;
  onContinueLocalOnly: () => void;
};

export function useAuthFlow({
  tauriRuntime,
  onLog,
  onClearCloudDevice,
  onContinueLocalOnly,
}: UseAuthFlowOptions) {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [authFlowState, setAuthFlowState] = useState<AuthFlowState>("idle");
  const [authFlowError, setAuthFlowError] = useState<string | null>(null);
  const [deviceAuthRequest, setDeviceAuthRequest] = useState<DeviceAuthStart | null>(null);

  function saveAuthSession(session: AuthSession) {
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
    startBrowserSignIn,
  };
}
