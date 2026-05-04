import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "./db.mjs";
import { lightweightModels } from "../../../packages/shared/src/index.js";

const PORT = Number(process.env.MIVA_API_PORT || 4000);
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
const googleOAuthClient = GOOGLE_OAUTH_CLIENT_ID ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID) : null;
const seedTimestamp = new Date().toISOString();
const DEV_USER_ID = "dev_user";
const DEV_PASSWORDS = {
  "dev@miva.local": "miva1234",
  "admin@miva.local": "admin1234"
};

const allowedOrigins = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
]);

const assistantProfiles = [
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
    status: "finalized",
    source: "desktop-setup",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
    completedAt: seedTimestamp
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
    status: "draft",
    source: "web-console",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
    completedAt: null
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
    status: "draft",
    source: "desktop-setup",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
    completedAt: null
  }
];

const devices = [
  {
    id: "device_local_dev",
    userId: "dev_user",
    name: "Local Development PC",
    os: "Windows",
    appVersion: "0.1.0",
    status: "connected",
    lastSeenAt: seedTimestamp
  }
];

const apiKeys = [
  {
    id: "key_gemini_dev",
    userId: "dev_user",
    provider: "gemini",
    label: "Gemini",
    maskedKey: "AIza...demo",
    status: "configured",
    lastValidatedAt: null,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  }
];

const defaultPromptSettings = {
  persona: "A practical personal assistant named MiVA.",
  roleGoal: "Help the user think clearly, plan next actions, and use the selected model responsibly.",
  responseRules: [
    "Start with the direct answer, then add context only when it helps.",
    "Ask a short clarifying question when the request is ambiguous.",
    "Keep local/private data assumptions explicit."
  ],
  scheduleRules: {
    mode: "draftOnly",
    timezone: "Asia/Seoul",
    reminderPreference: "Suggest reminders, but do not create calendar events until Google Workspace is connected."
  },
  workspaceRules: {
    googleWorkspace: "disabled",
    calendar: "disabled",
    gmail: "disabled",
    drive: "disabled"
  },
  coding: {
    capability: "chatOnly",
    providerPolicy: "localAllowed",
    localExperimental: false,
    accessMode: "readOnly",
    workspaceAllowlistRequired: false
  },
  safetyRules: [
    "Do not claim that an external tool action was completed unless a connected tool confirms it.",
    "Before changing calendars, files, or email, explain the planned action and wait for user confirmation."
  ]
};

const usageEvents = [
  { id: "event_1", type: "provider_selected", value: "gemini", createdAt: seedTimestamp },
  { id: "event_2", type: "model_selected", value: "gemini-2.5-flash", createdAt: seedTimestamp },
  { id: "event_3", type: "assistant_use_case_selected", value: "daily", createdAt: seedTimestamp },
  { id: "event_4", type: "assistant_use_case_selected", value: "work", createdAt: seedTimestamp },
  { id: "event_5", type: "local_mode_selected", value: "hybrid", createdAt: seedTimestamp },
  { id: "event_6", type: "assistant_profile_status", value: "finalized", createdAt: seedTimestamp }
];

const localUsageEvents = [
  {
    id: "usage_1",
    userId: "dev_user",
    deviceId: "device_local_dev",
    assistantProfileId: "profile_general",
    mode: "local",
    provider: "ollama",
    model: "qwen3:4b",
    inputChars: 80,
    outputChars: 360,
    durationMs: 2100,
    success: true,
    createdAt: seedTimestamp
  },
  {
    id: "usage_2",
    userId: "dev_user",
    deviceId: "device_local_dev",
    assistantProfileId: "profile_general",
    mode: "cloud",
    provider: "gemini",
    model: "gemini-2.5-flash",
    inputChars: 44,
    outputChars: 210,
    durationMs: 1200,
    success: true,
    createdAt: seedTimestamp
  }
];

const deviceAuthRequests = new Map();

function writeCorsHeaders(res, origin) {
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("access-control-allow-origin", origin);
  }
  res.setHeader("vary", "origin");
  res.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,authorization");
}

