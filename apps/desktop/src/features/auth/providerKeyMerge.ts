import type { ProviderKeyState } from "../../types";

export const emptyCloudProviderKeys: ProviderKeyState = {
  openai: "",
  gemini: "",
  groq: "",
  huggingface: "",
};

export function mergeProviderKeys(
  localKeys: ProviderKeyState,
  cloudKeys: ProviderKeyState,
): ProviderKeyState {
  return {
    openai: localKeys.openai.trim() || cloudKeys.openai.trim(),
    gemini: localKeys.gemini.trim() || cloudKeys.gemini.trim(),
    groq: localKeys.groq.trim() || cloudKeys.groq.trim(),
    huggingface: localKeys.huggingface.trim() || cloudKeys.huggingface.trim(),
  };
}

export function getProviderKeySource(
  provider: keyof ProviderKeyState,
  localKeys: ProviderKeyState,
  cloudKeys: ProviderKeyState,
): "local" | "cloud" | "demo" {
  if (localKeys[provider].trim()) {
    return "local";
  }

  if (cloudKeys[provider].trim()) {
    return "cloud";
  }

  return "demo";
}
