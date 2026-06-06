import type { Locale } from "./i18n";

export type StepId =
  | "welcome"
  | "survey"
  | "hardware"
  | "recommendation"
  | "ollama"
  | "clawCode"
  | "download"
  | "chat"
  | "profile"
  | "settings";

export type UseCase = "daily" | "study" | "work" | "fast" | "character";
export type Priority = "balanced" | "speed" | "quality";
export type AnswerStyle = "short" | "moderate" | "detailed";
export type LanguageUse = "korean" | "english" | "both";
export type LocalMode = "localOnly" | "cloudOnly" | "hybrid";
export type FutureFeature = "voice" | "character" | "googleWorkspace" | "files" | "tools" | "unsure";
export type MemorySyncMode = "profileOnly" | "summaryMemory";
export type AppMode = "setup" | "studio" | "runtime" | "history" | "auth";
export type SettingsSection = "general" | "aiModels" | "clawCode" | "security" | "logs";
export type StudioSection =
  | "myAssistants"
  | "overview"
  | "models"
  | "prompts"
  | "character"
  | "tts"
  | "googleWorkspace"
  | "code"
  | "skills";
export type ProviderId = "ollama" | "openai" | "gemini" | "groq";
export type CloudProviderId = Exclude<ProviderId, "ollama">;
export type ProviderMode = "local" | "cloud";
export type SummaryModelPolicy = "sameModel" | "localModel" | "cloudModel";
export type CalendarActionMode = "draftOnly" | "confirmBeforeAction" | "connectedActions";
export type WorkspaceToolPolicy = "disabled" | "askFirst" | "connectedOnly";
export type WorkspaceServiceId = "drive" | "gmail" | "calendar" | "docs" | "sheets";
export type CodingCapability = "chatOnly" | "codeExplain" | "codeEdit" | "clawCode";
export type CodingProviderPolicy = "localAllowed" | "cloudRecommended" | "cloudRequired";
export type CodingAccessMode = "readOnly" | "fileEdits" | "shellCommands";
export type SttProviderId = "disabled" | "browser" | "localWhisper" | "cloud";
export type TtsProviderId = "disabled" | "browser" | "localVoice" | "cloud";
export type VoiceRecordingMode = "toggleRecording";
export type CharacterRendererId = "placeholder" | "live2d";
export type CharacterReactionMode = "statusOnly" | "aiCues";
export type AuthRole = "user" | "admin";
export type PromptEditorMode = "simple" | "developer";
export type AuthFlowState = "idle" | "opening" | "waiting" | "connected" | "error" | "admin-web-only";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: AuthRole;
  locale: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type DeviceAuthStart = {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: string;
  intervalMs: number;
};

export type DeviceAuthStatus = {
  status: "pending" | "authorized" | "expired";
  session: AuthSession | null;
  expiresAt: string;
};

export type CloudDeviceRecord = {
  id: string;
  name: string;
  os?: string | null;
  appVersion?: string | null;
  status?: string;
  lastSeenAt?: string | null;
};

export type GoogleWorkspaceStatus = {
  connected: boolean;
  accountEmail: string | null;
  scopes: string[];
  status: "CONNECTED" | "DISCONNECTED" | "NEEDS_AUTH" | "ERROR";
  connectedAt: string | null;
};

export type PromptSettings = {
  simple: {
    assistantPurpose: string;
    desiredTasks: string;
    preferredTone: string;
    avoidances: string;
  };
  toolConnections: {
    googleWorkspace: boolean;
    googleWorkspaceServices: WorkspaceServiceId[];
    daisoCli: boolean;
  };
  persona: string;
  roleGoal: string;
  responseRules: string[];
  scheduleRules: {
    mode: CalendarActionMode;
    timezone: string;
    reminderPreference: string;
  };
  workspaceRules: {
    googleWorkspace: WorkspaceToolPolicy;
    calendar: WorkspaceToolPolicy;
    gmail: WorkspaceToolPolicy;
    drive: WorkspaceToolPolicy;
  };
  summaryMemory: {
    rollingSummary: boolean;
    modelPolicy: SummaryModelPolicy;
    provider: ProviderId;
    model: string;
    triggerTokenBudget: number;
  };
  coding: {
    capability: CodingCapability;
    providerPolicy: CodingProviderPolicy;
    localExperimental: boolean;
    accessMode: CodingAccessMode;
    workspaceAllowlistRequired: boolean;
  };
  voice: {
    enabled: boolean;
    stt: {
      enabled: boolean;
      provider: SttProviderId;
      recordingMode: VoiceRecordingMode;
      language: string;
    };
    tts: {
      enabled: boolean;
      provider: TtsProviderId;
      voiceId: string;
      speakingRate: number;
      volume: number;
      autoSpeak: boolean;
    };
    runtime: {
      interruptOnUserSpeech: boolean;
      showTranscripts: boolean;
    };
  };
  character: {
    enabled: boolean;
    renderer: CharacterRendererId;
    characterId: string;
    displayName: string;
    personality: string;
    userAddress: string;
    speakingStyle: string;
    reactionMode: CharacterReactionMode;
    live2dModelPath: string;
    showInRuntime: boolean;
  };
  safetyRules: string[];
};

