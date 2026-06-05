import type { ChatMessage, LocalAssistantProfile, ProviderId } from "../../types";

export const RECENT_CONTEXT_MESSAGE_LIMIT = 8;
export const MEMORY_COMPACTION_FALLBACK_BUDGET = 2000;

export function estimateTokensFromText(value: string) {
  return Math.ceil(value.length / 3);
}

export function estimateChatTokens(messages: Pick<ChatMessage, "content">[]) {
  return messages.reduce((total, message) => total + estimateTokensFromText(message.content), 0);
}

export function hasExplicitMemoryRequest(value: string) {
  const normalized = value.toLowerCase();
  return [
    "remember",
    "keep this in mind",
    "save this",
    "memorize",
    "기억",
    "기억해",
    "기억해줘",
    "저장해",
    "저장해줘",
    "다음에도 참고",
    "앞으로 참고",
  ].some((marker) => normalized.includes(marker));
}

export function cleanSpeechText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_#>]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

export function getRuntimeSummaryModel({
  profile,
  fallbackProvider,
  fallbackModel,
  selectedModel,
  selectedCloudModel,
}: {
  profile: LocalAssistantProfile;
  fallbackProvider: ProviderId;
  fallbackModel: string;
  selectedModel: string;
  selectedCloudModel: string;
}) {
  const settings = profile.prompt?.settings.summaryMemory;
  if (!settings || settings.modelPolicy === "sameModel") {
    return { provider: fallbackProvider, model: fallbackModel };
  }

  if (settings.modelPolicy === "localModel") {
    return { provider: "ollama" as ProviderId, model: settings.model || selectedModel };
  }

  const cloudProvider = settings.provider === "ollama" ? "gemini" : settings.provider;
  return { provider: cloudProvider, model: settings.model || selectedCloudModel };
}
