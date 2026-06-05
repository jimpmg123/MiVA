export const MIVA_HELPER_PORT: number;
export const MIVA_DESKTOP_BRIDGE_PORT: number;
export const MIVA_WEB_PORT: number;
export const MIVA_API_PORT: number;

export type LightweightModel = {
  id: string;
  ollamaName: string;
  label: string;
  category: string;
  summary: string;
  recommendedRamGb: number;
};

export const lightweightModels: LightweightModel[];
export function isAllowedOllamaModel(modelName: string): boolean;

export * from "./extensions.js";