export type OllamaStatus = {
  installed: boolean;
  running: boolean;
  command?: string | null;
  version?: string | null;
  installedModelCount: number;
  installedModels: string[];
  baseUrl: string;
  error?: string | null;
};

export type ClawCodeRuntimeInfo = {
  installed: boolean;
  version: string | null;
  installedAt: string | null;
  workspaceRoot: string | null;
  openAiConfigured: boolean;
  openAiModel: string;
  node: {
    installed: boolean;
    version: string | null;
    command: string | null;
  };
  git: {
    installed: boolean;
    version: string | null;
    command: string | null;
  };
  sessionsDir: string;
};

export type ModelDownloadProgress = {
  model: string;
  status: string;
  completed?: number | null;
  total?: number | null;
  percent?: number | null;
  done: boolean;
  paused?: boolean;
  error?: string | null;
};

export type ModelDownloadDockMode = "modal" | "compact" | "minimal";

export type VoiceWorkerStatus = {
  running: boolean;
  ok?: boolean;
  service?: string;
  version?: string;
  baseUrl: string;
  workerScript?: string;
  python?: {
    version: string;
    executable: string;
    platform: string;
  };
  engines?: {
    stt?: {
      installed: boolean;
      activeProvider: string | null;
      availableProviders: string[];
    };
    tts?: {
      installed: boolean;
      activeProvider: string | null;
      availableProviders: string[];
      defaultVoice?: string;
      voices?: Array<{
        id: string;
        label: string;
        language: string;
        gender?: string;
      }>;
      dependencies?: Record<string, boolean>;
    };
    multimodalVoice?: {
      installed: boolean;
      activeProvider: string | null;
      availableProviders: string[];
    };
  };
  capabilities?: {
    transcribe: boolean;
    synthesize: boolean;
    lipSync: boolean;
  };
  error?: string | null;
};

export type HardwareInfo = {
  cpuBrand?: string | null;
  logicalCoreCount: number;
  physicalCoreCount?: number | null;
  totalMemoryGb: number;
  availableMemoryGb: number;
  primaryDiskTotalGb: number;
  primaryDiskAvailableGb: number;
  gpuName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  arch: string;
};

export type ModelInfo = {
  id: string;
  name: string;
  label: string;
  category: string;
  summary: Record<Locale, string>;
  bestFor: Record<Locale, string>;
  recommendedRamGb: number;
  downloadSizeLabel?: string;
};

export type CloudModelInfo = {
  id: string;
  provider: CloudProviderId;
  label: string;
  category: string;
  summary: Record<Locale, string>;
  bestFor: Record<Locale, string>;
  status: Record<Locale, string>;
};

export type SurveyState = {
  useCase: UseCase | null;
  answerStyle: AnswerStyle | null;
  priority: Priority | null;
  languageUse: LanguageUse | null;
  localMode: LocalMode | null;
  futureFeatures: FutureFeature[];
  memorySyncMode: MemorySyncMode;
};

export type ChatUiAction = "claw-pick-workspace";

export type ChatGeneratedImage = {
  dataUrl: string;
  alt?: string;
  model?: string;
};

export type ImportedSkill = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  content: string;
  sourceFileName: string;
  enabled: boolean;
  importedAt: string;
};

