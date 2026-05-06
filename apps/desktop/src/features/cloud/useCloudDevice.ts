import { useEffect, useState } from "react";
import type { AuthSession, CloudDeviceRecord, HardwareInfo, OllamaStatus, ProviderId } from "../../types";
import { recordLocalUsageEvent, registerDesktopDevice } from "./client";

type RuntimeUsageEventInput = {
  assistantProfileId: string | null;
  provider: ProviderId;
  model: string;
  inputChars: number;
  outputChars: number;
  durationMs: number;
  success: boolean;
};

type UseCloudDeviceOptions = {
  authSession: AuthSession | null;
  hardware: HardwareInfo | null;
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
  status: OllamaStatus | null;
  onLog: (message: string) => void;
};

export function useCloudDevice({
  authSession,
  hardware,
  selectedProvider,
  selectedModel,
  selectedCloudModel,
  status,
  onLog,
}: UseCloudDeviceOptions) {
  const [cloudDevice, setCloudDevice] = useState<CloudDeviceRecord | null>(null);

  async function registerDeviceWithCloud() {
    const device = await registerDesktopDevice({
      authSession,
      hardware,
      selectedProvider,
      selectedModel,
      selectedCloudModel,
      status,
    });
    setCloudDevice(device);
    return device;
  }

  async function recordRuntimeUsageEvent(event: RuntimeUsageEventInput) {
    await recordLocalUsageEvent({
      authSession,
      cloudDeviceId: cloudDevice?.id ?? null,
      ...event,
    });
  }

  useEffect(() => {
    if (!authSession) {
      setCloudDevice(null);
      return;
    }

    void registerDeviceWithCloud().catch((error) => {
      onLog(`Device registration failed: ${String(error)}`);
    });
  }, [authSession, hardware?.osName, selectedProvider, selectedModel, selectedCloudModel, status?.running]);

  return {
    cloudDevice,
    recordRuntimeUsageEvent,
    registerDeviceWithCloud,
    setCloudDevice,
  };
}
