import type { ClawCodeRuntimeInfo } from "../../types";

const LOCAL_HELPER_URL = "http://127.0.0.1:43110";

async function readJsonResponse<T>(response: Response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as T : {} as T;
  if (!response.ok) {
    const message = (payload as { message?: string; error?: string }).message
      || (payload as { message?: string; error?: string }).error
      || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return payload;
}

export function getClawCodeStatus() {
  return fetch(`${LOCAL_HELPER_URL}/claw-code/status`)
    .then((response) => readJsonResponse<ClawCodeRuntimeInfo>(response));
}

export function installClawCodeRuntime(workspaceRoot: string | null = null) {
  return fetch(`${LOCAL_HELPER_URL}/claw-code/install`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceRoot }),
  }).then((response) => readJsonResponse<{ ok: boolean; message: string }>(response));
}

export function updateClawCodeWorkspace(workspaceRoot: string) {
  return fetch(`${LOCAL_HELPER_URL}/claw-code/workspace`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceRoot }),
  }).then((response) => readJsonResponse<{ ok: boolean; workspaceRoot: string }>(response));
}
