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

export function buildImageAnalysisMemoryPrompt(input: {
  currentSummary: string;
  userMessage: string;
  imageNames: string[];
  visionAnswer: string;
}) {
  const imageList = input.imageNames.length
    ? input.imageNames.join(", ")
    : "attached image";

  return [
    "Update this assistant memory for MiVA.",
    "The user attached image(s) and a vision model analyzed them.",
    "Store the important visual facts, visible text, objects, people, layout, and context from the analysis.",
    "The local MiVA assistant must be able to use this information in later conversation without seeing the images again.",
    "If the existing memory is getting long, compact it by merging duplicates and removing temporary details.",
    "Use two short sections: Pinned memory and Working memory.",
    "Output only the updated memory summary. Do not explain the process.",
    input.currentSummary ? `Existing summary:\n${input.currentSummary}` : "Existing summary: none.",
    "User message:",
    input.userMessage.trim() || "Analyze the attached image(s).",
    "Attached images:",
    imageList,
    "Vision analysis result:",
    input.visionAnswer.trim(),
  ].join("\n\n");
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