function sendJson(res, statusCode, data, origin) {
  const body = JSON.stringify(data, null, 2);
  writeCorsHeaders(res, origin);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function countBy(events, type) {
  return events
    .filter((event) => event.type === type)
    .reduce((acc, event) => {
      acc[event.value] = (acc[event.value] || 0) + 1;
      return acc;
    }, {});
}

function toTopList(counts) {
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function countProfilesBy(field) {
  return assistantProfiles.reduce((acc, profile) => {
    const value = profile[field] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function toDbProvider(provider) {
  const normalized = String(provider || "").toUpperCase();
  return ["OLLAMA", "OPENAI", "GEMINI", "ANTHROPIC", "CUSTOM"].includes(normalized) ? normalized : "CUSTOM";
}

function fromDbProvider(provider) {
  return String(provider || "CUSTOM").toLowerCase();
}

function toDbProfileStatus(status) {
  return status === "finalized" ? "FINALIZED" : "DRAFT";
}

function fromDbProfileStatus(status) {
  return status === "FINALIZED" ? "finalized" : "draft";
}

function toDbProfileSource(source) {
  const normalized = String(source || "").replaceAll("-", "_").toUpperCase();
  return ["DESKTOP_SETUP", "WEB_CONSOLE", "API"].includes(normalized) ? normalized : "WEB_CONSOLE";
}

function fromDbProfileSource(source) {
  return String(source || "WEB_CONSOLE").toLowerCase().replaceAll("_", "-");
}

function toDbCredentialStatus(status) {
  const normalized = String(status || "").replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase().replace(/^_/, "");
  return ["NOT_CONFIGURED", "CONFIGURED", "VERIFIED", "ERROR"].includes(normalized) ? normalized : "CONFIGURED";
}

function fromDbCredentialStatus(status) {
  if (status === "NOT_CONFIGURED") {
    return "notConfigured";
  }
  return String(status || "CONFIGURED").toLowerCase();
}

function toDbUsageMode(mode) {
  return mode === "cloud" ? "CLOUD" : "LOCAL";
}

function fromDbUsageMode(mode) {
  return mode === "CLOUD" ? "cloud" : "local";
}

function hashSecret(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: String(user.role || "USER").toLowerCase(),
    locale: user.locale
  };
}

function serializeAssistantProfile(profile) {
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
    status: fromDbProfileStatus(profile.status),
    source: fromDbProfileSource(profile.source),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    completedAt: profile.completedAt ? profile.completedAt.toISOString() : null,
    prompt: profile.prompt || undefined,
    capabilities: profile.capabilities || undefined
  };
}

function serializeApiKey(key) {
  return {
    id: key.id,
    userId: key.userId,
    provider: fromDbProvider(key.provider),
    label: key.label,
    maskedKey: key.maskedKey,
    status: fromDbCredentialStatus(key.status),
    lastValidatedAt: key.lastValidatedAt ? key.lastValidatedAt.toISOString() : null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString()
  };
}

function serializeDevice(device) {
  return {
    id: device.id,
    userId: device.userId,
    name: device.name,
    os: device.os,
    appVersion: device.appVersion,
    status: device.localStatus?.status || (device.lastSeenAt ? "connected" : "offline"),
    lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    createdAt: device.createdAt.toISOString(),
    updatedAt: device.updatedAt.toISOString()
  };
}

function serializeLocalUsageEvent(event) {
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
    createdAt: event.createdAt.toISOString()
  };
}

function countMetric(events, type) {
  return events.reduce((acc, event) => {
    if (event.metadata?.type === type && typeof event.metadata.value === "string") {
      acc[event.metadata.value] = (acc[event.metadata.value] || 0) + 1;
    }
    return acc;
  }, {});
}

async function ensureDevData() {
  await prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {
      passwordHash: hashSecret(DEV_PASSWORDS["dev@miva.local"])
    },
    create: {
      id: DEV_USER_ID,
      email: "dev@miva.local",
      displayName: "MiVA User",
      passwordHash: hashSecret(DEV_PASSWORDS["dev@miva.local"]),
      role: "USER",
      locale: "ko"
    }
  });

  await prisma.user.upsert({
    where: { id: "admin_user" },
    update: {
      passwordHash: hashSecret(DEV_PASSWORDS["admin@miva.local"])
    },
    create: {
      id: "admin_user",
      email: "admin@miva.local",
      displayName: "MiVA Admin",
      passwordHash: hashSecret(DEV_PASSWORDS["admin@miva.local"]),
      role: "ADMIN",
      locale: "ko"
    }
  });

  const profileCount = await prisma.assistantProfile.count({ where: { userId: DEV_USER_ID } });
  if (profileCount === 0) {
    await prisma.assistantProfile.createMany({
      data: assistantProfiles.map((profile) => ({
        id: profile.id,
        userId: profile.userId,
        name: profile.name,
        description: profile.description,
        useCase: profile.useCase,
        answerStyle: profile.answerStyle,
        priority: profile.priority,
        languageUse: profile.languageUse,
        localMode: profile.localMode,
        provider: toDbProvider(profile.provider),
        model: profile.model,
        futureFeatures: profile.futureFeatures,
        isDefault: profile.isDefault,
        status: toDbProfileStatus(profile.status),
        source: toDbProfileSource(profile.source),
        completedAt: profile.completedAt ? new Date(profile.completedAt) : null
      }))
    });
  }

  await prisma.device.upsert({
    where: { id: "device_local_dev" },
    update: {
      lastSeenAt: new Date(),
      localStatus: { status: "connected" }
    },
    create: {
      id: "device_local_dev",
      userId: DEV_USER_ID,
      name: "Local Development PC",
      os: "Windows",
      appVersion: "0.1.0",
      lastSeenAt: new Date(),
      localStatus: { status: "connected" }
    }
  });

  const credentialCount = await prisma.providerCredential.count({ where: { userId: DEV_USER_ID } });
  if (credentialCount === 0) {
    await prisma.providerCredential.create({
      data: {
        id: "key_gemini_dev",
        userId: DEV_USER_ID,
        provider: "GEMINI",
        label: "Gemini",
        encryptedKey: "",
        maskedKey: "AIza...demo",
        status: "CONFIGURED"
      }
    });
  }
}

