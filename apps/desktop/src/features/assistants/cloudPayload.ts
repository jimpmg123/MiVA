import type { LocalAssistantProfile } from "../../types";

export function buildCloudAssistantProfilePayload(profile: LocalAssistantProfile) {
  return {
    id: profile.sync.cloudProfileId ?? profile.id,
    name: profile.name || "MiVA Assistant",
    description: profile.description || "Local MiVA assistant profile created from setup choices.",
    useCase: profile.useCase ?? "daily",
    answerStyle: profile.answerStyle ?? "moderate",
    priority: profile.priority ?? "balanced",
    languageUse: profile.languageUse ?? "korean",
    localMode: profile.localMode ?? "hybrid",
    provider: profile.provider ?? "ollama",
    model: profile.model || "qwen3:4b",
    futureFeatures: Array.isArray(profile.futureFeatures) ? profile.futureFeatures : [],
    isDefault: true,
    status: profile.status,
    source: "desktop-setup",
    completedAt: profile.completedAt,
    prompt: profile.prompt,
    capabilities: profile.capabilities,
  };
}
