import { invoke } from "@tauri-apps/api/core";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    isTauri?: boolean;
  }
}

export function isTauriRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  return "__TAURI_INTERNALS__" in window || window.isTauri === true;
}

export function shouldUseLocalHelperBridge() {
  return isTauriRuntime();
}

export async function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error("MiVA Desktop must be opened through Tauri. Run `npm run tauri:dev`, not `npm run dev`.");
  }

  return invoke<T>(command, args);
}