export type AssistantSkillsCapability = {
  enabled: boolean;
  skillIds: string[];
  imported: ImportedSkill[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  provider?: ProviderId;
  model?: string;
  latencyMs?: number;
  uiAction?: ChatUiAction | null;
  images?: ChatGeneratedImage[];
};

export type DocumentAttachmentStatus = "analyzing" | "ready" | "error";

export type DocumentAnalysisResult = {
  ok: true;
  name: string;
  extension: string;
  kind: "pdf" | "spreadsheet";
  sizeBytes: number;
  context: string;
  truncated: boolean;
  durationMs: number;
  metadata: {
    pageCount?: number;
    extractedPages?: number;
    textChars?: number;
    sheetNames?: string[];
    sheets?: Array<{
      name: string;
      rows: number;
      columns: number;
    }>;
  };
};

export type DocumentAttachment = {
  id: string;
  path: string;
  name: string;
  extension: string;
  status: DocumentAttachmentStatus;
  context: string;
  sizeBytes: number | null;
  metadata: DocumentAnalysisResult["metadata"] | null;
  truncated: boolean;
  error: string | null;
};

export type ImageAttachment = {
  id: string;
  path: string;
  name: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
  previewUrl: string;
};

export type ImageAttachmentPayload = {
  name: string;
  mimeType: string;
  data: string;
};

export type RuntimeMemorySummary = {
  content: string;
  updatedAt: string;
  provider: ProviderId;
  model: string;
  sourceMessageCount: number;
  estimatedTokens: number;
};

export type RuntimeStoredConversation = {
  id: string;
  assistantId: string;
  assistantName?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  modelLabel?: string;
};

export type ChatMetrics = {
  provider: ProviderId;
  model: string;
  latencyMs: number;
  measuredAt: string;
};

export type ProviderKeyState = {
  openai: string;
  gemini: string;
  groq: string;
  huggingface: string;
};

export type RuntimeRequirement = {
  id: string;
  label: string;
  requiredFor: string;
  installed: boolean;
  meetsMinimum: boolean;
  command?: string | null;
  version?: string | null;
  note: string;
};

export type RuntimeRequirements = {
  python: RuntimeRequirement;
};

export type ProfileDetailsDraft = {
  name: string;
  description: string;
};

export type AssistantProfileSyncState = "idle" | "syncing" | "synced" | "error";
export type LocalAssistantProfileSource = "desktop-setup" | "runtime" | "web-sync";

export type LocalAssistantProfile = {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  source: LocalAssistantProfileSource;
  createdAt: string;
  updatedAt: string;
  locale: Locale;
  useCase: UseCase | null;
  answerStyle: AnswerStyle | null;
  priority: Priority | null;
  languageUse: LanguageUse | null;
  localMode: LocalMode | null;
  futureFeatures: FutureFeature[];
  provider: ProviderId;
  providerMode: ProviderMode;
  model: string;
  modelLabel: string;
  survey: SurveyState;
  recommendation: {
    localModel: string;
    cloudModel: string;
    selectedProvider: ProviderId;
    selectedModel: string;
    selectedCloudModel: string;
    hardwareMemoryGb: number | null;
  };
  prompt: {
    profileId: string;
    systemPrompt: string;
    settings: PromptSettings;
    variables: Record<string, unknown>;
    overrides: {
      persona: string | null;
      instructions: string[];
      guardrails: string[];
    };
  };
  capabilities: {
    voice: { enabled: boolean; sttProvider: SttProviderId | null; ttsProvider: TtsProviderId | null };
    character: { enabled: boolean; renderer: CharacterRendererId | null; characterId: string | null };
    googleWorkspace: { enabled: boolean; accountId: string | null; scopes: string[] };
    files: { enabled: boolean; allowedRoots: string[] };
    tools: { enabled: boolean; enabledToolIds: string[] };
    coding: {
      capability: CodingCapability;
      providerPolicy: CodingProviderPolicy;
      localExperimental: boolean;
      accessMode: CodingAccessMode;
      workspaceAllowlistRequired: boolean;
    };
    mcp: { enabled: boolean; serverIds: string[] };
    skills: AssistantSkillsCapability;
    externalApis: { enabled: boolean; providerIds: string[] };
    memory: {
      syncMode: MemorySyncMode;
      rollingSummary: {
        content: string | null;
        updatedAt: string | null;
        provider: ProviderId | null;
        model: string | null;
        sourceMessageCount: number;
        estimatedTokens: number;
      };
      snapshotPolicy: {
        firstConversations: number;
        recentConversations: number;
        highEffortConversations: number;
      };
    };
  };
  sync: {
    cloudEnabled: boolean;
    cloudProfileId: string | null;
    lastSyncedAt: string | null;
  };
  metadata: {
    setupStep: StepId;
    appMode: AppMode;
    appVersion: string;
    hardwareSnapshot: HardwareInfo | null;
  };
};

export type LocalAssistantProfileStore = {
  schemaVersion: 1;
  activeProfileId: string | null;
  profiles: LocalAssistantProfile[];
  updatedAt: string | null;
};
