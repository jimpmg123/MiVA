import { createHash } from "node:crypto";
import { lightweightModels } from "../../../packages/shared/src/index.js";

export type RequestLike = { headers: Record<string, unknown> };

export const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
export const seedTimestamp = new Date().toISOString();
export const DEV_USER_ID = "dev_user";
export const DEV_PASSWORDS = {
  "dev@miva.local": "miva1234",
  "admin@miva.local": "admin1234",
};

export const assistantProfiles = [
  {
    id: "profile_general",
    userId: "dev_user",
    name: "General Assistant",
    description: "Default MiVA assistant for daily questions and lightweight task support.",
    useCase: "daily",
    answerStyle: "moderate",
    priority: "balanced",
    languageUse: "korean",
    localMode: "hybrid",
    provider: "gemini",
    model: "gemini-2.5-flash",
    futureFeatures: ["voice", "googleWorkspace"],
    isDefault: true,
    source: "desktop-setup",
  },
  {
    id: "profile_work",
    userId: "dev_user",
    name: "Work Assistant",
    description: "A concise assistant for documents, email drafts, and work planning.",
    useCase: "work",
    answerStyle: "short",
    priority: "quality",
    languageUse: "korean",
    localMode: "hybrid",
    provider: "openai",
    model: "gpt-4o-mini",
    futureFeatures: ["googleWorkspace", "tools"],
    isDefault: false,
    source: "web-console",
  },
  {
    id: "profile_character",
    userId: "dev_user",
    name: "Character Assistant",
    description: "Future-ready profile for voice and virtual character mode.",
    useCase: "character",
    answerStyle: "moderate",
    priority: "balanced",
    languageUse: "both",
    localMode: "localOnly",
    provider: "ollama",
    model: "qwen3:4b",
    futureFeatures: ["voice", "character"],
    isDefault: false,
    source: "desktop-setup",
  },
];

export const defaultPromptSettings = {
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

export const deviceAuthRequests = new Map<string, any>();

export function toTopList(counts: Record<string, number>) {
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function toDbProvider(provider: unknown) {
  const normalized = String(provider || "").toUpperCase();
  return ["OLLAMA", "OPENAI", "GEMINI", "ANTHROPIC", "CUSTOM"].includes(normalized) ? normalized : "CUSTOM";
}

export function fromDbProvider(provider: unknown) {
  return String(provider || "CUSTOM").toLowerCase();
}

export function toDbProfileSource(source: unknown) {
  const normalized = String(source || "").replaceAll("-", "_").toUpperCase();
  return ["DESKTOP_SETUP", "WEB_CONSOLE", "API"].includes(normalized) ? normalized : "WEB_CONSOLE";
}

export function fromDbProfileSource(source: unknown) {
  return String(source || "WEB_CONSOLE").toLowerCase().replaceAll("_", "-");
}

export function toDbCredentialStatus(status: unknown) {
  const normalized = String(status || "").replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase().replace(/^_/, "");
  return ["NOT_CONFIGURED", "CONFIGURED", "VERIFIED", "ERROR"].includes(normalized) ? normalized : "CONFIGURED";
}

export function fromDbCredentialStatus(status: unknown) {
  if (status === "NOT_CONFIGURED") {
    return "notConfigured";
  }
  return String(status || "CONFIGURED").toLowerCase();
}

export function toDbUsageMode(mode: unknown) {
  return mode === "cloud" ? "CLOUD" : "LOCAL";
}

export function fromDbUsageMode(mode: unknown) {
  return mode === "CLOUD" ? "cloud" : "local";
}

export function hashSecret(value: unknown) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: String(user.role || "USER").toLowerCase(),
    locale: user.locale,
  };
}

export function serializeAssistantProfile(profile: any) {
  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    description: profile.description,
    useCase: profile.useCase,
    answerStyle: profile.answerStyle,
    priority: profile.priority,
    languageUse: profile.languageUse,
    localMode: profile.localMode,
    provider: fromDbProvider(profile.provider),
    model: profile.model,
    futureFeatures: Array.isArray(profile.futureFeatures) ? profile.futureFeatures : [],
    isDefault: profile.isDefault,
    source: fromDbProfileSource(profile.source),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    prompt: profile.prompt || undefined,
    capabilities: profile.capabilities || undefined,
  };
}

