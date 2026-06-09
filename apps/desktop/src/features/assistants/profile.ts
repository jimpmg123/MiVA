import type {
  CalendarActionMode,
  CharacterReactionMode,
  CharacterRendererId,
  CodingAccessMode,
  CodingCapability,
  CodingProviderPolicy,
  LocalAssistantProfile,
  MemorySyncMode,
  ProfileDetailsDraft,
  PromptSettings,
  SttProviderId,
  TtsProviderId,
  WorkspaceServiceId,
  WorkspaceToolPolicy,
  ImportedSkill,
  AssistantSkillsCapability,
} from "../../types";
import { normalizePersonalityTraits } from "../characters/personalityTraits";
export const defaultProfileDetails: ProfileDetailsDraft = {
  name: "MiVA Assistant",
  description: "Local MiVA assistant profile created from setup choices.",
};
const legacySimpleAvoidance = "Do not make tool actions sound completed unless a connected tool confirms them.";
const defaultSimpleAvoidance = "Only say an action is done when MiVA actually completed it. If not, explain what still needs to be done.";
const legacyCharacterUserAddress = "Use the user's displayed name when it feels natural.";
const defaultCharacterUserAddress = "Use my profile name unless I set a nickname.";
export const defaultPromptSettings: PromptSettings = {
  simple: {
    assistantPurpose: "Help me organize daily tasks, answer questions, and plan practical next actions.",
    desiredTasks: "Write what you want this assistant to help with. Example: plan my study schedule, summarize notes, prepare calendar reminders.",
    preferredTone: "Clear, practical, and friendly.",
    avoidances: defaultSimpleAvoidance,
  },
  toolConnections: {
    googleWorkspace: false,
    googleWorkspaceServices: ["drive", "gmail", "calendar"],
    daisoCli: false,
  },
  persona: "A practical personal assistant named MiVA.",
  roleGoal: "Help the user think clearly, plan next actions, and use the selected model responsibly.",
  responseRules: [
    "Start with the direct answer, then add context only when it helps.",
    "Use natural line breaks for readability when an answer is more than a few sentences.",
    "Ask a short clarifying question when the request is ambiguous.",
    "Keep local/private data assumptions explicit.",
  ],
  scheduleRules: {
    mode: "draftOnly",
    timezone: "Asia/Seoul",
    reminderPreference: "Suggest reminders, but do not create calendar events until Google Workspace is connected.",
  },
  workspaceRules: {
    googleWorkspace: "disabled",
    calendar: "disabled",
    gmail: "disabled",
    drive: "disabled",
  },
  summaryMemory: {
    rollingSummary: true,
    modelPolicy: "sameModel",
    provider: "ollama",
    model: "",
    triggerTokenBudget: 2000,
  },
  coding: {
    capability: "chatOnly",
    providerPolicy: "localAllowed",
    localExperimental: false,
    accessMode: "readOnly",
    workspaceAllowlistRequired: false,
  },
  voice: {
    enabled: false,
    stt: {
      enabled: false,
      provider: "browser",
      recordingMode: "toggleRecording",
      language: "auto",
    },
    tts: {
      enabled: false,
      provider: "browser",
      voiceId: "af_heart",
      speakingRate: 1,
      volume: 0.85,
      autoSpeak: false,
    },
    runtime: {
      interruptOnUserSpeech: true,
      showTranscripts: true,
    },
  },
  character: {
    enabled: false,
    renderer: "live2d",
    characterId: "vtuber-shizuku",
    displayName: "Shizuku",
    personality: "Calm, friendly, and softly supportive while still giving practical answers.",
    personalityTraits: [],
    userAddress: defaultCharacterUserAddress,
    speakingStyle: "Use gentle wording, clear line breaks, and short natural reactions.",
    reactionMode: "statusOnly",
    live2dModelPath: "VtuberLLM/Open-LLM-VTuber-main/live2d-models/shizuku/runtime/shizuku.model3.json",
    showInRuntime: true,
  },
  safetyRules: [
    "Do not claim that an external tool action was completed unless a connected tool confirms it.",
    "Before changing calendars, files, or email, explain the planned action and wait for user confirmation.",
  ],
  generatedFinalSystemPrompt: "",
};

