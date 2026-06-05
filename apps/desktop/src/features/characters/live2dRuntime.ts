import { invokeCommand } from "../../app/tauri";

const BUNDLED_CUBISM_CORE_URL = "/live2d/live2dcubismcore.min.js";
const BUNDLED_MODEL_BASE_URL = "/live2d-models";

export type Live2DRuntimeStatus = {
  installDir: string;
  modelBaseDir: string;
  coreScriptPath: string | null;
  installedModels: string[];
  totalSizeMb: number;
  ready: boolean;
};

export async function getLive2DRuntimeStatus() {
  return invokeCommand<Live2DRuntimeStatus>("get_live2d_runtime_status");
}

export async function installLive2DRuntime() {
  return invokeCommand<Live2DRuntimeStatus>("install_live2d_runtime");
}

export function resolveInstalledLive2DModelUrl(status: Live2DRuntimeStatus | null, live2dModelPath: string) {
  if (!status?.ready || !live2dModelPath) {
    return null;
  }

  const normalizedPath = live2dModelPath.replace(/\\/g, "/");
  const marker = "live2d-models/";
  const markerIndex = normalizedPath.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const relativePath = normalizedPath.slice(markerIndex + marker.length);
  return `${BUNDLED_MODEL_BASE_URL}/${relativePath}`;
}

export function resolveInstalledLive2DCoreUrl(status: Live2DRuntimeStatus | null) {
  if (!status?.coreScriptPath) {
    return null;
  }

  return BUNDLED_CUBISM_CORE_URL;
}