async function getAdminStats() {
  const [userCount, deviceRows, profiles, metricEvents] = await Promise.all([
    prisma.user.count(),
    prisma.device.findMany(),
    prisma.assistantProfile.findMany(),
    prisma.usageEvent.findMany({
      where: {
        eventType: "admin_metric"
      },
      orderBy: { createdAt: "desc" },
      take: 200
    })
  ]);

  const statusCounts = profiles.reduce((acc, profile) => {
    const status = fromDbProfileStatus(profile.status);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    users: {
      total: userCount,
      active: userCount
    },
    devices: {
      total: deviceRows.length,
      connected: deviceRows.filter((device) => device.localStatus?.status === "connected" || device.lastSeenAt).length
    },
    assistantProfiles: {
      total: profiles.length,
      finalized: profiles.filter((profile) => profile.status === "FINALIZED").length,
      useCases: toTopList(countMetric(metricEvents, "assistant_use_case_selected")),
      localModes: toTopList(countMetric(metricEvents, "local_mode_selected")),
      codingCapabilities: toTopList(countMetric(metricEvents, "coding_capability_selected")),
      statuses: toTopList(statusCounts)
    },
    providers: toTopList(countMetric(metricEvents, "provider_selected")),
    models: toTopList(countMetric(metricEvents, "model_selected")),
    recentEvents: metricEvents.slice(0, 8).map((event) => ({
      id: event.id,
      type: event.metadata?.type || event.eventType,
      value: event.metadata?.value || "",
      createdAt: event.createdAt.toISOString()
    }))
  };
}

function normalizeAssistantProfile(payload, userId = DEV_USER_ID) {
  const now = new Date().toISOString();
  const status = payload.status === "finalized" ? "finalized" : "draft";
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
    status,
    source: payload.source || "web-console",
    createdAt: payload.createdAt || now,
    updatedAt: now,
    completedAt: status === "finalized" ? (payload.completedAt || now) : null,
    prompt,
    capabilities
  };
}

function normalizeStringList(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? normalized : [...fallback];
}

function normalizeWorkspacePolicy(value) {
  return ["disabled", "askFirst", "connectedOnly"].includes(value) ? value : "disabled";
}

function normalizeCodingCapability(value) {
  return ["chatOnly", "codeExplain", "codeEdit", "clawCode"].includes(value)
    ? value
    : defaultPromptSettings.coding.capability;
}

function normalizeCodingProviderPolicy(value) {
  return ["localAllowed", "cloudRecommended", "cloudRequired"].includes(value)
    ? value
    : defaultPromptSettings.coding.providerPolicy;
}

function normalizeCodingAccessMode(value) {
  return ["readOnly", "fileEdits", "shellCommands"].includes(value)
    ? value
    : defaultPromptSettings.coding.accessMode;
}

function normalizeCodingPolicy(value) {
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
      : defaultPromptSettings.coding.workspaceAllowlistRequired
  };
}

