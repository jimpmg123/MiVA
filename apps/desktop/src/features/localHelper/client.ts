import { invokeCommand, shouldUseLocalHelperBridge } from "../../app/tauri";

const LOCAL_HELPER_BASE_URL = "http://127.0.0.1:43110";

function formatInvokeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function parseRequestBody(body?: BodyInit | null) {
  if (typeof body !== "string" || !body.trim() || body.trim() === "{}") {
    return null;
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function requestLocalHelper<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();

  if (shouldUseLocalHelperBridge()) {
    try {
      const result = await invokeCommand<unknown>("request_local_helper", {
        method,
        path,
        body: parseRequestBody(init?.body ?? null),
      });
      return result as T;
    } catch (error) {
      throw new Error(formatInvokeError(error));
    }
  }

  const response = await fetch(`${LOCAL_HELPER_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || data?.hint || `HTTP ${response.status}`);
  }

  return data as T;
}
