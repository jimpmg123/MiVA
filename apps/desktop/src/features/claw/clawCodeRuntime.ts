import { invokeCommand, shouldUseLocalHelperBridge } from "../../app/tauri";
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

function formatInvokeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function fetchClawCodeStatus() {
  return fetch(`${LOCAL_HELPER_URL}/claw-code/status`)
    .then((response) => readJsonResponse<ClawCodeRuntimeInfo>(response));
}

export async function getClawCodeStatus() {
  if (shouldUseLocalHelperBridge()) {
    try {
      return await invokeCommand<ClawCodeRuntimeInfo>("get_claw_code_status");
    } catch (error) {
      throw new Error(formatInvokeError(error));
    }
  }

  return fetchClawCodeStatus();
}

export async function installClawCodeRuntime(workspaceRoot: string | null = null) {
  if (shouldUseLocalHelperBridge()) {
    try {
      return await invokeCommand<{ ok: boolean; message: string }>("install_claw_code", {
        workspaceRoot,
      });
    } catch (error) {
      throw new Error(formatInvokeError(error));
    }
  }

  return fetch(`${LOCAL_HELPER_URL}/claw-code/install`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceRoot }),
  }).then((response) => readJsonResponse<{ ok: boolean; message: string }>(response));
}

export async function updateClawCodeWorkspace(workspaceRoot: string) {
  if (shouldUseLocalHelperBridge()) {
    try {
      return await invokeCommand<{ ok: boolean; workspaceRoot: string }>("set_claw_code_workspace", {
        workspaceRoot,
      });
    } catch (error) {
      throw new Error(formatInvokeError(error));
    }
  }

  return fetch(`${LOCAL_HELPER_URL}/claw-code/workspace`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceRoot }),
  }).then((response) => readJsonResponse<{ ok: boolean; workspaceRoot: string }>(response));
}