export const scheduleModeCopy: Record<CalendarActionMode, string> = {
  draftOnly: "Draft schedules only. The assistant may plan, but cannot create or edit calendar events.",
  confirmBeforeAction: "Prepare calendar actions and ask for confirmation before any connected tool runs.",
  connectedActions: "Allow confirmed calendar actions after Google Workspace is connected.",
};

export const workspacePolicyCopy: Record<WorkspaceToolPolicy, string> = {
  disabled: "Off",
  askFirst: "Ask before every action",
  connectedOnly: "Ask before every action",
};

export const codingCapabilityCopy: Record<CodingCapability, string> = {
  chatOnly: "Chat only",
  codeExplain: "Code explanation",
  codeEdit: "Code editing",
  clawCode: "Claw Code",
};

export const codingProviderPolicyCopy: Record<CodingProviderPolicy, string> = {
  localAllowed: "Local allowed",
  cloudRecommended: "Cloud recommended",
  cloudRequired: "Cloud API required",
};

export const codingAccessModeCopy: Record<CodingAccessMode, string> = {
  readOnly: "Read-only",
  fileEdits: "File edits",
  shellCommands: "Shell commands",
};

function normalizeStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? normalized : [...fallback];
}

const workspaceServiceIds: WorkspaceServiceId[] = ["drive", "gmail", "calendar", "docs", "sheets"];

function normalizeWorkspaceServices(value: unknown): WorkspaceServiceId[] {
  if (!Array.isArray(value)) {
    return [...defaultPromptSettings.toolConnections.googleWorkspaceServices];
  }

  const normalized = value
    .filter((item): item is WorkspaceServiceId => (
      typeof item === "string" && workspaceServiceIds.includes(item as WorkspaceServiceId)
    ));

  return Array.from(new Set(normalized));
}

function workspaceServicesToScopes(services: WorkspaceServiceId[]) {
  const scopeMap: Record<WorkspaceServiceId, string[]> = {
    drive: ["drive"],
    gmail: ["gmail"],
    calendar: ["calendar"],
    docs: ["docs"],
    sheets: ["sheets"],
  };

  return services.flatMap((service) => scopeMap[service]);
}

