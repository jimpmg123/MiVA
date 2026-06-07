import type { Locale } from "../../i18n";
import { providerMeta } from "../models/catalog";
import { defaultProfileDetails, normalizeProfileCapabilities, normalizePromptSettings } from "./profile";
import { LOCAL_PROFILE_SCHEMA_VERSION } from "./storage";
import type {
  AnswerStyle,
  FutureFeature,
  LanguageUse,
  LocalAssistantProfile,
  LocalAssistantProfileSource,
  LocalMode,
  MemorySyncMode,
  Priority,
  ProviderId,
  ProviderMode,
  UseCase,
} from "../../types";

export type CloudAssistantProfileRecord = {
  id: string;
  name: string;
  description: string;
  useCase: string;
  answerStyle: string;
  priority: string;
  languageUse: string;
  localMode: string;
  provider: ProviderId;
  model: string;
  futureFeatures: string[];
  isDefault?: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
  prompt?: LocalAssistantProfile["prompt"];
  capabilities?: LocalAssistantProfile["capabilities"];
};

function asUseCase(value: string | null | undefined, fallback: UseCase | null): UseCase | null {
  const allowed: UseCase[] = ["daily", "study", "work", "fast", "character"];
  return allowed.includes(value as UseCase) ? (value as UseCase) : fallback;
}

function asAnswerStyle(value: string | null | undefined, fallback: AnswerStyle | null): AnswerStyle | null {
  const allowed: AnswerStyle[] = ["short", "moderate", "detailed"];
  return allowed.includes(value as AnswerStyle) ? (value as AnswerStyle) : fallback;
}

function asPriority(value: string | null | undefined, fallback: Priority | null): Priority | null {
  const allowed: Priority[] = ["balanced", "speed", "quality"];
  return allowed.includes(value as Priority) ? (value as Priority) : fallback;
}

function asLanguageUse(value: string | null | undefined, fallback: LanguageUse | null): LanguageUse | null {
  const allowed: LanguageUse[] = ["korean", "english", "both"];
  return allowed.includes(value as LanguageUse) ? (value as LanguageUse) : fallback;
}

function asLocalMode(value: string | null | undefined, fallback: LocalMode | null): LocalMode | null {
  const allowed: LocalMode[] = ["localOnly", "cloudOnly", "hybrid"];
  return allowed.includes(value as LocalMode) ? (value as LocalMode) : fallback;
}

function asFutureFeatures(values: string[] | undefined, fallback: FutureFeature[]): FutureFeature[] {
  const allowed = new Set<FutureFeature>(["voice", "character", "googleWorkspace", "files", "tools", "unsure"]);
  const next = (values ?? []).filter((value): value is FutureFeature => allowed.has(value as FutureFeature));
  return next.length > 0 ? next : fallback;
}

function resolveCloudSource(source: string | undefined, existing: LocalAssistantProfile | null | undefined): LocalAssistantProfileSource {
  if (source === "web-console" || source === "api") {
    return "web-sync";
  }
  return existing?.source ?? "desktop-setup";
}

export function mapCloudAssistantProfileToLocal(
  cloud: CloudAssistantProfileRecord,
  input: {
    existing?: LocalAssistantProfile | null;
    locale: Locale;
    syncedAt: string;
  },
): LocalAssistantProfile {
  const existing = input.existing ?? null;
  const provider = (cloud.provider ?? existing?.provider ?? "ollama") as ProviderId;
  const providerMode: ProviderMode = providerMeta[provider]?.mode ?? existing?.providerMode ?? "local";
  const model = cloud.model || existing?.model || "qwen3:4b";
  const memorySyncMode = (cloud.capabilities?.memory?.syncMode
    ?? existing?.survey.memorySyncMode
    ?? "profileOnly") as MemorySyncMode;
  const promptSettings = normalizePromptSettings(cloud.prompt?.settings ?? existing?.prompt?.settings);
  const profileId = existing?.id ?? cloud.id;

  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    id: profileId,
    name: cloud.name?.trim() || existing?.name || defaultProfileDetails.name,
    description: cloud.description?.trim() || existing?.description || defaultProfileDetails.description,
    source: resolveCloudSource(cloud.source, existing),
    createdAt: existing?.createdAt ?? cloud.createdAt ?? input.syncedAt,
    updatedAt: cloud.updatedAt ?? input.syncedAt,
    locale: existing?.locale ?? input.locale,
    useCase: asUseCase(cloud.useCase, existing?.useCase ?? "daily"),
    answerStyle: asAnswerStyle(cloud.answerStyle, existing?.answerStyle ?? "moderate"),
    priority: asPriority(cloud.priority, existing?.priority ?? "balanced"),
    languageUse: asLanguageUse(cloud.languageUse, existing?.languageUse ?? "korean"),
    localMode: asLocalMode(cloud.localMode, existing?.localMode ?? "hybrid"),
    futureFeatures: asFutureFeatures(cloud.futureFeatures, existing?.futureFeatures ?? []),
    provider,
    providerMode,
    model,
    modelLabel: existing?.modelLabel ?? model,
    survey: {
      useCase: asUseCase(cloud.useCase, existing?.survey.useCase ?? "daily"),
      answerStyle: asAnswerStyle(cloud.answerStyle, existing?.survey.answerStyle ?? "moderate"),
      priority: asPriority(cloud.priority, existing?.survey.priority ?? "balanced"),
      languageUse: asLanguageUse(cloud.languageUse, existing?.survey.languageUse ?? "korean"),
      localMode: asLocalMode(cloud.localMode, existing?.survey.localMode ?? "hybrid"),
      futureFeatures: asFutureFeatures(cloud.futureFeatures, existing?.survey.futureFeatures ?? []),
      memorySyncMode,
    },
    recommendation: existing?.recommendation ?? {
      localModel: provider === "ollama" ? model : "qwen3:4b",
      cloudModel: provider === "ollama" ? "gpt-4.1-mini" : model,
      selectedProvider: provider,
      selectedModel: provider === "ollama" ? model : existing?.recommendation.selectedModel ?? "qwen3:4b",
      selectedCloudModel: provider === "ollama" ? existing?.recommendation.selectedCloudModel ?? "gpt-4.1-mini" : model,
      hardwareMemoryGb: existing?.metadata.hardwareSnapshot?.totalMemoryGb ?? null,
    },
    prompt: {
      profileId,
      systemPrompt: cloud.prompt?.systemPrompt ?? existing?.prompt.systemPrompt ?? "",
      settings: promptSettings,
      variables: cloud.prompt?.variables ?? existing?.prompt.variables ?? {},
      overrides: cloud.prompt?.overrides ?? existing?.prompt.overrides ?? {
        persona: null,
        instructions: [],
        guardrails: [],
      },
    },
    capabilities: normalizeProfileCapabilities(
      cloud.capabilities ?? existing?.capabilities,
      promptSettings,
      memorySyncMode,
    ),
    sync: {
      cloudEnabled: true,
      cloudProfileId: cloud.id,
      lastSyncedAt: input.syncedAt,
    },
    metadata: existing?.metadata ?? {
      setupStep: "profile",
      appMode: "studio",
      appVersion: "0.1.0",
      hardwareSnapshot: null,
    },
  };
}

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
    source: "desktop-setup",
    prompt: profile.prompt,
    capabilities: profile.capabilities,
  };
}