function normalizePromptSettings(value) {
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
        : defaultPromptSettings.scheduleRules.reminderPreference
    },
    workspaceRules: {
      googleWorkspace: normalizeWorkspacePolicy(workspaceRules.googleWorkspace),
      calendar: normalizeWorkspacePolicy(workspaceRules.calendar),
      gmail: normalizeWorkspacePolicy(workspaceRules.gmail),
      drive: normalizeWorkspacePolicy(workspaceRules.drive)
    },
    coding: normalizeCodingPolicy(source.coding),
    safetyRules: normalizeStringList(source.safetyRules, defaultPromptSettings.safetyRules)
  };
}

function normalizeCapabilitiesPayload(value, promptSettings) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...source,
    coding: normalizeCodingPolicy(source.coding || promptSettings.coding)
  };
}

function normalizePromptPayload(value) {
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
      guardrails: []
    }
  };
}

async function recordUsageEvent(type, value, userId = DEV_USER_ID) {
  await prisma.usageEvent.create({
    data: {
      userId,
      mode: "CLOUD",
      provider: "system",
      model: "system",
      eventType: "admin_metric",
      metadata: {
        type,
        value
      }
    }
  });
}

function maskApiKey(value) {
  const key = String(value || "").trim();
  if (!key) {
    return "";
  }

  if (key.length <= 8) {
    return `${key.slice(0, 2)}...${key.slice(-2)}`;
  }

  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function normalizeApiKeyPayload(payload) {
  const now = new Date().toISOString();
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
    lastValidatedAt: null,
    createdAt: payload.createdAt || now,
    updatedAt: now
  };
}

async function getUsageSummary() {
  const events = await prisma.usageEvent.findMany({
    where: {
      eventType: "chat"
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const totals = events.reduce((acc, event) => {
    acc.events += 1;
    if (event.mode === "LOCAL") {
      acc.localEvents += 1;
    } else {
      acc.cloudEvents += 1;
    }
    acc.estimatedInputChars += Number(event.inputChars || 0);
    acc.estimatedOutputChars += Number(event.outputChars || 0);
    acc.totalLatencyMs += Number(event.durationMs || 0);
    return acc;
  }, {
    events: 0,
    localEvents: 0,
    cloudEvents: 0,
    estimatedInputChars: 0,
    estimatedOutputChars: 0,
    totalLatencyMs: 0
  });

  return {
    totals: {
      events: totals.events,
      localEvents: totals.localEvents,
      cloudEvents: totals.cloudEvents,
      estimatedInputChars: totals.estimatedInputChars,
      estimatedOutputChars: totals.estimatedOutputChars,
      averageLatencyMs: totals.events ? Math.round(totals.totalLatencyMs / totals.events) : 0
    },
    byProvider: toTopList(events.reduce((acc, event) => {
      acc[event.provider] = (acc[event.provider] || 0) + 1;
      return acc;
    }, {})),
    byModel: toTopList(events.reduce((acc, event) => {
      acc[event.model] = (acc[event.model] || 0) + 1;
      return acc;
    }, {})),
    recentEvents: events.slice(0, 10).map(serializeLocalUsageEvent)
  };
}

function normalizeLocalUsagePayload(payload, userId = DEV_USER_ID) {
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
    createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined
  };
}

async function createAuthSession(user) {
  const token = `miva_${randomBytes(32).toString("hex")}`;
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSecret(token),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  return {
    token,
    user: serializeUser(user)
  };
}

async function verifyGoogleCredential(credential) {
  if (!googleOAuthClient || !GOOGLE_OAUTH_CLIENT_ID) {
    const error = new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
    error.statusCode = 503;
    throw error;
  }

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_OAUTH_CLIENT_ID
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    const error = new Error("INVALID_GOOGLE_ID_TOKEN");
    error.statusCode = 401;
    throw error;
  }

  if (payload.email_verified === false) {
    const error = new Error("GOOGLE_EMAIL_NOT_VERIFIED");
    error.statusCode = 401;
    throw error;
  }

  return payload;
}

async function upsertGoogleUser(payload) {
  const email = String(payload.email).toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        googleSubject: payload.sub,
        displayName: payload.name || existingUser.displayName,
        locale: payload.locale || existingUser.locale,
        lastLoginAt: new Date()
      }
    });
    return { user, isNewUser: false };
  }

  const user = await prisma.user.create({
    data: {
      id: `google_${payload.sub}`,
      email,
      displayName: payload.name || email.split("@")[0] || "MiVA User",
      googleSubject: payload.sub,
      role: "USER",
      locale: payload.locale || "en",
      lastLoginAt: new Date()
    }
  });
  return { user, isNewUser: true };
}

