import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { HardwareInfo, ModelDownloadDockMode, ModelDownloadProgress, OllamaStatus, ProviderId, RuntimeRequirements } from "../../types";
import {
  cancelOllamaModelPull,
  getDefaultPythonInstallDir,
  getHardwareInfo,
  getOllamaStatus,
  getRuntimeRequirements,
  installOllamaRuntime,
  installPythonRuntime,
  pauseOllamaModelPull,
  pullOllamaModel,
  startOllamaRuntime,
} from "./ollamaRuntime";

type UseOllamaRuntimeOptions = {
  tauriRuntime: boolean;
  selectedProvider: ProviderId;
  preparingDownloadLabel: string;
  downloadFailedLabel: string;
  onLog: (message: string) => void;
  setBusyAction: Dispatch<SetStateAction<string | null>>;
  onModelDownloaded: (model: string) => void;
};

export function useOllamaRuntime({
  tauriRuntime,
  selectedProvider,
  preparingDownloadLabel,
  downloadFailedLabel,
  onLog,
  setBusyAction,
  onModelDownloaded,
}: UseOllamaRuntimeOptions) {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [runtimeRequirements, setRuntimeRequirements] = useState<RuntimeRequirements | null>(null);
  const [runtimeRequirementsError, setRuntimeRequirementsError] = useState<string | null>(null);
  const [pythonInstallPath, setPythonInstallPath] = useState("");
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [downloadDockMode, setDownloadDockMode] = useState<ModelDownloadDockMode>("modal");
  const autoStartOllamaAttemptedRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    setBusyAction("refreshStatus");
    try {
      const nextStatus = await getOllamaStatus();
      setStatus(nextStatus);
    } catch (error) {
      onLog(`Status failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, setBusyAction]);

  const refreshHardware = useCallback(async () => {
    setBusyAction("hardware");
    setHardwareError(null);
    try {
      const nextHardware = await getHardwareInfo();
      setHardware(nextHardware);
    } catch (error) {
      setHardwareError(String(error));
      onLog(`Hardware check failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, setBusyAction]);

  const refreshRuntimeRequirements = useCallback(async () => {
    setRuntimeRequirementsError(null);
    try {
      const nextRequirements = await getRuntimeRequirements();
      setRuntimeRequirements(nextRequirements);
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      onLog(`Runtime requirement check failed: ${String(error)}`);
    }
  }, [onLog]);

  const refreshDefaultPythonInstallPath = useCallback(async () => {
    try {
      const nextPath = await getDefaultPythonInstallDir();
      setPythonInstallPath((current) => current || nextPath);
    } catch (error) {
      onLog(`Python install path check failed: ${String(error)}`);
    }
  }, [onLog]);

  const choosePythonInstallPath = useCallback(async () => {
    if (!tauriRuntime) {
      return;
    }

    try {
      const selected = await openDialog({
        title: "Choose Python install location",
        directory: true,
        multiple: false,
        defaultPath: pythonInstallPath || undefined,
      });

      if (typeof selected === "string") {
        setPythonInstallPath(selected);
      }
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      onLog(`Python install location selection failed: ${String(error)}`);
    }
  }, [onLog, pythonInstallPath, tauriRuntime]);

  const installPython = useCallback(async () => {
    setBusyAction("install-python");
    setRuntimeRequirementsError(null);
    try {
      const installPath = pythonInstallPath.trim();
      onLog(`Starting Python install through winget at ${installPath || "default location"}.`);
      const output = await installPythonRuntime(installPath || null);
      onLog(output);
      await refreshRuntimeRequirements();
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      onLog(`Python install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, pythonInstallPath, refreshRuntimeRequirements, setBusyAction]);

  const installOllama = useCallback(async () => {
    setBusyAction("install");
    try {
      onLog("Starting Ollama install through winget.");
      const output = await installOllamaRuntime();
      onLog(output);
      await refreshStatus();
    } catch (error) {
      onLog(`Install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, refreshStatus, setBusyAction]);

  const startOllama = useCallback(async () => {
    setBusyAction("start");
    try {
      const output = await startOllamaRuntime();
      onLog(output);
      await refreshStatus();
    } catch (error) {
      onLog(`Start failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }, [onLog, refreshStatus, setBusyAction]);

  const ensureOllamaReadyForChat = useCallback(async (model: string) => {
    if (selectedProvider !== "ollama") {
      return true;
    }

    if (!status?.installed) {
      onLog("Ollama is not installed. Install Ollama before using a local model.");
      return false;
    }

    let nextStatus = status;
    if (!nextStatus.running) {
      onLog("Ollama is not running. Starting Ollama automatically before local chat.");
      const output = await startOllamaRuntime();
      onLog(output);
      nextStatus = await getOllamaStatus();
      setStatus(nextStatus);
    }

    if (!nextStatus.running) {
      onLog("Ollama start was attempted, but the local runtime is still offline.");
      return false;
    }

    if (!nextStatus.installedModels.includes(model)) {
      onLog(`${model} is not installed. Download the model before starting local chat.`);
      return false;
    }

    return true;
  }, [onLog, selectedProvider, status]);

  const downloadModel = useCallback(async (model: string) => {
    setBusyAction(`download:${model}`);
    setDownloadDockMode((current) => (current === "minimal" || current === "compact" ? current : "modal"));
    setDownloadProgress((current) => ({
      model,
      status: current?.model === model && current.paused ? preparingDownloadLabel : preparingDownloadLabel,
      completed: current?.model === model ? current.completed ?? null : null,
      total: current?.model === model ? current.total ?? null : null,
      percent: current?.model === model ? current.percent ?? 0 : 0,
      done: false,
      paused: false,
      error: null,
    }));
    try {
      onLog(`Downloading ${model}.`);
      const output = await pullOllamaModel(model);
      onLog(output);
      if (output.toLowerCase().includes("paused")) {
        setDownloadProgress((current) => ({
          model,
          status: "Download paused",
          completed: current?.completed ?? null,
          total: current?.total ?? null,
          percent: current?.percent ?? null,
          done: false,
          paused: true,
          error: null,
        }));
        return;
      }
      onModelDownloaded(model);
      await refreshStatus();
      setDownloadDockMode("modal");
    } catch (error) {
      const message = String(error);
      if (message.toLowerCase().includes("cancelled")) {
        setDownloadProgress(null);
        setDownloadDockMode("modal");
        onLog(`Download cancelled: ${model}`);
        await refreshStatus();
        return;
      }
      setDownloadProgress((current) => ({
        model,
        status: downloadFailedLabel,
        completed: current?.completed ?? null,
        total: current?.total ?? null,
        percent: current?.percent ?? null,
        done: true,
        paused: false,
        error: message,
      }));
      onLog(`Download failed: ${message}`);
    } finally {
      setBusyAction(null);
    }
  }, [
    downloadFailedLabel,
    onLog,
    onModelDownloaded,
    preparingDownloadLabel,
    refreshStatus,
    setBusyAction,
  ]);

  const pauseModelDownload = useCallback(async (model: string) => {
    try {
      await pauseOllamaModelPull(model);
      setDownloadProgress((current) => (
        current?.model === model
          ? { ...current, paused: true, status: "Download paused" }
          : current
      ));
      setBusyAction(null);
      onLog(`Download paused: ${model}`);
    } catch (error) {
      onLog(`Pause failed: ${String(error)}`);
    }
  }, [onLog, setBusyAction]);

  const resumeModelDownload = useCallback(async (model: string) => {
    await downloadModel(model);
  }, [downloadModel]);

  const cancelModelDownload = useCallback(async (model: string) => {
    try {
      await cancelOllamaModelPull(model);
    } catch (error) {
      onLog(`Cancel request failed: ${String(error)}`);
    } finally {
      setDownloadProgress(null);
      setDownloadDockMode("modal");
      setBusyAction(null);
      await refreshStatus();
      onLog(`Download cancelled: ${model}`);
    }
  }, [onLog, refreshStatus, setBusyAction]);

  useEffect(() => {
    if (tauriRuntime) {
      void (async () => {
        await refreshStatus();
        await refreshHardware();
        await refreshRuntimeRequirements();
        await refreshDefaultPythonInstallPath();
      })();
    }
  }, [refreshDefaultPythonInstallPath, refreshHardware, refreshRuntimeRequirements, refreshStatus, tauriRuntime]);

  useEffect(() => {
    if (!tauriRuntime || !status || autoStartOllamaAttemptedRef.current) {
      return;
    }

    if (!status.installed || status.running) {
      return;
    }

    autoStartOllamaAttemptedRef.current = true;
    void (async () => {
      try {
        onLog("Ollama is installed but offline. Starting automatically on app launch.");
        const output = await startOllamaRuntime();
        onLog(output);
        const nextStatus = await getOllamaStatus();
        setStatus(nextStatus);
      } catch (error) {
        onLog(`Automatic Ollama start failed: ${String(error)}`);
      }
    })();
  }, [onLog, status, tauriRuntime]);

  useEffect(() => {
    if (!tauriRuntime) {
      return;
    }

    let unlisten: (() => void) | undefined;
    void listen<ModelDownloadProgress>("model-download-progress", (event) => {
      setDownloadProgress(event.payload);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      unlisten?.();
    };
  }, [tauriRuntime]);

  return {
    hardware,
    hardwareError,
    runtimeRequirements,
    runtimeRequirementsError,
    pythonInstallPath,
    status,
    downloadProgress,
    downloadDockMode,
    setDownloadDockMode,
    pauseModelDownload,
    resumeModelDownload,
    cancelModelDownload,
    refreshStatus,
    refreshHardware,
    refreshRuntimeRequirements,
    refreshDefaultPythonInstallPath,
    choosePythonInstallPath,
    installPython,
    installOllama,
    startOllama,
    ensureOllamaReadyForChat,
    downloadModel,
    setDownloadProgress,
  };
}
