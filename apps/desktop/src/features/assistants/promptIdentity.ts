import type { LocalAssistantProfile, PromptSettings } from "../../types";

type PromptIdentitySettings = Pick<PromptSettings, "assistantName" | "character">;

export function resolvePromptAssistantName(promptSettings: PromptIdentitySettings) {
  const configuredName = typeof promptSettings.assistantName === "string" ? promptSettings.assistantName.trim() : "";
  if (configuredName) {
    return configuredName;
  }

  const character = promptSettings.character;
  if (character.enabled && character.displayName.trim()) {
    return character.displayName.trim();
  }

  return "MiVA";
}

export function buildPromptAssistantIdentityLine(promptSettings: PromptIdentitySettings) {
  return [
    `Your name is ${resolvePromptAssistantName(promptSettings)}.`,
    "You are the user's personal AI assistant.",
  ].join("\n");
}

export function applyPromptAssistantNameReferences(value: string | undefined, promptSettings: PromptIdentitySettings) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  const assistantName = resolvePromptAssistantName(promptSettings);
  return trimmed.replace(/\bnamed\s+(?:MiVA|MIVA)(?=,|\.|\s|$)/i, () => `named ${assistantName}`);
}

export function applyPromptAssistantName(systemPrompt: string | undefined, promptSettings: PromptIdentitySettings) {
  const trimmed = systemPrompt?.trim();
  if (!trimmed) {
    return "";
  }

  const assistantName = resolvePromptAssistantName(promptSettings);
  const promptWithoutNameLine = trimmed.replace(/^\s*Your name is[^\n]*(?:\n+|$)/i, "");
  const rolePrompt = promptWithoutNameLine
    .replace(/(^|\n)(\s*)You are\s+(?:MiVA|MIVA),\s*/i, "$1$2You are ")
    .replace(/(^|\n)(\s*)You are\s+(?:MiVA|MIVA)\.(?=\s|$)/i, "$1$2You are the user's personal AI assistant.")
    .replace(/\bnamed\s+(?:MiVA|MIVA)(?=,|\.|\s|$)/i, () => `named ${assistantName}`);

  return [
    `Your name is ${assistantName}.`,
    rolePrompt,
  ].filter(Boolean).join("\n").trim();
}

export function applyPromptIdentityToProfile(profile: LocalAssistantProfile): LocalAssistantProfile {
  const settings = profile.prompt.settings;
  const systemPrompt = applyPromptAssistantName(profile.prompt.systemPrompt, settings);
  const generatedFinalSystemPrompt = settings.generatedFinalSystemPrompt?.trim()
    ? applyPromptAssistantName(settings.generatedFinalSystemPrompt, settings)
    : settings.generatedFinalSystemPrompt;

  if (
    systemPrompt === profile.prompt.systemPrompt.trim()
    && generatedFinalSystemPrompt === settings.generatedFinalSystemPrompt
  ) {
    return profile;
  }

  return {
    ...profile,
    prompt: {
      ...profile.prompt,
      systemPrompt,
      settings: {
        ...settings,
        generatedFinalSystemPrompt,
      },
    },
  };
}
