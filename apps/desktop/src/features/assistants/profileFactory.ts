import type { Locale } from "../../i18n";
import { buildSystemPromptPreview } from "./promptPreview";
import { defaultProfileDetails, normalizeProfileCapabilities, normalizePromptSettings } from "./profile";
import { LOCAL_PROFILE_SCHEMA_VERSION } from "./storage";
import type {
  AppMode,
  HardwareInfo,
  LocalAssistantProfile,
  ProfileDetailsDraft,
  PromptSettings,
  ProviderId,
  ProviderMode,
  StepId,
  SurveyState,
} from "../../types";

export function buildLocalAssistantProfile(input: {
  forceNew?: boolean;
  profileId?: string;
  activeLocalProfileId: string;
  appMode: AppMode;
  activeStep: StepId;
  locale: Locale;
  activeProviderMode: ProviderMode;
  activeModelLabel: string;
  assistantProfiles: LocalAssistantProfile[];
  profileDetailsDraft: ProfileDetailsDraft;
  promptSettingsDraft: PromptSettings;
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
  recommendedModel: string;
  recommendedCloudModel: string;
  survey: SurveyState;
  hardware: HardwareInfo | null;
}) {
  const providerModel = input.selectedProvider === "ollama" ? input.selectedModel : input.selectedCloudModel;
  const existing = input.forceNew
    ? undefined
    : input.assistantProfiles.find((profile) => profile.id === input.activeLocalProfileId);
  const profileId = input.profileId ?? existing?.id ?? input.activeLocalProfileId;
  const now = new Date().toISOString();
  const safeSurvey: SurveyState = {
    useCase: input.survey.useCase,
    answerStyle: input.survey.answerStyle,
    priority: input.survey.priority,
    languageUse: input.survey.languageUse,
    localMode: input.survey.localMode,
    futureFeatures: [...input.survey.futureFeatures],
    memorySyncMode: input.survey.memorySyncMode,
  };
  const promptSettings = normalizePromptSettings(input.promptSettingsDraft);
  const profileBase = {
    useCase: safeSurvey.useCase,
    answerStyle: safeSurvey.answerStyle,
    priority: safeSurvey.priority,
    languageUse: safeSurvey.languageUse,
    localMode: safeSurvey.localMode,
    futureFeatures: safeSurvey.futureFeatures,
    provider: input.selectedProvider,
    model: providerModel,
  };

  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    id: profileId,
    name: input.profileDetailsDraft.name.trim() || existing?.name || defaultProfileDetails.name,
    description: input.profileDetailsDraft.description.trim() || existing?.description || defaultProfileDetails.description,
    source: input.appMode === "runtime" ? "runtime" : "desktop-setup",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    locale: input.locale,
    ...profileBase,
    providerMode: input.activeProviderMode,
    modelLabel: input.activeModelLabel,
    survey: safeSurvey,
    recommendation: {
      localModel: input.recommendedModel,
      cloudModel: input.recommendedCloudModel,
      selectedProvider: input.selectedProvider,
      selectedModel: input.selectedModel,
      selectedCloudModel: input.selectedCloudModel,
      hardwareMemoryGb: input.hardware?.totalMemoryGb ?? null,
    },
    prompt: {
      profileId,
      systemPrompt: buildSystemPromptPreview(profileBase, promptSettings),
      settings: promptSettings,
      variables: {
        useCase: safeSurvey.useCase,
        answerStyle: safeSurvey.answerStyle,
        priority: safeSurvey.priority,
        languageUse: safeSurvey.languageUse,
        localMode: safeSurvey.localMode,
        futureFeatures: safeSurvey.futureFeatures,
        provider: input.selectedProvider,
        model: providerModel,
      },
      overrides: existing?.prompt?.overrides ?? {
        persona: null,
        instructions: [],
        guardrails: [],
      },
    },
    capabilities: normalizeProfileCapabilities(existing?.capabilities, promptSettings, safeSurvey.memorySyncMode),
    sync: existing?.sync ?? {
      cloudEnabled: false,
      cloudProfileId: null,
      lastSyncedAt: null,
    },
    metadata: {
      setupStep: input.activeStep,
      appMode: input.appMode,
      appVersion: "0.1.0",
      hardwareSnapshot: input.hardware,
    },
  } satisfies LocalAssistantProfile;
}
