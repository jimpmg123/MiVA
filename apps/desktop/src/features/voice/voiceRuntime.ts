import type { VoiceWorkerStatus } from "../../types";

const LOCAL_HELPER_BASE_URL = "http://127.0.0.1:43110";

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${LOCAL_HELPER_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }

  return data as T;
}

export function getVoiceWorkerStatus() {
  return readJson<VoiceWorkerStatus>("/voice/status");
}

export async function startVoiceWorker() {
  const result = await readJson<{ status: VoiceWorkerStatus }>("/voice/start", {
    method: "POST",
    body: "{}",
  });
  return result.status;
}