export function serializeApiKey(key: any) {
  return {
    id: key.id,
    userId: key.userId,
    provider: fromDbProvider(key.provider),
    label: key.label,
    maskedKey: key.maskedKey,
    status: fromDbCredentialStatus(key.status),
    lastValidatedAt: key.lastValidatedAt ? key.lastValidatedAt.toISOString() : null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
  };
}

export function serializeDevice(device: any) {
  return {
    id: device.id,
    userId: device.userId,
    name: device.name,
    os: device.os,
    appVersion: device.appVersion,
    status: device.localStatus?.status || (device.lastSeenAt ? "connected" : "offline"),
    lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    createdAt: device.createdAt.toISOString(),
    updatedAt: device.updatedAt.toISOString(),
  };
}

export function serializeLocalUsageEvent(event: any) {
  return {
    id: event.id,
    userId: event.userId,
    deviceId: event.deviceId,
    assistantProfileId: event.assistantProfileId,
    mode: fromDbUsageMode(event.mode),
    provider: event.provider,
    model: event.model,
    inputChars: event.inputChars,
    outputChars: event.outputChars,
    durationMs: event.durationMs,
    success: event.success,
    createdAt: event.createdAt.toISOString(),
  };
}

export function countMetric(events: any[], type: string) {
  return events.reduce<Record<string, number>>((acc, event) => {
    const metadata = event.metadata as any;
    if (metadata?.type === type && typeof metadata.value === "string") {
      acc[metadata.value] = (acc[metadata.value] || 0) + 1;
    }
    return acc;
  }, {});
}

export function normalizeStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? normalized : [...fallback];
}

export function normalizeWorkspacePolicy(value: unknown) {
  return ["disabled", "askFirst", "connectedOnly"].includes(String(value)) ? value : "disabled";
}

export function normalizeCodingCapability(value: unknown) {
  return ["chatOnly", "codeExplain", "codeEdit", "clawCode"].includes(String(value))
    ? value
    : defaultPromptSettings.coding.capability;
}

export function normalizeCodingProviderPolicy(value: unknown) {
  return ["localAllowed", "cloudRecommended", "cloudRequired"].includes(String(value))
    ? value
    : defaultPromptSettings.coding.providerPolicy;
}

export function normalizeCodingAccessMode(value: unknown) {
  return ["readOnly", "fileEdits", "shellCommands"].includes(String(value))
    ? value
    : defaultPromptSettings.coding.accessMode;
}

export function normalizeCodingPolicy(value: any) {
  const source = value && typeof value === "object" ? value : {};
  return {
    capability: normalizeCodingCapability(source.capability),
    providerPolicy: normalizeCodingProviderPolicy(source.providerPolicy),
    localExperimental: typeof source.localExperimental === "boolean"
      ? source.localExperimental
      : defaultPromptSettings.coding.localExperimental,
    accessMode: normalizeCodingAccessMode(source.accessMode),
    workspaceAllowlistRequired: typeof source.workspaceAllowlistRequired === "boolean"
      ? source.workspaceAllowlistRequired
      : defaultPromptSettings.coding.workspaceAllowlistRequired,
  };
}

export function normalizePromptSettings(value: any) {
  const source = value && typeof value === "object" ? value : {};
  const scheduleRules = source.scheduleRules && typeof source.scheduleRules === "object" ? source.scheduleRules : {};
  const workspaceRules = source.workspaceRules && typeof source.workspaceRules === "object" ? source.workspaceRules : {};
  const scheduleMode = ["draftOnly", "confirmBeforeAction", "connectedActions"].includes(scheduleRules.mode)
    ? scheduleRules.mode
    : defaultPromptSettings.scheduleRules.mode;

  return {
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
    coding: normalizeCodingPolicy(source.coding),
    safetyRules: normalizeStringList(source.safetyRules, defaultPromptSettings.safetyRules),
  };
}

export function normalizeCapabilitiesPayload(value: any, promptSettings: any) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...source,
    coding: normalizeCodingPolicy(source.coding || promptSettings.coding),
  };
}