export function normalizePromptSettings(value: unknown): PromptSettings {
  const source = value && typeof value === "object" ? value as Partial<PromptSettings> : {};
  const simple = source.simple && typeof source.simple === "object"
    ? source.simple as Partial<PromptSettings["simple"]>
    : {};
  const toolConnections = source.toolConnections && typeof source.toolConnections === "object"
    ? source.toolConnections as Partial<PromptSettings["toolConnections"]>
    : {};
  const scheduleRules = source.scheduleRules && typeof source.scheduleRules === "object"
    ? source.scheduleRules as Partial<PromptSettings["scheduleRules"]>
    : {};
  const workspaceRules = source.workspaceRules && typeof source.workspaceRules === "object"
    ? source.workspaceRules as Partial<PromptSettings["workspaceRules"]>
    : {};
  const coding = source.coding && typeof source.coding === "object"
    ? source.coding as Partial<PromptSettings["coding"]>
    : {};
  const summaryMemory = source.summaryMemory && typeof source.summaryMemory === "object"
    ? source.summaryMemory as Partial<PromptSettings["summaryMemory"]>
    : {};
  const voice = source.voice && typeof source.voice === "object"
    ? source.voice as Partial<PromptSettings["voice"]>
    : {};
  const stt = voice.stt && typeof voice.stt === "object"
    ? voice.stt as Partial<PromptSettings["voice"]["stt"]>
    : {};
  const tts = voice.tts && typeof voice.tts === "object"
    ? voice.tts as Partial<PromptSettings["voice"]["tts"]>
    : {};
  const voiceRuntime = voice.runtime && typeof voice.runtime === "object"
    ? voice.runtime as Partial<PromptSettings["voice"]["runtime"]>
    : {};
  const character = source.character && typeof source.character === "object"
    ? source.character as Partial<PromptSettings["character"]>
    : {};

  const scheduleMode: CalendarActionMode =
    scheduleRules.mode === "confirmBeforeAction" || scheduleRules.mode === "connectedActions" || scheduleRules.mode === "draftOnly"
      ? scheduleRules.mode
      : defaultPromptSettings.scheduleRules.mode;

  const normalizeWorkspacePolicy = (value: unknown): WorkspaceToolPolicy => (
    value === "askFirst" || value === "disabled"
      ? value
      : "disabled"
  );
  const normalizeCodingCapability = (value: unknown): CodingCapability => (
    value === "codeExplain" || value === "codeEdit" || value === "clawCode" || value === "chatOnly"
      ? value
      : defaultPromptSettings.coding.capability
  );
  const normalizeCodingProviderPolicy = (value: unknown): CodingProviderPolicy => (
    value === "cloudRecommended" || value === "cloudRequired" || value === "localAllowed"
      ? value
      : defaultPromptSettings.coding.providerPolicy
  );
  const normalizeCodingAccessMode = (value: unknown): CodingAccessMode => (
    value === "fileEdits" || value === "shellCommands" || value === "readOnly"
      ? value
      : defaultPromptSettings.coding.accessMode
  );
  const normalizeSummaryModelPolicy = (value: unknown) => (
    value === "localModel" || value === "cloudModel" || value === "sameModel"
      ? value
      : defaultPromptSettings.summaryMemory.modelPolicy
  );
  const normalizeSummaryProvider = (value: unknown) => (
    value === "openai" || value === "gemini" || value === "groq" || value === "ollama"
      ? value
      : defaultPromptSettings.summaryMemory.provider
  );
  const normalizeSttProvider = (value: unknown): SttProviderId => (
    value === "disabled" || value === "browser" || value === "localWhisper" || value === "cloud"
      ? value
      : defaultPromptSettings.voice.stt.provider
  );
  const normalizeTtsProvider = (value: unknown): TtsProviderId => (
    value === "disabled" || value === "browser" || value === "localVoice" || value === "cloud"
      ? value
      : defaultPromptSettings.voice.tts.provider
  );
  const normalizeCharacterRenderer = (value: unknown): CharacterRendererId => (
    value === "live2d" || value === "placeholder"
      ? value
      : defaultPromptSettings.character.renderer
  );
  const normalizeCharacterReactionMode = (value: unknown): CharacterReactionMode => (
    value === "aiCues" || value === "statusOnly"
      ? value
      : defaultPromptSettings.character.reactionMode
  );
  return {
    simple: {
      assistantPurpose: typeof simple.assistantPurpose === "string" && simple.assistantPurpose.trim()
        ? simple.assistantPurpose.trim()
        : defaultPromptSettings.simple.assistantPurpose,
      desiredTasks: typeof simple.desiredTasks === "string" && simple.desiredTasks.trim()
        ? simple.desiredTasks.trim()
        : defaultPromptSettings.simple.desiredTasks,
      preferredTone: typeof simple.preferredTone === "string" && simple.preferredTone.trim()
        ? simple.preferredTone.trim()
        : defaultPromptSettings.simple.preferredTone,
      avoidances: typeof simple.avoidances === "string" && simple.avoidances.trim()
        ? simple.avoidances.trim() === legacySimpleAvoidance
          ? defaultSimpleAvoidance
          : simple.avoidances.trim()
        : defaultPromptSettings.simple.avoidances,
    },
    toolConnections: {
      googleWorkspace: typeof toolConnections.googleWorkspace === "boolean"
        ? toolConnections.googleWorkspace
        : defaultPromptSettings.toolConnections.googleWorkspace,
      googleWorkspaceServices: normalizeWorkspaceServices(toolConnections.googleWorkspaceServices),
      daisoCli: typeof toolConnections.daisoCli === "boolean"
        ? toolConnections.daisoCli
        : defaultPromptSettings.toolConnections.daisoCli,
    },
    persona: typeof source.persona === "string" && source.persona.trim()
      ? source.persona.trim()
      : defaultPromptSettings.persona,
    roleGoal: typeof source.roleGoal === "string" && source.roleGoal.trim()
      ? source.roleGoal.trim()
      : defaultPromptSettings.roleGoal,
    responseRules: normalizeStringList(source.responseRules, defaultPromptSettings.responseRules),
    scheduleRules: {
      mode: scheduleMode,
      timezone: typeof scheduleRules.timezone === "string" && scheduleRules.timezone.trim()
        ? scheduleRules.timezone.trim()
        : defaultPromptSettings.scheduleRules.timezone,
      reminderPreference: typeof scheduleRules.reminderPreference === "string" && scheduleRules.reminderPreference.trim()
        ? scheduleRules.reminderPreference.trim()
        : defaultPromptSettings.scheduleRules.reminderPreference,
    },
    workspaceRules: {
      googleWorkspace: normalizeWorkspacePolicy(workspaceRules.googleWorkspace),
      calendar: normalizeWorkspacePolicy(workspaceRules.calendar),
      gmail: normalizeWorkspacePolicy(workspaceRules.gmail),
      drive: normalizeWorkspacePolicy(workspaceRules.drive),
    },
    summaryMemory: {
      rollingSummary: typeof summaryMemory.rollingSummary === "boolean"
        ? summaryMemory.rollingSummary
        : defaultPromptSettings.summaryMemory.rollingSummary,
      modelPolicy: normalizeSummaryModelPolicy(summaryMemory.modelPolicy),
      provider: normalizeSummaryProvider(summaryMemory.provider),
      model: typeof summaryMemory.model === "string" ? summaryMemory.model.trim() : defaultPromptSettings.summaryMemory.model,
      triggerTokenBudget: Number.isFinite(Number(summaryMemory.triggerTokenBudget))
        ? Math.max(1000, Math.round(Number(summaryMemory.triggerTokenBudget)))
        : defaultPromptSettings.summaryMemory.triggerTokenBudget,
    },
    coding: {
      capability: normalizeCodingCapability(coding.capability),
      providerPolicy: normalizeCodingProviderPolicy(coding.providerPolicy),
      localExperimental: typeof coding.localExperimental === "boolean"
        ? coding.localExperimental
        : defaultPromptSettings.coding.localExperimental,
      accessMode: normalizeCodingAccessMode(coding.accessMode),
      workspaceAllowlistRequired: typeof coding.workspaceAllowlistRequired === "boolean"
        ? coding.workspaceAllowlistRequired
        : defaultPromptSettings.coding.workspaceAllowlistRequired,
    },
    voice: {
      enabled: typeof voice.enabled === "boolean" ? voice.enabled : defaultPromptSettings.voice.enabled,
      stt: {
        enabled: typeof stt.enabled === "boolean" ? stt.enabled : defaultPromptSettings.voice.stt.enabled,
        provider: normalizeSttProvider(stt.provider),
        recordingMode: "toggleRecording",
        language: typeof stt.language === "string" && stt.language.trim()
          ? stt.language.trim()
          : defaultPromptSettings.voice.stt.language,
      },
      tts: {
        enabled: typeof tts.enabled === "boolean" ? tts.enabled : defaultPromptSettings.voice.tts.enabled,
        provider: normalizeTtsProvider(tts.provider),
        voiceId: typeof tts.voiceId === "string" && tts.voiceId.trim()
          ? tts.voiceId.trim()
          : defaultPromptSettings.voice.tts.voiceId,
        speakingRate: Number.isFinite(Number(tts.speakingRate))
          ? Math.min(2, Math.max(0.5, Number(tts.speakingRate)))
          : defaultPromptSettings.voice.tts.speakingRate,
        volume: Number.isFinite(Number(tts.volume))
          ? Math.min(1, Math.max(0, Number(tts.volume)))
          : defaultPromptSettings.voice.tts.volume,
        autoSpeak: typeof tts.autoSpeak === "boolean" ? tts.autoSpeak : defaultPromptSettings.voice.tts.autoSpeak,
      },
      runtime: {
        interruptOnUserSpeech: typeof voiceRuntime.interruptOnUserSpeech === "boolean"
          ? voiceRuntime.interruptOnUserSpeech
          : defaultPromptSettings.voice.runtime.interruptOnUserSpeech,
        showTranscripts: typeof voiceRuntime.showTranscripts === "boolean"
          ? voiceRuntime.showTranscripts
          : defaultPromptSettings.voice.runtime.showTranscripts,
      },
    },
    character: {
      enabled: typeof character.enabled === "boolean" ? character.enabled : defaultPromptSettings.character.enabled,
      renderer: normalizeCharacterRenderer(character.renderer),
      characterId: typeof character.characterId === "string" && character.characterId.trim()
        ? character.characterId.trim()
        : defaultPromptSettings.character.characterId,
      displayName: typeof character.displayName === "string" && character.displayName.trim()
        ? character.displayName.trim()
        : defaultPromptSettings.character.displayName,
      personality: typeof character.personality === "string" && character.personality.trim()
        ? character.personality.trim()
        : defaultPromptSettings.character.personality,
      personalityTraits: normalizePersonalityTraits(character.personalityTraits),
      userAddress: typeof character.userAddress === "string" && character.userAddress.trim()
        ? character.userAddress.trim() === legacyCharacterUserAddress
          ? defaultCharacterUserAddress
          : character.userAddress.trim()
        : defaultPromptSettings.character.userAddress,
      speakingStyle: typeof character.speakingStyle === "string" && character.speakingStyle.trim()
        ? character.speakingStyle.trim()
        : defaultPromptSettings.character.speakingStyle,
      reactionMode: normalizeCharacterReactionMode(character.reactionMode),
      live2dModelPath: typeof character.live2dModelPath === "string"
        ? character.live2dModelPath.trim()
        : defaultPromptSettings.character.live2dModelPath,
      showInRuntime: typeof character.showInRuntime === "boolean"
        ? character.showInRuntime
        : defaultPromptSettings.character.showInRuntime,
    },
    safetyRules: normalizeStringList(source.safetyRules, defaultPromptSettings.safetyRules),
    generatedFinalSystemPrompt: typeof source.generatedFinalSystemPrompt === "string"
      ? source.generatedFinalSystemPrompt.trim()
      : defaultPromptSettings.generatedFinalSystemPrompt,
  };
}

