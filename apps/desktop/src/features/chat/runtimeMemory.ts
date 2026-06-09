import type { ChatMessage, LocalAssistantProfile, ProviderId, RuntimeMemorySummary, UserProfile } from "../../types";

export const RECENT_CONTEXT_MESSAGE_LIMIT = 8;
export const MEMORY_COMPACTION_FALLBACK_BUDGET = 2000;
export const OPENAI_COMPACTION_MODEL = "gpt-4o-mini";

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
    "\uae30\uc5b5",
    "\uae30\uc5b5\ud574",
    "\uae30\uc5b5\ud574\uc918",
    "\uc800\uc7a5",
    "\uc800\uc7a5\ud574\uc918",
    "\uba54\ubaa8",
    "\uc78a\uc9c0 \ub9c8",
    "\ub2e4\uc74c\uc5d0\ub3c4 \ucc38\uace0",
    "\uc55e\uc73c\ub85c \ucc38\uace0",
  ].some((marker) => normalized.includes(marker));
}

export function getPinnedRuntimeMemory(summary: RuntimeMemorySummary | null | undefined) {
  return summary?.pinnedMemory?.trim() || summary?.content?.trim() || "";
}

export function getCompactedSessionMemory(summary: RuntimeMemorySummary | null | undefined) {
  return summary?.sessionSummary?.trim() || "";
}

export function buildRuntimeMemoryContent(input: {
  profileMemory?: string | null;
  pinnedMemory?: string | null;
  sessionSummary?: string | null;
}) {
  return [
    input.profileMemory?.trim()
      ? `Profile memory from user setup and assistant settings:\n${input.profileMemory.trim()}`
      : "",
    input.pinnedMemory?.trim()
      ? `Pinned long-term memory:\n${input.pinnedMemory.trim()}`
      : "",
    input.sessionSummary?.trim()
      ? `Compacted current conversation context:\n${input.sessionSummary.trim()}`
      : "",
  ].filter(Boolean).join("\n\n");
}

function formatOptionalLine(label: string, value: unknown) {
  return typeof value === "string" && value.trim() ? `${label}: ${value.trim()}` : null;
}

export function buildProfileMemory(profile: LocalAssistantProfile, userProfile?: UserProfile | null) {
  const settings = profile.prompt.settings;
  const personalization = profile.personalization;
  const lines = [
    formatOptionalLine("User profile summary", userProfile?.profileSummary),
    formatOptionalLine("User age group", userProfile?.ageGroup),
    formatOptionalLine("User current status", userProfile?.currentStatus),
    formatOptionalLine("User education level", userProfile?.educationLevel),
    formatOptionalLine("User major or field", userProfile?.majorOrField),
    formatOptionalLine("User job-seeking field", userProfile?.jobSeekingField),
    formatOptionalLine("User industry or role", userProfile?.industryOrRole),
    formatOptionalLine("User teaching audience", userProfile?.teachingAudience),
    formatOptionalLine("User household context", userProfile?.householdContext),
    formatOptionalLine("User expertise level", userProfile?.expertiseLevel),
    formatOptionalLine("User preferred language", userProfile?.preferredLanguage),
    formatOptionalLine("Additional user background", userProfile?.additionalBackground),
    formatOptionalLine("Assistant profile name", profile.name),
    formatOptionalLine("Assistant profile description", profile.description),
    formatOptionalLine("Initial user need", profile.useCase),
    formatOptionalLine("Preferred answer style", profile.answerStyle),
    formatOptionalLine("Language preference", profile.languageUse),
    formatOptionalLine("Operation preference", profile.localMode),
    formatOptionalLine("Assistant purpose", settings.simple.assistantPurpose),
    formatOptionalLine("User-requested tasks", settings.simple.desiredTasks),
    formatOptionalLine("Preferred tone", settings.simple.preferredTone),
    formatOptionalLine("Avoidances", settings.simple.avoidances),
    formatOptionalLine("User address style", settings.character.userAddress),
    formatOptionalLine("Assistant persona", settings.persona),
    formatOptionalLine("Assistant role goal", settings.roleGoal),
    settings.character.enabled ? formatOptionalLine("Character display name", settings.character.displayName) : null,
    settings.character.enabled ? formatOptionalLine("Character personality", settings.character.personality) : null,
    settings.character.enabled && settings.character.personalityTraits.length
      ? `Character personality traits: ${settings.character.personalityTraits.join(", ")}`
      : null,
    settings.character.enabled ? formatOptionalLine("Character speaking style", settings.character.speakingStyle) : null,
    personalization ? formatOptionalLine("Global answer style", personalization.baseStyle) : null,
    personalization ? formatOptionalLine("Global warmth", personalization.warmth) : null,
    personalization ? formatOptionalLine("Global enthusiasm", personalization.enthusiasm) : null,
    personalization ? formatOptionalLine("Global headings and lists preference", personalization.headingsAndLists) : null,
    personalization ? formatOptionalLine("Global emoji preference", personalization.emojiUse) : null,
    personalization ? formatOptionalLine("Global custom instructions", personalization.customInstructions) : null,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
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
    "Update this assistant's pinned long-term memory for MiVA.",
    "The user attached image(s) and a vision model analyzed them.",
    "Store only visual facts, visible text, objects, people, layout, and context that are likely useful in later conversations.",
    "If a detail is temporary or not likely useful later, omit it.",
    "If the existing memory is getting long, compact it by merging duplicates and removing temporary details.",
    "Use short bullets grouped under stable headings when helpful.",
    "Output only the updated pinned memory. Do not explain the process.",
    input.currentSummary ? `Existing pinned memory:\n${input.currentSummary}` : "Existing pinned memory: none.",
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