export function normalizePromptPayload(value: any) {
  const source = value && typeof value === "object" ? value : {};
  const settings = normalizePromptSettings(source.settings);

  return {
    profileId: typeof source.profileId === "string" && source.profileId.trim() ? source.profileId.trim() : null,
    systemPrompt: typeof source.systemPrompt === "string" ? source.systemPrompt : "",
    settings,
    variables: source.variables && typeof source.variables === "object" ? source.variables : {},
    overrides: source.overrides && typeof source.overrides === "object" ? source.overrides : {
      persona: null,
      instructions: [],
      guardrails: [],
    },
  };
}

export function normalizeAssistantProfile(payload: any, userId = DEV_USER_ID) {
  const now = new Date().toISOString();
  const prompt = normalizePromptPayload(payload.prompt);
  const capabilities = normalizeCapabilitiesPayload(payload.capabilities, prompt.settings);
  return {
    id: payload.id || `profile_${Date.now()}`,
    userId,
    name: String(payload.name || "Untitled Assistant"),
    description: String(payload.description || ""),
    useCase: payload.useCase || "daily",
    answerStyle: payload.answerStyle || "moderate",
    priority: payload.priority || "balanced",
    languageUse: payload.languageUse || "korean",
    localMode: payload.localMode || "hybrid",
    provider: payload.provider || "gemini",
    model: payload.model || "gemini-2.5-flash",
    futureFeatures: Array.isArray(payload.futureFeatures) ? payload.futureFeatures : [],
    isDefault: Boolean(payload.isDefault),
    source: payload.source || "web-console",
    createdAt: payload.createdAt || now,
    updatedAt: now,
    prompt,
    capabilities,
  };
}

export function maskApiKey(value: unknown) {
  const key = String(value || "").trim();
  if (!key) {
    return "";
  }

  if (key.length <= 8) {
    return `${key.slice(0, 2)}...${key.slice(-2)}`;
  }

  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function normalizeApiKeyPayload(payload: any) {
  const provider = ["openai", "gemini", "anthropic", "custom"].includes(payload.provider)
    ? payload.provider
    : "custom";
  const label = String(payload.label || provider).trim() || provider;
  const maskedKey = maskApiKey(payload.key);

  return {
    id: payload.id || `key_${provider}_${Date.now()}`,
    userId: "dev_user",
    provider,
    label,
    maskedKey,
    status: maskedKey ? "configured" : "notConfigured",
  };
}

export function normalizeLocalUsagePayload(payload: any, userId = DEV_USER_ID) {
  return {
    id: payload.id || undefined,
    userId,
    deviceId: String(payload.deviceId || "device_local_dev"),
    assistantProfileId: payload.assistantProfileId ? String(payload.assistantProfileId) : null,
    mode: payload.mode === "cloud" ? "cloud" : "local",
    provider: String(payload.provider || "ollama"),
    model: String(payload.model || "unknown"),
    inputChars: Number.isFinite(Number(payload.inputChars)) ? Math.max(0, Math.round(Number(payload.inputChars))) : 0,
    outputChars: Number.isFinite(Number(payload.outputChars)) ? Math.max(0, Math.round(Number(payload.outputChars))) : 0,
    durationMs: Number.isFinite(Number(payload.durationMs)) ? Math.max(0, Math.round(Number(payload.durationMs))) : 0,
    success: payload.success !== false,
    createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
  };
}

export function normalizeDevicePayload(payload: any, userId = DEV_USER_ID) {
  return {
    id: payload.id ? String(payload.id) : undefined,
    userId,
    name: String(payload.name || "MiVA Desktop"),
    os: payload.os ? String(payload.os) : null,
    appVersion: payload.appVersion ? String(payload.appVersion) : null,
    lastSeenAt: new Date(),
    localStatus: {
      status: payload.status === "offline" ? "offline" : "connected",
      modelRuntime: payload.modelRuntime || null,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function toAssistantProfileDbData(profile: any, userId = profile.userId || DEV_USER_ID) {
  return {
    userId,
    name: profile.name,
    description: profile.description,
    useCase: profile.useCase,
    answerStyle: profile.answerStyle,
    priority: profile.priority,
    languageUse: profile.languageUse,
    localMode: profile.localMode,
    provider: toDbProvider(profile.provider) as any,
    model: profile.model,
    futureFeatures: profile.futureFeatures,
    isDefault: profile.isDefault,
    source: toDbProfileSource(profile.source) as any,
    prompt: profile.prompt,
    capabilities: profile.capabilities,
  } as any;
}
