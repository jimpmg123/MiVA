import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { ClawCodeRuntimeInfo } from "../../types";
import { isTauriRuntime } from "../../app/tauri";
import { getClawCodeStatus, installClawCodeRuntime, updateClawCodeWorkspace } from "./clawCodeRuntime";

const HELPER_RETRY_DELAYS_MS = [0, 600, 1200, 2400];

function formatClawCodeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch/i.test(message)) {
    return "Local helper에 연결하지 못했습니다. MiVA 앱이 실행 중인지 확인하고 Recheck status를 다시 눌러 주세요.";
  }

  if (/connection refused|error sending request|connect/i.test(message)) {
    return "Local helper가 아직 시작되지 않았습니다. MiVA 앱을 다시 실행하거나 Node.js 설치 후 Recheck status를 눌러 주세요.";
  }

  return message;
}

async function withHelperStartupRetry<T>(task: () => Promise<T>) {
  let lastError: unknown = null;

  for (const delayMs of HELPER_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    try {
      return await task();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /connection refused|error sending request|connect|failed to fetch/i.test(message);
      if (!retryable) {
        throw error;
      }
    }
  }

  throw lastError;
}

type UseClawCodeRuntimeOptions = {
  openAiApiKey?: string;
  onLog: (message: string) => void;
  setBusyAction: Dispatch<SetStateAction<string | null>>;
};

export function useClawCodeRuntime({
  openAiApiKey = "",
  onLog,
  setBusyAction,
}: UseClawCodeRuntimeOptions) {
  const [status, setStatus] = useState<ClawCodeRuntimeInfo | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!isTauriRuntime()) {
      return;
    }

    setBusyAction("claw-status");
    setStatusError(null);
    try {
      const nextStatus = await withHelperStartupRetry(() => getClawCodeStatus());
      setStatus({
        ...nextStatus,
        openAiConfigured: nextStatus.openAiConfigured || Boolean(openAiApiKey.trim()),
      });
    } catch (error) {
      const message = formatClawCodeError(error);
      setStatusError(message);
      onLog(`Claw Code status failed: ${message}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, openAiApiKey, setBusyAction]);

  const installClawCode = useCallback(async (workspaceRoot: string | null = null) => {
    if (!isTauriRuntime()) {
      return;
    }

    setBusyAction("install-claw-code");
    try {
      const result = await withHelperStartupRetry(() => installClawCodeRuntime(workspaceRoot));
      onLog(result.message);
      await refreshStatus();
    } catch (error) {
      onLog(`Claw Code install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, refreshStatus, setBusyAction]);

  const chooseWorkspaceRoot = useCallback(async () => {
    if (!isTauriRuntime()) {
      return null;
    }

    try {
      const selected = await openDialog({
        title: "Choose Claw Code workspace folder",
        directory: true,
        multiple: false,
      });
      if (!selected || Array.isArray(selected)) {
        return null;
      }

      return selected;
    } catch (error) {
      onLog(`Workspace picker failed: ${String(error)}`);
      return null;
    }
  }, [onLog]);

  const setWorkspaceRoot = useCallback(async (workspaceRoot: string) => {
    if (!isTauriRuntime()) {
      return;
    }

    setBusyAction("claw-workspace");
    try {
      const result = await withHelperStartupRetry(() => updateClawCodeWorkspace(workspaceRoot));
      onLog(`Claw Code workspace set to ${result.workspaceRoot}`);
      await refreshStatus();
    } catch (error) {
      onLog(`Claw Code workspace update failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, refreshStatus, setBusyAction]);

  const applyClawCodeWorkspace = useCallback(async (workspaceRoot: string) => {
    if (!isTauriRuntime()) {
      return;
    }

    if (!status?.installed) {
      await installClawCode(workspaceRoot);
      return;
    }

    await setWorkspaceRoot(workspaceRoot);
  }, [installClawCode, setWorkspaceRoot, status?.installed]);

  useEffect(() => {
    if (isTauriRuntime()) {
      void refreshStatus();
    }
  }, [refreshStatus]);

  return {
    clawCodeStatus: status,
    clawCodeStatusError: statusError,
    applyClawCodeWorkspace,
    chooseClawCodeWorkspace: chooseWorkspaceRoot,
    installClawCode,
    refreshClawCodeStatus: refreshStatus,
    setClawCodeWorkspace: setWorkspaceRoot,
  };
}
