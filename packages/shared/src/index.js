export const MIVA_HELPER_PORT = 43110;
export const MIVA_DESKTOP_BRIDGE_PORT = 43111;
export const MIVA_WEB_PORT = 5173;
export const MIVA_API_PORT = 4000;

export const lightweightModels = [
  {
    id: "llama3.2-3b",
    ollamaName: "llama3.2:3b",
    label: "Llama 3.2 3B",
    category: "low-spec",
    summary: "Small fallback model for low-spec PCs.",
    recommendedRamGb: 8
  },
  {
    id: "qwen3-4b",
    ollamaName: "qwen3:4b",
    label: "Qwen3 4B",
    category: "korean-recommended",
    summary: "Default lightweight Korean/general assistant candidate.",
    recommendedRamGb: 12
  },
  {
    id: "gemma3-4b",
    ollamaName: "gemma3:4b",
    label: "Gemma 3 4B",
    category: "lightweight",
    summary: "Lightweight general assistant candidate.",
    recommendedRamGb: 12
  },
  {
    id: "phi3-mini",
    ollamaName: "phi3:mini",
    label: "Phi-3 Mini",
    category: "ultralight",
    summary: "Very small fallback model for quick tests.",
    recommendedRamGb: 8
  }
];

export function isAllowedOllamaModel(modelName) {
  return lightweightModels.some((model) => model.ollamaName === modelName);
}
