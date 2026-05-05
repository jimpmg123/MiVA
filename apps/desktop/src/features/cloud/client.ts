import { buildCloudAssistantProfilePayload } from "../assistants/cloudPayload";
import { loadOrCreateDeviceId } from "../auth/storage";
import { providerMeta } from "../models/catalog";
import type {
  AuthSession,
  CloudDeviceRecord,
  DeviceAuthStart,
  DeviceAuthStatus,
  HardwareInfo,
  LocalAssistantProfile,
  OllamaStatus,
  ProviderId,
} from "../../types";

export const CLOUD_API_URL = "http://127.0.0.1:4000";

export async function fetchCloudJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CLOUD_API_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

export function getCloudHeaders(authSession: AuthSession | null, extraHeaders?: Record<string, string>) {
  return {
    ...(extraHeaders ?? {}),
    ...(authSession ? { authorization: `Bearer ${authSession.token}` } : {}),
  };
}

export function startDeviceAuth() {
  return fetchCloudJson<DeviceAuthStart>("/auth/device/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app: "miva-desktop" }),
  });
}

export function getDeviceAuthStatus(deviceCode: string) {
  return fetchCloudJson<DeviceAuthStatus>(`/auth/device/${encodeURIComponent(deviceCode)}`);
}

export async function registerDesktopDevice(input: {
  authSession: AuthSession | null;
  hardware: HardwareInfo | null;
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
  status: OllamaStatus | null;
}) {
  const deviceId = loadOrCreateDeviceId();
  const deviceName = input.hardware?.osName
    ? `MiVA Desktop - ${input.hardware.osName}`
    : "MiVA Desktop";
  const response = await fetchCloudJson<{ device: CloudDeviceRecord }>("/devices", {
    method: "POST",
    headers: getCloudHeaders(input.authSession, { "content-type": "application/json" }),
    body: JSON.stringify({
      id: deviceId,
      name: deviceName,
      os: input.hardware?.osName ?? navigator.platform ?? null,
      appVersion: "0.1.0",
      status: "connected",
      modelRuntime: {
        provider: input.selectedProvider,
        model: input.selectedProvider === "ollama" ? input.selectedModel : input.selectedCloudModel,
        ollamaRunning: Boolean(input.status?.running),
      },
    }),
  });
  return response.device;
}

export function recordLocalUsageEvent(input: {
  authSession: AuthSession | null;
  cloudDeviceId: string | null;
  assistantProfileId: string | null;
  provider: ProviderId;
  model: string;
  inputChars: number;
  outputChars: number;
  durationMs: number;
  success: boolean;
}) {
  return fetchCloudJson<{ ok: boolean; accepted: number }>("/usage/local-events", {
    method: "POST",
    headers: getCloudHeaders(input.authSession, { "content-type": "application/json" }),
    body: JSON.stringify({
      events: [{
        deviceId: input.cloudDeviceId ?? loadOrCreateDeviceId(),
        assistantProfileId: input.assistantProfileId,
        mode: providerMeta[input.provider].mode,
        provider: input.provider,
        model: input.model,
        inputChars: input.inputChars,
        outputChars: input.outputChars,
        durationMs: input.durationMs,
        success: input.success,
      }],
    }),
  });
}

export async function upsertCloudAssistantProfile(input: {
  authSession: AuthSession | null;
  profile: LocalAssistantProfile;
}) {
  const cloudProfileId = input.profile.sync.cloudProfileId;
  const payload = buildCloudAssistantProfilePayload(input.profile);
  const request = async (method: "POST" | "PATCH", url: string) => {
    const response = await fetch(url, {
      method,
      headers: getCloudHeaders(input.authSession, { "content-type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }

    return response.json() as Promise<{ profile?: { id?: string } }>;
  };

  if (!cloudProfileId) {
    return request("POST", `${CLOUD_API_URL}/assistant-profiles`);
  }

  try {
    return await request("PATCH", `${CLOUD_API_URL}/assistant-profiles/${encodeURIComponent(cloudProfileId)}`);
  } catch (error) {
    if (String(error).includes("404")) {
      return request("POST", `${CLOUD_API_URL}/assistant-profiles`);
    }

    throw error;
  }
}
