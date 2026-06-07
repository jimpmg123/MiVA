import type { Locale } from "../../i18n";
import type {
  AnswerStyle,
  CloudAssistantProfile,
  FutureFeature,
  LanguageUse,
  LocalAssistantProfile,
  LocalAssistantProfileStore,
  LocalMode,
  Priority,
  ProviderId,
  SurveyState,
  UseCase,
} from "../../types";
import { cloudModelCatalog, modelCatalog, providerMeta } from "../models/catalog";
import { buildSystemPromptPreview } from "./promptPreview";
import { normalizeProfileCapabilities, normalizePromptSettings } from "./profile";
import { normalizeAssistantProfileName } from "./profileIdentity";
import { LOCAL_PROFILE_SCHEMA_VERSION } from "./storage";

const useCases: UseCase[] = ["daily", "study", "work", "fast", "character"];
const answerStyles: AnswerStyle[] = ["short", "moderate", "detailed"];
const priorities: Priority[] = ["balanced", "speed", "quality"];
const languageUses: LanguageUse[] = ["korean", "english", "both"];
const localModes: LocalMode[] = ["localOnly", "cloudOnly", "hybrid"];
const providers: ProviderId[] = ["ollama", "openai", "gemini", "groq"];
const futureFeatures: FutureFeature[] = ["voice", "character", "googleWorkspace", "files", "tools", "unsure"];

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? value as T : fallback;
}

function optionalEnumValue<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && values.includes(value as T) ? value as T : null;
}