async function getUserFromSessionToken(token) {
  if (!token) {
    return null;
  }

  if (token === "dev-token-admin") {
    return prisma.user.findUnique({ where: { id: "admin_user" } });
  }

  if (token === "dev-token-user") {
    return prisma.user.findUnique({ where: { id: DEV_USER_ID } });
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: { user: true }
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function getRequestUser(req) {
  const sessionUser = await getUserFromSessionToken(getBearerToken(req));
  if (sessionUser) {
    return sessionUser;
  }

  return prisma.user.findUnique({ where: { id: DEV_USER_ID } });
}

function createDeviceAuthRequest() {
  const now = Date.now();
  const deviceCode = `device_${now}_${Math.random().toString(36).slice(2, 10)}`;
  const userCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
  const request = {
    deviceCode,
    userCode,
    status: "pending",
    session: null,
    createdAt: new Date(now).toISOString(),
    expiresAt
  };

  deviceAuthRequests.set(deviceCode, request);
  return request;
}

async function recordAssistantProfileSyncEvents(profile) {
  await Promise.all([
    recordUsageEvent("assistant_profile_synced", profile.id, profile.userId),
    recordUsageEvent("assistant_use_case_selected", profile.useCase, profile.userId),
    recordUsageEvent("provider_selected", profile.provider, profile.userId),
    recordUsageEvent("model_selected", profile.model, profile.userId),
    recordUsageEvent("local_mode_selected", profile.localMode, profile.userId),
    recordUsageEvent("coding_capability_selected", profile.prompt?.settings?.coding?.capability || "chatOnly", profile.userId)
  ]);
}

function applyAssistantProfilePayload(profile, payload) {
  Object.assign(profile, normalizeAssistantProfile({
    ...profile,
    ...payload,
    id: profile.id,
    createdAt: profile.createdAt
  }));

  if (profile.isDefault) {
    assistantProfiles.forEach((item) => {
      item.isDefault = item.id === profile.id;
    });
  }

  return profile;
}

function toAssistantProfileDbData(profile, userId = profile.userId || DEV_USER_ID) {
  return {
    userId,
    name: profile.name,
    description: profile.description,
    useCase: profile.useCase,
    answerStyle: profile.answerStyle,
    priority: profile.priority,
    languageUse: profile.languageUse,
    localMode: profile.localMode,
    provider: toDbProvider(profile.provider),
    model: profile.model,
    futureFeatures: profile.futureFeatures,
    isDefault: profile.isDefault,
    status: toDbProfileStatus(profile.status),
    source: toDbProfileSource(profile.source),
    prompt: profile.prompt,
    capabilities: profile.capabilities,
    completedAt: profile.completedAt ? new Date(profile.completedAt) : null
  };
}

function normalizeDevicePayload(payload, userId = DEV_USER_ID) {
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
      updatedAt: new Date().toISOString()
    }
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    writeCorsHeaders(res, origin);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "miva-api",
        note: "Temporary cloud API contract backed by Prisma/PostgreSQL."
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/me") {
      const sessionUser = await getUserFromSessionToken(getBearerToken(req));
      const user = sessionUser || await prisma.user.findUnique({ where: { id: DEV_USER_ID } });
      sendJson(res, 200, serializeUser(user), origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/login") {
      const payload = await readJson(req);
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || user.passwordHash !== hashSecret(password)) {
        sendJson(res, 401, {
          error: "INVALID_CREDENTIALS",
          message: "Use dev@miva.local / miva1234 or admin@miva.local / admin1234 for local testing."
        }, origin);
        return;
      }

      sendJson(res, 200, {
        ...await createAuthSession(user),
        isNewUser: false
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/google") {
      const payload = await readJson(req);
      const credential = String(payload.credential || "");
      if (!credential) {
        sendJson(res, 400, {
          error: "GOOGLE_CREDENTIAL_REQUIRED"
        }, origin);
        return;
      }

      const googlePayload = await verifyGoogleCredential(credential);
      const { user, isNewUser } = await upsertGoogleUser(googlePayload);
      await recordUsageEvent("google_login_completed", serializeUser(user).role);
      sendJson(res, 200, {
        ...await createAuthSession(user),
        isNewUser
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/device/start") {
      const request = createDeviceAuthRequest();
      sendJson(res, 201, {
        deviceCode: request.deviceCode,
        userCode: request.userCode,
        verificationUrl: `http://127.0.0.1:5173/?desktopLogin=1&deviceCode=${encodeURIComponent(request.deviceCode)}&userCode=${encodeURIComponent(request.userCode)}`,
        expiresAt: request.expiresAt,
        intervalMs: 1500
      }, origin);
      return;
    }

    const deviceStatusMatch = url.pathname.match(/^\/auth\/device\/([^/]+)$/);
    if (req.method === "GET" && deviceStatusMatch) {
      const request = deviceAuthRequests.get(deviceStatusMatch[1]);
      if (!request) {
        sendJson(res, 404, { error: "DEVICE_AUTH_NOT_FOUND" }, origin);
        return;
      }

      if (new Date(request.expiresAt).getTime() < Date.now()) {
        request.status = "expired";
      }

      sendJson(res, 200, {
        status: request.status,
        userCode: request.userCode,
        expiresAt: request.expiresAt,
        session: request.status === "authorized" ? request.session : null
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/device/complete") {
      const payload = await readJson(req);
      const deviceCode = String(payload.deviceCode || "");
      const request = deviceAuthRequests.get(deviceCode);
      if (!request) {
        sendJson(res, 404, { error: "DEVICE_AUTH_NOT_FOUND" }, origin);
        return;
      }

      if (new Date(request.expiresAt).getTime() < Date.now()) {
        request.status = "expired";
        sendJson(res, 410, { error: "DEVICE_AUTH_EXPIRED" }, origin);
        return;
      }

      const user = await getUserFromSessionToken(String(payload.token || ""));
      if (!user) {
        sendJson(res, 401, { error: "INVALID_SESSION_TOKEN" }, origin);
        return;
      }

      request.status = "authorized";
      request.session = await createAuthSession(user);
      await recordUsageEvent("desktop_device_login_completed", serializeUser(user).role);
      sendJson(res, 200, {
        status: request.status,
        session: request.session
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/catalog/models") {
      sendJson(res, 200, {
        models: lightweightModels
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/devices") {
      const requestUser = await getRequestUser(req);
      const deviceRows = await prisma.device.findMany({
        where: { userId: requestUser.id },
        orderBy: { updatedAt: "desc" }
      });
      sendJson(res, 200, {
        devices: deviceRows.map(serializeDevice)
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/devices") {
      const requestUser = await getRequestUser(req);
      const payload = await readJson(req);
      const devicePayload = normalizeDevicePayload(payload, requestUser.id);
      const { id: deviceId, ...deviceData } = devicePayload;
      const resolvedDeviceId = deviceId || "device_local_dev";
      const existingDevice = await prisma.device.findUnique({ where: { id: resolvedDeviceId } });
      const device = existingDevice
        ? await prisma.device.update({
          where: { id: resolvedDeviceId },
          data: deviceData
        })
        : await prisma.device.create({
          data: {
            ...deviceData,
            id: resolvedDeviceId
          }
        });
      if (!existingDevice) {
        await recordUsageEvent("device_registered", device.id, requestUser.id);
      }
      sendJson(res, 201, {
        device: serializeDevice(device)
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api-keys") {
      const keys = await prisma.providerCredential.findMany({
        where: { userId: DEV_USER_ID },
        orderBy: { updatedAt: "desc" }
      });
      sendJson(res, 200, {
        keys: keys.map(serializeApiKey)
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api-keys") {
      const payload = await readJson(req);
      const nextKey = normalizeApiKeyPayload({
        ...payload
      });
      const existingKey = payload.id
        ? await prisma.providerCredential.findUnique({ where: { id: payload.id } })
        : payload.provider !== "custom"
          ? await prisma.providerCredential.findFirst({
            where: {
              userId: DEV_USER_ID,
              provider: toDbProvider(payload.provider)
            }
          })
          : null;
      const key = existingKey
        ? await prisma.providerCredential.update({
          where: { id: existingKey.id },
          data: {
            provider: toDbProvider(nextKey.provider),
            label: nextKey.label,
            encryptedKey: String(payload.key || ""),
            maskedKey: nextKey.maskedKey,
            status: toDbCredentialStatus(nextKey.status),
            lastValidatedAt: null
          }
        })
        : await prisma.providerCredential.create({
          data: {
            id: nextKey.id,
            userId: DEV_USER_ID,
            provider: toDbProvider(nextKey.provider),
            label: nextKey.label,
            encryptedKey: String(payload.key || ""),
            maskedKey: nextKey.maskedKey,
            status: toDbCredentialStatus(nextKey.status),
            lastValidatedAt: null
          }
        });

      await recordUsageEvent("api_key_configured", nextKey.provider);
      sendJson(res, existingKey ? 200 : 201, {
        key: serializeApiKey(key)
      }, origin);
      return;
    }

    const apiKeyTestMatch = url.pathname.match(/^\/api-keys\/([^/]+)\/test$/);
    if (req.method === "POST" && apiKeyTestMatch) {
      const existingKey = await prisma.providerCredential.findUnique({ where: { id: apiKeyTestMatch[1] } });
      const key = existingKey
        ? await prisma.providerCredential.update({
          where: { id: existingKey.id },
          data: {
            status: existingKey.maskedKey ? "VERIFIED" : "ERROR",
            lastValidatedAt: new Date()
          }
        })
        : null;
      if (!key) {
        sendJson(res, 404, { error: "API_KEY_NOT_FOUND" }, origin);
        return;
      }

      await recordUsageEvent("api_key_tested", fromDbProvider(key.provider));
      sendJson(res, 200, {
        key: serializeApiKey(key)
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/assistant-profiles") {
      const requestUser = await getRequestUser(req);
      const profiles = await prisma.assistantProfile.findMany({
        where: { userId: requestUser.id },
        orderBy: [
          { isDefault: "desc" },
          { updatedAt: "desc" }
        ]
      });
      sendJson(res, 200, {
        profiles: profiles.map(serializeAssistantProfile)
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/assistant-profiles") {
      const requestUser = await getRequestUser(req);
      const payload = await readJson(req);
      const existingProfile = payload.id
        ? await prisma.assistantProfile.findFirst({ where: { id: payload.id, userId: requestUser.id } })
        : null;
      const normalizedProfile = normalizeAssistantProfile({
        ...existingProfile,
        ...(existingProfile ? serializeAssistantProfile(existingProfile) : {}),
        ...payload,
        id: existingProfile?.id || payload.id,
        createdAt: existingProfile?.createdAt?.toISOString() || payload.createdAt
      }, requestUser.id);

      if (normalizedProfile.isDefault) {
        await prisma.assistantProfile.updateMany({
          where: { userId: requestUser.id },
          data: { isDefault: false }
        });
      }

      const profile = existingProfile
        ? await prisma.assistantProfile.update({
          where: { id: existingProfile.id },
          data: toAssistantProfileDbData(normalizedProfile)
        })
        : await prisma.assistantProfile.create({
          data: {
            id: normalizedProfile.id,
            ...toAssistantProfileDbData(normalizedProfile, requestUser.id)
          }
        });

      await recordAssistantProfileSyncEvents(normalizedProfile);
      sendJson(res, existingProfile ? 200 : 201, {
        profile: serializeAssistantProfile(profile)
      }, origin);
      return;
    }

    const finalizeMatch = url.pathname.match(/^\/assistant-profiles\/([^/]+)\/finalize$/);
    if (req.method === "POST" && finalizeMatch) {
      const requestUser = await getRequestUser(req);
      const existingProfile = await prisma.assistantProfile.findFirst({
        where: { id: finalizeMatch[1], userId: requestUser.id }
      });
      if (!existingProfile) {
        sendJson(res, 404, { error: "PROFILE_NOT_FOUND" }, origin);
        return;
      }

      await prisma.assistantProfile.updateMany({
        where: { userId: requestUser.id },
        data: { isDefault: false }
      });
      const profile = await prisma.assistantProfile.update({
        where: { id: existingProfile.id },
        data: {
          isDefault: true,
          status: "FINALIZED",
          completedAt: new Date()
        }
      });
      await Promise.all([
        recordUsageEvent("assistant_profile_status", "finalized", requestUser.id),
        recordUsageEvent("assistant_profile_finalized", profile.id, requestUser.id),
        recordUsageEvent("provider_selected", fromDbProvider(profile.provider), requestUser.id),
        recordUsageEvent("model_selected", profile.model, requestUser.id)
      ]);
      sendJson(res, 200, {
        profile: serializeAssistantProfile(profile)
      }, origin);
      return;
    }

    const profileMatch = url.pathname.match(/^\/assistant-profiles\/([^/]+)$/);
    if (profileMatch) {
      const requestUser = await getRequestUser(req);
      const profileId = profileMatch[1];
      const profile = await prisma.assistantProfile.findFirst({
        where: { id: profileId, userId: requestUser.id }
      });
      if (!profile) {
        sendJson(res, 404, { error: "PROFILE_NOT_FOUND" }, origin);
        return;
      }

      if (req.method === "GET") {
        sendJson(res, 200, { profile: serializeAssistantProfile(profile) }, origin);
        return;
      }

      if (req.method === "PATCH") {
        const payload = await readJson(req);
        const normalizedProfile = normalizeAssistantProfile({
          ...serializeAssistantProfile(profile),
          ...payload,
          id: profile.id,
          createdAt: profile.createdAt.toISOString()
        }, requestUser.id);
        if (normalizedProfile.isDefault) {
          await prisma.assistantProfile.updateMany({
            where: { userId: requestUser.id },
            data: { isDefault: false }
          });
        }
        const updatedProfile = await prisma.assistantProfile.update({
          where: { id: profile.id },
          data: toAssistantProfileDbData(normalizedProfile)
        });
        await recordAssistantProfileSyncEvents(normalizedProfile);
        sendJson(res, 200, {
          profile: serializeAssistantProfile(updatedProfile)
        }, origin);
        return;
      }

      if (req.method === "DELETE") {
        const deletedProfile = await prisma.assistantProfile.delete({ where: { id: profileId } });
        if (deletedProfile.isDefault) {
          const fallbackProfile = await prisma.assistantProfile.findFirst({
            where: { userId: requestUser.id },
            orderBy: { updatedAt: "desc" }
          });
          if (fallbackProfile) {
            await prisma.assistantProfile.update({
              where: { id: fallbackProfile.id },
              data: { isDefault: true }
            });
          }
        }

        await recordUsageEvent("assistant_profile_deleted", profileId, requestUser.id);
        sendJson(res, 200, {
          ok: true,
          profile: serializeAssistantProfile(deletedProfile)
        }, origin);
        return;
      }
    }

    if (req.method === "POST" && url.pathname === "/usage-events") {
      const payload = await readJson(req);
      if (typeof payload.type !== "string" || typeof payload.value !== "string") {
        sendJson(res, 400, {
          error: "INVALID_USAGE_EVENT"
        }, origin);
        return;
      }

      await recordUsageEvent(payload.type, payload.value);
      sendJson(res, 201, {
        ok: true
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/usage/summary") {
      sendJson(res, 200, await getUsageSummary(), origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/usage/local-events") {
      const requestUser = await getRequestUser(req);
      const payload = await readJson(req);
      const events = Array.isArray(payload.events) ? payload.events : [payload];
      const normalizedEvents = events.map((event) => normalizeLocalUsagePayload(event, requestUser.id));
      const [knownDevices, knownProfiles] = await Promise.all([
        prisma.device.findMany({
          where: {
            id: {
              in: [...new Set(normalizedEvents.map((event) => event.deviceId).filter(Boolean))]
            }
          },
          select: { id: true }
        }),
        prisma.assistantProfile.findMany({
          where: {
            id: {
              in: [...new Set(normalizedEvents.map((event) => event.assistantProfileId).filter(Boolean))]
            }
          },
          select: { id: true }
        })
      ]);
      const knownDeviceIds = new Set(knownDevices.map((device) => device.id));
      const knownProfileIds = new Set(knownProfiles.map((profile) => profile.id));
      await prisma.usageEvent.createMany({
        data: normalizedEvents.map((event) => ({
          id: event.id,
          userId: event.userId,
          deviceId: knownDeviceIds.has(event.deviceId) ? event.deviceId : null,
          assistantProfileId: knownProfileIds.has(event.assistantProfileId) ? event.assistantProfileId : null,
          mode: toDbUsageMode(event.mode),
          provider: event.provider,
          model: event.model,
          eventType: "chat",
          inputChars: event.inputChars,
          outputChars: event.outputChars,
          durationMs: event.durationMs,
          success: event.success,
          createdAt: event.createdAt
        }))
      });
      await Promise.all(normalizedEvents.map((event) => recordUsageEvent("local_usage_synced", `${event.provider}:${event.model}`, requestUser.id)));
      sendJson(res, 201, {
        ok: true,
        accepted: normalizedEvents.length
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/admin/stats") {
      sendJson(res, 200, await getAdminStats(), origin);
      return;
    }

    sendJson(res, 404, {
      error: "NOT_FOUND",
      path: url.pathname
    }, origin);
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    sendJson(res, statusCode, {
      error: "MIVA_API_ERROR",
      message: error.message
    }, origin);
  }
});

ensureDevData()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`MiVA API placeholder listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize MiVA API data", error);
    process.exit(1);
  });
