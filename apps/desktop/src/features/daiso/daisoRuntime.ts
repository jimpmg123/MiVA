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

export type DaisoStatus = {
  installed: boolean;
  available: boolean;
  command: string;
  status: string;
  endpoint: string;
  checkedAt: string;
  error: string | null;
};

export type DaisoRunResult = {
  ok: boolean;
  needsUserInput: boolean;
  featureGuide?: boolean;
  directReply?: string;
  command?: string;
  commandLine?: string;
  context?: string;
  data?: unknown;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  message: string;
};

export function getDaisoStatus() {
  return readJson<DaisoStatus>("/daiso/status");
}

export function runDaisoRequest(prompt: string) {
  return readJson<DaisoRunResult>("/daiso/run", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