function validDate(value: unknown, fallback: string) {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    return fallback;
  }

  return value;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function mergeObjects(base: unknown, override: unknown): Record<string, unknown> {
  const result = { ...objectValue(base) };
  for (const [key, value] of Object.entries(objectValue(override))) {
    const currentValue = result[key];
    if (
      value
      && typeof value === "object"
      && !Array.isArray(value)
      && currentValue
      && typeof currentValue === "object"
      && !Array.isArray(currentValue)
    ) {
      result[key] = mergeObjects(currentValue, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeFutureFeatures(value: unknown): FutureFeature[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter(
    (item): item is FutureFeature => typeof item === "string" && futureFeatures.includes(item as FutureFeature),
  )));
}

function getUniqueImportedName(
  requestedName: string,
  cloudProfileId: string,
  localProfiles: LocalAssistantProfile[],
) {
  const linkedProfile = localProfiles.find((profile) => (
    profile.sync.cloudProfileId === cloudProfileId || profile.id === cloudProfileId
  ));
  const existingNames = new Set(
    localProfiles
      .filter((profile) => profile.id !== linkedProfile?.id)
      .map((profile) => normalizeAssistantProfileName(profile.name)),
  );
  if (!existingNames.has(normalizeAssistantProfileName(requestedName))) {
    return requestedName;
  }

  let suffix = 1;
  let candidate = `${requestedName} (Web)`;
  while (existingNames.has(normalizeAssistantProfileName(candidate))) {
    suffix += 1;
    candidate = `${requestedName} (Web ${suffix})`;
  }
  return candidate;
}

function getCloudProfileFingerprint(profile: LocalAssistantProfile) {
  return JSON.stringify({
    name: profile.name,
    description: profile.description,
    useCase: profile.useCase,
    answerStyle: profile.answerStyle,
    priority: profile.priority,
    languageUse: profile.languageUse,
    localMode: profile.localMode,
    futureFeatures: profile.futureFeatures,
    provider: profile.provider,
    model: profile.model,
    prompt: profile.prompt,
    capabilities: profile.capabilities,
  });
}

export function buildLocalAssistantProfileFromCloud(input: {
  cloudProfile: CloudAssistantProfile;
  existingProfile?: LocalAssistantProfile;
  localProfiles: LocalAssistantProfile[];
  locale: Locale;
  syncedAt: string;
}): LocalAssistantProfile {
  const { cloudProfile, existingProfile, localProfiles, locale, syncedAt } = input;
  const localProfileId = existingProfile?.id ?? cloudProfile.id;
  const provider = enumValue(cloudProfile.provider, providers, "ollama");
  const model = stringValue(cloudProfile.model, provider === "ollama" ? "qwen3:4b" : "gemini-2.5-flash");
  const useCase = optionalEnumValue(cloudProfile.useCase, useCases);
  const answerStyle = optionalEnumValue(cloudProfile.answerStyle, answerStyles);
  const priority = optionalEnumValue(cloudProfile.priority, priorities);
  const languageUse = optionalEnumValue(cloudProfile.languageUse, languageUses);
  const localMode = optionalEnumValue(cloudProfile.localMode, localModes);
  const normalizedFutureFeatures = normalizeFutureFeatures(cloudProfile.futureFeatures);
  const prompt = objectValue(cloudProfile.prompt);
  const mergedPromptSettings = mergeObjects(existingProfile?.prompt.settings, prompt.settings);
  const promptSettings = normalizePromptSettings(mergedPromptSettings);
  const rawCapabilities = mergeObjects(existingProfile?.capabilities, cloudProfile.capabilities);
  const rawMemory = objectValue(rawCapabilities.memory);
  const memorySyncMode = rawMemory.syncMode === "summaryMemory" ? "summaryMemory" : "profileOnly";
  const survey: SurveyState = {
    useCase,
    answerStyle,
    priority,
    languageUse,
    localMode,
    futureFeatures: normalizedFutureFeatures,
    memorySyncMode,
  };
  const profileBase = {
    useCase,
    answerStyle,
    priority,
    languageUse,
    localMode,
    futureFeatures: normalizedFutureFeatures,
    provider,
    model,
  };
  const selectedLocalModel = provider === "ollama"
    ? model
    : existingProfile?.recommendation.selectedModel ?? "qwen3:4b";
  const selectedCloudModel = provider === "ollama"
    ? existingProfile?.recommendation.selectedCloudModel ?? "gemini-2.5-flash"
    : model;
  const modelLabel = provider === "ollama"
    ? modelCatalog.find((item) => item.name === model)?.label ?? model
    : cloudModelCatalog.find((item) => item.id === model)?.label ?? model;
  const requestedName = stringValue(cloudProfile.name, "MiVA Assistant");
  const importedName = getUniqueImportedName(requestedName, cloudProfile.id, localProfiles);
  const systemPrompt = typeof prompt.systemPrompt === "string" && prompt.systemPrompt.trim()
    ? prompt.systemPrompt
    : buildSystemPromptPreview(profileBase, promptSettings);
  const promptOverrides = objectValue(prompt.overrides);

  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    id: localProfileId,
    name: importedName,
    description: stringValue(cloudProfile.description, "Assistant profile imported from MiVA Web."),
    source: "web-sync",
    createdAt: existingProfile?.createdAt ?? validDate(cloudProfile.createdAt, syncedAt),
    updatedAt: validDate(cloudProfile.updatedAt, syncedAt),
    locale: existingProfile?.locale ?? locale,
    ...profileBase,
    providerMode: providerMeta[provider].mode,
    modelLabel,
    survey,
    recommendation: {
      localModel: existingProfile?.recommendation.localModel ?? selectedLocalModel,
      cloudModel: existingProfile?.recommendation.cloudModel ?? selectedCloudModel,
      selectedProvider: provider,
      selectedModel: selectedLocalModel,
      selectedCloudModel,
      hardwareMemoryGb: existingProfile?.recommendation.hardwareMemoryGb ?? null,
    },
    prompt: {
      profileId: localProfileId,
      systemPrompt,
      settings: promptSettings,
      variables: objectValue(prompt.variables),
      overrides: {
        persona: typeof promptOverrides.persona === "string" ? promptOverrides.persona : null,
        instructions: Array.isArray(promptOverrides.instructions)
          ? promptOverrides.instructions.filter((item): item is string => typeof item === "string")
          : [],
        guardrails: Array.isArray(promptOverrides.guardrails)
          ? promptOverrides.guardrails.filter((item): item is string => typeof item === "string")
          : [],
      },
    },
    capabilities: normalizeProfileCapabilities(
      rawCapabilities as Partial<LocalAssistantProfile["capabilities"]>,
      promptSettings,
      memorySyncMode,
    ),
    sync: {
      cloudEnabled: true,
      cloudProfileId: cloudProfile.id,
      lastSyncedAt: syncedAt,
    },
    metadata: existingProfile?.metadata ?? {
      setupStep: "profile",
      appMode: "studio",
      appVersion: "0.1.0",
      hardwareSnapshot: null,
    },
  };
}

export function mergeCloudAssistantProfiles(input: {
  currentStore: LocalAssistantProfileStore;
  cloudProfiles: CloudAssistantProfile[];
  locale: Locale;
  syncedAt: string;
}) {
  const { currentStore, cloudProfiles, locale, syncedAt } = input;
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  const mergedProfiles = [...currentStore.profiles];

  for (const cloudProfile of cloudProfiles) {
    const existingIndex = mergedProfiles.findIndex((profile) => (
      profile.sync.cloudProfileId === cloudProfile.id || profile.id === cloudProfile.id
    ));
    const existingProfile = existingIndex >= 0 ? mergedProfiles[existingIndex] : undefined;
    const importedProfile = buildLocalAssistantProfileFromCloud({
      cloudProfile,
      existingProfile,
      localProfiles: mergedProfiles,
      locale,
      syncedAt,
    });

    if (existingIndex < 0) {
      mergedProfiles.push(importedProfile);
      added += 1;
      continue;
    }

    if (existingProfile && getCloudProfileFingerprint(existingProfile) === getCloudProfileFingerprint(importedProfile)) {
      mergedProfiles[existingIndex] = {
        ...existingProfile,
        sync: importedProfile.sync,
      };
      unchanged += 1;
      continue;
    }

    mergedProfiles[existingIndex] = importedProfile;
    updated += 1;
  }

  const cloudDefault = cloudProfiles.find((profile) => profile.isDefault);
  const importedDefault = cloudDefault
    ? mergedProfiles.find((profile) => profile.sync.cloudProfileId === cloudDefault.id || profile.id === cloudDefault.id)
    : null;
  const currentActiveStillExists = mergedProfiles.some((profile) => profile.id === currentStore.activeProfileId);
  const activeProfileId = currentActiveStillExists
    ? currentStore.activeProfileId
    : importedDefault?.id ?? mergedProfiles[0]?.id ?? null;

  return {
    store: {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId,
      profiles: mergedProfiles,
      updatedAt: syncedAt,
    } satisfies LocalAssistantProfileStore,
    added,
    updated,
    unchanged,
  };
}