export function codingSettingsToCapability(settings: PromptSettings): LocalAssistantProfile["capabilities"]["coding"] {
  return {
    capability: settings.coding.capability,
    providerPolicy: settings.coding.providerPolicy,
    localExperimental: settings.coding.localExperimental,
    accessMode: settings.coding.accessMode,
    workspaceAllowlistRequired: settings.coding.workspaceAllowlistRequired,
  };
}

export function normalizeMemoryCapability(
  value: Partial<LocalAssistantProfile["capabilities"]["memory"]> | undefined,
  syncMode: MemorySyncMode,
): LocalAssistantProfile["capabilities"]["memory"] {
  return {
    syncMode: value?.syncMode === "summaryMemory" ? "summaryMemory" : syncMode,
    rollingSummary: {
      content: typeof value?.rollingSummary?.content === "string" && value.rollingSummary.content.trim()
        ? value.rollingSummary.content.trim()
        : null,
      pinnedMemory: typeof value?.rollingSummary?.pinnedMemory === "string" && value.rollingSummary.pinnedMemory.trim()
        ? value.rollingSummary.pinnedMemory.trim()
        : null,
      sessionSummary: typeof value?.rollingSummary?.sessionSummary === "string" && value.rollingSummary.sessionSummary.trim()
        ? value.rollingSummary.sessionSummary.trim()
        : null,
      compactedMessageCount: Number.isFinite(Number(value?.rollingSummary?.compactedMessageCount))
        ? Math.max(0, Math.round(Number(value?.rollingSummary?.compactedMessageCount)))
        : 0,
      updatedAt: typeof value?.rollingSummary?.updatedAt === "string" ? value.rollingSummary.updatedAt : null,
      provider: value?.rollingSummary?.provider === "openai" || value?.rollingSummary?.provider === "gemini" || value?.rollingSummary?.provider === "groq" || value?.rollingSummary?.provider === "ollama"
        ? value.rollingSummary.provider
        : null,
      model: typeof value?.rollingSummary?.model === "string" && value.rollingSummary.model.trim()
        ? value.rollingSummary.model.trim()
        : null,
      sourceMessageCount: Number.isFinite(Number(value?.rollingSummary?.sourceMessageCount))
        ? Math.max(0, Math.round(Number(value?.rollingSummary?.sourceMessageCount)))
        : 0,
      estimatedTokens: Number.isFinite(Number(value?.rollingSummary?.estimatedTokens))
        ? Math.max(0, Math.round(Number(value?.rollingSummary?.estimatedTokens)))
        : 0,
    },
    snapshotPolicy: {
      firstConversations: Number.isFinite(Number(value?.snapshotPolicy?.firstConversations))
        ? Math.max(0, Math.round(Number(value?.snapshotPolicy?.firstConversations)))
        : 3,
      recentConversations: Number.isFinite(Number(value?.snapshotPolicy?.recentConversations))
        ? Math.max(0, Math.round(Number(value?.snapshotPolicy?.recentConversations)))
        : 3,
      highEffortConversations: Number.isFinite(Number(value?.snapshotPolicy?.highEffortConversations))
        ? Math.max(0, Math.round(Number(value?.snapshotPolicy?.highEffortConversations)))
        : 1,
    },
  };
}

