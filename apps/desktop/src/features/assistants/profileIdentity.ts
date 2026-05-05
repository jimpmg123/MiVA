import type { LocalAssistantProfile, ProfileDetailsDraft, PromptSettings, ProviderId } from "../../types";
import { defaultProfileDetails, defaultPromptSettings, normalizePromptSettings } from "./profile";

export function createLocalProfileId() {
  return `local_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
}

export function normalizeAssistantProfileName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function hasDuplicateAssistantProfileName(profile: LocalAssistantProfile, profiles: LocalAssistantProfile[]) {
  const profileName = normalizeAssistantProfileName(profile.name);
  if (!profileName) {
    return false;
  }

  return profiles.some((item) => (
    item.id !== profile.id && normalizeAssistantProfileName(item.name) === profileName
  ));
}

export function getAssistantProfileFingerprint(profile: LocalAssistantProfile) {
  return JSON.stringify({
    name: profile.name.trim(),
    description: profile.description.trim(),
    provider: profile.provider,
    model: profile.model,
    useCase: profile.useCase,
    answerStyle: profile.answerStyle,
    priority: profile.priority,
    localMode: profile.localMode,
    languageUse: profile.languageUse,
    futureFeatures: profile.futureFeatures,
    memorySyncMode: profile.survey.memorySyncMode,
    promptSettings: normalizePromptSettings(profile.prompt?.settings),
  });
}

export function getNewAssistantDraftBaseline(input: {
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
}) {
  return JSON.stringify({
    profileDetails: defaultProfileDetails,
    promptSettings: defaultPromptSettings,
    selectedProvider: input.selectedProvider,
    selectedModel: input.selectedModel,
    selectedCloudModel: input.selectedCloudModel,
  });
}

export function getCurrentNewAssistantDraftFingerprint(input: {
  profileDetailsDraft: ProfileDetailsDraft;
  promptSettingsDraft: PromptSettings;
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
}) {
  return JSON.stringify({
    profileDetails: {
      name: input.profileDetailsDraft.name.trim() || defaultProfileDetails.name,
      description: input.profileDetailsDraft.description.trim() || defaultProfileDetails.description,
    },
    promptSettings: normalizePromptSettings(input.promptSettingsDraft),
    selectedProvider: input.selectedProvider,
    selectedModel: input.selectedModel,
    selectedCloudModel: input.selectedCloudModel,
  });
}
