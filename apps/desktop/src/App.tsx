import { useEffect, useMemo, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./App.css";
import type { Locale } from "./i18n";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

type StepId =
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

type UseCase = "daily" | "study" | "work" | "fast" | "character";
type Priority = "balanced" | "speed" | "quality";
type AnswerStyle = "short" | "moderate" | "detailed";
type LanguageUse = "korean" | "english" | "both";
type LocalMode = "localOnly" | "cloudOnly" | "hybrid";
type FutureFeature = "voice" | "character" | "googleWorkspace" | "files" | "tools" | "unsure";
type MemorySyncMode = "profileOnly" | "summaryMemory";
type AppMode = "setup" | "studio" | "runtime" | "auth";
type SettingsSection = "general" | "aiModels" | "security" | "logs";
type StudioSection = "myAssistants" | "overview" | "models" | "prompts" | "character" | "tts" | "googleWorkspace" | "tools";
type ProviderId = "ollama" | "openai" | "gemini";
type CloudProviderId = Exclude<ProviderId, "ollama">;
type ProviderMode = "local" | "cloud";
type CalendarActionMode = "draftOnly" | "confirmBeforeAction" | "connectedActions";
type WorkspaceToolPolicy = "disabled" | "askFirst" | "connectedOnly";
type CodingCapability = "chatOnly" | "codeExplain" | "codeEdit" | "clawCode";
type CodingProviderPolicy = "localAllowed" | "cloudRecommended" | "cloudRequired";
type CodingAccessMode = "readOnly" | "fileEdits" | "shellCommands";
type AuthRole = "user" | "admin";
type PromptEditorMode = "simple" | "developer";

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: AuthRole;
  locale: string;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type DeviceAuthStart = {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: string;
  intervalMs: number;
};

type DeviceAuthStatus = {
  status: "pending" | "authorized" | "expired";
  session: AuthSession | null;
  expiresAt: string;
};

type CloudDeviceRecord = {
  id: string;
  name: string;
  os?: string | null;
  appVersion?: string | null;
  status?: string;
  lastSeenAt?: string | null;
};

type AuthFlowState = "idle" | "opening" | "waiting" | "connected" | "error";

type PromptSettings = {
  simple: {
    assistantPurpose: string;
    desiredTasks: string;
    preferredTone: string;
    avoidances: string;
  };
  toolConnections: {
    googleWorkspaceCli: boolean;
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
  coding: {
    capability: CodingCapability;
    providerPolicy: CodingProviderPolicy;
    localExperimental: boolean;
    accessMode: CodingAccessMode;
    workspaceAllowlistRequired: boolean;
  };
  safetyRules: string[];
};

type OllamaStatus = {
  installed: boolean;
  running: boolean;
  command?: string | null;
  version?: string | null;
  installedModelCount: number;
  installedModels: string[];
  baseUrl: string;
  error?: string | null;
};

type HardwareInfo = {
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

type ModelInfo = {
  id: string;
  name: string;
  label: string;
  category: string;
  summary: Record<Locale, string>;
  bestFor: Record<Locale, string>;
  recommendedRamGb: number;
  downloadSizeLabel?: string;
};

type CloudModelInfo = {
  id: string;
  provider: CloudProviderId;
  label: string;
  category: string;
  summary: Record<Locale, string>;
  bestFor: Record<Locale, string>;
  status: Record<Locale, string>;
};

type SurveyState = {
  useCase: UseCase | null;
  answerStyle: AnswerStyle | null;
  priority: Priority | null;
  languageUse: LanguageUse | null;
  localMode: LocalMode | null;
  futureFeatures: FutureFeature[];
  memorySyncMode: MemorySyncMode;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  provider?: ProviderId;
  model?: string;
  latencyMs?: number;
};

type ChatMetrics = {
  provider: ProviderId;
  model: string;
  latencyMs: number;
  measuredAt: string;
};

type ProviderKeyState = {
  openai: string;
  gemini: string;
};

type RuntimeRequirement = {
  id: string;
  label: string;
  requiredFor: string;
  installed: boolean;
  meetsMinimum: boolean;
  command?: string | null;
  version?: string | null;
  note: string;
};

type RuntimeRequirements = {
  python: RuntimeRequirement;
};

type ProfileDetailsDraft = {
  name: string;
  description: string;
};

type AssistantProfileSyncState = "idle" | "syncing" | "synced" | "error";
type LocalAssistantProfileStatus = "draft" | "finalized";
type LocalAssistantProfileSource = "desktop-setup" | "runtime" | "web-sync";

type LocalAssistantProfile = {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  status: LocalAssistantProfileStatus;
  source: LocalAssistantProfileSource;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
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
    voice: { enabled: boolean; sttProvider: string | null; ttsProvider: string | null };
    character: { enabled: boolean; renderer: string | null; characterId: string | null };
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
    skills: { enabled: boolean; skillIds: string[] };
    externalApis: { enabled: boolean; providerIds: string[] };
    memory: {
      syncMode: MemorySyncMode;
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

type LocalAssistantProfileStore = {
  schemaVersion: 1;
  activeProfileId: string | null;
  profiles: LocalAssistantProfile[];
  updatedAt: string | null;
};

const PROVIDER_KEYS_STORAGE_KEY = "miva.providerKeys.v1";
const ASSISTANT_PROFILE_STORAGE_KEY = "miva.assistantProfiles.v1";
const RUNTIME_CHAT_STORAGE_KEY = "miva.runtimeChat.v1";
const AUTH_STORAGE_KEY = "miva.desktop.auth.v1";
const DEVICE_STORAGE_KEY = "miva.desktop.deviceId.v1";
const CLOUD_API_URL = "http://127.0.0.1:4000";
const LOCAL_PROFILE_SCHEMA_VERSION = 1;
const DEFAULT_LOCAL_PROFILE_ID = "local_default";
const ACTIVE_LOCALE: Locale = "en";
const emptyProviderKeys: ProviderKeyState = {
  openai: "",
  gemini: "",
};
const defaultProfileDetails: ProfileDetailsDraft = {
  name: "MiVA Assistant",
  description: "Local MiVA assistant profile created from setup choices.",
};
const legacySimpleAvoidance = "Do not make tool actions sound completed unless a connected tool confirms them.";
const defaultSimpleAvoidance = "Only say an action is done when MiVA actually completed it. If not, explain what still needs to be done.";
const defaultPromptSettings: PromptSettings = {
  simple: {
    assistantPurpose: "Help me organize daily tasks, answer questions, and plan practical next actions.",
    desiredTasks: "Write what you want this assistant to help with. Example: plan my study schedule, summarize notes, prepare calendar reminders.",
    preferredTone: "Clear, practical, and friendly.",
    avoidances: defaultSimpleAvoidance,
  },
  toolConnections: {
    googleWorkspaceCli: false,
    daisoCli: false,
  },
  persona: "A practical personal assistant named MiVA.",
  roleGoal: "Help the user think clearly, plan next actions, and use the selected model responsibly.",
  responseRules: [
    "Start with the direct answer, then add context only when it helps.",
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
  coding: {
    capability: "chatOnly",
    providerPolicy: "localAllowed",
    localExperimental: false,
    accessMode: "readOnly",
    workspaceAllowlistRequired: false,
  },
  safetyRules: [
    "Do not claim that an external tool action was completed unless a connected tool confirms it.",
    "Before changing calendars, files, or email, explain the planned action and wait for user confirmation.",
  ],
};

const scheduleModeCopy: Record<CalendarActionMode, string> = {
  draftOnly: "Draft schedules only. The assistant may plan, but cannot create or edit calendar events.",
  confirmBeforeAction: "Prepare calendar actions and ask for confirmation before any connected tool runs.",
  connectedActions: "Allow confirmed calendar actions after Google Workspace is connected.",
};

const workspacePolicyCopy: Record<WorkspaceToolPolicy, string> = {
  disabled: "Disabled",
  askFirst: "Ask first",
  connectedOnly: "Connected only",
};

const codingCapabilityCopy: Record<CodingCapability, string> = {
  chatOnly: "Chat only",
  codeExplain: "Code explanation",
  codeEdit: "Code editing",
  clawCode: "Claw Code",
};

const codingProviderPolicyCopy: Record<CodingProviderPolicy, string> = {
  localAllowed: "Local allowed",
  cloudRecommended: "Cloud recommended",
  cloudRequired: "Cloud API required",
};

const codingAccessModeCopy: Record<CodingAccessMode, string> = {
  readOnly: "Read-only",
  fileEdits: "File edits",
  shellCommands: "Shell commands",
};

const emptyAssistantProfileStore: LocalAssistantProfileStore = {
  schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
  activeProfileId: null,
  profiles: [],
  updatedAt: null,
};

function isSupportedGpuName(value?: string | null) {
  if (!value) {
    return false;
  }

  return !/parsec|virtual|remote|microsoft basic|basic display|displaylink|indirect display|mirror driver|spacedesk|radmin|nomachine|vmware|virtualbox|hyper-v/i.test(value);
}

const providerMeta: Record<ProviderId, { label: string; mode: ProviderMode; icon: string }> = {
  ollama: { label: "Ollama", mode: "local", icon: "dns" },
  openai: { label: "OpenAI", mode: "cloud", icon: "cloud" },
  gemini: { label: "Gemini", mode: "cloud", icon: "auto_awesome" },
};

const providerUiCopy = {
  ko: {
    localModeLocalOnlyTitle: "濡쒖뺄濡쒕쭔 ?ъ슜",
    localModeLocalOnlyBody: "?명꽣???놁씠 ??而댄벂???덉뿉?쒕쭔 AI 鍮꾩꽌瑜??ㅽ뻾?⑸땲??",
    localModeCloudOnlyTitle: "?⑤씪???대씪?곕뱶濡??ъ슜",
    localModeCloudOnlyBody: "Ollama ?ㅼ튂 ?놁씠 OpenAI/Gemini 媛숈? ?몃? API濡??쒖옉?⑸땲??",
    localModeHybridTitle: "濡쒖뺄 + ?대씪?곕뱶 蹂듯빀",
    localModeHybridBody: "湲곕낯? 濡쒖뺄濡??먭퀬, ?꾩슂?섎㈃ ?몃? API? Google Workspace瑜??곌껐?⑸땲??",
    recommended: "媛??異붿쿇",
    localModels: "濡쒖뺄 紐⑤뜽",
    cloudModels: "?대씪?곕뱶 紐⑤뜽",
    bestMatch: "異붿쿇 議고빀",
    selected: "Selected",
    selectModel: "??紐⑤뜽 ?좏깮",
    comingSoon: "Coming soon",
    customOllama: "?ъ슜??Ollama 紐⑤뜽",
    customOllamaBody: "紐⑤뜽 ?대쫫 吏곸젒 ?낅젰? ?ㅼ쓬 ?④퀎?먯꽌 異붽??⑸땲??",
    provider: "Provider",
    providerStatus: "Provider ?곹깭",
    localHeader: "LOCAL",
    cloudHeader: "CLOUD",
    localDataNotice: "?곗씠?곕뒗 ??PC ?덉뿉??泥섎━?⑸땲??",
    cloudDataNotice: "硫붿떆吏???좏깮???몃? Provider濡??꾩넚?⑸땲??",
    apiKeysNext: "?대씪?곕뱶 紐⑤뜽? Ollama ?ㅼ튂瑜?嫄대꼫?곌퀬 API ???ㅼ젙?쇰줈 ?대룞?⑸땲??",
    continueToProviderSettings: "API ???ㅼ젙?쇰줈 ?대룞",
    continueToOllama: "Ollama ?ㅼ젙?쇰줈 ?대룞",
    cloudBackendPending: "?대씪?곕뱶 梨꾪똿 ?곌껐? ?ㅼ쓬 ?④퀎?먯꽌 援ы쁽?⑸땲??",
    localRuntimeReady: "Local runtime",
    cloudRuntimeReady: "?대씪?곕뱶 Provider",
    hasOverride: "override ?덉쓬",
    needsKey: "???ㅼ젙 ?꾩슂",
    defaultKey: "湲곕낯 .env",
  },
  en: {
    localModeLocalOnlyTitle: "Local only",
    localModeLocalOnlyBody: "Run the assistant only on this computer without internet use.",
    localModeCloudOnlyTitle: "Cloud only",
    localModeCloudOnlyBody: "Start with OpenAI/Gemini APIs and skip the Ollama install path.",
    localModeHybridTitle: "Local + cloud hybrid",
    localModeHybridBody: "Use local models by default, then add APIs and Google Workspace later.",
    recommended: "Recommended",
    localModels: "Local models",
    cloudModels: "Cloud models",
    bestMatch: "Best match",
    selected: "Selected",
    selectModel: "Select model",
    comingSoon: "Coming soon",
    customOllama: "Custom Ollama model",
    customOllamaBody: "Manual model-name entry will be added in a later step.",
    provider: "Provider",
    providerStatus: "Provider status",
    localHeader: "LOCAL",
    cloudHeader: "CLOUD",
    localDataNotice: "Data stays on this PC.",
    cloudDataNotice: "Messages are sent to the selected external provider.",
    apiKeysNext: "Cloud models skip Ollama setup and continue to API key settings.",
    continueToProviderSettings: "Continue to API keys",
    continueToOllama: "Continue to Ollama",
    cloudBackendPending: "Cloud chat routing will be implemented in the next backend step.",
    localRuntimeReady: "Local runtime",
    cloudRuntimeReady: "Cloud provider",
    hasOverride: "Override set",
    needsKey: "Key needed",
    defaultKey: "Default .env",
  },
} satisfies Record<Locale, Record<string, string>>;

type ModelDownloadProgress = {
  model: string;
  status: string;
  completed?: number | null;
  total?: number | null;
  percent?: number | null;
  done: boolean;
  error?: string | null;
};

const modelCatalog: ModelInfo[] = [
  {
    id: "qwen3-4b",
    name: "qwen3:4b",
    label: "Qwen3 4B",
    category: "Default",
    summary: {
      ko: "?쒓뎅???묐떟怨??쇰컲 鍮꾩꽌 ?묒뾽??媛??臾대궃??1李?異붿쿇 紐⑤뜽?낅땲??",
      en: "The safest Phase 1 default for Korean and general assistant work.",
    },
    bestFor: {
      ko: "?쇱젙 ?뺣━, 湲?곌린, ?쇰컲 吏덈Ц",
      en: "Planning, writing, general questions",
    },
    recommendedRamGb: 12,
  },
  {
    id: "exaone3.5-2.4b",
    name: "exaone3.5:2.4b",
    label: "EXAONE 3.5 2.4B",
    category: "Korean / compact",
    summary: {
      ko: "EXAONE 3.5 2.4B is a compact bilingual Korean and English model from LG AI Research.",
      en: "A compact Korean/English bilingual model from LG AI Research, suitable for small-device local testing.",
    },
    bestFor: {
      ko: "Korean chat, lightweight local assistant, lower-spec PCs",
      en: "Korean chat, lightweight local assistant, lower-spec PCs",
    },
    recommendedRamGb: 8,
    downloadSizeLabel: "1.6 GB",
  },
  {
    id: "exaone3.5-7.8b",
    name: "exaone3.5:7.8b",
    label: "EXAONE 3.5 7.8B",
    category: "Korean / higher quality",
    summary: {
      ko: "EXAONE 3.5 7.8B is a larger bilingual Korean and English model for better local answer quality.",
      en: "A larger Korean/English bilingual local model for better answer quality when the PC has enough memory.",
    },
    bestFor: {
      ko: "Korean assistant quality, writing, long-context tests",
      en: "Korean assistant quality, writing, long-context tests",
    },
    recommendedRamGb: 16,
    downloadSizeLabel: "4.8 GB",
  },
  {
    id: "llama3.2-3b",
    name: "llama3.2:3b",
    label: "Llama 3.2 3B",
    category: "Low-spec",
    summary: {
      ko: "RAM ?ъ쑀媛 ?곴굅??鍮좊Ⅸ ?뚯뒪?멸? ?꾩슂?????곌린 醫뗭? ?묒? 紐⑤뜽?낅땲??",
      en: "A compact model for lower-spec PCs or quick setup tests.",
    },
    bestFor: {
      ko: "鍮좊Ⅸ ??? ??? ?ъ뼇 PC",
      en: "Fast casual chat, lower-spec PCs",
    },
    recommendedRamGb: 8,
  },
  {
    id: "gemma3-4b",
    name: "gemma3:4b",
    label: "Gemma 3 4B",
    category: "Balanced",
    summary: {
      ko: "媛踰쇱슫 踰붿슜 鍮꾩꽌 ?꾨낫?낅땲?? ?곸뼱 以묒떖 ?ъ슜?먮뒗 ??덉쑝濡??뚯뒪?명븷 留뚰빀?덈떎.",
      en: "A lightweight general assistant candidate, especially worth testing for English-first use.",
    },
    bestFor: {
      ko: "踰붿슜 ??? 媛꾨떒???낅Т 蹂댁“",
      en: "General chat, light productivity support",
    },
    recommendedRamGb: 12,
  },
  {
    id: "phi3-mini",
    name: "phi3:mini",
    label: "Phi-3 Mini",
    category: "Ultralight",
    summary: {
      ko: "理쒖냼 ?ъ뼇 ?뚯뒪?몄슜 珥덇꼍??紐⑤뜽?낅땲?? ?덉쭏蹂대떎 ?ㅽ뻾 媛?μ꽦???곗꽑?⑸땲??",
      en: "An ultralight fallback that prioritizes running locally over answer quality.",
    },
    bestFor: {
      ko: "Minimum-spec checks and install verification",
      en: "Minimum-spec checks, install verification",
    },
    recommendedRamGb: 8,
  },
];

const cloudModelCatalog: CloudModelInfo[] = [
  {
    id: "gemini-2.5-pro",
    provider: "gemini",
    label: "Gemini 2.5 Pro",
    category: "Stable large model",
    summary: {
      ko: "?덉쭏???곗꽑?????곌린 醫뗭? ?덉젙?곸씤 ???Gemini 紐⑤뜽?낅땲?? 1M+ 而⑦뀓?ㅽ듃 ?묒뾽???쇰몢???〓땲??",
      en: "A stable large Gemini model for higher-quality assistant work with a 1M+ context window.",
    },
    bestFor: {
      ko: "High-quality answers, long context, Google Workspace preparation",
      en: "High-quality answers, long context, Google Workspace preparation",
    },
    status: {
      ko: "API ???꾩슂",
      en: "API key required",
    },
  },
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    label: "Gemini 2.5 Flash",
    category: "Balanced cloud",
    summary: {
      ko: "?띾룄? ?덉쭏??洹좏삎??醫뗭븘 湲곕낯?곸씤 ?대씪?곕뱶 鍮꾩꽌 ?뚯뒪?몄뿉 ?곹빀??Gemini 紐⑤뜽?낅땲??",
      en: "A balanced Gemini model for everyday cloud assistant testing.",
    },
    bestFor: {
      ko: "General chat, quick work support, Google Workspace preparation",
      en: "General chat, quick work support, Google Workspace preparation",
    },
    status: {
      ko: "API ???꾩슂",
      en: "API key required",
    },
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o mini",
    category: "Balanced cloud",
    summary: {
      ko: "媛踰쇱슫 鍮꾩슜/?띾룄 湲곗??쇰줈 ?쇰컲 鍮꾩꽌 ?묒뾽???곌린 醫뗭? ?대씪?곕뱶 紐⑤뜽 ?꾨낫?낅땲??",
      en: "A balanced cloud candidate for general assistant tasks with lightweight cost and latency.",
    },
    bestFor: {
      ko: "?쇰컲 鍮꾩꽌, 湲?곌린, ?낅Т 蹂댁“",
      en: "General assistant, writing, work support",
    },
    status: {
      ko: "API ???꾩슂",
      en: "API key required",
    },
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    label: "GPT-4.1 mini",
    category: "Reasoning cloud",
    summary: {
      ko: "臾몄꽌/?낅Т 蹂댁“泥섎읆 ?덉쭏??議곌툑 ???곗꽑???뚯쓽 ?대씪?곕뱶 ?꾨낫?낅땲??",
      en: "A cloud candidate for document and work support when quality matters more.",
    },
    bestFor: {
      ko: "臾몄꽌, ?대찓?? 媛踰쇱슫 遺꾩꽍",
      en: "Documents, email, light analysis",
    },
    status: {
      ko: "?꾩냽 ?곌껐",
      en: "Later integration",
    },
  },
  {
    id: "gemini-2.5-flash-lite",
    provider: "gemini",
    label: "Gemini 2.5 Flash Lite",
    category: "Fast lightweight",
    summary: {
      ko: "鍮좊Ⅴ怨?媛踰쇱슫 ?묐떟???꾩슂?섍굅??Pro/Flash ?쒕룄 ?뚯쭊 ???泥댄븯湲?醫뗭? Gemini 紐⑤뜽?낅땲??",
      en: "A faster, lighter Gemini fallback for low-latency and quota-sensitive testing.",
    },
    bestFor: {
      ko: "Fast responses, lightweight assistant tasks, quota fallback",
      en: "Fast responses, lightweight assistant tasks, quota fallback",
    },
    status: {
      ko: "API ???꾩슂",
      en: "API key required",
    },
  },
  {
    id: "custom-cloud",
    provider: "openai",
    label: "Custom API Model",
    category: "Placeholder",
    summary: {
      ko: "?ъ슜?먭? 吏곸젒 紐⑤뜽 ?대쫫怨?Provider瑜??ｋ뒗 ?듭뀡? 異뷀썑 異붽??⑸땲??",
      en: "Manual provider and model-name entry will be added later.",
    },
    bestFor: {
      ko: "?ъ슜??吏???대씪?곕뱶 Provider",
      en: "Custom cloud provider setup",
    },
    status: {
      ko: "Coming soon",
      en: "Coming soon",
    },
  },
];

const steps: Array<{ id: StepId; label: string; detail: string }> = [
  { id: "welcome", label: "Welcome", detail: "Start" },
  { id: "survey", label: "Survey", detail: "Needs" },
  { id: "hardware", label: "Hardware", detail: "PC check" },
  { id: "recommendation", label: "Recommendation", detail: "Best model" },
  { id: "ollama", label: "Ollama", detail: "Runtime" },
  { id: "clawCode", label: "Claw Code", detail: "Optional" },
  { id: "download", label: "Download", detail: "Local model" },
  { id: "chat", label: "Chat", detail: "Test" },
];

const settingsSections: Array<{ id: SettingsSection; label: string; detail: string; icon: string }> = [
  { id: "general", label: "General", detail: "Language, storage, assistant", icon: "settings" },
  { id: "aiModels", label: "AI models", detail: "Provider, model, API keys", icon: "memory" },
  { id: "security", label: "Security", detail: "Privacy and key policy", icon: "shield" },
  { id: "logs", label: "Logs", detail: "Local app activity", icon: "article" },
];

const studioSections: Array<{ id: StudioSection; label: string; detail: string; icon: string }> = [
  { id: "myAssistants", label: "My Assistants", detail: "Saved assistants", icon: "supervisor_account" },
  { id: "overview", label: "Overview", detail: "Assistant build status", icon: "dashboard" },
  { id: "models", label: "Models", detail: "Browse and download", icon: "deployed_code_update" },
  { id: "prompts", label: "Prompts", detail: "Persona and instructions", icon: "edit_note" },
  { id: "character", label: "2D character", detail: "Avatar and expressions", icon: "face" },
  { id: "tts", label: "TTS / Voice", detail: "Speech settings", icon: "record_voice_over" },
  { id: "googleWorkspace", label: "Google Workspace", detail: "Calendar, Gmail, Drive", icon: "workspaces" },
  { id: "tools", label: "Tools", detail: "MCP, skills, APIs", icon: "extension" },
];

const copy = {
  ko: {
    appSubtitle: "Install and test an AI assistant on this computer",
    studioMode: "Studio",
    setupMode: "?ㅼ젙",
    runtimeMode: "?ㅽ뻾",
    enterMiVA: "MiVA ?쒖옉?섍린",
    assistantWorkspace: "鍮꾩꽌 ?뚰겕?ㅽ럹?댁뒪",
    newChat: "New chat",
    recentConversations: "Recent conversations",
    savedSnippets: "??ν븳 ?댁슜",
    systemLogs: "?쒖뒪??濡쒓렇",
    backToSetup: "Back to setup",
    setupFlow: "?ㅼ젙 ?먮쫫",
    setupFlowSubtitle: "AI 珥덇린 ?ㅼ젙",
    settings: "?ㅼ젙",
    localOnly: "濡쒖뺄 ?꾩슜",
    language: "?몄뼱",
    welcomeTitle: "Welcome to MiVA",
    welcomeBody:
      "??而댄벂???덉뿉?쒕쭔 ?묐룞?섎뒗 媛쒖씤 AI 鍮꾩꽌?낅땲?? ?곗씠?곌? ?몃?濡??섍?吏 ?딅뒗 濡쒖뺄 ?섍꼍?먯꽌 鍮좊Ⅴ怨??덉쟾??AI ?ъ슜 寃쏀뿕???쒖옉?섏꽭??",
    startSetup: "?ㅼ젙 ?쒖옉",
    estimatedTime: "Estimated time: 5 minutes",
    continue: "怨꾩냽",
    back: "?ㅻ줈",
    privacyTitle: "100% Private",
    privacyBody: "紐⑤뱺 泥섎━???ъ슜?먯쓽 而댄벂?곗뿉??濡쒖뺄濡??ㅽ뻾?⑸땲??",
    hardwarePrivacyBody: "1李?踰꾩쟾? 濡쒓렇???놁씠 ?숈옉?섎ŉ, ?ㅻЦ ?듬?怨?PC ?뺣낫???????덉뿉?쒕쭔 異붿쿇???ъ슜?⑸땲??",
    localModelTitle: "留ㅼ슦 鍮좊쫫",
    localModelBody: "?대씪?곕뱶 ?쒕쾭瑜?嫄곗튂吏 ?딆븘 ??鍮좊Ⅸ ?묐떟??湲곕??????덉뒿?덈떎.",
    guidedTitle: "No Internet",
    guidedBody: "紐⑤뜽 ?ㅼ튂 ?꾩뿉???곌껐 ?놁씠??濡쒖뺄?먯꽌 ?ъ슜?????덉뒿?덈떎.",
    surveyTitle: "?대뼡 AI 鍮꾩꽌媛 ?꾩슂?섏꽭??",
    surveyBody: "媛??媛源뚯슫 ?ъ슜 紐⑹쟻??怨좊Ⅴ硫?MiVA媛 媛踰쇱슫 紐⑤뜽 以묒뿉???곗꽑 異붿쿇??怨꾩궛?⑸땲??",
    surveyPageTitle: "?섎쭔??MiVA ?ㅼ젙?섍린",
    surveyProgress: "吏덈Ц",
    selectOne: "Choose one",
    selectMany: "Choose any that apply",
    previousQuestion: "?댁쟾",
    nextQuestion: "?ㅼ쓬",
    nextHardware: "?ㅼ쓬: ?섎뱶?⑥뼱 ?뺤씤",
    proTipTitle: "Pro Tip",
    proTipBody: "???ㅼ젙? ?ㅼ튂媛 ?앸궃 ?ㅼ뿉???몄젣?좎? 諛붽? ???덉뒿?덈떎.",
    advancedOptionsTitle: "異붽? ?ㅼ젙 ?듭뀡",
    advancedOptionsBody: "AI 湲곕뒫???몃? ?ㅼ젙??議곗젙?섎뒗 ?붾㈃?낅땲?? 1李?踰꾩쟾?먯꽌???몄뼱? 濡쒖뺄 ?ㅼ젙遺???쒓났?섍퀬, ?댄썑 Google Workspace? ?꾧뎄 ?곌껐 ?ㅼ젙?쇰줈 ?뺤옣?⑸땲??",
    advancedOptionsButton: "異붽? ?ㅼ젙 ?닿린",
    priorityTitle: "臾댁뾿?????곗꽑?좉퉴??",
    answerStyleTitle: "?듬?? ?대뼡 ?ㅽ??쇱씠 醫뗫굹??",
    languageUseTitle: "二쇰줈 ?대뼡 ?몄뼱濡??ъ슜???덉젙?멸???",
    localModeTitle: "MiVA瑜??대뼡 諛⑹떇?쇰줈 ?곌퀬 ?띕굹??",
    futureFeatureTitle: "?섏쨷??愿???덈뒗 湲곕뒫? 臾댁뾿?멸???",
    memorySyncTitle: "다른 기기에서 이 비서를 어떻게 이어쓸까요?",
    profileOnlyMemory: "Settings sync only",
    profileOnlyMemoryBody: "AI 비서 설정만 유지합니다.",
    summaryMemory: "Summary memory sync",
    summaryMemoryBody: "요약된 기억도 함께 유지합니다.",
    balanced: "洹좏삎",
    balancedBody: "?띾룄? ?듬? ?덉쭏???곷떦??留욎땅?덈떎.",
    speed: "?띾룄",
    speedBody: "媛踰쇱슫 紐⑤뜽怨?吏㏃? ?듬????곗꽑?⑸땲??",
    quality: "?듬? ?덉쭏",
    qualityBody: "議곌툑 ?먮젮????醫뗭? ?듬????곗꽑?⑸땲??",
    shortAnswer: "吏㏐퀬 諛붾줈 ?듬?",
    shortAnswerBody: "?듭떖留?鍮좊Ⅴ寃??뺣━?⑸땲??",
    moderateAnswer: "?곷떦???ㅻ챸",
    moderateAnswerBody: "吏㏃? ?ㅻ챸怨??꾩슂??留λ씫???④퍡 ?쒓났?⑸땲??",
    detailedAnswer: "?먯꽭???ㅻ챸",
    detailedAnswerBody: "諛곌꼍怨??④퀎源뚯? ?먯꽭????댁꽌 ?ㅻ챸?⑸땲??",
    koreanMain: "?쒓뎅??以묒떖",
    koreanMainBody: "?쒓뎅??吏덈Ц怨??듬???二쇰줈 ?ъ슜?⑸땲??",
    englishMain: "?곸뼱 以묒떖",
    englishMainBody: "?곸뼱 ?먮즺? ?듬???二쇰줈 ?ъ슜?⑸땲??",
    bilingualMain: "Korean and English",
    bilingualMainBody: "?곹솴???곕씪 ???몄뼱瑜??④퍡 ?ъ슜?⑸땲??",
    localOnlyMode: "Local only",
    localOnlyModeBody: "紐⑤뱺 ?ъ슜????而댄벂???덉뿉???앸궡怨??띠뒿?덈떎.",
    localAfterSetupMode: "?ㅼ튂 ??濡쒖뺄 ?묐룞?대㈃ 異⑸텇",
    localAfterSetupModeBody: "?ㅼ슫濡쒕뱶/?ㅼ튂 ?꾩뿉??濡쒖뺄?먯꽌 ?묐룞?섎㈃ ?⑸땲??",
    futureIntegrationsMode: "Future integrations are okay",
    futureIntegrationsModeBody: "Google Workspace, API, ?꾧뎄 ?곌껐???댄썑??怨좊젮?????덉뒿?덈떎.",
    voiceFeature: "Voice chat",
    voiceFeatureBody: "留덉씠?ъ? ?뚯꽦 ?묐떟???ъ슜?섎뒗 鍮꾩꽌",
    characterFeature: "AI 罹먮┃???붾㈃",
    characterFeatureBody: "?붾㈃??罹먮┃?곕? ?꾩슦??鍮꾩꽌",
    googleFeature: "Google Calendar / Gmail ?곕룞",
    googleFeatureBody: "Google Workspace CLI 湲곕컲 ?꾩냽 湲곕뒫 ?꾨낫",
    filesFeature: "臾몄꽌/?뚯씪 ?쎄린",
    filesFeatureBody: "濡쒖뺄 ?뚯씪???쎄퀬 ?뺣━?섎뒗 鍮꾩꽌",
    toolsFeature: "?몃? ?꾧뎄 ?곌껐",
    toolsFeatureBody: "MCP, agent skills, ?몃? API ?곌껐",
    unsureFeature: "??紐⑤Ⅴ寃좎쓬",
    unsureFeatureBody: "吏湲덉? 湲곕낯 濡쒖뺄 鍮꾩꽌遺???쒖옉?⑸땲??",
    daily: "Daily planning",
    dailyBody: "?쇱젙, ???? 硫붾え ?뺣━瑜??꾩?二쇰뒗 鍮꾩꽌",
    study: "怨듬?/湲?곌린",
    studyBody: "?붿빟, 珥덉븞 ?묒꽦, ?ㅻ챸???꾩?二쇰뒗 鍮꾩꽌",
    work: "?낅Т 蹂댁“",
    workBody: "硫붿씪 珥덉븞, 臾몄꽌 ?뺣━, 媛꾨떒??遺꾩꽍 蹂댁“",
    fast: "Fast chat",
    fastBody: "遺???놁씠 鍮좊Ⅴ寃?吏덈Ц?섍퀬 ?듯븯??鍮꾩꽌",
    character: "罹먮┃??鍮꾩꽌",
    characterBody: "?섏쨷??踰꾩텛??罹먮┃?곗? ?뚯꽦?쇰줈 ?뺤옣??鍮꾩꽌",
    hardwareTitle: "?섎뱶?⑥뼱 ?뺤씤",
    hardwareBody: "??而댄벂?곌? ?대뒓 ?뺣룄??濡쒖뺄 AI 紐⑤뜽???ㅽ뻾?????덈뒗吏 ?뺤씤?⑸땲?? ?쒖뒪???뺣낫瑜?遺꾩꽍????遺?쒕윭??寃쏀뿕???꾪븳 紐⑤뜽??異붿쿇?⑸땲??",
    scanPc: "Scan PC",
    checking: "Checking",
    detected: "Detected",
    unknown: "?????놁쓬",
    processor: "?꾨줈?몄꽌",
    memory: "Memory",
    graphics: "洹몃옒??GPU)",
    disk: "?붿뒪??怨듦컙",
    verdict: "?먯젙",
    highEnd: "High-end",
    great: "Great",
    good: "?묓샇",
    basic: "湲곕낯",
    limited: "Limited",
    optimal: "理쒖쟻",
    driveDetected: "?쒕씪?대툕 媛먯?",
    healthy: "?뺤긽",
    used: "Used",
    cores: "肄붿뼱",
    vramUsage: "VRAM usage",
    vramPlaceholder: "Waiting for measurement",
    modelCapacity: "紐⑤뜽 ?⑸웾",
    modelCapacityBody: "?꾩옱 ?ъ쑀 怨듦컙?쇰줈 ??{count}媛쒖쓽 媛踰쇱슫 濡쒖뺄 鍮꾩꽌 紐⑤뜽??蹂닿??????덉뒿?덈떎. ??紐⑤뜽 湲곗?? 異뷀썑 ?몃? 湲곗????뺤젙?⑸땲??",
    cpuVerdictHigh: "硫?고깭?ㅽ궧怨?濡쒖뺄 AI 異붾줎??留ㅼ슦 ?곹빀?⑸땲??",
    cpuVerdictGood: "媛踰쇱슫 濡쒖뺄 AI 紐⑤뜽 ?ㅽ뻾??異⑸텇???꾨줈?몄꽌?낅땲??",
    cpuVerdictBasic: "?묒? 紐⑤뜽 ?뚯뒪?몄뿉???곹빀?섏?留??숈떆 ?묒뾽? ?쒗븳?????덉뒿?덈떎.",
    memoryVerdictGreat: "蹂듭옟??濡쒖뺄 紐⑤뜽源뚯? ?ㅽ뻾?????덈뒗 ?ъ쑀 硫붾え由ъ엯?덈떎.",
    memoryVerdictGood: "媛踰쇱슫 濡쒖뺄 鍮꾩꽌 紐⑤뜽 ?ㅽ뻾??異⑸텇??硫붾え由ъ엯?덈떎.",
    memoryVerdictLimited: "珥덇꼍??紐⑤뜽遺???뚯뒪?명븯???몄씠 醫뗭뒿?덈떎.",
    gpuVerdictDetected: "GPU??媛먯??섏뿀吏留?VRAM ?섏튂???꾩쭅 placeholder?낅땲?? 異뷀썑 VRAM 媛먯?瑜?異붽??섎㈃ ???뺥솗??異붿쿇??媛?ν빀?덈떎.",
    gpuVerdictMissing: "?꾩슜 GPU ?뺣낫瑜??뺤씤?섏? 紐삵뻽?듬땲?? 1李?異붿쿇? CPU? RAM 湲곗??쇰줈 怨꾩궛?⑸땲??",
    gpuMissing: "Missing",
    noSupportedGpu: "No supported GPU detected",
    systemVerificationComplete: "?쒖뒪???뺤씤 ?꾨즺",
    hardwareMinimumMet: "MiVA 1李?濡쒖뺄 鍮꾩꽌 ?ㅽ뻾???꾪븳 湲곕낯 ?뺤씤???앸궗?듬땲??",
    continueRecommendations: "異붿쿇 寃곌낵濡??대룞",
    totalRam: "?꾩껜 RAM",
    available: "Available",
    recommendationTitle: "異붿쿇 紐⑤뜽",
    recommendationBody: "?ㅻЦ ?듬?怨??꾩옱 PC ?뺣낫瑜?湲곗??쇰줈 1李?紐⑤뜽??異붿쿇?덉뒿?덈떎.",
    selectThis: "??紐⑤뜽 ?ъ슜",
    alternatives: "???紐⑤뜽",
    reasonNeed: "?좏깮???ъ슜 紐⑹쟻??留욎뒿?덈떎.",
    reasonRam: "?꾩옱 硫붾え由?踰붿쐞?먯꽌 ?ㅽ뻾 媛?μ꽦???믪뒿?덈떎.",
    reasonSpeed: "鍮좊Ⅸ ?묐떟???곗꽑?섎뒗 ?좏깮??留욎뒿?덈떎.",
    ollamaTitle: "Ollama ?ㅽ뻾 ?섍꼍",
    ollamaBody: "MiVA??Ollama瑜?濡쒖뺄 紐⑤뜽 ?ㅽ뻾 ?붿쭊?쇰줈 ?ъ슜?⑸땲?? 紐⑤뜽 ?먯껜媛 ?꾨땲??紐⑤뜽???ㅽ뻾?섎뒗 ?꾨줈洹몃옩?낅땲??",
    installOllama: "Ollama ?ㅼ튂",
    startOllama: "Ollama ?쒖옉",
    refresh: "?덈줈怨좎묠",
    running: "Running",
    stopped: "Installed, not running",
    missing: "?ㅼ튂 ?꾩슂",
    activity: "?쒕룞",
    noLogs: "?꾩쭅 ?쒕룞???놁뒿?덈떎.",
    downloadTitle: "紐⑤뜽 ?ㅼ슫濡쒕뱶",
    downloadBody: "?좏깮??紐⑤뜽??Ollama 湲곕낯 ????꾩튂???ㅼ슫濡쒕뱶?⑸땲?? 1李?踰꾩쟾?먯꽌??????꾩튂瑜?諛붽씀吏 ?딆뒿?덈떎.",
    downloadModel: "紐⑤뜽 ?ㅼ슫濡쒕뱶",
    downloading: "?ㅼ슫濡쒕뱶 以?..",
    downloadProgressTitle: "Model download in progress",
    preparingDownload: "Preparing download",
    downloadComplete: "?ㅼ슫濡쒕뱶 ?꾨즺",
    downloadFailed: "?ㅼ슫濡쒕뱶 ?ㅽ뙣",
    close: "?リ린",
    downloaded: "Downloaded",
    downloadSize: "?ㅼ슫濡쒕뱶 ?ш린",
    installed: "Installed",
    notInstalled: "Not installed",
    modelStorage: "????꾩튂",
    defaultStorage: "Ollama 湲곕낯 紐⑤뜽 ????꾩튂 ?ъ슜",
    chatTitle: "Local Chat Sandbox",
    chatBody: "紐⑤뜽 ?ㅼ튂媛 ?앸굹硫?MiVA媛 ?ㅼ젣濡?濡쒖뺄?먯꽌 ?묐떟?섎뒗吏 ?뺤씤?⑸땲??",
    chatSandboxTitle: "濡쒖뺄 梨꾪똿 ?뚮뱶諛뺤뒪",
    chatSandboxBody: "濡쒖뺄 ?몄뒪?댁뒪媛 以鍮꾨릺?덉뒿?덈떎. ?곗씠?곕뒗 ??而댄벂??諛뽰쑝濡??섍?吏 ?딆뒿?덈떎. ?꾨옒?먯꽌 {model}??異붾줎 ?띾룄? ?듬? ?덉쭏???뚯뒪?명븯?몄슂.",
    chatGreeting: "?덈뀞?섏꽭?? ???MiVA?먯꽌 ?ㅽ뻾 以묒씤 濡쒖뺄 AI 鍮꾩꽌?낅땲?? {model} 紐⑤뜽??濡쒖뺄 ?섍꼍??遺덈윭?붿뒿?덈떎. ?ㅻ뒛? 臾댁뾿???꾩??쒕┫源뚯슂?",
    assistantStageTitle: "鍮꾩꽌 ?ㅽ뻾 ?붾㈃",
    assistantStageBody: "梨꾪똿, ?뚯꽦, 罹먮┃???쒗쁽???⑹퀜吏??ㅼ젣 MiVA ?ㅽ뻾 怨듦컙?낅땲??",
    characterPreview: "Character preview",
    characterPreviewBody: "1李⑥뿉?쒕뒗 ?곹깭 ?쒗쁽留??쒖떆?⑸땲?? Live2D/?뚯꽦 諛섏쓳? ?꾩냽 ?④퀎?먯꽌 ?곌껐?⑸땲??",
    characterIdle: "Idle",
    characterListening: "Waiting for input",
    localRuntime: "Local runtime",
    generatingResponse: "?듬? ?앹꽦 以?..",
    jumpToLatest: "理쒖떊 梨꾪똿?쇰줈 ?대룞",
    justNow: "Just now",
    suggestedAction: "異붿쿇 吏덈Ц",
    suggestedPrompt: "?꾩????섎뒗 濡쒕큸?????吏㏃? ?댁빞湲곕? ?ㅻ젮以?",
    latencyMetric: "吏???쒓컙: 45ms",
    tokensMetric: "?좏겙: 12.4 t/s",
    vramMetric: "VRAM: waiting",
    messagePlaceholder: "MiVA?먭쾶 臾쇱뼱蹂닿린...",
    send: "?꾩넚",
    noMessages: "?꾩쭅 硫붿떆吏媛 ?놁뒿?덈떎.",
    runtimeRequired: "Tauri ??李쎌뿉???ㅽ뻾?댁빞 濡쒖뺄 紐낅졊???ъ슜?????덉뒿?덈떎.",
    settingsTitle: "???ㅼ젙",
    settingsBody: "?몄뼱, 濡쒖뺄 紐⑤뜽, ?몃? AI Provider ?ㅻ? 愿由ы빀?덈떎. 諛고룷 ?꾩뿉??蹂댁븞 ??μ냼濡??댁쟾???덉젙?낅땲??",
    currentModel: "?꾩옱 紐⑤뜽",
    serviceStatus: "?쒕퉬???곹깭",
    installedModels: "?ㅼ튂??紐⑤뜽",
    providerKeysTitle: "AI Provider Keys",
    providerKeysBody: "鍮꾩썙?먮㈃ local-helper .env???덈뒗 媛쒕컻??湲곕낯 ?ㅻ? ?ъ슜?⑸땲?? ?낅젰?섎㈃ ???깆쓽 濡쒖뺄 override ?ㅻ줈 ??ν빀?덈떎.",
    openaiApiKey: "OpenAI API key",
    geminiApiKey: "Gemini API key",
    userOverrideKey: "User override key",
    defaultEnvKey: "湲곕낯 .env ???ъ슜",
    saveKeys: "Save keys",
    clearKeys: "??吏?곌린",
    keysSaved: "濡쒖뺄????λ맖",
    keyStorageNotice: "?꾩옱??媛쒕컻 ?뚯뒪?몄슜 localStorage ??μ엯?덈떎. 諛고룷 ?꾩뿉??OS 蹂댁븞 ??μ냼濡?援먯껜?댁빞 ?⑸땲??",
    none: "?놁쓬",
  },
  en: {
    appSubtitle: "A local setup app for installing and testing an AI assistant on this computer",
    setupMode: "Setup",
    studioMode: "Studio",
    runtimeMode: "Runtime",
    enterMiVA: "Enter MiVA",
    assistantWorkspace: "Assistant Workspace",
    newChat: "New Chat",
    recentConversations: "Recent Conversations",
    savedSnippets: "Saved Snippets",
    systemLogs: "System Logs",
    backToSetup: "Back to Setup",
    setupFlow: "Setup Flow",
    setupFlowSubtitle: "Initial Setup",
    settings: "Settings",
    localOnly: "Local only",
    language: "Language",
    welcomeTitle: "Welcome to MiVA",
    welcomeBody:
      "Your private, local-first AI assistant. Experience high-performance intelligence that lives entirely on your machine, ensuring your data never leaves your sight.",
    startSetup: "Start Setup",
    estimatedTime: "Estimated time: 5 Minutes",
    continue: "Continue",
    back: "Back",
    privacyTitle: "100% Private",
    privacyBody: "All processing happens locally on your hardware.",
    hardwarePrivacyBody: "Phase 1 runs without login. Survey answers and PC information are only used inside this app for recommendations.",
    localModelTitle: "Ultra Fast",
    localModelBody: "Zero latency from cloud servers. Instant responses.",
    guidedTitle: "No Internet",
    guidedBody: "Works perfectly without any connection needed.",
    surveyTitle: "What kind of AI assistant do you need?",
    surveyBody: "Pick the closest use case and MiVA will calculate a first recommendation from lightweight models.",
    surveyPageTitle: "Personalize your MiVA",
    surveyProgress: "Question",
    selectOne: "Choose one",
    selectMany: "Choose any that apply",
    previousQuestion: "Previous",
    nextQuestion: "Next",
    nextHardware: "Next: Hardware Check",
    proTipTitle: "Pro Tip",
    proTipBody: "You can change these preferences at any time after setup.",
    advancedOptionsTitle: "Advanced options",
    advancedOptionsBody: "This area will handle detailed AI feature settings. Phase 1 starts with language and local setup policy, then expands into Google Workspace and tool connections.",
    advancedOptionsButton: "Open advanced settings",
    priorityTitle: "What matters most?",
    answerStyleTitle: "What answer style do you prefer?",
    languageUseTitle: "Which language will you use most?",
    localModeTitle: "How do you want to use MiVA?",
    futureFeatureTitle: "Which future features interest you?",
    memorySyncTitle: "How should this assistant continue on other devices?",
    profileOnlyMemory: "Settings sync only",
    profileOnlyMemoryBody: "Sync assistant settings only.",
    summaryMemory: "Summary memory sync",
    summaryMemoryBody: "Sync assistant settings and summary memory.",
    balanced: "Balanced",
    balancedBody: "Balance speed and answer quality.",
    speed: "Speed",
    speedBody: "Prioritize lighter models and short answers.",
    quality: "Answer quality",
    qualityBody: "Prioritize stronger answers even if they are slower.",
    shortAnswer: "Short and direct",
    shortAnswerBody: "Get the point quickly.",
    moderateAnswer: "Moderate explanation",
    moderateAnswerBody: "Include short context when useful.",
    detailedAnswer: "Detailed explanation",
    detailedAnswerBody: "Explain background and steps more fully.",
    koreanMain: "Korean-first",
    koreanMainBody: "Mostly Korean questions and answers.",
    englishMain: "English-first",
    englishMainBody: "Mostly English sources and answers.",
    bilingualMain: "Korean and English",
    bilingualMainBody: "Use both languages depending on context.",
    localOnlyMode: "Local only, no internet",
    localOnlyModeBody: "Keep usage entirely on this computer.",
    localAfterSetupMode: "Local after setup",
    localAfterSetupModeBody: "Download/install first, then run locally.",
    futureIntegrationsMode: "Future integrations are okay",
    futureIntegrationsModeBody: "Google Workspace, APIs, and tools can be added later.",
    voiceFeature: "Voice chat",
    voiceFeatureBody: "Use microphone input and spoken responses.",
    characterFeature: "AI character screen",
    characterFeatureBody: "Show a virtual character on screen.",
    googleFeature: "Google Calendar / Gmail",
    googleFeatureBody: "Future Google Workspace CLI integration.",
    filesFeature: "Read documents/files",
    filesFeatureBody: "Use local files as assistant context.",
    toolsFeature: "External tools",
    toolsFeatureBody: "MCP, agent skills, and external APIs.",
    unsureFeature: "Not sure yet",
    unsureFeatureBody: "Start with the default local assistant.",
    daily: "Daily planning",
    dailyBody: "A helper for schedules, tasks, and notes",
    study: "Study/Writing",
    studyBody: "A helper for summaries, drafts, and explanations",
    work: "Work support",
    workBody: "A helper for emails, documents, and light analysis",
    fast: "Fast casual chat",
    fastBody: "A quick assistant for low-friction questions",
    character: "Character assistant",
    characterBody: "A future-ready assistant for avatar and voice expansion",
    hardwareTitle: "Hardware Check",
    hardwareBody: "Let's see what your machine is capable of. We analyze your system to suggest the best AI models for a smooth experience.",
    scanPc: "Rescan",
    checking: "Checking",
    detected: "Detected",
    unknown: "Unknown",
    processor: "Processor",
    memory: "Memory",
    graphics: "Graphics (GPU)",
    disk: "Disk Space",
    verdict: "Verdict",
    highEnd: "High-End",
    great: "Great",
    good: "Good",
    basic: "Basic",
    limited: "Limited",
    optimal: "Optimal",
    driveDetected: "Drive Detected",
    healthy: "Healthy",
    used: "Used",
    cores: "Cores",
    vramUsage: "VRAM Usage",
    vramPlaceholder: "Pending",
    modelCapacity: "Model Capacity",
    modelCapacityBody: "You have enough space for approx. {count} lightweight local assistant models. Large-model capacity rules are placeholders for now.",
    cpuVerdictHigh: "Excellent for multi-tasking and large-scale local AI inferencing.",
    cpuVerdictGood: "Strong enough for lightweight local assistant models.",
    cpuVerdictBasic: "Suitable for small-model tests, but multitasking may be limited.",
    memoryVerdictGreat: "Plenty of room for running even more complex local models.",
    memoryVerdictGood: "Enough memory for lightweight local assistant models.",
    memoryVerdictLimited: "Start with ultralight models first.",
    gpuVerdictDetected: "GPU detected, but VRAM is still a placeholder. A future VRAM check will make recommendations more precise.",
    gpuVerdictMissing: "Dedicated GPU details were not detected. Phase 1 recommendations use CPU and RAM first.",
    gpuMissing: "Missing",
    noSupportedGpu: "No supported GPU detected",
    systemVerificationComplete: "System Verification Complete",
    hardwareMinimumMet: "Basic checks for the MiVA Phase 1 local assistant are complete.",
    continueRecommendations: "Continue to Recommendations",
    totalRam: "Total RAM",
    available: "Available",
    recommendationTitle: "Recommended model",
    recommendationBody: "This first model choice is based on the survey and current PC information.",
    selectThis: "Use this model",
    alternatives: "Alternative models",
    reasonNeed: "Matches the selected assistant need.",
    reasonRam: "Fits the current memory range.",
    reasonSpeed: "Matches the speed-first preference.",
    ollamaTitle: "Ollama runtime",
    ollamaBody: "MiVA uses Ollama as the local model runner. Ollama is not the model; it is the program that runs models.",
    installOllama: "Install Ollama",
    startOllama: "Start Ollama",
    refresh: "Refresh",
    running: "Running",
    stopped: "Installed, not running",
    missing: "Needs install",
    activity: "Activity",
    noLogs: "No activity yet.",
    downloadTitle: "Download model",
    downloadBody: "Download the selected model into Ollama's default model storage. Phase 1 does not customize storage paths.",
    downloadModel: "Download model",
    downloading: "Downloading...",
    downloadProgressTitle: "Downloading model",
    preparingDownload: "Preparing download",
    downloadComplete: "Download complete",
    downloadFailed: "Download failed",
    close: "Close",
    downloaded: "Downloaded",
    downloadSize: "Download size",
    installed: "Installed",
    notInstalled: "Not installed",
    modelStorage: "Storage",
    defaultStorage: "Use Ollama's default model storage",
    chatTitle: "Local chat test",
    chatBody: "After the model is installed, confirm MiVA responds locally.",
    chatSandboxTitle: "Test Chat",
    chatSandboxBody: "Use this temporary chat to test the selected assistant before entering Runtime.",
    chatGreeting: "Hello! I'm your local AI assistant running on MiVA. I've successfully loaded the {model} model into your local memory. How can I help you today?",
    assistantStageTitle: "Assistant Runtime",
    assistantStageBody: "The future MiVA runtime space for chat, voice, and character expression.",
    characterPreview: "Character Preview",
    characterPreviewBody: "Phase 1 shows status expression only. Live2D and voice reactions will be connected later.",
    characterIdle: "Idle",
    characterListening: "Waiting for input",
    localRuntime: "Local Runtime",
    generatingResponse: "Generating response...",
    jumpToLatest: "Jump to latest chat",
    justNow: "Just now",
    suggestedAction: "Suggested Action",
    suggestedPrompt: "Tell me a short story about a helpful robot.",
    latencyMetric: "Latency: 45ms",
    tokensMetric: "Tokens: 12.4 t/s",
    vramMetric: "VRAM: Pending",
    messagePlaceholder: "Ask MiVA something...",
    send: "Send",
    noMessages: "No messages yet.",
    runtimeRequired: "Local commands only work inside the Tauri desktop window.",
    settingsTitle: "App settings",
    settingsBody: "Manage language, local model policy, and external AI provider keys. Secure storage comes before distribution.",
    currentModel: "Current model",
    serviceStatus: "Service status",
    installedModels: "Installed models",
    providerKeysTitle: "AI Provider Keys",
    providerKeysBody: "Leave fields empty to use the default development keys from local-helper .env. Enter a key to save a local override for this app.",
    openaiApiKey: "OpenAI API Key",
    geminiApiKey: "Gemini API Key",
    userOverrideKey: "User override key",
    defaultEnvKey: "Use default .env key",
    saveKeys: "Save keys",
    clearKeys: "Clear keys",
    keysSaved: "Saved locally",
    keyStorageNotice: "This currently uses localStorage for development testing. Replace it with OS secure storage before distribution.",
    none: "None",
  },
} satisfies Record<Locale, Record<string, string>>;

type CopyKey = keyof (typeof copy)["ko"];

type SurveyOption = {
  id: string;
  titleKey?: CopyKey;
  bodyKey?: CopyKey;
  title?: Record<Locale, string>;
  body?: Record<Locale, string>;
  icon: string;
};

type SurveyQuestionId = "useCase" | "answerStyle" | "priority" | "languageUse" | "localMode" | "futureFeatures" | "memorySyncMode";

type SurveyQuestion = {
  id: SurveyQuestionId;
  titleKey: CopyKey;
  helperKey: CopyKey;
  multi: boolean;
  columns: string;
  options: SurveyOption[];
};

const useCaseCards: SurveyOption[] = [
  { id: "daily", titleKey: "daily", bodyKey: "dailyBody", icon: "event_note" },
  { id: "study", titleKey: "study", bodyKey: "studyBody", icon: "edit_note" },
  { id: "work", titleKey: "work", bodyKey: "workBody", icon: "work_outline" },
  { id: "fast", titleKey: "fast", bodyKey: "fastBody", icon: "forum" },
  { id: "character", titleKey: "character", bodyKey: "characterBody", icon: "smart_toy" },
];

const answerStyleOptions: SurveyOption[] = [
  { id: "short", titleKey: "shortAnswer", bodyKey: "shortAnswerBody", icon: "bolt" },
  { id: "moderate", titleKey: "moderateAnswer", bodyKey: "moderateAnswerBody", icon: "subject" },
  { id: "detailed", titleKey: "detailedAnswer", bodyKey: "detailedAnswerBody", icon: "article" },
];

const priorityOptions: SurveyOption[] = [
  { id: "balanced", titleKey: "balanced", bodyKey: "balancedBody", icon: "tune" },
  { id: "speed", titleKey: "speed", bodyKey: "speedBody", icon: "speed" },
  { id: "quality", titleKey: "quality", bodyKey: "qualityBody", icon: "auto_awesome" },
];

const languageUseOptions: SurveyOption[] = [
  { id: "korean", titleKey: "koreanMain", bodyKey: "koreanMainBody", icon: "translate" },
  { id: "english", titleKey: "englishMain", bodyKey: "englishMainBody", icon: "language" },
  { id: "both", titleKey: "bilingualMain", bodyKey: "bilingualMainBody", icon: "forum" },
];

const localModeOptions: SurveyOption[] = [
  {
    id: "localOnly",
    title: {
      ko: providerUiCopy.ko.localModeLocalOnlyTitle,
      en: providerUiCopy.en.localModeLocalOnlyTitle,
    },
    body: {
      ko: providerUiCopy.ko.localModeLocalOnlyBody,
      en: providerUiCopy.en.localModeLocalOnlyBody,
    },
    icon: "lock",
  },
  {
    id: "cloudOnly",
    title: {
      ko: providerUiCopy.ko.localModeCloudOnlyTitle,
      en: providerUiCopy.en.localModeCloudOnlyTitle,
    },
    body: {
      ko: providerUiCopy.ko.localModeCloudOnlyBody,
      en: providerUiCopy.en.localModeCloudOnlyBody,
    },
    icon: "cloud",
  },
  {
    id: "hybrid",
    title: {
      ko: providerUiCopy.ko.localModeHybridTitle,
      en: providerUiCopy.en.localModeHybridTitle,
    },
    body: {
      ko: providerUiCopy.ko.localModeHybridBody,
      en: providerUiCopy.en.localModeHybridBody,
    },
    icon: "hub",
  },
];

const futureFeatureOptions: SurveyOption[] = [
  { id: "voice", titleKey: "voiceFeature", bodyKey: "voiceFeatureBody", icon: "mic" },
  { id: "character", titleKey: "characterFeature", bodyKey: "characterFeatureBody", icon: "smart_toy" },
  { id: "googleWorkspace", titleKey: "googleFeature", bodyKey: "googleFeatureBody", icon: "calendar_month" },
  { id: "files", titleKey: "filesFeature", bodyKey: "filesFeatureBody", icon: "folder_open" },
  { id: "tools", titleKey: "toolsFeature", bodyKey: "toolsFeatureBody", icon: "extension" },
  { id: "unsure", titleKey: "unsureFeature", bodyKey: "unsureFeatureBody", icon: "help" },
];

const memorySyncOptions: SurveyOption[] = [
  { id: "profileOnly", titleKey: "profileOnlyMemory", bodyKey: "profileOnlyMemoryBody", icon: "sync" },
  { id: "summaryMemory", titleKey: "summaryMemory", bodyKey: "summaryMemoryBody", icon: "memory" },
];

const surveyQuestions: SurveyQuestion[] = [
  { id: "useCase", titleKey: "surveyTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-2 xl:grid-cols-3", options: useCaseCards },
  { id: "answerStyle", titleKey: "answerStyleTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: answerStyleOptions },
  { id: "priority", titleKey: "priorityTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: priorityOptions },
  { id: "languageUse", titleKey: "languageUseTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: languageUseOptions },
  { id: "localMode", titleKey: "localModeTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: localModeOptions },
  { id: "memorySyncMode", titleKey: "memorySyncTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-2", options: memorySyncOptions },
  { id: "futureFeatures", titleKey: "futureFeatureTitle", helperKey: "selectMany", multi: true, columns: "grid-cols-2 xl:grid-cols-3", options: futureFeatureOptions },
];

function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error("MiVA Desktop must be opened through Tauri. Run `npm run tauri:dev`, not `npm run dev`.");
  }

  return invoke<T>(command, args);
}

function normalizeAssistantProfileStore(value: unknown): LocalAssistantProfileStore {
  if (!value || typeof value !== "object") {
    return emptyAssistantProfileStore;
  }

  const store = value as Partial<LocalAssistantProfileStore>;
  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    activeProfileId: typeof store.activeProfileId === "string" ? store.activeProfileId : null,
    profiles: Array.isArray(store.profiles) ? store.profiles.filter(Boolean) as LocalAssistantProfile[] : [],
    updatedAt: typeof store.updatedAt === "string" ? store.updatedAt : null,
  };
}

async function loadLocalAssistantProfileStore() {
  if (isTauriRuntime()) {
    const store = await invoke<unknown>("load_assistant_profile_store");
    return normalizeAssistantProfileStore(store);
  }

  const stored = window.localStorage.getItem(ASSISTANT_PROFILE_STORAGE_KEY);
  if (!stored) {
    return emptyAssistantProfileStore;
  }

  try {
    return normalizeAssistantProfileStore(JSON.parse(stored));
  } catch {
    return emptyAssistantProfileStore;
  }
}

async function saveLocalAssistantProfileStore(store: LocalAssistantProfileStore) {
  const normalized = normalizeAssistantProfileStore(store);
  if (isTauriRuntime()) {
    const saved = await invoke<unknown>("save_assistant_profile_store", { store: normalized });
    return normalizeAssistantProfileStore(saved);
  }

  window.localStorage.setItem(ASSISTANT_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function getModelByName(name: string) {
  return modelCatalog.find((model) => model.name === name) ?? modelCatalog[0];
}

function getCloudModelById(id: string) {
  return cloudModelCatalog.find((model) => model.id === id) ?? cloudModelCatalog[0];
}

function formatGb(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} GB`;
}

function formatBytes(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  return `${nextValue.toFixed(unitIndex >= 2 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatChatLatency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Latency: -";
  }

  if (value < 1000) {
    return `Latency: ${Math.round(value)} ms`;
  }

  return `Latency: ${(value / 1000).toFixed(1)} s`;
}

function formatLogTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function recommendModel(survey: SurveyState, hardware: HardwareInfo | null) {
  const ram = hardware?.totalMemoryGb ?? 0;

  if (ram > 0 && ram < 8) {
    return "phi3:mini";
  }

  if (survey.priority === "speed" || survey.answerStyle === "short" || survey.useCase === "fast") {
    return ram >= 12 ? "llama3.2:3b" : "phi3:mini";
  }

  if (survey.priority === "quality" || survey.useCase === "study" || survey.useCase === "work") {
    return ram >= 12 ? "qwen3:4b" : "llama3.2:3b";
  }

  if (survey.languageUse === "english") {
    return ram >= 12 ? "gemma3:4b" : "llama3.2:3b";
  }

  if (survey.useCase === "character" || survey.useCase === "daily") {
    return ram >= 12 ? "qwen3:4b" : "llama3.2:3b";
  }

  return ram >= 12 ? "gemma3:4b" : "llama3.2:3b";
}

function recommendCloudModel(survey: SurveyState) {
  if (survey.priority === "speed" || survey.useCase === "fast") {
    return "gemini-2.5-flash-lite";
  }

  if (survey.useCase === "work" || survey.useCase === "study" || survey.priority === "quality") {
    return "gemini-2.5-flash";
  }

  if (survey.futureFeatures.includes("googleWorkspace")) {
    return "gemini-2.5-flash";
  }

  return "gemini-2.5-flash";
}

function PrimaryButton({ children, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg bg-[#35607f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-[#c2c7ce] bg-white px-5 py-3 text-sm font-semibold text-[#35607f] transition hover:bg-[#f3f4f5] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_12px_30px_rgba(53,96,127,0.08)] ${className}`}>
      {children}
    </section>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "action" }) {
  const classes = {
    neutral: "bg-[#e1e3e4] text-[#42474d]",
    success: "bg-[#c9e8cb] text-[#334d38]",
    action: "bg-[#cae6ff] text-[#1c4b69]",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes[tone]}`}>{children}</span>;
}

function loadProviderKeys(): ProviderKeyState {
  if (typeof window === "undefined") {
    return emptyProviderKeys;
  }

  try {
    const saved = window.localStorage.getItem(PROVIDER_KEYS_STORAGE_KEY);
    if (!saved) {
      return emptyProviderKeys;
    }

    const parsed = JSON.parse(saved) as Partial<ProviderKeyState>;
    return {
      openai: typeof parsed.openai === "string" ? parsed.openai : "",
      gemini: typeof parsed.gemini === "string" ? parsed.gemini : "",
    };
  } catch {
    return emptyProviderKeys;
  }
}

function normalizeAuthSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as Partial<AuthSession>;
  const user = session.user as Partial<AuthUser> | undefined;
  if (
    typeof session.token !== "string" ||
    !user ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.displayName !== "string" ||
    (user.role !== "user" && user.role !== "admin")
  ) {
    return null;
  }

  return {
    token: session.token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      locale: typeof user.locale === "string" ? user.locale : "en",
    },
  };
}

function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    return normalizeAuthSession(JSON.parse(saved));
  } catch {
    return null;
  }
}

function loadOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "device_desktop_local";
  }

  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextId = `device_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
  window.localStorage.setItem(DEVICE_STORAGE_KEY, nextId);
  return nextId;
}

function loadRuntimeChatMessages(): ChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(RUNTIME_CHAT_STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved) as ChatMessage[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((message) => (
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string"
    ));
  } catch {
    return [];
  }
}

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

function normalizePromptSettings(value: unknown): PromptSettings {
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

  const scheduleMode: CalendarActionMode =
    scheduleRules.mode === "confirmBeforeAction" || scheduleRules.mode === "connectedActions" || scheduleRules.mode === "draftOnly"
      ? scheduleRules.mode
      : defaultPromptSettings.scheduleRules.mode;

  const normalizeWorkspacePolicy = (value: unknown): WorkspaceToolPolicy => (
    value === "askFirst" || value === "connectedOnly" || value === "disabled"
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
      googleWorkspaceCli: typeof toolConnections.googleWorkspaceCli === "boolean"
        ? toolConnections.googleWorkspaceCli
        : defaultPromptSettings.toolConnections.googleWorkspaceCli,
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
    safetyRules: normalizeStringList(source.safetyRules, defaultPromptSettings.safetyRules),
  };
}

function codingSettingsToCapability(settings: PromptSettings): LocalAssistantProfile["capabilities"]["coding"] {
  return {
    capability: settings.coding.capability,
    providerPolicy: settings.coding.providerPolicy,
    localExperimental: settings.coding.localExperimental,
    accessMode: settings.coding.accessMode,
    workspaceAllowlistRequired: settings.coding.workspaceAllowlistRequired,
  };
}

function normalizeMemoryCapability(
  value: Partial<LocalAssistantProfile["capabilities"]["memory"]> | undefined,
  syncMode: MemorySyncMode,
): LocalAssistantProfile["capabilities"]["memory"] {
  return {
    syncMode: value?.syncMode === "summaryMemory" ? "summaryMemory" : syncMode,
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

function normalizeProfileCapabilities(
  value: Partial<LocalAssistantProfile["capabilities"]> | undefined,
  settings: PromptSettings,
  memorySyncMode: MemorySyncMode = "profileOnly",
): LocalAssistantProfile["capabilities"] {
  const coding = value?.coding && typeof value.coding === "object"
    ? value.coding
    : codingSettingsToCapability(settings);

  return {
    voice: value?.voice ?? { enabled: false, sttProvider: null, ttsProvider: null },
    character: value?.character ?? { enabled: false, renderer: null, characterId: null },
    googleWorkspace: value?.googleWorkspace ?? { enabled: false, accountId: null, scopes: [] },
    files: value?.files ?? { enabled: false, allowedRoots: [] },
    tools: value?.tools ?? { enabled: false, enabledToolIds: [] },
    coding: {
      ...codingSettingsToCapability(settings),
      ...coding,
    },
    mcp: value?.mcp ?? { enabled: false, serverIds: [] },
    skills: value?.skills ?? { enabled: false, skillIds: [] },
    externalApis: value?.externalApis ?? { enabled: false, providerIds: [] },
    memory: normalizeMemoryCapability(value?.memory, memorySyncMode),
  };
}

function App() {
  const [appMode, setAppMode] = useState<AppMode>("setup");
  const [activeStep, setActiveStep] = useState<StepId>("welcome");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [studioSection, setStudioSection] = useState<StudioSection>("myAssistants");
  const [settingsReturnTarget, setSettingsReturnTarget] = useState<{ appMode: AppMode; activeStep: StepId }>({
    appMode: "studio",
    activeStep: "welcome",
  });
  const [authReturnTarget, setAuthReturnTarget] = useState<{ appMode: AppMode; activeStep: StepId }>({
    appMode: "studio",
    activeStep: "welcome",
  });
  const [survey, setSurvey] = useState<SurveyState>({
    useCase: null,
    answerStyle: null,
    priority: null,
    languageUse: null,
    localMode: null,
    futureFeatures: [],
    memorySyncMode: "profileOnly",
  });
  const [surveyQuestionIndex, setSurveyQuestionIndex] = useState(0);
  const [surveyTipExpanded, setSurveyTipExpanded] = useState(false);
  const [surveyTipContentVisible, setSurveyTipContentVisible] = useState(false);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [runtimeRequirements, setRuntimeRequirements] = useState<RuntimeRequirements | null>(null);
  const [runtimeRequirementsError, setRuntimeRequirementsError] = useState<string | null>(null);
  const [pythonInstallPath, setPythonInstallPath] = useState("");
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState("qwen3:4b");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("ollama");
  const [selectedCloudModel, setSelectedCloudModel] = useState("gemini-2.5-flash");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [authFlowState, setAuthFlowState] = useState<AuthFlowState>("idle");
  const [authFlowError, setAuthFlowError] = useState<string | null>(null);
  const [deviceAuthRequest, setDeviceAuthRequest] = useState<DeviceAuthStart | null>(null);
  const [cloudDevice, setCloudDevice] = useState<CloudDeviceRecord | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [testChatMessages, setTestChatMessages] = useState<ChatMessage[]>([]);
  const [runtimeChatMessages, setRuntimeChatMessages] = useState<ChatMessage[]>(() => loadRuntimeChatMessages());
  const [chatMetrics, setChatMetrics] = useState<ChatMetrics | null>(null);
  const [assistantPanelMinimized, setAssistantPanelMinimized] = useState(false);
  const [dismissedChatIntroKeys, setDismissedChatIntroKeys] = useState<string[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyState>(() => loadProviderKeys());
  const [providerKeysSaved, setProviderKeysSaved] = useState(false);
  const [profileDetailsDraft, setProfileDetailsDraft] = useState<ProfileDetailsDraft>(() => defaultProfileDetails);
  const [promptSettingsDraft, setPromptSettingsDraft] = useState<PromptSettings>(() => defaultPromptSettings);
  const [promptEditorMode, setPromptEditorMode] = useState<PromptEditorMode>("simple");
  const [toolsForAiOpen, setToolsForAiOpen] = useState(false);
  const [assistantProfileStore, setAssistantProfileStore] = useState<LocalAssistantProfileStore>(emptyAssistantProfileStore);
  const [activeLocalProfileId, setActiveLocalProfileId] = useState(DEFAULT_LOCAL_PROFILE_ID);
  const [assistantProfileLoaded, setAssistantProfileLoaded] = useState(false);
  const [assistantProfileSaveState, setAssistantProfileSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [assistantProfileError, setAssistantProfileError] = useState<string | null>(null);
  const [assistantProfileSyncState, setAssistantProfileSyncState] = useState<AssistantProfileSyncState>("idle");
  const [assistantProfileSyncMessage, setAssistantProfileSyncMessage] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [tauriRuntime] = useState(isTauriRuntime);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollChatRef = useRef(true);
  const assistantProfileSaveTimerRef = useRef<number | null>(null);
  const assistantProfileHydratedRef = useRef(false);
  const autoStartOllamaAttemptedRef = useRef(false);

  const t = copy[ACTIVE_LOCALE];
  const providerText = providerUiCopy[ACTIVE_LOCALE];
  const recommendedModel = useMemo(() => recommendModel(survey, hardware), [survey, hardware]);
  const recommendedCloudModel = useMemo(() => recommendCloudModel(survey), [survey]);
  const recommendedModelInfo = getModelByName(recommendedModel);
  const recommendedCloudModelInfo = getCloudModelById(recommendedCloudModel);
  const selectedModelInfo = getModelByName(selectedModel);
  const selectedCloudModelInfo = getCloudModelById(selectedCloudModel);
  const activeProviderMeta = providerMeta[selectedProvider];
  const activeProviderMode = activeProviderMeta.mode;
  const activeModelLabel = selectedProvider === "ollama" ? selectedModelInfo.label : selectedCloudModelInfo.label;
  const activeProviderLabel = activeProviderMeta.label;
  const cloudRecommended =
    survey.localMode === "cloudOnly" ||
    (survey.localMode === "hybrid" && (survey.priority === "quality" || survey.useCase === "work"));
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const installedModels = status?.installedModels ?? [];
  const selectedModelInstalled = installedModels.includes(selectedModel);
  const recommendedModelInstalled = installedModels.includes(recommendedModel);
  const serviceLabel = !status ? t.checking : status.running ? t.running : status.installed ? t.stopped : t.missing;
  const activeLocalProfile = assistantProfileStore.profiles.find((profile) => profile.id === activeLocalProfileId) ?? null;
  const promptProfileId = activeLocalProfile?.id ?? activeLocalProfileId;
  const chatIntroKey = `${selectedProvider}:${selectedProvider === "ollama" ? selectedModel : selectedCloudModel}:${promptProfileId}`;
  const showChatIntroCard = (selectedProvider !== "ollama" || selectedModelInstalled) && !dismissedChatIntroKeys.includes(chatIntroKey);
  const activeChatMessages = appMode === "runtime" ? runtimeChatMessages : testChatMessages;

  function log(message: string) {
    setLogs((current) => [`${formatLogTime()} ${message}`, ...current].slice(0, 40));
  }

  function updateChatMessages(mode: AppMode, updater: (current: ChatMessage[]) => ChatMessage[]) {
    if (mode === "runtime") {
      setRuntimeChatMessages(updater);
      return;
    }

    setTestChatMessages(updater);
  }

  function clearCurrentChat() {
    updateChatMessages(appMode, () => []);
    setChatInput("");
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }

  function saveProviderKeys() {
    window.localStorage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(providerKeys));
    setProviderKeysSaved(true);
    window.setTimeout(() => setProviderKeysSaved(false), 2000);
  }

  function clearProviderKeys() {
    setProviderKeys(emptyProviderKeys);
    window.localStorage.removeItem(PROVIDER_KEYS_STORAGE_KEY);
    setProviderKeysSaved(false);
  }

  async function fetchCloudJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${CLOUD_API_URL}${path}`, init);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }

    return response.json() as Promise<T>;
  }

  function getCloudHeaders(extraHeaders?: Record<string, string>) {
    return {
      ...(extraHeaders ?? {}),
      ...(authSession ? { authorization: `Bearer ${authSession.token}` } : {}),
    };
  }

  function saveAuthSession(session: AuthSession) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setAuthSession(session);
  }

  function clearAuthSession() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
    setCloudDevice(null);
    setDeviceAuthRequest(null);
    setAuthFlowState("idle");
    setAuthFlowError(null);
  }

  async function registerDeviceWithCloud() {
    const deviceId = loadOrCreateDeviceId();
    const deviceName = hardware?.osName
      ? `MiVA Desktop - ${hardware.osName}`
      : "MiVA Desktop";
    const response = await fetchCloudJson<{ device: CloudDeviceRecord }>("/devices", {
      method: "POST",
      headers: getCloudHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        id: deviceId,
        name: deviceName,
        os: hardware?.osName ?? navigator.platform ?? null,
        appVersion: "0.1.0",
        status: "connected",
        modelRuntime: {
          provider: selectedProvider,
          model: selectedProvider === "ollama" ? selectedModel : selectedCloudModel,
          ollamaRunning: Boolean(status?.running),
        },
      }),
    });
    setCloudDevice(response.device);
    log(`Registered desktop device: ${response.device.id}.`);
    return response.device;
  }

  async function recordRuntimeUsageEvent(event: {
    assistantProfileId: string | null;
    provider: ProviderId;
    model: string;
    inputChars: number;
    outputChars: number;
    durationMs: number;
    success: boolean;
  }) {
    await fetchCloudJson<{ ok: boolean; accepted: number }>("/usage/local-events", {
      method: "POST",
      headers: getCloudHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        events: [{
          deviceId: cloudDevice?.id ?? loadOrCreateDeviceId(),
          assistantProfileId: event.assistantProfileId,
          mode: providerMeta[event.provider].mode,
          provider: event.provider,
          model: event.model,
          inputChars: event.inputChars,
          outputChars: event.outputChars,
          durationMs: event.durationMs,
          success: event.success,
        }],
      }),
    });
  }

  async function startBrowserSignIn() {
    setAuthFlowState("opening");
    setAuthFlowError(null);

    try {
      const request = await fetchCloudJson<DeviceAuthStart>("/auth/device/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "miva-desktop" }),
      });

      setDeviceAuthRequest(request);
      setAuthFlowState("waiting");

      try {
        if (tauriRuntime) {
          await openUrl(request.verificationUrl);
        } else {
          window.open(request.verificationUrl, "_blank", "noopener,noreferrer");
        }
      } catch (openError) {
        setAuthFlowError(`Browser did not open automatically. Open this URL manually: ${request.verificationUrl}`);
        log(`Browser open failed: ${String(openError)}`);
      }

      log("Opened MiVA web sign-in in the system browser.");
    } catch (error) {
      const message = `Could not start browser sign-in: ${String(error)}`;
      setAuthFlowState("error");
      setAuthFlowError(message);
      log(message);
    }
  }

  async function submitDevLogin() {
    setAuthFlowState("opening");
    setAuthFlowError(null);

    try {
      const session = await fetchCloudJson<AuthSession>("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      saveAuthSession(session);
      setAuthFlowState("connected");
      log(`Signed in as ${session.user.email}.`);
    } catch (error) {
      const message = `Sign in failed: ${String(error)}`;
      setAuthFlowState("error");
      setAuthFlowError(message);
      log(message);
    }
  }

  function buildSystemPromptPreview(
    profile: Pick<LocalAssistantProfile, "useCase" | "answerStyle" | "priority" | "languageUse" | "localMode" | "futureFeatures" | "provider" | "model">,
    promptSettings: PromptSettings,
  ) {
    const languageLine = "Use English for this development build. Other locale preferences are stored for later localization.";

    return [
      "You are MiVA, the user's personal AI assistant.",
      languageLine,
      "Be practical, concise, and direct. If unsure, say so instead of inventing facts.",
      "User-friendly prompt setup:",
      `- Assistant purpose: ${promptSettings.simple.assistantPurpose}`,
      `- User-requested work: ${promptSettings.simple.desiredTasks}`,
      `- Preferred tone: ${promptSettings.simple.preferredTone}`,
      `- Avoidances: ${promptSettings.simple.avoidances}`,
      "Tools for AI:",
      `- Google Workspace CLI: ${promptSettings.toolConnections.googleWorkspaceCli ? "on" : "off"}. When on, MiVA may prepare Google Calendar, Gmail, Drive, and Workspace actions, but it must only say an action is done after the connected tool confirms completion.`,
      `- Daiso CLI: ${promptSettings.toolConnections.daisoCli ? "on" : "off"}. When on, MiVA may prepare approved Daiso CLI workflows, but it must only run or report actions after the connected tool confirms completion.`,
      "Coding policy:",
      `- Capability: ${codingCapabilityCopy[promptSettings.coding.capability]}.`,
      `- Model policy: ${codingProviderPolicyCopy[promptSettings.coding.providerPolicy]}.`,
      `- Access mode: ${codingAccessModeCopy[promptSettings.coding.accessMode]}.`,
      `- Workspace allowlist required: ${promptSettings.coding.workspaceAllowlistRequired ? "yes" : "no"}.`,
      `- Local coding experimental: ${promptSettings.coding.localExperimental ? "yes" : "no"}.`,
      promptSettings.coding.providerPolicy === "cloudRequired"
        ? "- Code editing and Claw Code must use a cloud API model unless the user explicitly enables advanced local experimental mode."
        : "- Local models may be used only within the selected read-only or limited coding policy.",
      `Persona: ${promptSettings.persona}`,
      `Role goal: ${promptSettings.roleGoal}`,
      `Use case: ${profile.useCase ?? "daily"}.`,
      `Answer style: ${profile.answerStyle ?? "moderate"}.`,
      `Priority: ${profile.priority ?? "balanced"}.`,
      `Operation mode: ${profile.localMode ?? "hybrid"}.`,
      `Future interests: ${profile.futureFeatures.length ? profile.futureFeatures.join(", ") : "none"}.`,
      "Response rules:",
      ...promptSettings.responseRules.map((rule) => `- ${rule}`),
      `Schedule policy: ${scheduleModeCopy[promptSettings.scheduleRules.mode]}`,
      `Schedule timezone: ${promptSettings.scheduleRules.timezone}.`,
      `Schedule reminder preference: ${promptSettings.scheduleRules.reminderPreference}`,
      `Google Workspace policy: ${workspacePolicyCopy[promptSettings.workspaceRules.googleWorkspace]}.`,
      `Calendar policy: ${workspacePolicyCopy[promptSettings.workspaceRules.calendar]}. Gmail policy: ${workspacePolicyCopy[promptSettings.workspaceRules.gmail]}. Drive policy: ${workspacePolicyCopy[promptSettings.workspaceRules.drive]}.`,
      "Safety rules:",
      ...promptSettings.safetyRules.map((rule) => `- ${rule}`),
      `Active provider: ${profile.provider}. Active model: ${profile.model}.`,
    ].join("\n");
  }

  function buildCurrentLocalAssistantProfile(status: LocalAssistantProfileStatus): LocalAssistantProfile {
    const providerModel = selectedProvider === "ollama" ? selectedModel : selectedCloudModel;
    const existing = assistantProfileStore.profiles.find((profile) => profile.id === activeLocalProfileId);
    const now = new Date().toISOString();
    const safeSurvey: SurveyState = {
      useCase: survey.useCase,
      answerStyle: survey.answerStyle,
      priority: survey.priority,
      languageUse: survey.languageUse,
      localMode: survey.localMode,
      futureFeatures: [...survey.futureFeatures],
      memorySyncMode: survey.memorySyncMode,
    };
    const promptSettings = normalizePromptSettings(promptSettingsDraft);
    const profileBase = {
      useCase: safeSurvey.useCase,
      answerStyle: safeSurvey.answerStyle,
      priority: safeSurvey.priority,
      languageUse: safeSurvey.languageUse,
      localMode: safeSurvey.localMode,
      futureFeatures: safeSurvey.futureFeatures,
      provider: selectedProvider,
      model: providerModel,
    };

    return {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      id: existing?.id ?? activeLocalProfileId,
      name: profileDetailsDraft.name.trim() || existing?.name || defaultProfileDetails.name,
      description: profileDetailsDraft.description.trim() || existing?.description || defaultProfileDetails.description,
      status,
      source: appMode === "runtime" ? "runtime" : "desktop-setup",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: status === "finalized" ? existing?.completedAt ?? now : null,
      locale: ACTIVE_LOCALE,
      ...profileBase,
      providerMode: activeProviderMode,
      modelLabel: activeModelLabel,
      survey: safeSurvey,
      recommendation: {
        localModel: recommendedModel,
        cloudModel: recommendedCloudModel,
        selectedProvider,
        selectedModel,
        selectedCloudModel,
        hardwareMemoryGb: hardware?.totalMemoryGb ?? null,
      },
      prompt: {
        profileId: existing?.id ?? activeLocalProfileId,
        systemPrompt: buildSystemPromptPreview(profileBase, promptSettings),
        settings: promptSettings,
        variables: {
          useCase: safeSurvey.useCase,
          answerStyle: safeSurvey.answerStyle,
          priority: safeSurvey.priority,
          languageUse: safeSurvey.languageUse,
          localMode: safeSurvey.localMode,
          futureFeatures: safeSurvey.futureFeatures,
          provider: selectedProvider,
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
        setupStep: activeStep,
        appMode,
        appVersion: "0.1.0",
        hardwareSnapshot: hardware,
      },
    };
  }

  async function saveCurrentLocalAssistantProfile(status: LocalAssistantProfileStatus) {
    const profile = buildCurrentLocalAssistantProfile(status);
    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: profile.id,
      profiles: [
        profile,
        ...assistantProfileStore.profiles.filter((item) => item.id !== profile.id),
      ],
      updatedAt: profile.updatedAt,
    };

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
      return profile;
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile save failed: ${message}`);
      throw error;
    }
  }

  async function persistLocalAssistantProfile(profile: LocalAssistantProfile) {
    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: profile.id,
      profiles: [
        profile,
        ...assistantProfileStore.profiles.filter((item) => item.id !== profile.id),
      ],
      updatedAt: profile.updatedAt,
    };

    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);
    const savedStore = await saveLocalAssistantProfileStore(nextStore);
    setAssistantProfileStore(savedStore);
    return savedStore;
  }

  async function createNewLocalAssistantProfile() {
    const now = new Date().toISOString();
    const id = `local_${Date.now()}`;
    const name = `MiVA Assistant ${assistantProfileStore.profiles.length + 1}`;
    const initialSurvey: SurveyState = {
      useCase: null,
      answerStyle: null,
      priority: null,
      languageUse: null,
      localMode: null,
      futureFeatures: [],
      memorySyncMode: "profileOnly",
    };
    const provider: ProviderId = "ollama";
    const providerModel = "qwen3:4b";
    const localRecommendation = recommendModel(initialSurvey, hardware);
    const cloudRecommendation = recommendCloudModel(initialSurvey);
    const promptSettings = defaultPromptSettings;
    const profileBase = {
      useCase: initialSurvey.useCase,
      answerStyle: initialSurvey.answerStyle,
      priority: initialSurvey.priority,
      languageUse: initialSurvey.languageUse,
      localMode: initialSurvey.localMode,
      futureFeatures: initialSurvey.futureFeatures,
      provider,
      model: providerModel,
    };
    const profile: LocalAssistantProfile = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      id,
      name,
      description: defaultProfileDetails.description,
      status: "draft",
      source: "desktop-setup",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      locale: ACTIVE_LOCALE,
      ...profileBase,
      providerMode: providerMeta[provider].mode,
      modelLabel: getModelByName(providerModel).label,
      survey: initialSurvey,
      recommendation: {
        localModel: localRecommendation,
        cloudModel: cloudRecommendation,
        selectedProvider: provider,
        selectedModel: providerModel,
        selectedCloudModel: cloudRecommendation,
        hardwareMemoryGb: hardware?.totalMemoryGb ?? null,
      },
      prompt: {
        profileId: id,
        systemPrompt: buildSystemPromptPreview(profileBase, promptSettings),
        settings: promptSettings,
        variables: {
          useCase: initialSurvey.useCase,
          answerStyle: initialSurvey.answerStyle,
          priority: initialSurvey.priority,
          languageUse: initialSurvey.languageUse,
          localMode: initialSurvey.localMode,
          futureFeatures: initialSurvey.futureFeatures,
          provider,
          model: providerModel,
        },
        overrides: {
          persona: null,
          instructions: [],
          guardrails: [],
        },
      },
      capabilities: normalizeProfileCapabilities(undefined, promptSettings, initialSurvey.memorySyncMode),
      sync: {
        cloudEnabled: false,
        cloudProfileId: null,
        lastSyncedAt: null,
      },
      metadata: {
        setupStep: activeStep,
        appMode: "studio",
        appVersion: "0.1.0",
        hardwareSnapshot: hardware,
      },
    };
    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: id,
      profiles: [profile, ...assistantProfileStore.profiles],
      updatedAt: now,
    };

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(id);
    applyLocalAssistantProfile(profile);
    setStudioSection("overview");

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      log(`Created assistant profile: ${name}.`);
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile create failed: ${message}`);
    }
  }

  async function deleteLocalAssistantProfile(profileId: string) {
    const profile = assistantProfileStore.profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    if (!window.confirm(`Delete "${profile.name}" from this computer?`)) {
      return;
    }

    const remainingProfiles = assistantProfileStore.profiles.filter((item) => item.id !== profileId);
    const nextActiveProfile = remainingProfiles[0] ?? null;
    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: nextActiveProfile?.id ?? null,
      profiles: remainingProfiles,
      updatedAt: new Date().toISOString(),
    };

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);

    if (nextActiveProfile) {
      setActiveLocalProfileId(nextActiveProfile.id);
      applyLocalAssistantProfile(nextActiveProfile);
    } else {
      setActiveLocalProfileId(DEFAULT_LOCAL_PROFILE_ID);
      setProfileDetailsDraft(defaultProfileDetails);
      setPromptSettingsDraft(defaultPromptSettings);
      setSurvey({
        useCase: null,
        answerStyle: null,
        priority: null,
        languageUse: null,
        localMode: null,
        futureFeatures: [],
        memorySyncMode: "profileOnly",
      });
      setSelectedProvider("ollama");
      setSelectedModel("qwen3:4b");
      setSelectedCloudModel("gemini-2.5-flash");
    }

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      log(`Deleted assistant profile: ${profile.name}.`);
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile delete failed: ${message}`);
    }
  }

  function buildCloudAssistantProfilePayload(profile: LocalAssistantProfile) {
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

  async function sendProfileToCloud(profile: LocalAssistantProfile) {
    const cloudProfileId = profile.sync.cloudProfileId;
    const payload = buildCloudAssistantProfilePayload(profile);
    const request = async (method: "POST" | "PATCH", url: string) => {
      const response = await fetch(url, {
        method,
        headers: getCloudHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
      }

      return response.json() as Promise<{ profile?: { id?: string } }>;
    };

    if (!cloudProfileId) {
      return request("POST", `${CLOUD_API_URL}/assistant-profiles`);
    }

    try {
      return await request("PATCH", `${CLOUD_API_URL}/assistant-profiles/${encodeURIComponent(cloudProfileId)}`);
    } catch (error) {
      if (String(error).includes("404")) {
        return request("POST", `${CLOUD_API_URL}/assistant-profiles`);
      }

      throw error;
    }
  }

  async function syncCurrentAssistantProfileToCloud() {
    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage("Saving local profile before cloud sync...");

    try {
      const localProfile = await saveCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
      setAssistantProfileSyncMessage("Sending assistant profile to MiVA API...");
      const response = await sendProfileToCloud(localProfile);
      const cloudProfileId = response.profile?.id ?? localProfile.sync.cloudProfileId ?? localProfile.id;
      const syncedAt = new Date().toISOString();
      const syncedProfile: LocalAssistantProfile = {
        ...localProfile,
        updatedAt: syncedAt,
        sync: {
          cloudEnabled: true,
          cloudProfileId,
          lastSyncedAt: syncedAt,
        },
      };

      await persistLocalAssistantProfile(syncedProfile);
      setAssistantProfileSyncState("synced");
      setAssistantProfileSyncMessage(`Synced to web profile ${cloudProfileId}.`);
      log(`Assistant profile synced to web: ${cloudProfileId}.`);
    } catch (error) {
      const message = `Cloud API offline or sync failed: ${String(error)}`;
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(message);
      log(message);
    }
  }

  function applyLocalAssistantProfile(profile: LocalAssistantProfile) {
    setProfileDetailsDraft({
      name: profile.name || defaultProfileDetails.name,
      description: profile.description || defaultProfileDetails.description,
    });
    setSurvey({
      useCase: profile.survey?.useCase ?? profile.useCase ?? null,
      answerStyle: profile.survey?.answerStyle ?? profile.answerStyle ?? null,
      priority: profile.survey?.priority ?? profile.priority ?? null,
      languageUse: profile.survey?.languageUse ?? profile.languageUse ?? null,
      localMode: profile.survey?.localMode ?? profile.localMode ?? null,
      futureFeatures: Array.isArray(profile.survey?.futureFeatures) ? profile.survey.futureFeatures : profile.futureFeatures ?? [],
      memorySyncMode: profile.survey?.memorySyncMode ?? profile.capabilities?.memory?.syncMode ?? "profileOnly",
    });
    setSelectedProvider(profile.provider ?? "ollama");
    setSelectedModel(profile.recommendation?.selectedModel ?? (profile.provider === "ollama" ? profile.model : selectedModel));
    setSelectedCloudModel(profile.recommendation?.selectedCloudModel ?? (profile.provider !== "ollama" ? profile.model : selectedCloudModel));
    setPromptSettingsDraft(normalizePromptSettings(profile.prompt?.settings));
  }

  async function finalizeCurrentLocalAssistantProfile() {
    try {
      await saveCurrentLocalAssistantProfile("finalized");
      log("Assistant profile finalized locally.");
    } catch {
      // The save function already records the visible error state.
    }
  }

  function enterSettings(section: SettingsSection = "general") {
    if (activeStep !== "settings") {
      setSettingsReturnTarget({ appMode, activeStep });
    }

    setAppMode("setup");
    setActiveStep("settings");
    setSettingsSection(section);
  }

  function exitSettings() {
    setAppMode(settingsReturnTarget.appMode);
    setActiveStep(settingsReturnTarget.activeStep === "settings" ? "welcome" : settingsReturnTarget.activeStep);
  }

  function openAuth() {
    if (appMode !== "auth") {
      setAuthReturnTarget({ appMode, activeStep });
    }

    setAppMode("auth");
  }

  function closeAuth() {
    setAppMode(authReturnTarget.appMode === "auth" ? "studio" : authReturnTarget.appMode);
    setActiveStep(authReturnTarget.activeStep === "settings" ? "welcome" : authReturnTarget.activeStep);
  }

  function goToNextStep() {
    if (activeStep === "recommendation" && selectedProvider !== "ollama") {
      enterSettings("aiModels");
      return;
    }

    const next = steps[Math.min(activeIndex + 1, steps.length - 1)];
    if (next.id === "chat") {
      void finalizeCurrentLocalAssistantProfile();
    }
    setActiveStep(next.id);
  }

  function goToPreviousStep() {
    const previous = steps[Math.max(activeIndex - 1, 0)];
    setActiveStep(previous.id);
  }

  async function refreshStatus() {
    setBusyAction("refreshStatus");
    try {
      const nextStatus = await invokeCommand<OllamaStatus>("get_ollama_status");
      setStatus(nextStatus);
    } catch (error) {
      log(`Status failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshHardware() {
    setBusyAction("hardware");
    setHardwareError(null);
    try {
      const nextHardware = await invokeCommand<HardwareInfo>("get_hardware_info");
      setHardware(nextHardware);
    } catch (error) {
      setHardwareError(String(error));
      log(`Hardware check failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshRuntimeRequirements() {
    setRuntimeRequirementsError(null);
    try {
      const nextRequirements = await invokeCommand<RuntimeRequirements>("get_runtime_requirements");
      setRuntimeRequirements(nextRequirements);
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      log(`Runtime requirement check failed: ${String(error)}`);
    }
  }

  async function refreshDefaultPythonInstallPath() {
    try {
      const nextPath = await invokeCommand<string>("get_default_python_install_dir");
      setPythonInstallPath((current) => current || nextPath);
    } catch (error) {
      log(`Python install path check failed: ${String(error)}`);
    }
  }

  async function choosePythonInstallPath() {
    if (!tauriRuntime) {
      return;
    }

    try {
      const selected = await openDialog({
        title: "Choose Python install location",
        directory: true,
        multiple: false,
        defaultPath: pythonInstallPath || undefined,
      });

      if (typeof selected === "string") {
        setPythonInstallPath(selected);
      }
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      log(`Python install location selection failed: ${String(error)}`);
    }
  }

  async function installPython() {
    setBusyAction("install-python");
    setRuntimeRequirementsError(null);
    try {
      const installPath = pythonInstallPath.trim();
      log(`Starting Python install through winget at ${installPath || "default location"}.`);
      const output = await invokeCommand<string>("install_python", { targetDir: installPath || null });
      log(output);
      await refreshRuntimeRequirements();
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      log(`Python install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function installOllama() {
    setBusyAction("install");
    try {
      log("Starting Ollama install through winget.");
      const output = await invokeCommand<string>("install_ollama");
      log(output);
      await refreshStatus();
    } catch (error) {
      log(`Install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function startOllama() {
    setBusyAction("start");
    try {
      const output = await invokeCommand<string>("start_ollama");
      log(output);
      await refreshStatus();
    } catch (error) {
      log(`Start failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function ensureOllamaReadyForChat(model: string) {
    if (selectedProvider !== "ollama") {
      return true;
    }

    if (!status?.installed) {
      log("Ollama is not installed. Install Ollama before using a local model.");
      return false;
    }

    let nextStatus = status;
    if (!nextStatus.running) {
      log("Ollama is not running. Starting Ollama automatically before local chat.");
      const output = await invokeCommand<string>("start_ollama");
      log(output);
      nextStatus = await invokeCommand<OllamaStatus>("get_ollama_status");
      setStatus(nextStatus);
    }

    if (!nextStatus.running) {
      log("Ollama start was attempted, but the local runtime is still offline.");
      return false;
    }

    if (!nextStatus.installedModels.includes(model)) {
      log(`${model} is not installed. Download the model before starting local chat.`);
      return false;
    }

    return true;
  }

  async function downloadModel(model: string) {
    setBusyAction(`download:${model}`);
    setDownloadProgress({
      model,
      status: t.preparingDownload,
      completed: null,
      total: null,
      percent: 0,
      done: false,
      error: null,
    });
    try {
      log(`Downloading ${model}.`);
      const output = await invokeCommand<string>("pull_model", { model });
      log(output);
      setDismissedChatIntroKeys((current) => current.filter((key) => key !== `ollama:${model}:${promptProfileId}`));
      await refreshStatus();
    } catch (error) {
      const message = String(error);
      setDownloadProgress((current) => ({
        model,
        status: t.downloadFailed,
        completed: current?.completed ?? null,
        total: current?.total ?? null,
        percent: current?.percent ?? null,
        done: true,
        error: message,
      }));
      log(`Download failed: ${message}`);
    } finally {
      setBusyAction(null);
    }
  }

  function scrollChatToLatest(behavior: ScrollBehavior = "smooth") {
    chatEndRef.current?.scrollIntoView({ behavior, block: "end" });
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }

  function handleChatScroll() {
    const element = chatScrollRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    shouldAutoScrollChatRef.current = nearBottom;
    setShowJumpToLatest((current) => (current === !nearBottom ? current : !nearBottom));
  }

  async function sendMessage() {
    const prompt = chatInput.trim();
    const chatMode = appMode;
    const providerModel = selectedProvider === "ollama" ? selectedModel : selectedCloudModel;
    const assistantProfile = buildCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
    const apiKey = selectedProvider === "openai"
      ? providerKeys.openai.trim()
      : selectedProvider === "gemini"
        ? providerKeys.gemini.trim()
        : "";
    const localUnavailable = selectedProvider === "ollama" && !status?.installed;

    if (!prompt || localUnavailable || busyAction === "chat") {
      return;
    }

    setBusyAction("chat");
    const runtimeReady = await ensureOllamaReadyForChat(providerModel);
    if (!runtimeReady) {
      setBusyAction(null);
      return;
    }

    setChatInput("");
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
    const startedAt = performance.now();
    const requestedAt = new Date().toISOString();
    updateChatMessages(chatMode, (current) => [
      ...current,
      { role: "user", content: prompt, createdAt: requestedAt, provider: selectedProvider, model: providerModel },
    ]);

    try {
      const answer = await invokeCommand<string>("chat_once", {
        provider: selectedProvider,
        model: providerModel,
        prompt,
        locale: ACTIVE_LOCALE,
        apiKey: apiKey || null,
        profile: assistantProfile,
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      setChatMetrics({
        provider: selectedProvider,
        model: providerModel,
        latencyMs,
        measuredAt: new Date().toISOString(),
      });
      updateChatMessages(chatMode, (current) => [
        ...current,
        {
          role: "assistant",
          content: answer,
          createdAt: new Date().toISOString(),
          provider: selectedProvider,
          model: providerModel,
          latencyMs,
        },
      ]);
      log("Chat response received.");
      if (chatMode === "runtime") {
        void recordRuntimeUsageEvent({
          assistantProfileId: assistantProfile.sync.cloudProfileId ?? assistantProfile.id,
          provider: selectedProvider,
          model: providerModel,
          inputChars: prompt.length,
          outputChars: answer.length,
          durationMs: latencyMs,
          success: true,
        }).catch((usageError) => {
          log(`Runtime usage sync failed: ${String(usageError)}`);
        });
      }
    } catch (error) {
      const message = `Chat failed: ${String(error)}`;
      const latencyMs = Math.round(performance.now() - startedAt);
      updateChatMessages(chatMode, (current) => [
        ...current,
        {
          role: "assistant",
          content: message,
          createdAt: new Date().toISOString(),
          provider: selectedProvider,
          model: providerModel,
        },
      ]);
      log(message);
      if (chatMode === "runtime") {
        void recordRuntimeUsageEvent({
          assistantProfileId: assistantProfile.sync.cloudProfileId ?? assistantProfile.id,
          provider: selectedProvider,
          model: providerModel,
          inputChars: prompt.length,
          outputChars: message.length,
          durationMs: latencyMs,
          success: false,
        }).catch((usageError) => {
          log(`Runtime usage sync failed: ${String(usageError)}`);
        });
      }
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (tauriRuntime) {
      void (async () => {
        await refreshStatus();
        await refreshHardware();
        await refreshRuntimeRequirements();
        await refreshDefaultPythonInstallPath();
      })();
    }
  }, [tauriRuntime]);

  useEffect(() => {
    if (!tauriRuntime || !status || autoStartOllamaAttemptedRef.current) {
      return;
    }

    if (!status.installed || status.running) {
      return;
    }

    autoStartOllamaAttemptedRef.current = true;
    void (async () => {
      try {
        log("Ollama is installed but offline. Starting automatically on app launch.");
        const output = await invokeCommand<string>("start_ollama");
        log(output);
        const nextStatus = await invokeCommand<OllamaStatus>("get_ollama_status");
        setStatus(nextStatus);
      } catch (error) {
        log(`Automatic Ollama start failed: ${String(error)}`);
      }
    })();
  }, [tauriRuntime, status]);

  useEffect(() => {
    if (!authSession) {
      return;
    }

    void registerDeviceWithCloud().catch((error) => {
      log(`Device registration failed: ${String(error)}`);
    });
  }, [authSession, hardware?.osName, selectedProvider, selectedModel, selectedCloudModel, status?.running]);

  useEffect(() => {
    if (!deviceAuthRequest || authFlowState !== "waiting") {
      return;
    }

    let cancelled = false;
    const pollInterval = Math.max(1000, deviceAuthRequest.intervalMs || 1500);

    const pollDeviceAuth = async () => {
      try {
        const statusResponse = await fetchCloudJson<DeviceAuthStatus>(
          `/auth/device/${encodeURIComponent(deviceAuthRequest.deviceCode)}`,
        );

        if (cancelled) {
          return;
        }

        if (statusResponse.status === "authorized" && statusResponse.session) {
          saveAuthSession(statusResponse.session);
          setAuthFlowState("connected");
          setAuthFlowError(null);
          setDeviceAuthRequest(null);
          log(`Desktop session connected for ${statusResponse.session.user.email}.`);
          return;
        }

        if (statusResponse.status === "expired") {
          setAuthFlowState("error");
          setAuthFlowError("This desktop login request expired. Start sign-in again.");
          setDeviceAuthRequest(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthFlowState("error");
          setAuthFlowError(`Could not check sign-in status: ${String(error)}`);
        }
      }
    };

    void pollDeviceAuth();
    const intervalId = window.setInterval(() => void pollDeviceAuth(), pollInterval);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authFlowState, deviceAuthRequest]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const store = await loadLocalAssistantProfileStore();
        if (cancelled) {
          return;
        }

        setAssistantProfileStore(store);
        const activeProfile = store.profiles.find((profile) => profile.id === store.activeProfileId) ?? store.profiles[0] ?? null;
        if (activeProfile) {
          setActiveLocalProfileId(activeProfile.id);
          applyLocalAssistantProfile(activeProfile);
        }

        assistantProfileHydratedRef.current = true;
        setAssistantProfileLoaded(true);
        log(activeProfile ? "Assistant profile loaded from local storage." : "No local assistant profile found yet.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        assistantProfileHydratedRef.current = true;
        setAssistantProfileLoaded(true);
        setAssistantProfileError(String(error));
        setAssistantProfileSaveState("error");
        log(`Assistant profile load failed: ${String(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!assistantProfileLoaded || !assistantProfileHydratedRef.current || appMode !== "setup" || activeStep === "welcome") {
      return;
    }

    if (assistantProfileSaveTimerRef.current) {
      window.clearTimeout(assistantProfileSaveTimerRef.current);
    }

    assistantProfileSaveTimerRef.current = window.setTimeout(() => {
      void saveCurrentLocalAssistantProfile(activeStep === "chat" ? "finalized" : "draft").catch(() => undefined);
    }, 700);

    return () => {
      if (assistantProfileSaveTimerRef.current) {
        window.clearTimeout(assistantProfileSaveTimerRef.current);
      }
    };
  }, [
    assistantProfileLoaded,
    appMode,
    activeStep,
    survey,
    selectedProvider,
    selectedModel,
    selectedCloudModel,
    recommendedModel,
    recommendedCloudModel,
    hardware,
  ]);

  useEffect(() => {
    if (!tauriRuntime) {
      return;
    }

    let unlisten: (() => void) | undefined;
    void listen<ModelDownloadProgress>("model-download-progress", (event) => {
      setDownloadProgress(event.payload);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      unlisten?.();
    };
  }, [tauriRuntime]);

  useEffect(() => {
    window.localStorage.setItem(RUNTIME_CHAT_STORAGE_KEY, JSON.stringify(runtimeChatMessages));
  }, [runtimeChatMessages]);

  useEffect(() => {
    if (appMode !== "runtime" && !(appMode === "setup" && activeStep === "chat")) {
      return;
    }

    if (!shouldAutoScrollChatRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollChatToLatest(activeChatMessages.length === 0 ? "auto" : "smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [appMode, activeStep, activeChatMessages.length, busyAction, showChatIntroCard, selectedProvider, selectedModel, selectedCloudModel]);

  useEffect(() => {
    setSelectedModel(recommendedModel);
  }, [recommendedModel]);

  useEffect(() => {
    if (cloudRecommended) {
      const cloudModel = getCloudModelById(recommendedCloudModel);
      setSelectedCloudModel(cloudModel.id);
      setSelectedProvider(cloudModel.provider);
      return;
    }

    setSelectedProvider("ollama");
  }, [cloudRecommended, recommendedCloudModel]);

  useEffect(() => {
    if (!surveyTipExpanded) {
      setSurveyTipContentVisible(false);
      return;
    }

    setSurveyTipContentVisible(false);
    const timer = window.setTimeout(() => {
      setSurveyTipContentVisible(true);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [surveyTipExpanded]);

  const renderNavigation = () => (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#35607f] text-white shadow-sm">
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
        </div>
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.setupFlowSubtitle}</p>
        </div>
      </div>

      <nav className="flex-1">
        {activeStep === "settings" ? (
          <div className="p-4">
            <p className="px-3 pb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">Settings</p>
            <div className="grid gap-1">
              {settingsSections.map((section) => {
                const active = settingsSection === section.id;

                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                      active ? "bg-[#cae6ff]/45 text-[#35607f]" : "text-[#72787e] hover:bg-[#e7e8e9] hover:text-[#191c1d]"
                    }`}
                    key={section.id}
                    onClick={() => setSettingsSection(section.id)}
                    type="button"
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full ${
                        active ? "bg-[#35607f] text-white" : "bg-[#e1e3e4] text-[#72787e]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
                    </span>
                    <span>
                      <span className="block">{section.label}</span>
                      <span className="block text-xs font-medium opacity-70">{section.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          steps.map((step, index) => {
            const active = step.id === activeStep;
            const completed = index < activeIndex;

            return (
              <button
                className={`flex w-full items-center gap-3 border-r-4 px-6 py-4 text-left text-sm font-semibold transition ${
                  active
                    ? "border-[#35607f] bg-[#cae6ff]/45 text-[#35607f]"
                    : completed
                      ? "border-transparent text-[#4a654e] hover:bg-[#e7e8e9]"
                      : "border-transparent text-[#72787e] hover:bg-[#e7e8e9]"
                }`}
                key={step.id}
                onClick={() => {
                  setAppMode("setup");
                  setActiveStep(step.id);
                }}
                type="button"
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-[#35607f] text-white"
                      : completed
                        ? "bg-[#c9e8cb] text-[#334d38]"
                        : "bg-[#e1e3e4] text-[#72787e]"
                  }`}
                >
                  {completed ? (
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  <span className="block">{step.label}</span>
                  <span className="block text-xs font-medium opacity-70">{step.detail}</span>
                </span>
              </button>
            );
          })
        )}
      </nav>

      <div className="grid gap-2 border-t border-[#c2c7ce]/60 p-4">
        <button
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
            activeStep === "profile" ? "bg-white text-[#35607f] shadow-sm" : "text-[#42474d] hover:bg-[#f3f4f5] hover:text-[#191c1d]"
          }`}
          onClick={openAuth}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">account_circle</span>
          {authSession ? authSession.user.displayName : "Sign in"}
        </button>
      </div>
    </aside>
  );

  const renderStudioNavigation = () => (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#35607f] text-white shadow-sm">
          <span className="material-symbols-outlined text-[20px]">construction</span>
        </div>
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">Assistant Studio</p>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="px-3 pb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">Studio</p>
        <div className="grid gap-1">
          {studioSections.map((section) => {
            const active = studioSection === section.id;

            return (
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  active ? "bg-[#cae6ff]/45 text-[#35607f]" : "text-[#72787e] hover:bg-[#e7e8e9] hover:text-[#191c1d]"
                }`}
                key={section.id}
                onClick={() => setStudioSection(section.id)}
                type="button"
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full ${
                    active ? "bg-[#35607f] text-white" : "bg-[#e1e3e4] text-[#72787e]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
                </span>
                <span>
                  <span className="block">{section.label}</span>
                  <span className="block text-xs font-medium opacity-70">{section.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="grid gap-2 border-t border-[#c2c7ce]/40 p-4">
        <button
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#42474d] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
          type="button"
          onClick={openAuth}
        >
          <span className="material-symbols-outlined text-[18px]">account_circle</span>
          {authSession ? authSession.user.displayName : "Sign in"}
        </button>
      </div>
    </aside>
  );

  const renderRuntimeNavigation = () => (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#35607f] text-white shadow-sm">
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
        </div>
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.assistantWorkspace}</p>
        </div>
      </div>

      <div className="border-b border-[#c2c7ce]/30 p-4">
        <button
          className="flex w-full items-center justify-between rounded-2xl border border-[#c2c7ce]/50 bg-white px-4 py-3 text-sm font-bold text-[#191c1d] shadow-sm transition hover:border-[#35607f]/60"
          type="button"
          onClick={clearCurrentChat}
        >
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[#35607f]">add_comment</span>
            {t.newChat}
          </span>
          <span className="material-symbols-outlined text-[16px] text-[#72787e]">arrow_forward</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <section>
          <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">{t.recentConversations}</h2>
          <div className="mt-3 grid gap-1">
            {[t.chatTitle, activeModelLabel, t.suggestedAction].map((label, index) => (
              <button
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  index === 0 ? "bg-[#cae6ff]/35 font-bold text-[#191c1d]" : "text-[#42474d] hover:bg-[#f3f4f5]"
                }`}
                key={`${label}-${index}`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-[#72787e]">history</span>
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">Collection</h2>
          <div className="mt-3 grid gap-1">
            <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#42474d] transition hover:bg-[#f3f4f5]" type="button">
              <span className="material-symbols-outlined text-[16px] text-[#72787e]">bookmark</span>
              {t.savedSnippets}
            </button>
            <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#42474d] transition hover:bg-[#f3f4f5]" type="button">
              <span className="material-symbols-outlined text-[16px] text-[#72787e]">monitoring</span>
              {t.systemLogs}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-2 border-t border-[#c2c7ce]/40 p-4">
        <button
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#42474d] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
          type="button"
          onClick={openAuth}
        >
          <span className="material-symbols-outlined text-[18px]">account_circle</span>
          {authSession ? authSession.user.displayName : "Sign in"}
        </button>
      </div>
    </aside>
  );

  const renderTopBar = () => {
    const settingsOpen = appMode === "setup" && activeStep === "settings";

    return (
    <header className="grid h-[60px] w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(180px,320px)_auto] items-center gap-3 border-b border-[#c2c7ce]/60 bg-[#f8f9fa]/85 px-5 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <span className="font-heading text-lg font-bold tracking-tight text-[#35607f]">MiVA</span>
        {!settingsOpen && (
        <div className="flex min-w-0 shrink rounded-full border border-[#c2c7ce]/60 bg-[#e7e8e9]/60 p-0.5">
          <button
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              appMode === "studio" ? "bg-white text-[#35607f] shadow-sm" : "text-[#72787e] hover:text-[#191c1d]"
            }`}
            onClick={() => setAppMode("studio")}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">construction</span>
            {t.studioMode}
          </button>
          <button
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              appMode === "runtime" ? "bg-white text-[#35607f] shadow-sm" : "text-[#72787e] hover:text-[#191c1d]"
            }`}
            onClick={() => setAppMode("runtime")}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
            {t.runtimeMode}
          </button>
        </div>
        )}
      </div>

      {settingsOpen ? <div /> : (
      <div className="mx-auto flex w-full max-w-[320px] min-w-0 items-center gap-2 rounded-full border border-[#c2c7ce]/60 bg-white/80 px-2.5 py-1.5 shadow-sm">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${
            activeProviderMode === "local" ? "bg-[#c9e8cb] text-[#334d38]" : "bg-[#cae6ff] text-[#1c4b69]"
          }`}
        >
          {activeProviderMode === "local" ? providerText.localHeader : providerText.cloudHeader}
        </span>
        <span className="material-symbols-outlined shrink-0 text-sm text-[#4a654e]">{activeProviderMeta.icon}</span>
        <span className="truncate text-[13px] font-semibold text-[#42474d]">
          {activeProviderLabel} / {activeModelLabel}
        </span>
      </div>
      )}

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          aria-label="Help"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#72787e] transition-all duration-200 ease-in-out hover:bg-[#f3f4f5]"
          type="button"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        {!settingsOpen && (
          <button
            aria-label={t.settings}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#72787e] transition-all duration-200 ease-in-out hover:bg-[#f3f4f5]"
            onClick={() => enterSettings("general")}
            title={t.settings}
            type="button"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        )}
      </div>
    </header>
    );
  };

  const renderFooter = (primaryLabel = t.continue, primaryAction = goToNextStep, primaryDisabled = false) => (
    <div className="mt-8 flex items-center justify-between">
      <SecondaryButton disabled={activeStep === "welcome"} onClick={goToPreviousStep}>
        {t.back}
      </SecondaryButton>
      <PrimaryButton disabled={primaryDisabled} onClick={primaryAction}>
        {primaryLabel}
      </PrimaryButton>
    </div>
  );

  const renderWelcome = () => (
    <div className="mx-auto flex min-h-[calc(100vh-144px)] w-full max-w-4xl flex-col items-center justify-center text-center">
      <div className="mb-10 space-y-4">
        <h2 className="font-heading text-[42px] font-black leading-tight tracking-tight text-[#191c1d]">{t.welcomeTitle}</h2>
        <p className="mx-auto max-w-xl font-sans text-base leading-6 text-[#42474d] opacity-80">{t.welcomeBody}</p>
      </div>

      <div className="mb-12 grid w-full grid-cols-3 gap-6">
        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#35607f]/10 text-[#35607f]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.privacyTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.privacyBody}</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#4a654e]/10 text-[#4a654e]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.localModelTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.localModelBody}</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#555d63]/10 text-[#555d63]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud_off
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.guidedTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.guidedBody}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          className="group flex items-center gap-2 rounded-full bg-[#35607f] px-12 py-4 font-heading text-base font-semibold text-white transition-all duration-300 hover:bg-[#4f7999] hover:shadow-lg active:scale-95"
          onClick={goToNextStep}
          type="button"
        >
          {t.startSetup}
          <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#72787e] opacity-60">{t.estimatedTime}</p>
      </div>
    </div>
  );

  const renderSurvey = () => {
    const question = surveyQuestions[surveyQuestionIndex] ?? surveyQuestions[0];
    const isLastQuestion = surveyQuestionIndex === surveyQuestions.length - 1;
    const progress = ((surveyQuestionIndex + 1) / surveyQuestions.length) * 100;

    function isOptionSelected(questionId: SurveyQuestionId, optionId: string) {
      if (questionId === "useCase") return survey.useCase === optionId;
      if (questionId === "answerStyle") return survey.answerStyle === optionId;
      if (questionId === "priority") return survey.priority === optionId;
      if (questionId === "languageUse") return survey.languageUse === optionId;
      if (questionId === "localMode") return survey.localMode === optionId;
      if (questionId === "memorySyncMode") return survey.memorySyncMode === optionId;
      return survey.futureFeatures.includes(optionId as FutureFeature);
    }

    function questionAnswered(questionId: SurveyQuestionId) {
      if (questionId === "useCase") return survey.useCase !== null;
      if (questionId === "answerStyle") return survey.answerStyle !== null;
      if (questionId === "priority") return survey.priority !== null;
      if (questionId === "languageUse") return survey.languageUse !== null;
      if (questionId === "localMode") return survey.localMode !== null;
      if (questionId === "memorySyncMode") return survey.memorySyncMode !== null;
      return survey.futureFeatures.length > 0;
    }

    function selectOption(questionId: SurveyQuestionId, optionId: string) {
      setSurvey((current) => {
        if (questionId === "useCase") return { ...current, useCase: optionId as UseCase };
        if (questionId === "answerStyle") return { ...current, answerStyle: optionId as AnswerStyle };
        if (questionId === "priority") return { ...current, priority: optionId as Priority };
        if (questionId === "languageUse") return { ...current, languageUse: optionId as LanguageUse };
        if (questionId === "localMode") return { ...current, localMode: optionId as LocalMode };
        if (questionId === "memorySyncMode") return { ...current, memorySyncMode: optionId as MemorySyncMode };

        const feature = optionId as FutureFeature;
        if (feature === "unsure") {
          return { ...current, futureFeatures: ["unsure"] };
        }

        const withoutUnsure = current.futureFeatures.filter((item) => item !== "unsure");
        const exists = withoutUnsure.includes(feature);
        return {
          ...current,
          futureFeatures: exists ? withoutUnsure.filter((item) => item !== feature) : [...withoutUnsure, feature],
        };
      });
    }

    function moveSurveyBack() {
      if (surveyQuestionIndex === 0) {
        goToPreviousStep();
        return;
      }

      setSurveyQuestionIndex((current) => Math.max(current - 1, 0));
    }

    function moveSurveyNext() {
      if (isLastQuestion) {
        goToNextStep();
        return;
      }

      setSurveyQuestionIndex((current) => Math.min(current + 1, surveyQuestions.length - 1));
    }

    return (
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">
            {t.surveyProgress} {surveyQuestionIndex + 1} / {surveyQuestions.length}
          </p>
          <h2 className="mt-3 font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.surveyPageTitle}</h2>
          <p className="mt-2 max-w-[720px] text-base leading-7 text-[#42474d]">{t.surveyBody}</p>
          <h3 className="mt-8 font-heading text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t[question.titleKey]}</h3>
          <p className="mt-1 text-sm leading-5 text-[#72787e]">{t[question.helperKey]}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e1e3e4]">
            <div className="h-full rounded-full bg-[#35607f] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-6">
          <Panel className="flex min-h-[500px] flex-col">
            <div className={`grid ${question.columns} gap-4`}>
              {question.options.map((option) => {
                const active = isOptionSelected(question.id, option.id);
                const optionTitle = option.title?.[ACTIVE_LOCALE] ?? (option.titleKey ? t[option.titleKey] : "");
                const optionBody = option.body?.[ACTIVE_LOCALE] ?? (option.bodyKey ? t[option.bodyKey] : "");

                return (
                  <button
                    className={`group relative flex min-h-[150px] flex-col items-start rounded-xl border bg-white p-6 text-left shadow-sm transition-all duration-200 active:scale-[0.98] ${
                      active
                        ? "border-[#35607f] bg-[#cae6ff]/20 shadow-md ring-4 ring-[#cae6ff]"
                        : "border-[#c2c7ce] hover:border-[#35607f] hover:shadow-md"
                    }`}
                    key={option.id}
                    onClick={() => selectOption(question.id, option.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined mb-4 text-3xl text-[#35607f]">{option.icon}</span>
                    <span className="font-heading mb-1 text-[18px] font-semibold text-[#191c1d]">{optionTitle}</span>
                    <span className="text-sm leading-5 text-[#72787e]">{optionBody}</span>
                    <span
                      className={`absolute right-4 top-4 transition-opacity ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[#35607f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <footer className="mt-auto flex items-center justify-between border-t border-[#c2c7ce]/30 pt-8">
              <SecondaryButton className="flex items-center gap-2" onClick={moveSurveyBack}>
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                {surveyQuestionIndex === 0 ? t.back : t.previousQuestion}
              </SecondaryButton>
              <PrimaryButton className="flex items-center gap-2" disabled={!questionAnswered(question.id)} onClick={moveSurveyNext}>
                {isLastQuestion ? t.nextHardware : t.nextQuestion}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </PrimaryButton>
            </footer>
          </Panel>

          <aside
            className={`relative transition-[width] duration-300 ease-in-out ${
              surveyTipExpanded ? "w-[260px]" : "w-[82px]"
            }`}
          >
            <div className="group relative h-full min-h-[500px] w-full rounded-2xl border border-[#c2c7ce]/60 bg-[#f3f4f5] p-4 text-[#35607f] shadow-sm transition hover:border-[#35607f]">
              <span className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 rounded-lg bg-[#2e3132] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {t.proTipTitle}
              </span>

              {!surveyTipExpanded && (
                <button
                  className="flex h-full w-full flex-col items-center justify-center gap-8"
                  onClick={() => setSurveyTipExpanded(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    tips_and_updates
                  </span>
                  <img alt="" className="h-11 w-11 object-contain opacity-70" src="/gear.png" />
                </button>
              )}

              {surveyTipExpanded && (
                <>
                  {!surveyTipContentVisible && <div className="h-full rounded-2xl bg-[#f3f4f5]" />}

                  {surveyTipContentVisible && (
                    <div className="flex h-full flex-col gap-5 animate-[fadeIn_180ms_ease-out]">
                      <button
                        className="rounded-2xl bg-[#4f7999] p-5 text-left text-white"
                        onClick={() => setSurveyTipExpanded(false)}
                        type="button"
                      >
                        <span className="material-symbols-outlined mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>
                          tips_and_updates
                        </span>
                        <h3 className="font-heading mb-2 text-[18px] font-bold leading-tight">{t.proTipTitle}</h3>
                        <p className="text-sm leading-6 text-white/80">{t.proTipBody}</p>
                      </button>

                      <div className="flex flex-1 flex-col rounded-2xl bg-white p-5 text-[#191c1d] shadow-sm">
                        <img alt="" className="mb-3 h-12 w-12 object-contain opacity-70" src="/gear.png" />
                        <h4 className="font-heading text-base font-bold">{t.advancedOptionsTitle}</h4>
                        <p className="mt-3 text-sm leading-6 text-[#42474d]">{t.advancedOptionsBody}</p>
                        <button
                          className="mt-auto inline-flex items-center gap-2 rounded-lg bg-[#35607f] px-4 py-3 text-sm font-semibold text-white"
                          onClick={() => enterSettings("general")}
                          type="button"
                        >
                          {t.advancedOptionsButton}
                          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    );
  };

  const renderHardware = () => {
    const cpuCores = hardware?.logicalCoreCount ?? 0;
    const ramGb = hardware?.totalMemoryGb ?? 0;
    const diskTotalGb = hardware?.primaryDiskTotalGb ?? 0;
    const diskAvailableGb = hardware?.primaryDiskAvailableGb ?? 0;
    const diskUsedGb = Math.max(diskTotalGb - diskAvailableGb, 0);
    const diskUsedPercent = diskTotalGb > 0 ? Math.min(100, Math.max(0, (diskUsedGb / diskTotalGb) * 100)) : 0;
    const modelCapacityCount = Math.max(1, Math.floor(diskAvailableGb / 4));
    const gpuDetected = isSupportedGpuName(hardware?.gpuName);
    const gpuDisplayName = gpuDetected ? hardware?.gpuName : t.noSupportedGpu;
    const cpuBadge = !hardware ? t.checking : cpuCores >= 12 ? t.highEnd : cpuCores >= 8 ? t.great : cpuCores >= 4 ? t.basic : t.limited;
    const memoryBadge = !hardware ? t.checking : ramGb >= 32 ? t.great : ramGb >= 16 ? t.good : ramGb >= 8 ? t.basic : t.limited;
    const gpuBadge = !hardware ? t.checking : gpuDetected ? t.optimal : t.gpuMissing;
    const cpuVerdict = cpuCores >= 12 ? t.cpuVerdictHigh : cpuCores >= 4 ? t.cpuVerdictGood : t.cpuVerdictBasic;
    const memoryVerdict = ramGb >= 32 ? t.memoryVerdictGreat : ramGb >= 8 ? t.memoryVerdictGood : t.memoryVerdictLimited;
    const gpuVerdict = gpuDetected ? t.gpuVerdictDetected : t.gpuVerdictMissing;

    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h2 className="font-heading mb-2 text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.hardwareTitle}</h2>
            <p className="max-w-3xl text-base leading-6 text-[#72787e]">{t.hardwareBody}</p>
            <div className="mt-6 flex w-fit items-center gap-3 rounded-xl border border-[#c9e8cb]/70 bg-[#c9e8cb]/30 px-5 py-3">
              <span className="material-symbols-outlined text-[#4e6952]">lock</span>
              <p className="text-sm font-medium text-[#4e6952]">{t.hardwarePrivacyBody}</p>
            </div>
          </div>
          <button
            aria-label={t.scanPc}
            className="group relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#c2c7ce] bg-white text-[#35607f] shadow-sm transition hover:border-[#35607f] hover:bg-[#cae6ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!tauriRuntime || busyAction === "hardware"}
            onClick={refreshHardware}
            type="button"
          >
            <span className={`material-symbols-outlined ${busyAction === "hardware" ? "animate-spin" : ""}`}>sync</span>
            <span className="pointer-events-none absolute -bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#2e3132] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              {t.scanPc}
            </span>
          </button>
        </header>

        {!tauriRuntime && (
          <Panel className="mb-6 border-[#ffdad6] bg-[#fff6f4]">
            <p className="text-sm font-semibold text-[#93000a]">{t.runtimeRequired}</p>
          </Panel>
        )}

        {hardwareError && (
          <Panel className="mb-6 border-[#ffdad6] bg-[#fff6f4]">
            <p className="text-sm font-semibold text-[#93000a]">{hardwareError}</p>
          </Panel>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">memory</span>
              </div>
              <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{cpuBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.processor}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">
              {hardware?.cpuBrand || t.unknown} {cpuCores > 0 ? `- ${cpuCores} ${t.cores}` : ""}
            </p>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? cpuVerdict : t.checking}</p>
            </div>
          </div>

          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">database</span>
              </div>
              <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{memoryBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.memory}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">{formatGb(hardware?.totalMemoryGb)} RAM</p>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? memoryVerdict : t.checking}</p>
            </div>
          </div>

          <div className="group row-span-2 flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">videogame_asset</span>
              </div>
              <span className="rounded-full bg-[#cae6ff] px-3 py-1 text-xs font-semibold text-[#1c4b69]">{gpuBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.graphics}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">{hardware ? gpuDisplayName : t.unknown}</p>
            <div className="mb-8">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#72787e]">{t.vramUsage}</span>
                <span className="text-xs font-bold text-[#35607f]">{t.vramPlaceholder}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[12%] rounded-full bg-[#35607f]" />
              </div>
            </div>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? gpuVerdict : t.checking}</p>
            </div>
            <div className="mt-8 overflow-hidden rounded-lg border border-slate-100 bg-[#f3f4f5]">
              <div className="grid h-32 place-items-center bg-[radial-gradient(circle_at_center,#e7e8e9,#c2c7ce)] text-[#35607f]">
                <span className="material-symbols-outlined text-5xl">memory</span>
              </div>
            </div>
          </div>

          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md md:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">hard_drive</span>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{t.driveDetected}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#72787e]">{t.healthy}</span>
              </div>
            </div>
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1">
                <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.disk}</h3>
                <p className="mb-6 text-sm leading-5 text-[#72787e]">{formatGb(hardware?.primaryDiskTotalGb)} Capacity</p>
                <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#4a654e]" style={{ width: `${diskUsedPercent}%` }} />
                </div>
                <div className="flex justify-between text-xs font-semibold text-[#72787e]">
                  <span>{formatGb(diskUsedGb)} {t.used}</span>
                  <span>{formatGb(diskAvailableGb)} {t.available}</span>
                </div>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200/50 bg-[#f3f4f5] p-4">
                <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.modelCapacity}</p>
                <p className="text-sm leading-relaxed text-[#72787e]">
                  {t.modelCapacityBody.replace("{count}", String(modelCapacityCount))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#cceace] text-[#07200f]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-[#191c1d]">{t.systemVerificationComplete}</h4>
              <p className="text-sm text-[#72787e]">{t.hardwareMinimumMet}</p>
            </div>
          </div>
          <PrimaryButton disabled={!hardware && tauriRuntime} onClick={goToNextStep}>
            {t.continueRecommendations}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderRecommendation = () => {
    const localCards = [
      ...modelCatalog.map((model) => ({
        id: model.name,
        label: model.label,
        category: model.category,
        summary: model.summary[ACTIVE_LOCALE],
        bestFor: model.bestFor[ACTIVE_LOCALE],
        selectable: true,
        model,
      })),
      {
        id: "custom-ollama",
        label: providerText.customOllama,
        category: "Placeholder",
        summary: providerText.customOllamaBody,
        bestFor: providerText.comingSoon,
        selectable: false,
        model: null,
      },
    ];
    const topIsCloud = cloudRecommended;
    const topProvider = topIsCloud ? providerMeta[recommendedCloudModelInfo.provider] : providerMeta.ollama;
    const topLabel = topIsCloud ? recommendedCloudModelInfo.label : recommendedModelInfo.label;
    const topSummary = topIsCloud ? recommendedCloudModelInfo.summary[ACTIVE_LOCALE] : recommendedModelInfo.summary[ACTIVE_LOCALE];
    const topBestFor = topIsCloud ? recommendedCloudModelInfo.bestFor[ACTIVE_LOCALE] : recommendedModelInfo.bestFor[ACTIVE_LOCALE];
    const reasons = [t.reasonNeed, t.reasonRam];
    if (survey.priority === "speed" || survey.useCase === "fast") {
      reasons.push(t.reasonSpeed);
    }
    if (topIsCloud) {
      reasons.push(providerText.apiKeysNext);
    }

    function selectRecommendedModel() {
      if (topIsCloud) {
        setSelectedProvider(recommendedCloudModelInfo.provider);
        setSelectedCloudModel(recommendedCloudModelInfo.id);
        return;
      }

      setSelectedProvider("ollama");
      setSelectedModel(recommendedModel);
    }

    function selectLocalModel(modelName: string) {
      setSelectedProvider("ollama");
      setSelectedModel(modelName);
    }

    function continueFromRecommendation() {
      if (selectedProvider !== "ollama") {
        enterSettings("aiModels");
        return;
      }

      setActiveStep("ollama");
    }

    return (
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-8">
          <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.recommendationTitle}</h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">{t.recommendationBody}</p>
        </header>

        <Panel className="overflow-hidden border-[#35607f] bg-[#fafdff]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="action">{providerText.recommended}</Badge>
                <Badge tone={topProvider.mode === "local" ? "success" : "action"}>
                  {topProvider.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
                </Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#42474d] shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">{topProvider.icon}</span>
                  {topProvider.label}
                </span>
              </div>
              <h3 className="mt-4 font-heading text-3xl font-bold text-[#191c1d]">{topLabel}</h3>
              <p className="mt-3 max-w-[640px] text-sm leading-6 text-[#42474d]">{topSummary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>{topBestFor}</Badge>
                <Badge>{t.totalRam}: {formatGb(hardware?.totalMemoryGb)}</Badge>
                <Badge>
                  {topIsCloud ? recommendedCloudModelInfo.status[ACTIVE_LOCALE] : recommendedModelInstalled ? t.installed : t.notInstalled}
                </Badge>
              </div>
            </div>
            <PrimaryButton
              onClick={selectRecommendedModel}
            >
              {t.selectThis}
            </PrimaryButton>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {reasons.map((reason) => (
              <div className="rounded-xl bg-[#cae6ff]/45 p-4 text-sm font-semibold leading-6 text-[#1c4b69]" key={reason}>
                {reason}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">{providerText.localModels}</h3>
              <p className="mt-1 text-sm text-[#72787e]">{providerText.localDataNotice}</p>
            </div>
            <Badge tone="success">Ollama</Badge>
          </div>

          <div className="mt-4 overflow-x-auto pb-3">
            <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
              {localCards.map((card) => {
                const active = selectedProvider === "ollama" && card.model?.name === selectedModel;
                const installed = card.model ? installedModels.includes(card.model.name) : false;

                return (
                  <article
                    className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                      active
                        ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                        : card.selectable
                          ? "border-[#c2c7ce]/70 hover:border-[#35607f] hover:shadow-md"
                          : "cursor-not-allowed border-[#e1e3e4] opacity-70"
                    }`}
                    key={card.id}
                    onClick={() => {
                      if (!card.model) return;
                      selectLocalModel(card.model.name);
                    }}
                    role={card.selectable ? "button" : undefined}
                    tabIndex={card.selectable ? 0 : -1}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                        <span className="material-symbols-outlined text-[20px]">memory</span>
                      </span>
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {installed && <Badge tone="success">{t.installed}</Badge>}
                      {!card.selectable && <Badge>{providerText.comingSoon}</Badge>}
                    </div>
                    <p className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{card.label}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">{card.category}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#42474d]">{card.bestFor}</p>
                    {card.model && (
                      <div className="mt-4 flex gap-2">
                        <SecondaryButton
                          className="px-3 py-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectLocalModel(card.model.name);
                          }}
                        >
                          {providerText.selectModel}
                        </SecondaryButton>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#e1e3e4]">
            <div className="h-full w-1/3 rounded-full bg-[#35607f]/70" />
          </div>
        </Panel>

        <Panel className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">{providerText.cloudModels}</h3>
              <p className="mt-1 text-sm text-[#72787e]">{providerText.cloudDataNotice}</p>
            </div>
            <Badge tone="action">OpenAI / Gemini</Badge>
          </div>

          <div className="mt-4 overflow-x-auto pb-3">
            <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
              {cloudModelCatalog.map((model) => {
                const active = selectedProvider === model.provider && selectedCloudModel === model.id;
                const selectable = model.id !== "custom-cloud";

                return (
                  <button
                    className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                      active
                        ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                        : selectable
                          ? "border-[#c2c7ce]/70 hover:border-[#35607f] hover:shadow-md"
                          : "cursor-not-allowed border-[#e1e3e4] opacity-70"
                    }`}
                    disabled={!selectable}
                    key={model.id}
                    onClick={() => {
                      setSelectedProvider(model.provider);
                      setSelectedCloudModel(model.id);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                        <span className="material-symbols-outlined text-[20px]">{providerMeta[model.provider].icon}</span>
                      </span>
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {!selectable && <Badge>{providerText.comingSoon}</Badge>}
                    </div>
                    <p className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{model.label}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">
                      {providerMeta[model.provider].label} / {model.category}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#42474d]">{model.bestFor[ACTIVE_LOCALE]}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#e1e3e4]">
            <div className="h-full w-1/3 rounded-full bg-[#35607f]/70" />
          </div>
        </Panel>

        <div className="mt-8 flex items-center justify-between">
          <SecondaryButton onClick={goToPreviousStep}>{t.back}</SecondaryButton>
          <PrimaryButton onClick={continueFromRecommendation}>
            {selectedProvider === "ollama"
              ? providerText.continueToOllama
              : providerText.continueToProviderSettings}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderOllamaSetup = () => (
      <div className="mx-auto max-w-[880px]">
        <header className="mb-8">
          <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.ollamaTitle}</h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">{t.ollamaBody}</p>
        </header>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.serviceStatus}</span>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[#191c1d]">{serviceLabel}</h3>
              <p className="mt-2 text-sm text-[#42474d]">{status?.version ?? status?.baseUrl ?? "http://localhost:11434"}</p>
            </div>
            <Badge tone={status?.running ? "success" : "action"}>{status?.running ? t.running : t.missing}</Badge>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!status?.installed && (
              <PrimaryButton disabled={!tauriRuntime || busyAction !== null} onClick={installOllama}>
                {busyAction === "install" ? "Installing..." : t.installOllama}
              </PrimaryButton>
            )}
            {status?.installed && !status.running && (
              <PrimaryButton disabled={!tauriRuntime || busyAction !== null} onClick={startOllama}>
                {busyAction === "start" ? "Starting..." : t.startOllama}
              </PrimaryButton>
            )}
            <SecondaryButton disabled={!tauriRuntime || busyAction !== null} onClick={refreshStatus}>
              {t.refresh}
            </SecondaryButton>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">{t.activity}</h3>
            <Badge>{logs.length}</Badge>
          </div>
          <div className="mt-4 h-56 overflow-auto rounded-xl bg-[#2e3132] p-4 text-xs leading-5 text-[#f0f1f2]">
            {logs.length === 0 ? <p>{t.noLogs}</p> : logs.map((item) => <p key={item}>{item}</p>)}
          </div>
        </Panel>
      </div>

      {renderFooter(t.continue, goToNextStep, !status?.running)}
    </div>
  );

  const renderClawCodeSetup = () => {
    const pythonRequirement = runtimeRequirements?.python;
    const pythonReady = Boolean(pythonRequirement?.meetsMinimum);
    const pythonBusy = busyAction === "install-python";

    return (
      <div className="mx-auto max-w-[880px]">
        <header className="mb-8">
          <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">Claw Code setup</h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">
            Claw Code is optional. Install it only if this assistant will help inspect or modify code on this computer.
          </p>
        </header>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Optional developer tool</span>
                <h3 className="mt-3 font-heading text-2xl font-bold text-[#191c1d]">Install later or skip</h3>
                <p className="mt-2 text-sm leading-6 text-[#42474d]">
                  Phase 1 keeps this as a guided placeholder. The installer flow will later verify Git, Node, and the Claw Code package before enabling code-editing skills.
                </p>
              </div>
              <Badge>Optional</Badge>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton disabled title="Installer command will be wired later">
                Install Claw Code
              </PrimaryButton>
              <SecondaryButton onClick={goToNextStep}>Skip for now</SecondaryButton>
            </div>
          </Panel>

          <Panel>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">When should users install it?</h3>
            <div className="mt-4 grid gap-3">
              {[
                ["Code modification", "Needed when the assistant should edit files or help with local projects."],
                ["Plain assistant usage", "Not needed for chat, prompts, TTS, 2D characters, or Google Workspace setup."],
                ["Future skills", "Will be connected to agent skills and MCP-style tools later."],
              ].map(([title, body]) => (
                <div className="rounded-xl bg-[#f3f4f5] p-4" key={title}>
                  <p className="text-sm font-bold text-[#191c1d]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#42474d]">{body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

      <Panel className="mt-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Developer runtime checks</span>
            <h3 className="mt-3 font-heading text-xl font-bold text-[#191c1d]">Python for optional tools</h3>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              Claw Code itself is not the same as Ollama. Python is checked here for optional developer workflows, local scripts, TTS/STT helpers, and future model utilities.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void refreshRuntimeRequirements()}>
              Recheck
            </SecondaryButton>
            <PrimaryButton disabled={!tauriRuntime || pythonReady || busyAction !== null} onClick={() => void installPython()}>
              {pythonBusy ? "Installing Python..." : pythonRequirement?.installed ? "Update Python" : "Install Python"}
            </PrimaryButton>
          </div>
        </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border border-[#e1e3e4] bg-[#f8f9fa] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-base font-bold text-[#191c1d]">{pythonRequirement?.label ?? "Python 3.8+"}</p>
                  <p className="mt-1 text-sm leading-6 text-[#42474d]">
                    {pythonRequirement?.version ?? "Checking Python availability..."}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#72787e]">
                    {pythonRequirement?.note ?? "Not required for Ollama. Some developer tools may need it later."}
                  </p>
                  {pythonRequirement?.command && (
                    <p className="mt-2 font-mono text-[11px] text-[#72787e]">{pythonRequirement.command}</p>
                  )}
                </div>
                <Badge tone={pythonRequirement?.meetsMinimum ? "success" : "neutral"}>
                  {pythonRequirement?.meetsMinimum ? "Ready" : pythonRequirement?.installed ? "Old version" : "Optional"}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e1e3e4] bg-[#f8f9fa] p-4">
              <div className="flex h-full flex-col justify-between gap-4">
                <div>
                  <p className="font-heading text-base font-bold text-[#191c1d]">Install location</p>
                  <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs leading-5 text-[#42474d]">
                    {pythonInstallPath || "Loading default C-drive user location..."}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#72787e]">
                    MiVA passes this path to winget. Some installers may still keep shared components in the standard Windows location.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void choosePythonInstallPath()}>
                    Change
                  </SecondaryButton>
                  <PrimaryButton disabled={!tauriRuntime || pythonReady || busyAction !== null} onClick={() => void installPython()}>
                    {pythonBusy ? "Installing..." : "Install here"}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>

        {runtimeRequirementsError && (
          <p className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{runtimeRequirementsError}</p>
        )}
      </Panel>

      {renderFooter("Continue", goToNextStep)}
    </div>
    );
  };

  const renderDownload = () => {
    const downloadBusy = busyAction === `download:${selectedModel}`;
    const activeProgress = downloadProgress?.model === selectedModel ? downloadProgress : null;
    const progress = selectedModelInstalled ? 100 : activeProgress?.percent ?? 0;

    return (
      <div className="mx-auto max-w-[880px]">
        <header className="mb-8">
          <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.downloadTitle}</h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">{t.downloadBody}</p>
        </header>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
          <Panel>
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge tone={selectedModelInstalled ? "success" : "action"}>
                  {selectedModelInstalled ? t.installed : t.notInstalled}
                </Badge>
                <h3 className="mt-4 font-heading text-3xl font-bold text-[#191c1d]">{selectedModelInfo.label}</h3>
                <p className="mt-3 text-sm leading-6 text-[#42474d]">{selectedModelInfo.summary[ACTIVE_LOCALE]}</p>
              </div>
              <select
                className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-2 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
              >
                {modelCatalog.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8">
              <div className="h-2 overflow-hidden rounded-full bg-[#e1e3e4]">
                <div className="h-full rounded-full bg-[#35607f] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#42474d]">
                <span>{t.modelStorage}: {t.defaultStorage}</span>
                <span>{progress}%</span>
              </div>
            </div>

            <div className="mt-8">
              <PrimaryButton
                disabled={!tauriRuntime || !status?.running || selectedModelInstalled || busyAction !== null}
                onClick={() => downloadModel(selectedModel)}
              >
                {downloadBusy ? t.downloading : t.downloadModel}
              </PrimaryButton>
            </div>
          </Panel>

          <Panel>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">{t.installedModels}</h3>
            <div className="mt-4 grid gap-3">
              {installedModels.length === 0 ? (
                <p className="rounded-xl bg-[#f3f4f5] p-4 text-sm text-[#42474d]">{t.none}</p>
              ) : (
                installedModels.map((model) => (
                  <div className="flex items-center justify-between rounded-xl bg-[#f3f4f5] p-4 text-sm" key={model}>
                    <span className="font-semibold text-[#191c1d]">{model}</span>
                    <Badge tone="success">{t.installed}</Badge>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        {renderFooter(t.continue, goToNextStep, !selectedModelInstalled)}
      </div>
    );
  };

  const renderChat = () => {
    const runtimeChat = appMode === "runtime";
    const greeting =
      selectedProvider === "ollama"
        ? t.chatGreeting.replace("{model}", activeModelLabel)
        : `Hello. MiVA has prepared ${activeProviderLabel} / ${activeModelLabel}. If an API key is configured, you can test responses now.`;
    const sandboxBody = runtimeChat
      ? selectedProvider === "ollama"
        ? t.chatSandboxBody.replace("{model}", activeModelLabel)
        : providerText.cloudDataNotice
      : `${t.chatSandboxBody} Current provider: ${activeProviderLabel} / ${activeModelLabel}.`;
    const chatUnavailable = selectedProvider === "ollama"
      ? !status?.installed || (status.running && !selectedModelInstalled)
      : false;
    const chatSubmitDisabled = chatUnavailable || busyAction === "chat";
    const chatLatencyMetric = formatChatLatency(chatMetrics?.latencyMs);
    const chatMessageMetric = `Messages: ${activeChatMessages.length}`;
    const chatProviderMetric = `${activeProviderMode === "local" ? "Local" : "Cloud"}: ${activeModelLabel}`;
    const showAssistantRuntimePanel = runtimeChat;
    const chatShellClass = !showAssistantRuntimePanel
      ? "relative mx-auto min-h-[calc(100vh-132px)] max-w-[880px] overflow-visible"
      : assistantPanelMinimized
      ? runtimeChat
        ? "relative mx-auto h-[calc(100vh-132px)] max-w-[1180px] overflow-visible"
        : "relative mx-auto min-h-[calc(100vh-132px)] max-w-[1180px] overflow-visible"
      : runtimeChat
        ? "relative mx-auto grid h-[calc(100vh-132px)] max-w-[1180px] grid-cols-[minmax(0,1fr)_300px] gap-6 overflow-visible"
        : "relative mx-auto grid min-h-[calc(100vh-132px)] max-w-[1180px] grid-cols-[minmax(0,1fr)_300px] gap-6 overflow-visible";
    const chatSectionClass = runtimeChat
      ? "flex min-h-0 flex-col overflow-hidden"
      : "flex flex-col";
    const chatMessagesClass = runtimeChat
      ? "flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-28 pr-1 pt-2"
      : "flex flex-col gap-8 pb-8 pr-1 pt-2";
    const assistantCardClass = runtimeChat
      ? "sticky top-4 flex h-[calc(100vh-156px)] self-start flex-col overflow-hidden rounded-3xl border border-[#c2c7ce] bg-white shadow-[0_18px_48px_rgba(53,96,127,0.10)]"
      : "sticky top-2 flex max-h-[calc(100vh-156px)] self-start flex-col overflow-hidden rounded-3xl border border-[#c2c7ce] bg-white shadow-[0_18px_48px_rgba(53,96,127,0.10)]";

    return (
      <div className={chatShellClass}>
        <section className={chatSectionClass}>
        <div
          className={chatMessagesClass}
          ref={chatScrollRef}
          onScroll={handleChatScroll}
        >
          {appMode === "setup" && (
            <section className="relative overflow-hidden rounded-3xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_18px_48px_rgba(53,96,127,0.10)]">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#cae6ff]/60 blur-3xl" />
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#c9e8cb] text-[#334d38] shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">verified</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#72787e]">Test Chat</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-[#191c1d]">Try this assistant before entering runtime</h2>
                    <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#42474d]">
                      Test chat is temporary for setup validation. Runtime chat is saved locally and can be restored after restart.
                    </p>
                  </div>
                </div>
                <PrimaryButton
                  className="shrink-0 rounded-xl px-4 py-2.5 text-sm"
                  onClick={() => {
                    void finalizeCurrentLocalAssistantProfile();
                    setAppMode("runtime");
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    {t.enterMiVA}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </span>
                </PrimaryButton>
              </div>
            </section>
          )}

          {showChatIntroCard && (
            <section className="relative rounded-2xl border border-[#c2c7ce] bg-white p-6 shadow-sm">
              <button
                aria-label={t.close}
                className="absolute right-4 top-4 rounded-full p-1 text-[#72787e] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                onClick={() => setDismissedChatIntroKeys((current) => [...current, chatIntroKey])}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="flex items-start gap-4 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#4f7999] text-white">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div>
                  <h2 className="font-heading mb-2 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">
                    {t.chatSandboxTitle}
                  </h2>
                  <p className="text-sm leading-6 text-[#42474d]">
                    {selectedProvider === "ollama" ? (
                      <>
                        {sandboxBody.split(activeModelLabel)[0]}
                        <span className="font-semibold text-[#35607f]">{activeModelLabel}</span>
                        {sandboxBody.split(activeModelLabel)[1] ?? ""}
                      </>
                    ) : (
                      sandboxBody
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="flex max-w-[85%] items-end gap-4 self-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
              <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
            </div>
            <div className="rounded-2xl rounded-bl-none border border-[#c2c7ce] bg-white p-4 shadow-[0_8px_24px_rgba(53,96,127,0.08)]">
              <p className="text-sm leading-6 text-[#191c1d]">{greeting}</p>
              <span className="mt-2 block text-right text-[10px] text-[#72787e]">{t.justNow}</span>
            </div>
          </div>

          {activeChatMessages.map((message, index) => (
            <div
              className={`flex max-w-[85%] items-end gap-4 ${message.role === "user" ? "self-end" : "self-start"}`}
              key={`${message.role}-${index}`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
                  <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
                </div>
              )}
              <div
                className={`rounded-2xl border p-4 text-sm leading-6 shadow-[0_8px_24px_rgba(53,96,127,0.08)] ${
                  message.role === "user"
                    ? "rounded-br-none border-[#35607f] bg-[#35607f] text-white"
                    : "rounded-bl-none border-[#c2c7ce] bg-white text-[#191c1d]"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {busyAction === "chat" && (
            <div className="flex max-w-[85%] items-end gap-4 self-start" aria-live="polite">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
                <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
              </div>
              <div className="rounded-2xl rounded-bl-none border border-[#c2c7ce] bg-white p-4 shadow-[0_8px_24px_rgba(53,96,127,0.08)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-[#35607f]">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>{t.generatingResponse}</span>
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="typing-dot" />
                    <span className="typing-dot animation-delay-150" />
                    <span className="typing-dot animation-delay-300" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeChatMessages.length === 0 && (
            <div className="mt-3 flex flex-col items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#72787e]">{t.suggestedAction}</p>
              <button
                className="group flex items-center gap-3 rounded-full border border-[#35607f]/20 bg-[#f3f4f5] px-6 py-3 text-[#35607f] transition-all duration-200 hover:border-[#35607f] hover:bg-[#35607f]/5"
                onClick={() => setChatInput(t.suggestedPrompt)}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="text-sm font-medium italic">{t.suggestedPrompt}</span>
                <span className="material-symbols-outlined translate-x-1 text-sm opacity-0 transition-opacity group-hover:opacity-100">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
          <div ref={chatEndRef} className="h-1 shrink-0" />
        </div>

        <div className="sticky bottom-0 z-10 bg-[#f8f9fa]/90 pb-2 pt-4 backdrop-blur">
          {showJumpToLatest && (
            <button
              aria-label={t.jumpToLatest}
              className="absolute -top-5 left-1/2 z-20 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-[#c2c7ce] bg-white text-[#35607f] shadow-[0_10px_24px_rgba(53,96,127,0.18)] transition hover:-translate-y-0.5 hover:border-[#35607f]"
              title={t.jumpToLatest}
              type="button"
              onClick={() => scrollChatToLatest()}
            >
              <span className="material-symbols-outlined text-[22px]">arrow_downward</span>
            </button>
          )}

          <form
            className="flex items-center gap-2 rounded-2xl border border-[#c2c7ce] bg-white p-2 shadow-[0_12px_40px_rgba(53,96,127,0.10)]"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <button className="p-3 text-[#72787e] transition hover:text-[#35607f]" type="button">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <textarea
              className="min-h-11 flex-1 resize-none border-none bg-transparent py-3 text-sm text-[#191c1d] outline-none placeholder:text-[#72787e]"
              disabled={chatUnavailable}
              placeholder={busyAction === "chat" ? t.generatingResponse : t.messagePlaceholder}
              rows={1}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (!chatSubmitDisabled) {
                    void sendMessage();
                  }
                }
              }}
            />
            <button className="p-2 text-[#72787e] transition hover:text-[#4a654e]" type="button">
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#35607f] text-white shadow-md transition hover:bg-[#4f7999] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={chatSubmitDisabled}
              type="submit"
            >
              <span className={`material-symbols-outlined ${busyAction === "chat" ? "animate-spin" : ""}`}>
                {busyAction === "chat" ? "progress_activity" : "send"}
              </span>
            </button>
          </form>

          <div className="mt-3 flex justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4a654e]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{chatLatencyMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#35607f]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{chatMessageMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#555d63]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{chatProviderMetric}</span>
            </div>
          </div>
        </div>
        </section>

        {showAssistantRuntimePanel && (assistantPanelMinimized ? (
          <button
            className="absolute right-0 top-0 z-20 flex max-w-[240px] items-center gap-3 rounded-2xl border border-[#c2c7ce] bg-white/95 p-3 text-left shadow-[0_16px_40px_rgba(53,96,127,0.16)] transition hover:border-[#35607f]"
            type="button"
            title="Show assistant panel"
            onClick={() => setAssistantPanelMinimized(false)}
          >
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#35607f] text-white">
              <span className="material-symbols-outlined text-[24px]">smart_toy</span>
              <span
                className={`absolute -right-0.5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  busyAction === "chat" ? "bg-[#35607f] animate-pulse" : "bg-[#4a654e]"
                }`}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#191c1d]">{activeModelLabel}</span>
              <span className="block text-xs font-semibold text-[#72787e]">Assistant profile</span>
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#72787e]">open_in_full</span>
          </button>
        ) : (
          <aside className={assistantCardClass}>
          <div className="border-b border-[#e1e3e4] p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.assistantStageTitle}</p>
              <button
                aria-label="Minimize assistant panel"
                className="grid h-8 w-8 place-items-center rounded-full text-[#72787e] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                type="button"
                title="Minimize"
                onClick={() => setAssistantPanelMinimized(true)}
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>
            <h2 className="mt-2 font-heading text-[22px] font-bold leading-7 text-[#191c1d]">{activeModelLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">{t.assistantStageBody}</p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#cae6ff_0%,#f8f9fa_48%,#ffffff_100%)] p-6 text-center">
            <div className="relative grid h-40 w-40 place-items-center rounded-full bg-[#35607f] text-white shadow-[0_24px_60px_rgba(53,96,127,0.28)]">
              <span className="absolute inset-3 rounded-full border border-white/25" />
              <span className="material-symbols-outlined text-[64px]">smart_toy</span>
              <span
                className={`absolute -right-1 top-8 h-5 w-5 rounded-full border-4 border-white ${
                  busyAction === "chat" ? "bg-[#35607f] animate-pulse" : "bg-[#4a654e]"
                }`}
              />
            </div>

            <h3 className="mt-8 font-heading text-xl font-bold text-[#191c1d]">{t.characterPreview}</h3>
            <p className="mt-3 text-sm leading-6 text-[#42474d]">{t.characterPreviewBody}</p>

            <div className="mt-6 grid w-full gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-[#72787e]">
                  {selectedProvider === "ollama" ? providerText.localRuntimeReady : providerText.cloudRuntimeReady}
                </span>
                <Badge tone={selectedProvider === "ollama" ? (status?.running ? "success" : "neutral") : "action"}>
                  {selectedProvider === "ollama" ? (status?.running ? t.running : t.stopped) : activeProviderLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-[#72787e]">{t.characterIdle}</span>
                <Badge tone={busyAction === "chat" ? "action" : "neutral"}>
                  {busyAction === "chat" ? t.generatingResponse : t.characterListening}
                </Badge>
              </div>
            </div>
          </div>
          </aside>
        ))}
      </div>
    );
  };

  const renderProfile = () => {
    const profile = activeLocalProfile ?? buildCurrentLocalAssistantProfile("draft");
    const profileRows = [
      ["Status", profile.status],
      ["Provider", `${activeProviderLabel} / ${activeProviderMode}`],
      ["Model", activeModelLabel],
      ["Use case", profile.useCase ?? "-"],
      ["Answer style", profile.answerStyle ?? "-"],
      ["Language", profile.languageUse ?? "-"],
      ["Local mode", profile.localMode ?? "-"],
    ];
    const capabilityRows = [
      ["Voice", profile.capabilities.voice.enabled],
      ["Character", profile.capabilities.character.enabled],
      ["Google Workspace", profile.capabilities.googleWorkspace.enabled],
      ["Files", profile.capabilities.files.enabled],
      ["Tools", profile.capabilities.tools.enabled],
      ["MCP", profile.capabilities.mcp.enabled],
      ["Skills", profile.capabilities.skills.enabled],
      ["External APIs", profile.capabilities.externalApis.enabled],
    ];

    return (
      <div className="mx-auto max-w-[920px]">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Account</p>
            <h2 className="mt-3 font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">
              Sign in to sync profiles
            </h2>
            <p className="mt-2 max-w-[680px] text-base leading-7 text-[#42474d]">
              Local profiles work without an account. Sign-in will later sync assistants, settings, and chat history across devices.
            </p>
          </div>
          <button
            className="rounded-xl bg-[#35607f] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#4f7999]"
            type="button"
          >
            Sign in
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#191c1d]">Assistant Setup</h3>
                <p className="mt-2 text-sm leading-6 text-[#42474d]">
                  Survey choices, provider selection, and model recommendation are saved locally first.
                </p>
              </div>
              <button
                className="rounded-xl bg-[#35607f] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#4f7999]"
                type="button"
                onClick={() => void finalizeCurrentLocalAssistantProfile()}
              >
                Finalize
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {profileRows.map(([label, value]) => (
                <div className="flex items-center justify-between rounded-xl bg-[#f3f4f5] px-4 py-3 text-sm" key={label}>
                  <span className="font-semibold text-[#72787e]">{label}</span>
                  <span className="font-bold text-[#191c1d]">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-[#f8f9fa] p-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Future interests</span>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">
                {profile.futureFeatures.length ? profile.futureFeatures.join(", ") : "None selected"}
              </p>
            </div>
          </Panel>

          <Panel>
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">Extension Slots</h3>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              These fields are placeholders for later role details, voice, character, Google Workspace, MCP, and skills.
            </p>

            <div className="mt-6 grid gap-3">
              {capabilityRows.map(([label, enabled]) => (
                <div className="flex items-center justify-between rounded-xl bg-[#f3f4f5] px-4 py-3 text-sm" key={String(label)}>
                  <span className="font-semibold text-[#42474d]">{label}</span>
                  <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Later"}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="mt-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">Prompt Preview</h3>
              <p className="mt-1 text-sm text-[#72787e]">This preview is what the local helper can use to shape answers.</p>
            </div>
            <button
              className="rounded-xl border border-[#c2c7ce] px-4 py-2 text-sm font-bold text-[#42474d] transition hover:border-[#35607f] hover:text-[#35607f]"
              type="button"
              onClick={() => enterSettings("general")}
            >
              Open settings
            </button>
          </div>
          <pre className="mt-5 max-h-56 overflow-auto rounded-2xl bg-[#2e3132] p-5 text-xs leading-6 text-[#f0f1f2]">
            {profile.prompt.systemPrompt}
          </pre>
        </Panel>

        {assistantProfileError && (
          <p className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{assistantProfileError}</p>
        )}
      </div>
    );
  };

  const renderAuth = () => (
    <main className="grid h-full w-full flex-1 place-items-center bg-[#f8f9fa] px-6 text-[#191c1d]">
      <section className="w-full max-w-[440px] rounded-3xl border border-[#c2c7ce]/70 bg-white p-8 shadow-[0_24px_80px_rgba(53,96,127,0.16)]">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">MiVA Account</p>
            <h1 className="mt-3 font-heading text-[30px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              MiVA Desktop opens web login in your system browser, then receives a desktop session from the API.
            </p>
          </div>
          <button
            aria-label="Close sign in"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#72787e] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
            type="button"
            onClick={closeAuth}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {authSession ? (
          <div className="grid gap-5">
            <div className="rounded-2xl bg-[#f3f4f5] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Connected Account</p>
              <p className="mt-3 text-lg font-bold text-[#191c1d]">{authSession.user.displayName}</p>
              <p className="mt-1 text-sm text-[#42474d]">{authSession.user.email}</p>
              <Badge tone="success">{authSession.user.role}</Badge>
            </div>
            <PrimaryButton className="w-full justify-center" onClick={closeAuth}>
              Continue to MiVA
            </PrimaryButton>
            <SecondaryButton className="w-full" onClick={clearAuthSession}>
              Sign out
            </SecondaryButton>
          </div>
        ) : (
          <div className="grid gap-5">
            <PrimaryButton
              className="w-full justify-center"
              disabled={authFlowState === "opening" || authFlowState === "waiting"}
              onClick={() => void startBrowserSignIn()}
            >
              {authFlowState === "opening"
                ? "Opening browser..."
                : authFlowState === "waiting"
                  ? "Waiting for web login..."
                  : "Continue in browser"}
            </PrimaryButton>

            {deviceAuthRequest && authFlowState === "waiting" && (
              <div className="rounded-2xl border border-[#cae6ff] bg-[#eff8ff] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#35607f]">Browser login waiting</p>
                <p className="mt-2 text-sm leading-6 text-[#42474d]">Complete sign-in in the browser window. MiVA Desktop will connect automatically.</p>
                <p className="mt-3 font-mono text-sm font-bold text-[#191c1d]">Code: {deviceAuthRequest.userCode}</p>
              </div>
            )}

            {authFlowError && (
              <p className="rounded-2xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{authFlowError}</p>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e1e3e4]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#72787e]">Local dev fallback</span>
              <div className="h-px flex-1 bg-[#e1e3e4]" />
            </div>

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitDevLogin();
              }}
            >
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">ID</span>
                <input
                  autoComplete="username"
                  className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
                  placeholder="dev@miva.local"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Password</span>
                <input
                  autoComplete="current-password"
                  className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
                  placeholder="miva1234"
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
              </label>

              <SecondaryButton className="w-full" disabled={authFlowState === "opening"} type="submit">
                Use local dev login
              </SecondaryButton>
            </form>
          </div>
        )}
      </section>
    </main>
  );

  const renderStudio = () => {
    const activeStudioSection = studioSections.find((section) => section.id === studioSection) ?? studioSections[0];
    const placeholderCards: Record<StudioSection, Array<[string, string, string]>> = {
      myAssistants: [
        ["Assistant library", "Saved assistants from Setup and Studio are shown here.", "supervisor_account"],
        ["Cloud sync", "Local assistants can be pushed to the web console manually.", "cloud_sync"],
        ["Runtime launch", "Choose one assistant before entering Runtime.", "rocket_launch"],
      ],
      overview: [
        ["Assistant profile", "Current setup choices and selected model will be edited here.", "account_circle"],
        ["Prompt stack", "Persona, rules, and tool instructions will be assembled here.", "edit_note"],
        ["Runtime preview", "Studio changes will be tested before they affect runtime chat.", "play_circle"],
      ],
      models: [
        ["Local model library", "Browse Ollama models and download them onto this computer.", "deployed_code_update"],
        ["Cloud model routing", "Choose OpenAI or Gemini models without local downloads.", "cloud"],
        ["Model policy", "Set fallback and quality preferences after provider rules are finalized.", "rule"],
      ],
      prompts: [
        ["Persona", "Define assistant role, tone, and boundaries.", "badge"],
        ["System prompt", "Compose model instructions from survey answers and user edits.", "subject"],
        ["Prompt presets", "Save multiple prompt configurations per assistant.", "bookmark"],
      ],
      character: [
        ["2D avatar", "Attach Live2D or image-based assistant characters later.", "face"],
        ["Expression states", "Map listening, thinking, speaking, and idle states.", "mood"],
        ["Scene layout", "Control where the assistant appears in runtime mode.", "dashboard_customize"],
      ],
      tts: [
        ["Text to speech", "Choose voice providers and speaking style.", "record_voice_over"],
        ["Speech to text", "Microphone input and wake controls will be configured here.", "mic"],
        ["Voice test", "Preview latency and quality before enabling runtime voice.", "graphic_eq"],
      ],
      googleWorkspace: [
        ["Google Workspace CLI", "Calendar, Gmail, and Drive integration settings will live here.", "workspaces"],
        ["OAuth status", "Account connection and scopes will be shown here after login exists.", "verified_user"],
        ["Tool permissions", "Users will decide what the assistant can read or change.", "rule"],
      ],
      tools: [
        ["MCP servers", "Register local and remote model context protocol servers.", "hub"],
        ["Agent skills", "Enable specialized abilities such as code help or file workflows.", "extension"],
        ["External APIs", "Attach custom APIs after provider security is finalized.", "api"],
      ],
    };

    const renderMyAssistants = () => {
      const currentDraft = buildCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
      const profiles = assistantProfileStore.profiles.length ? assistantProfileStore.profiles : [currentDraft];

      return (
        <div className="grid gap-6">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#191c1d]">My Assistants</h3>
                <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
                  Choose which saved assistant you want to edit in Studio, run in Runtime, or sync to the web console.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Badge tone="action">{profiles.length} saved</Badge>
                <PrimaryButton onClick={() => void createNewLocalAssistantProfile()}>
                  New Assistant
                </PrimaryButton>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            {profiles.map((profile) => {
              const active = profile.id === activeLocalProfileId;
              const syncLabel = profile.sync?.cloudEnabled ? "Cloud synced" : "Local only";
              const syncTone = profile.sync?.cloudEnabled ? "success" : "neutral";
              const codingSettings = normalizePromptSettings(profile.prompt?.settings).coding;

              return (
                <article
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                    active ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                  }`}
                  key={profile.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                      <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {active && <Badge tone="action">Active</Badge>}
                      <Badge tone={syncTone}>{syncLabel}</Badge>
                    </div>
                  </div>

                  <h4 className="mt-5 font-heading text-xl font-bold text-[#191c1d]">{profile.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-[#42474d]">{profile.description}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Role", profile.useCase ?? "daily"],
                      ["Provider", providerMeta[profile.provider]?.label ?? profile.provider],
                      ["Model", profile.modelLabel || profile.model],
                      ["Coding", codingCapabilityCopy[codingSettings.capability]],
                    ].map(([label, value]) => (
                      <div className="rounded-xl bg-[#f3f4f5] p-3" key={label}>
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">{label}</span>
                        <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone={codingSettings.providerPolicy === "cloudRequired" ? "action" : "neutral"}>
                      {codingProviderPolicyCopy[codingSettings.providerPolicy]}
                    </Badge>
                    {profile.futureFeatures.map((feature) => (
                      <Badge key={feature}>{feature}</Badge>
                    ))}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-[#72787e]">
                    Last updated {new Date(profile.updatedAt).toLocaleString()}.
                    {profile.sync?.lastSyncedAt ? ` Synced ${new Date(profile.sync.lastSyncedAt).toLocaleString()}.` : ""}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <SecondaryButton
                      onClick={() => {
                        setActiveLocalProfileId(profile.id);
                        applyLocalAssistantProfile(profile);
                      }}
                    >
                      {active ? "Selected" : "Select"}
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => {
                        setActiveLocalProfileId(profile.id);
                        applyLocalAssistantProfile(profile);
                        setStudioSection("overview");
                      }}
                    >
                      Edit in Studio
                    </SecondaryButton>
                    {active && (
                      <SecondaryButton
                        disabled={assistantProfileSyncState === "syncing"}
                        onClick={() => void syncCurrentAssistantProfileToCloud()}
                      >
                        {assistantProfileSyncState === "syncing" ? "Syncing..." : "Sync to Web"}
                      </SecondaryButton>
                    )}
                    <PrimaryButton
                      onClick={() => {
                        setActiveLocalProfileId(profile.id);
                        applyLocalAssistantProfile(profile);
                        setAppMode("runtime");
                      }}
                    >
                      Run
                    </PrimaryButton>
                    <SecondaryButton
                      className="border-[#ffdad6] text-[#93000a] hover:bg-[#ffdad6]/40"
                      onClick={() => void deleteLocalAssistantProfile(profile.id)}
                    >
                      Delete
                    </SecondaryButton>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      );
    };

    const renderStudioOverview = () => {
      const profile = buildCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
      const localChangesPending = Boolean(
        activeLocalProfile &&
        (
          activeLocalProfile.name !== profile.name ||
          activeLocalProfile.description !== profile.description ||
          activeLocalProfile.provider !== profile.provider ||
          activeLocalProfile.model !== profile.model ||
          activeLocalProfile.useCase !== profile.useCase ||
          activeLocalProfile.answerStyle !== profile.answerStyle ||
          activeLocalProfile.priority !== profile.priority ||
          activeLocalProfile.localMode !== profile.localMode ||
          JSON.stringify(normalizePromptSettings(activeLocalProfile.prompt?.settings)) !== JSON.stringify(profile.prompt.settings)
        )
      );
      const syncBadgeTone = assistantProfileSyncState === "error"
        ? "neutral"
        : assistantProfileSyncState === "syncing"
          ? "action"
          : localChangesPending
            ? "action"
            : profile.sync.cloudEnabled
            ? "success"
            : "neutral";
      const syncLabel = assistantProfileSyncState === "syncing"
        ? "Syncing"
        : assistantProfileSyncState === "error"
          ? "Sync failed"
          : localChangesPending
            ? "Local changes"
            : profile.sync.cloudEnabled
            ? "Cloud synced"
            : "Local only";

      return (
        <div className="grid gap-6 md:grid-cols-3">
          <Panel className="min-h-[260px] md:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                <span className="material-symbols-outlined text-[22px]">account_circle</span>
              </span>
              <Badge tone={syncBadgeTone}>{syncLabel}</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Assistant name</span>
                <input
                  className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 font-heading text-xl font-bold text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={profileDetailsDraft.name}
                  onChange={(event) => setProfileDetailsDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Description</span>
                <textarea
                  className="min-h-[96px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#42474d] outline-none focus:border-[#35607f]"
                  value={profileDetailsDraft.description}
                  onChange={(event) => setProfileDetailsDraft((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Status", profile.status],
                ["Provider", providerMeta[profile.provider]?.label ?? profile.provider],
                ["Model", profile.modelLabel || profile.model],
                ["Coding", codingCapabilityCopy[profile.prompt.settings.coding.capability]],
              ].map(([label, value]) => (
                <div className="rounded-xl bg-[#f3f4f5] p-3" key={label}>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">{label}</span>
                  <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{value}</p>
                </div>
              ))}
            </div>

            {profile.sync.lastSyncedAt && (
              <p className="mt-4 text-xs leading-5 text-[#72787e]">
                Last synced at {new Date(profile.sync.lastSyncedAt).toLocaleString()}.
              </p>
            )}

            {assistantProfileSyncMessage && (
              <p className={`mt-4 rounded-xl p-3 text-xs leading-5 ${
                assistantProfileSyncState === "error" ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#cae6ff]/45 text-[#1c4b69]"
              }`}>
                {assistantProfileSyncMessage}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <PrimaryButton
                disabled={assistantProfileSyncState === "syncing"}
                onClick={() => void syncCurrentAssistantProfileToCloud()}
              >
                {assistantProfileSyncState === "syncing" ? "Syncing..." : "Sync to Web"}
              </PrimaryButton>
              <SecondaryButton onClick={() => void saveCurrentLocalAssistantProfile(profile.status)}>
                Save locally
              </SecondaryButton>
            </div>
          </Panel>

          {placeholderCards.overview.slice(1).map(([title, body, icon]) => (
            <Panel className="min-h-[260px]" key={title}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                <span className="material-symbols-outlined text-[22px]">{icon}</span>
              </span>
              <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#42474d]">{body}</p>
              <Badge>Placeholder</Badge>
            </Panel>
          ))}
        </div>
      );
    };

    const renderPromptStudio = () => {
      const profile = buildCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
      const settings = profile.prompt.settings;
      const updatePromptSettings = (updater: (current: PromptSettings) => PromptSettings) => {
        setPromptSettingsDraft((current) => updater(current));
      };
      const updateSimplePrompt = (key: keyof PromptSettings["simple"], value: string) => {
        updatePromptSettings((current) => ({
          ...current,
          simple: {
            ...current.simple,
            [key]: value,
          },
        }));
      };
      const updateToolConnection = (key: keyof PromptSettings["toolConnections"], enabled: boolean) => {
        updatePromptSettings((current) => ({
          ...current,
          toolConnections: {
            ...current.toolConnections,
            [key]: enabled,
          },
        }));
      };
      const updateListItem = (key: "responseRules" | "safetyRules", index: number, value: string) => {
        updatePromptSettings((current) => ({
          ...current,
          [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item),
        }));
      };
      const addListItem = (key: "responseRules" | "safetyRules", value: string) => {
        updatePromptSettings((current) => ({
          ...current,
          [key]: [...current[key], value],
        }));
      };
      const removeListItem = (key: "responseRules" | "safetyRules", index: number) => {
        updatePromptSettings((current) => ({
          ...current,
          [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
        }));
      };
      const toolOptions: Array<{
        id: keyof PromptSettings["toolConnections"];
        title: string;
        label: string;
        icon: string;
        description: string;
        role: string;
        features: string[];
      }> = [
        {
          id: "googleWorkspaceCli",
          title: "Google Workspace CLI",
          label: "Google apps",
          icon: "workspaces",
          description: "Connects Google Calendar, Gmail, Drive, and Workspace tasks after OAuth and CLI setup are added.",
          role: "Lets the assistant prepare schedules, emails, document actions, and workspace automation. Until the tool confirms completion, MiVA should explain the draft action instead of saying it is done.",
          features: ["Calendar planning", "Gmail draft support", "Drive and Workspace actions"],
        },
        {
          id: "daisoCli",
          title: "Daiso CLI",
          label: "Daiso",
          icon: "terminal",
          description: "Reserved for Daiso CLI workflows that can run approved local or external commands later.",
          role: "Lets the assistant understand that Daiso actions may become available. MiVA must still ask before tool use and only report completion after the connected CLI confirms it.",
          features: ["Approved CLI workflows", "Local automation hooks", "Future tool actions"],
        },
      ];

      const renderPromptPreview = () => (
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-heading text-xl font-bold text-[#191c1d]">System prompt preview</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                This is the assembled prompt sent to the local helper with each chat request.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={() => setPromptSettingsDraft(defaultPromptSettings)}>
                Reset defaults
              </SecondaryButton>
              <PrimaryButton onClick={() => void saveCurrentLocalAssistantProfile(profile.status)}>
                Save locally
              </PrimaryButton>
            </div>
          </div>
          <pre className="mt-5 max-h-[360px] w-full max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[#191c1d] p-5 text-xs leading-6 text-[#e1e3e4]">
            {profile.prompt.systemPrompt}
          </pre>
        </Panel>
      );

      const renderSimplePrompt = () => (
        <>
          <Panel>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="min-w-0">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                  <span className="material-symbols-outlined text-[24px]">edit_note</span>
                </span>
                <h3 className="mt-5 font-heading text-xl font-bold text-[#191c1d]">Simple prompt builder</h3>
                <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
                  Write what normal users actually want this assistant to do. MiVA turns these fields into structured prompt instructions.
                </p>
                <div className="mt-5 grid gap-3">
                  {[
                    ["Purpose", "What this assistant is for."],
                    ["Tasks", "The work the user wants to ask for often."],
                    ["Tone", "How the assistant should sound."],
                    ["Limits", "What the assistant should avoid."],
                  ].map(([title, body]) => (
                    <div className="rounded-xl bg-[#f3f4f5] p-3" key={title}>
                      <p className="text-sm font-bold text-[#191c1d]">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#72787e]">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid min-w-0 gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Assistant purpose</span>
                  <textarea
                    className="min-h-[96px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
                    value={settings.simple.assistantPurpose}
                    onChange={(event) => updateSimplePrompt("assistantPurpose", event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">What should this assistant do?</span>
                  <textarea
                    className="min-h-[140px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
                    placeholder="Example: manage my schedule, remind me of deadlines, summarize study notes, help with emails."
                    value={settings.simple.desiredTasks}
                    onChange={(event) => updateSimplePrompt("desiredTasks", event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Preferred tone</span>
                  <input
                    className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                    value={settings.simple.preferredTone}
                    onChange={(event) => updateSimplePrompt("preferredTone", event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Things to avoid</span>
                  <textarea
                    className="min-h-[92px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
                    value={settings.simple.avoidances}
                    onChange={(event) => updateSimplePrompt("avoidances", event.target.value)}
                  />
                </label>
              </div>
            </div>
          </Panel>
        </>
      );

      const renderToolsForAiCard = () => (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Tools for AI</p>
              <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Connected tool permissions</h3>
              <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
                Choose which external tools this assistant is allowed to prepare for. These toggles shape the prompt; real actions still require a connected tool and confirmation.
              </p>
            </div>
            <SecondaryButton onClick={() => setToolsForAiOpen(true)}>
              Manage tools
            </SecondaryButton>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {toolOptions.map((tool) => {
              const enabled = settings.toolConnections[tool.id];

              return (
                <div className="rounded-xl bg-[#f3f4f5] p-4" key={tool.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                        <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#191c1d]">{tool.title}</p>
                        <p className="mt-1 text-xs text-[#72787e]">{tool.label}</p>
                      </div>
                    </div>
                    <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "On" : "Off"}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#42474d]">{tool.description}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      );

      const renderToolsForAiModal = () => {
        if (!toolsForAiOpen) {
          return null;
        }

        return (
          <div className="fixed inset-0 z-[90] grid place-items-center bg-[#191c1d]/35 px-6 backdrop-blur-sm">
            <section className="max-h-[86vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_24px_80px_rgba(25,28,29,0.24)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Tools for AI</p>
                  <h3 className="mt-2 font-heading text-2xl font-bold text-[#191c1d]">Tool access settings</h3>
                  <p className="mt-2 text-sm leading-6 text-[#42474d]">
                    Turn tools on when this assistant should prepare actions for that integration. Turning a tool on does not mean the action is already connected or completed.
                  </p>
                </div>
                <button
                  aria-label="Close tools settings"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#72787e] transition hover:bg-[#f3f4f5]"
                  onClick={() => setToolsForAiOpen(false)}
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                {toolOptions.map((tool) => {
                  const enabled = settings.toolConnections[tool.id];

                  return (
                    <article className="rounded-2xl border border-[#c2c7ce]/70 bg-[#f8f9fa] p-5" key={tool.id}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                            <span className="material-symbols-outlined text-[24px]">{tool.icon}</span>
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-heading text-lg font-bold text-[#191c1d]">{tool.title}</h4>
                            <p className="mt-2 text-sm leading-6 text-[#42474d]">{tool.description}</p>
                          </div>
                        </div>
                        <button
                          aria-pressed={enabled}
                          className={`flex h-9 w-[76px] shrink-0 items-center rounded-full p-1 transition ${
                            enabled ? "justify-end bg-[#35607f]" : "justify-start bg-[#dfe3e6]"
                          }`}
                          onClick={() => updateToolConnection(tool.id, !enabled)}
                          type="button"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[11px] font-bold text-[#35607f] shadow-sm">
                            {enabled ? "On" : "Off"}
                          </span>
                        </button>
                      </div>

                      <div className="mt-4 rounded-xl bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">What this gives the assistant</p>
                        <p className="mt-2 text-sm leading-6 text-[#42474d]">{tool.role}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {tool.features.map((feature) => (
                          <Badge key={feature}>{feature}</Badge>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <PrimaryButton onClick={() => setToolsForAiOpen(false)}>
                  Done
                </PrimaryButton>
              </div>
            </section>
          </div>
        );
      };

      const renderDeveloperPrompt = () => (
        <>
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#191c1d]">Developer prompt controls</h3>
                <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
                  Edit detailed prompt pieces used by local and cloud providers. These settings are stored in the active assistant profile.
                </p>
              </div>
              <Badge tone="action">Advanced</Badge>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Persona</span>
                <textarea
                  className="min-h-[128px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={settings.persona}
                  onChange={(event) => updatePromptSettings((current) => ({ ...current, persona: event.target.value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Role goal</span>
                <textarea
                  className="min-h-[128px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={settings.roleGoal}
                  onChange={(event) => updatePromptSettings((current) => ({ ...current, roleGoal: event.target.value }))}
                />
              </label>
            </div>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#191c1d]">Response rules</h3>
                  <p className="mt-2 text-sm leading-6 text-[#42474d]">General behavior rules that apply to every provider.</p>
                </div>
                <SecondaryButton
                  className="px-3 py-2 text-xs"
                  onClick={() => addListItem("responseRules", "Add a clear response rule.")}
                >
                  Add rule
                </SecondaryButton>
              </div>
              <div className="mt-5 grid gap-3">
                {settings.responseRules.map((rule, index) => (
                  <div className="flex gap-2" key={`response-${index}`}>
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                      value={rule}
                      onChange={(event) => updateListItem("responseRules", index, event.target.value)}
                    />
                    <SecondaryButton className="px-3 py-2" onClick={() => removeListItem("responseRules", index)}>
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </SecondaryButton>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#191c1d]">Safety rules</h3>
                  <p className="mt-2 text-sm leading-6 text-[#42474d]">Boundaries for tools, private data, and actions.</p>
                </div>
                <SecondaryButton
                  className="px-3 py-2 text-xs"
                  onClick={() => addListItem("safetyRules", "Add a clear safety rule.")}
                >
                  Add rule
                </SecondaryButton>
              </div>
              <div className="mt-5 grid gap-3">
                {settings.safetyRules.map((rule, index) => (
                  <div className="flex gap-2" key={`safety-${index}`}>
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                      value={rule}
                      onChange={(event) => updateListItem("safetyRules", index, event.target.value)}
                    />
                    <SecondaryButton className="px-3 py-2" onClick={() => removeListItem("safetyRules", index)}>
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </SecondaryButton>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-heading text-xl font-bold text-[#191c1d]">Schedule and Workspace policy</h3>
                <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
                  Schedule drafting works with prompt rules only. Creating, editing, or deleting real calendar events requires a connected Google Workspace tool later.
                </p>
              </div>
              <Badge tone={settings.workspaceRules.googleWorkspace === "disabled" ? "neutral" : "action"}>
                Google Workspace {workspacePolicyCopy[settings.workspaceRules.googleWorkspace]}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <label className="grid gap-2 xl:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Schedule mode</span>
                <select
                  className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={settings.scheduleRules.mode}
                  onChange={(event) => updatePromptSettings((current) => ({
                    ...current,
                    scheduleRules: {
                      ...current.scheduleRules,
                      mode: event.target.value as CalendarActionMode,
                    },
                  }))}
                >
                  <option value="draftOnly">Draft only</option>
                  <option value="confirmBeforeAction">Confirm before action</option>
                  <option value="connectedActions">Connected actions after OAuth</option>
                </select>
                <span className="text-xs leading-5 text-[#72787e]">{scheduleModeCopy[settings.scheduleRules.mode]}</span>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Timezone</span>
                <input
                  className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={settings.scheduleRules.timezone}
                  onChange={(event) => updatePromptSettings((current) => ({
                    ...current,
                    scheduleRules: {
                      ...current.scheduleRules,
                      timezone: event.target.value,
                    },
                  }))}
                />
              </label>
              <label className="grid gap-2 xl:col-span-3">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Reminder preference</span>
                <input
                  className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={settings.scheduleRules.reminderPreference}
                  onChange={(event) => updatePromptSettings((current) => ({
                    ...current,
                    scheduleRules: {
                      ...current.scheduleRules,
                      reminderPreference: event.target.value,
                    },
                  }))}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(["googleWorkspace", "calendar", "gmail", "drive"] as Array<keyof PromptSettings["workspaceRules"]>).map((key) => (
                <label className="grid gap-2 rounded-xl bg-[#f3f4f5] p-3" key={key}>
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{key}</span>
                  <select
                    className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-2 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                    value={settings.workspaceRules[key]}
                    onChange={(event) => updatePromptSettings((current) => ({
                      ...current,
                      workspaceRules: {
                        ...current.workspaceRules,
                        [key]: event.target.value as WorkspaceToolPolicy,
                      },
                    }))}
                  >
                    <option value="disabled">Disabled</option>
                    <option value="askFirst">Ask first</option>
                    <option value="connectedOnly">Connected only</option>
                  </select>
                </label>
              ))}
            </div>
          </Panel>
        </>
      );

      return (
        <div className="grid gap-6">
          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#191c1d]">Prompt profile</h3>
                <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
                  Simple mode is for normal users. Developer mode exposes detailed prompt policy and tool behavior.
                </p>
              </div>
              <Badge tone="action">Local profile</Badge>
            </div>

            <div className="mt-6 inline-flex rounded-2xl border border-[#c2c7ce] bg-[#f3f4f5] p-1">
              {([
                ["simple", "Simple"],
                ["developer", "Developer"],
              ] as Array<[PromptEditorMode, string]>).map(([mode, label]) => (
                <button
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                    promptEditorMode === mode
                      ? "bg-white text-[#35607f] shadow-sm"
                      : "text-[#72787e] hover:text-[#191c1d]"
                  }`}
                  key={mode}
                  onClick={() => setPromptEditorMode(mode)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </Panel>

          {promptEditorMode === "simple" ? (
            <>
              {renderSimplePrompt()}
              {renderToolsForAiCard()}
            </>
          ) : renderDeveloperPrompt()}
          {renderPromptPreview()}
          {renderToolsForAiModal()}
        </div>
      );
    };

    const renderStudioTools = () => {
      const profile = buildCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
      const coding = profile.prompt.settings.coding;
      const codingOptions: Array<{
        id: CodingCapability;
        title: string;
        body: string;
        icon: string;
        providerPolicy: CodingProviderPolicy;
        accessMode: CodingAccessMode;
        workspaceAllowlistRequired: boolean;
      }> = [
        {
          id: "chatOnly",
          title: "General assistant",
          body: "No repository actions. Use this for normal personal assistant chat.",
          icon: "chat_bubble",
          providerPolicy: "localAllowed",
          accessMode: "readOnly",
          workspaceAllowlistRequired: false,
        },
        {
          id: "codeExplain",
          title: "Code explanation",
          body: "Read-only code help. Local models are allowed for small snippets and simple explanations.",
          icon: "terminal",
          providerPolicy: "localAllowed",
          accessMode: "readOnly",
          workspaceAllowlistRequired: false,
        },
        {
          id: "codeEdit",
          title: "Code editing",
          body: "Multi-file edits and repository changes. Requires a cloud coding model by default.",
          icon: "edit_square",
          providerPolicy: "cloudRequired",
          accessMode: "fileEdits",
          workspaceAllowlistRequired: true,
        },
        {
          id: "clawCode",
          title: "Claw Code",
          body: "Agentic coding loop with file reads, edits, and shell commands. Cloud API is required by default.",
          icon: "precision_manufacturing",
          providerPolicy: "cloudRequired",
          accessMode: "shellCommands",
          workspaceAllowlistRequired: true,
        },
      ];
      const selectedOption = codingOptions.find((option) => option.id === coding.capability) ?? codingOptions[0];
      const cloudRequired = coding.providerPolicy === "cloudRequired" && !coding.localExperimental;
      const cloudRequirementUnmet = cloudRequired && selectedProvider === "ollama";
      const updateCodingPolicy = (option: typeof codingOptions[number]) => {
        setPromptSettingsDraft((current) => ({
          ...current,
          coding: {
            capability: option.id,
            providerPolicy: option.providerPolicy,
            localExperimental: false,
            accessMode: option.accessMode,
            workspaceAllowlistRequired: option.workspaceAllowlistRequired,
          },
        }));

        if (option.providerPolicy === "cloudRequired" && selectedProvider === "ollama") {
          setSelectedProvider("gemini");
          setSelectedCloudModel("gemini-2.5-flash");
        }
      };
      const setLocalExperimental = (enabled: boolean) => {
        setPromptSettingsDraft((current) => ({
          ...current,
          coding: {
            ...current.coding,
            localExperimental: enabled,
          },
        }));
      };

      return (
        <div className="grid gap-6">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Coding assistant policy</p>
                <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Choose what this assistant can do with code</h3>
                <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#42474d]">
                  Code editing and Claw Code require a cloud API model by default. Local models can explain code, but full repository automation is kept behind an advanced experimental path.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge tone={cloudRequired ? "action" : "neutral"}>{codingProviderPolicyCopy[coding.providerPolicy]}</Badge>
                <Badge>{codingAccessModeCopy[coding.accessMode]}</Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {codingOptions.map((option) => {
                const active = option.id === coding.capability;
                return (
                  <button
                    className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                      active ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                    }`}
                    key={option.id}
                    onClick={() => updateCodingPolicy(option)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                        <span className="material-symbols-outlined text-[22px]">{option.icon}</span>
                      </span>
                      {active && <Badge tone="action">Selected</Badge>}
                    </div>
                    <h4 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{option.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-[#42474d]">{option.body}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone={option.providerPolicy === "cloudRequired" ? "action" : "neutral"}>
                        {codingProviderPolicyCopy[option.providerPolicy]}
                      </Badge>
                      <Badge>{codingAccessModeCopy[option.accessMode]}</Badge>
                      {option.workspaceAllowlistRequired && <Badge>Workspace allowlist</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                  <span className="material-symbols-outlined text-[22px]">policy</span>
                </span>
                <Badge tone={cloudRequirementUnmet ? "action" : "success"}>
                  {cloudRequirementUnmet ? "Action needed" : "Policy ready"}
                </Badge>
              </div>
              <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">Current coding guardrail</h3>
              <div className="mt-4 grid gap-3">
                {[
                  ["Capability", codingCapabilityCopy[coding.capability]],
                  ["Provider policy", codingProviderPolicyCopy[coding.providerPolicy]],
                  ["Access mode", codingAccessModeCopy[coding.accessMode]],
                  ["Selected model", `${providerMeta[selectedProvider].label} / ${activeModelLabel}`],
                ].map(([label, value]) => (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f3f4f5] p-3" key={label}>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{label}</span>
                    <span className="truncate text-sm font-semibold text-[#191c1d]">{value}</span>
                  </div>
                ))}
              </div>

              {cloudRequirementUnmet && (
                <div className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">
                  This coding mode requires a cloud API model. Switch to Gemini/OpenAI before saving this assistant for code editing.
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <SecondaryButton onClick={() => enterSettings("aiModels")}>
                  Manage API keys
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    setSelectedProvider("gemini");
                    setSelectedCloudModel("gemini-2.5-flash");
                  }}
                >
                  Use Gemini 2.5 Flash
                </PrimaryButton>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                  <span className="material-symbols-outlined text-[22px]">science</span>
                </span>
                <Badge>Advanced</Badge>
              </div>
              <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">Experimental local coding</h3>
              <p className="mt-3 text-sm leading-6 text-[#42474d]">
                Local coding can be slow, forget context, or fail on larger repositories. Keep it read-only unless the user deliberately accepts the risk.
              </p>
              <label className="mt-5 flex items-start gap-3 rounded-xl bg-[#f3f4f5] p-4">
                <input
                  checked={coding.localExperimental}
                  className="mt-1 h-4 w-4 accent-[#35607f]"
                  disabled={selectedOption.providerPolicy !== "cloudRequired"}
                  onChange={(event) => setLocalExperimental(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-bold text-[#191c1d]">Allow advanced local coding fallback</span>
                  <span className="mt-1 block text-xs leading-5 text-[#72787e]">
                    This does not install or run Claw Code yet. It only records that the assistant is allowed to try local coding later.
                  </span>
                </span>
              </label>
              <div className="mt-5 rounded-xl bg-[#f3f4f5] p-4 text-xs leading-5 text-[#42474d]">
                Recommended local coding candidates: qwen3-coder:30b, devstral:24b, gpt-oss:20b, qwen2.5-coder:32b.
              </div>
            </Panel>
          </div>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#191c1d]">Save this coding policy</h3>
                <p className="mt-2 text-sm leading-6 text-[#42474d]">
                  The selected coding capability is saved into the assistant profile and appears on the web after Sync to Web.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <SecondaryButton onClick={() => void saveCurrentLocalAssistantProfile(profile.status)}>
                  Save locally
                </SecondaryButton>
                <PrimaryButton onClick={() => void syncCurrentAssistantProfileToCloud()}>
                  Sync to Web
                </PrimaryButton>
              </div>
            </div>
          </Panel>
        </div>
      );
    };

    const renderModelStudio = () => (
      <div className="grid gap-6">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-bold text-[#191c1d]">Local model library</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Select and download Ollama models for this computer. Recommendation only chooses a first model; Studio is where users can manage more models later.
              </p>
            </div>
            <Badge tone={status?.running ? "success" : "neutral"}>{status?.running ? "Ollama running" : "Ollama offline"}</Badge>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {modelCatalog.map((model) => {
              const active = selectedProvider === "ollama" && selectedModel === model.name;
              const installed = installedModels.includes(model.name);
              const downloadBusy = busyAction === `download:${model.name}`;
              const canDownload = tauriRuntime && Boolean(status?.running) && !installed && busyAction === null;

              return (
                <article
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                    active ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                  }`}
                  key={model.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                      <span className="material-symbols-outlined text-[22px]">memory</span>
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {installed && <Badge tone="success">{t.installed}</Badge>}
                    </div>
                  </div>
                  <h4 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{model.label}</h4>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">{model.category}</p>
                  <p className="mt-3 text-sm leading-6 text-[#42474d]">{model.summary[ACTIVE_LOCALE]}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-[#f3f4f5] p-3">
                      <span className="font-bold uppercase tracking-[0.12em] text-[#72787e]">RAM</span>
                      <p className="mt-1 font-semibold text-[#191c1d]">{model.recommendedRamGb} GB+</p>
                    </div>
                    <div className="rounded-xl bg-[#f3f4f5] p-3">
                      <span className="font-bold uppercase tracking-[0.12em] text-[#72787e]">Size</span>
                      <p className="mt-1 font-semibold text-[#191c1d]">{model.downloadSizeLabel ?? "Ollama tag"}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <SecondaryButton
                      className="px-3 py-2 text-xs"
                      onClick={() => {
                        setSelectedProvider("ollama");
                        setSelectedModel(model.name);
                      }}
                    >
                      {providerText.selectModel}
                    </SecondaryButton>
                    <PrimaryButton
                      className="px-3 py-2 text-xs"
                      disabled={!canDownload}
                      onClick={() => {
                        setSelectedProvider("ollama");
                        setSelectedModel(model.name);
                        void downloadModel(model.name);
                      }}
                    >
                      {downloadBusy ? t.downloading : installed ? t.installed : t.downloadModel}
                    </PrimaryButton>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-bold text-[#191c1d]">Cloud models</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Cloud models do not need downloads. API key management remains in Settings &gt; AI models.
              </p>
            </div>
            <Badge tone="action">OpenAI / Gemini</Badge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {cloudModelCatalog.filter((model) => model.id !== "custom-cloud").slice(0, 3).map((model) => (
              <button
                className={`rounded-2xl border bg-white p-4 text-left transition ${
                  selectedProvider === model.provider && selectedCloudModel === model.id
                    ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                    : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                }`}
                key={model.id}
                onClick={() => {
                  setSelectedProvider(model.provider);
                  setSelectedCloudModel(model.id);
                }}
                type="button"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                  <span className="material-symbols-outlined text-[20px]">{providerMeta[model.provider].icon}</span>
                </span>
                <p className="mt-4 font-heading text-base font-bold text-[#191c1d]">{model.label}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{providerMeta[model.provider].label}</p>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    );

    return (
      <div className="mx-auto w-full min-w-0 max-w-[980px]">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Studio</p>
          <h2 className="mt-2 font-heading text-[30px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">
            {activeStudioSection.label}
          </h2>
          <p className="mt-2 max-w-[720px] text-base leading-7 text-[#42474d]">
            Studio is the free-editing workspace after initial Setup. Prompts, 2D character, TTS, Google Workspace, and tools will be configured here.
          </p>
        </header>

        {studioSection === "myAssistants" ? (
          renderMyAssistants()
        ) : studioSection === "overview" ? (
          renderStudioOverview()
        ) : studioSection === "models" ? (
          renderModelStudio()
        ) : studioSection === "prompts" ? (
          renderPromptStudio()
        ) : studioSection === "tools" ? (
          renderStudioTools()
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {placeholderCards[studioSection].map(([title, body, icon]) => (
              <Panel className="min-h-[210px]" key={title}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                  <span className="material-symbols-outlined text-[22px]">{icon}</span>
                </span>
                <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#42474d]">{body}</p>
                <Badge>Placeholder</Badge>
              </Panel>
            ))}
          </div>
        )}

        <Panel className="mt-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="font-heading text-xl font-bold text-[#191c1d]">Studio scope</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Initial Setup only handles survey, hardware, recommendation, Ollama, optional Claw Code, model download, and test chat. Everything else moves into Studio.
              </p>
            </div>
            <PrimaryButton
              onClick={() => {
                setAppMode("setup");
                setActiveStep("chat");
              }}
            >
              Open test chat
            </PrimaryButton>
          </div>
        </Panel>
      </div>
    );
  };

  const renderSettings = () => {
    const activeSettingsSection = settingsSections.find((section) => section.id === settingsSection) ?? settingsSections[0];

    const generalPanel = (
      <>
        <Panel className="mb-6">
          <div className="grid gap-6">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.language}</span>
              <select
                className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                value={ACTIVE_LOCALE}
                disabled
              >
                <option value="en">English</option>
              </select>
            </label>

            <div className="rounded-xl bg-[#f3f4f5] p-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.modelStorage}</span>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">{t.defaultStorage}</p>
            </div>

            <div className="rounded-xl bg-[#f3f4f5] p-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.currentModel}</span>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">
                {activeProviderLabel} / {activeModelLabel}
              </p>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Assistant Profile</span>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">
                {activeLocalProfile?.name ?? "MiVA Assistant"} / {activeLocalProfile?.status ?? "draft"}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#72787e]">
                Saved locally first. Cloud sync can attach to this profile later.
              </p>
            </div>
            <Badge tone={assistantProfileSaveState === "error" ? "neutral" : assistantProfileSaveState === "saving" ? "action" : "success"}>
              {assistantProfileSaveState === "saving"
                ? "Saving"
                : assistantProfileSaveState === "error"
                  ? "Save error"
                  : assistantProfileSaveState === "saved"
                    ? "Saved"
                    : assistantProfileLoaded
                      ? "Local"
                      : "Loading"}
            </Badge>
          </div>
          {assistantProfileError && <p className="mt-3 text-xs leading-5 text-[#93000a]">{assistantProfileError}</p>}
        </Panel>
      </>
    );

    const aiModelsPanel = (
      <Panel>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">{t.providerKeysTitle}</h3>
            <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#42474d]">{t.providerKeysBody}</p>
          </div>
          {providerKeysSaved && <Badge tone="success">{t.keysSaved}</Badge>}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {(["ollama", "openai", "gemini"] as ProviderId[]).map((providerId) => {
            const meta = providerMeta[providerId];
            const isActive = selectedProvider === providerId;
            const statusLabel =
              providerId === "ollama"
                ? status?.running
                  ? t.running
                  : status?.installed
                    ? t.stopped
                    : t.missing
                : providerKeys[providerId]
                  ? providerText.hasOverride
                  : providerText.defaultKey;

            return (
              <button
                className={`rounded-2xl border bg-white p-4 text-left transition ${
                  isActive ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                }`}
                key={providerId}
                onClick={() => {
                  setSelectedProvider(providerId);
                  if (providerId !== "ollama") {
                    setSelectedCloudModel(cloudModelCatalog.find((model) => model.provider === providerId)?.id ?? selectedCloudModel);
                  }
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                    <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                  </span>
                  <Badge tone={meta.mode === "local" ? "success" : "action"}>
                    {meta.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
                  </Badge>
                </div>
                <h4 className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{meta.label}</h4>
                <p className="mt-1 text-sm font-semibold text-[#72787e]">{statusLabel}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.openaiApiKey}</span>
              <Badge tone={providerKeys.openai ? "action" : "neutral"}>{providerKeys.openai ? t.userOverrideKey : t.defaultEnvKey}</Badge>
            </div>
            <input
              autoComplete="off"
              className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
              placeholder="sk-..."
              type="password"
              value={providerKeys.openai}
              onChange={(event) => setProviderKeys((current) => ({ ...current, openai: event.target.value }))}
            />
          </label>

          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.geminiApiKey}</span>
              <Badge tone={providerKeys.gemini ? "action" : "neutral"}>{providerKeys.gemini ? t.userOverrideKey : t.defaultEnvKey}</Badge>
            </div>
            <input
              autoComplete="off"
              className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
              placeholder="AIza..."
              type="password"
              value={providerKeys.gemini}
              onChange={(event) => setProviderKeys((current) => ({ ...current, gemini: event.target.value }))}
            />
          </label>

          <div className="rounded-xl bg-[#fff8e1] p-4 text-sm leading-6 text-[#5c4300]">
            {t.keyStorageNotice}
          </div>

          <div className="flex items-center justify-end gap-3">
            <SecondaryButton onClick={clearProviderKeys}>{t.clearKeys}</SecondaryButton>
            <PrimaryButton onClick={saveProviderKeys}>{t.saveKeys}</PrimaryButton>
          </div>
        </div>
      </Panel>
    );

    const securityPanel = (
      <Panel>
        <h3 className="font-heading text-xl font-bold text-[#191c1d]">Security</h3>
        <p className="mt-2 text-sm leading-6 text-[#42474d]">
          Phase 1 keeps assistant profiles and runtime chat history on this device. Cloud sync and account security will be added later.
        </p>
        <div className="mt-6 grid gap-3">
          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">API key policy</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">Local override keys stay in this app storage for development testing.</p>
          </div>
          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Runtime chat</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">Saved locally. Server sync is disabled until account features exist.</p>
          </div>
        </div>
      </Panel>
    );

    const logsPanel = (
      <Panel>
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-heading text-xl font-bold text-[#191c1d]">Logs</h3>
          <Badge>{logs.length}</Badge>
        </div>
        <div className="mt-5 h-80 overflow-auto rounded-xl bg-[#2e3132] p-4 text-xs leading-5 text-[#f0f1f2]">
          {logs.length === 0 ? <p>{t.noLogs}</p> : logs.map((item) => <p key={item}>{item}</p>)}
        </div>
        <div className="mt-6 border-t border-[#e1e3e4] pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Developer access</p>
          <p className="mt-2 text-sm leading-6 text-[#42474d]">
            Initial Setup is hidden after first configuration. Use this temporary entry while developing the installer flow.
          </p>
          <SecondaryButton
            className="mt-4"
            onClick={() => {
              setAppMode("setup");
              setActiveStep("welcome");
            }}
          >
            Open initial setup
          </SecondaryButton>
        </div>
      </Panel>
    );

    return (
      <div className="mx-auto max-w-[860px]">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Settings</p>
            <h2 className="mt-2 font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">
              {activeSettingsSection.label}
            </h2>
            <p className="mt-2 text-base leading-7 text-[#42474d]">{activeSettingsSection.detail}</p>
          </div>
          <SecondaryButton className="shrink-0" onClick={exitSettings}>
            Exit settings
          </SecondaryButton>
        </header>

        {settingsSection === "general" && generalPanel}
        {settingsSection === "aiModels" && aiModelsPanel}
        {settingsSection === "security" && securityPanel}
        {settingsSection === "logs" && logsPanel}
      </div>
    );
  };

  const renderDownloadProgressModal = () => {
    if (!downloadProgress) {
      return null;
    }

    const model = getModelByName(downloadProgress.model);
    const percent = downloadProgress.error ? downloadProgress.percent ?? 0 : downloadProgress.done ? 100 : downloadProgress.percent ?? 0;
    const visiblePercent = Math.min(100, Math.max(downloadProgress.done ? 100 : 0, percent));
    const title = downloadProgress.error
      ? t.downloadFailed
      : downloadProgress.done
        ? t.downloadComplete
        : t.downloadProgressTitle;

    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-[#191c1d]/35 px-6 backdrop-blur-sm">
        <section className="w-full max-w-[520px] rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_24px_80px_rgba(25,28,29,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">{model.label}</p>
              <h2 className="mt-2 font-heading text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{title}</h2>
            </div>
            <div
              className={`relative grid h-11 w-11 place-items-center rounded-full ${
                downloadProgress.error ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#cae6ff] text-[#35607f]"
              }`}
            >
              {!downloadProgress.done && !downloadProgress.error && (
                <span className="absolute inset-1 rounded-full border-2 border-[#35607f]/20 border-t-[#35607f] animate-spin" />
              )}
              <span className="material-symbols-outlined relative z-10">
                {downloadProgress.error ? "error" : downloadProgress.done ? "check_circle" : "arrow_downward"}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-[#42474d]">{downloadProgress.status || t.preparingDownload}</span>
              <span className="text-sm font-bold text-[#35607f]">{Math.round(visiblePercent)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#e1e3e4]">
              <div className="h-full rounded-full bg-[#35607f] transition-all duration-300" style={{ width: `${visiblePercent}%` }} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f3f4f5] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.downloaded}</p>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">{formatBytes(downloadProgress.completed)}</p>
            </div>
            <div className="rounded-xl bg-[#f3f4f5] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.downloadSize}</p>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">{formatBytes(downloadProgress.total)}</p>
            </div>
          </div>

          {downloadProgress.error && (
            <p className="mt-5 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{downloadProgress.error}</p>
          )}

          {(downloadProgress.done || downloadProgress.error) && (
            <div className="mt-6 flex justify-end">
              <PrimaryButton onClick={() => setDownloadProgress(null)}>{t.close}</PrimaryButton>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (activeStep === "welcome") return renderWelcome();
    if (activeStep === "survey") return renderSurvey();
    if (activeStep === "hardware") return renderHardware();
    if (activeStep === "recommendation") return renderRecommendation();
    if (activeStep === "ollama") return renderOllamaSetup();
    if (activeStep === "clawCode") return renderClawCodeSetup();
    if (activeStep === "download") return renderDownload();
    if (activeStep === "chat") return renderChat();
    if (activeStep === "profile") return renderProfile();
    return renderSettings();
  };

  return (
    <main className="flex h-screen min-w-[1000px] overflow-hidden bg-[#f8f9fa] text-[#191c1d]">
      {appMode === "auth" ? (
        renderAuth()
      ) : (
        <>
          {appMode === "setup" ? renderNavigation() : appMode === "studio" ? renderStudioNavigation() : renderRuntimeNavigation()}
          <div className="flex min-w-0 flex-1 flex-col">
            {renderTopBar()}
            <div className="flex-1 overflow-y-auto px-10 py-9">
              {appMode === "setup" ? renderCurrentStep() : appMode === "studio" ? renderStudio() : renderChat()}
            </div>
          </div>
        </>
      )}
      {renderDownloadProgressModal()}
    </main>
  );
}

export default App;