function normalizeImportedSkill(value: unknown): ImportedSkill | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<ImportedSkill>;
  const slug = typeof source.slug === "string" ? source.slug.trim() : "";
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const content = typeof source.content === "string" ? source.content : "";
  if (!slug || !name || !content.trim()) {
    return null;
  }

  return {
    id: typeof source.id === "string" && source.id.trim() ? source.id.trim() : `skill_${slug}`,
    slug,
    name,
    description: typeof source.description === "string" ? source.description.trim() : name,
    icon: typeof source.icon === "string" && source.icon.trim() ? source.icon.trim() : "auto_awesome",
    content,
    sourceFileName: typeof source.sourceFileName === "string" ? source.sourceFileName.trim() : `${slug}.md`,
    enabled: source.enabled !== false,
    importedAt: typeof source.importedAt === "string" ? source.importedAt : new Date().toISOString(),
  };
}

export function normalizeSkillsCapability(value: unknown): AssistantSkillsCapability {
  const source = value && typeof value === "object" ? value as Partial<AssistantSkillsCapability> : {};
  const imported = Array.isArray(source.imported)
    ? source.imported.map(normalizeImportedSkill).filter((skill): skill is ImportedSkill => Boolean(skill))
    : [];
  const enabledImported = imported.filter((skill) => skill.enabled);

  return {
    enabled: source.enabled === true || enabledImported.length > 0,
    skillIds: enabledImported.map((skill) => skill.id),
    imported,
  };
}

