import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { ClawCodeRuntimeInfo } from "../../types";
import { getClawCodeStatus, installClawCodeRuntime, updateClawCodeWorkspace } from "./clawCodeRuntime";

type UseClawCodeRuntimeOptions = {
  openAiApiKey?: string;
  tauriRuntime: boolean;
  onLog: (message: string) => void;
  setBusyAction: Dispatch<SetStateAction<string | null>>;
};

export function useClawCodeRuntime({
  openAiApiKey = "",
  tauriRuntime,
  onLog,
  setBusyAction,
}: UseClawCodeRuntimeOptions) {
  const [status, setStatus] = useState<ClawCodeRuntimeInfo | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!tauriRuntime) {
      return;
    }

    setBusyAction("claw-status");
    setStatusError(null);
    try {
      const nextStatus = await getClawCodeStatus();
      setStatus({
        ...nextStatus,
        openAiConfigured: nextStatus.openAiConfigured || Boolean(openAiApiKey.trim()),
      });
    } catch (error) {
      const message = String(error);
      setStatusError(message);
      onLog(`Claw Code status failed: ${message}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, openAiApiKey, setBusyAction, tauriRuntime]);

  const installClawCode = useCallback(async (workspaceRoot: string | null = null) => {
    if (!tauriRuntime) {
      return;
    }

    setBusyAction("install-claw-code");
    try {
      const result = await installClawCodeRuntime(workspaceRoot);
      onLog(result.message);
      await refreshStatus();
    } catch (error) {
      onLog(`Claw Code install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, refreshStatus, setBusyAction, tauriRuntime]);

  const chooseWorkspaceRoot = useCallback(async () => {
    if (!tauriRuntime) {
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
  }, [onLog, tauriRuntime]);

  const setWorkspaceRoot = useCallback(async (workspaceRoot: string) => {
    if (!tauriRuntime) {
      return;
    }

    setBusyAction("claw-workspace");
    try {
      const result = await updateClawCodeWorkspace(workspaceRoot);
      onLog(`Claw Code workspace set to ${result.workspaceRoot}`);
      await refreshStatus();
    } catch (error) {
      onLog(`Claw Code workspace update failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, refreshStatus, setBusyAction, tauriRuntime]);

  useEffect(() => {
    if (tauriRuntime) {
      void refreshStatus();
    }
  }, [refreshStatus, tauriRuntime]);

  return {
    clawCodeStatus: status,
    clawCodeStatusError: statusError,
    chooseClawCodeWorkspace: chooseWorkspaceRoot,
    installClawCode,
    refreshClawCodeStatus: refreshStatus,
    setClawCodeWorkspace: setWorkspaceRoot,
  };
}