export function normalizeProfileCapabilities(
  value: Partial<LocalAssistantProfile["capabilities"]> | undefined,
  settings: PromptSettings,
  memorySyncMode: MemorySyncMode = "profileOnly",
): LocalAssistantProfile["capabilities"] {
  const coding = value?.coding && typeof value.coding === "object"
    ? value.coding
    : codingSettingsToCapability(settings);

  const workspaceEnabled = settings.toolConnections.googleWorkspace;
  const workspaceScopes = workspaceServicesToScopes(settings.toolConnections.googleWorkspaceServices);

  return {
    voice: {
      enabled: settings.voice.enabled,
      sttProvider: settings.voice.stt.enabled ? settings.voice.stt.provider : null,
      ttsProvider: settings.voice.tts.enabled ? settings.voice.tts.provider : null,
    },
    character: {
      enabled: settings.character.enabled && settings.character.showInRuntime,
      renderer: settings.character.enabled ? settings.character.renderer : null,
      characterId: settings.character.enabled ? settings.character.characterId : null,
    },
    googleWorkspace: {
      accountId: value?.googleWorkspace?.accountId ?? null,
      enabled: workspaceEnabled,
      scopes: workspaceEnabled ? workspaceScopes : [],
    },
    files: value?.files ?? { enabled: false, allowedRoots: [] },
    tools: value?.tools ?? { enabled: false, enabledToolIds: [] },
    coding: {
      ...codingSettingsToCapability(settings),
      ...coding,
    },
    mcp: value?.mcp ?? { enabled: false, serverIds: [] },
    skills: normalizeSkillsCapability(value?.skills),
    externalApis: value?.externalApis ?? { enabled: false, providerIds: [] },
    memory: normalizeMemoryCapability(value?.memory, memorySyncMode),
  };
}

