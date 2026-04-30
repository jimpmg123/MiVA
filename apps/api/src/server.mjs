import http from "node:http";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import { lightweightModels } from "../../../packages/shared/src/index.js";

const PORT = Number(process.env.MIVA_API_PORT || 4000);
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
const googleOAuthClient = GOOGLE_OAUTH_CLIENT_ID ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID) : null;
const seedTimestamp = new Date().toISOString();

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

const demoUsers = [
  {
    id: "dev_user",
    email: "dev@miva.local",
    password: "miva1234",
    displayName: "MiVA User",
    role: "user",
    locale: "ko"
  },
  {
    id: "admin_user",
    email: "admin@miva.local",
    password: "admin1234",
    displayName: "MiVA Admin",
    role: "admin",
    locale: "ko"
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

const authSessions = new Map();
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

function getAdminStats() {
  return {
    users: {
      total: 1,
      active: 1
    },
    devices: {
      total: devices.length,
      connected: devices.filter((device) => device.status === "connected").length
    },
    assistantProfiles: {
      total: assistantProfiles.length,
      finalized: assistantProfiles.filter((profile) => profile.status === "finalized").length,
      useCases: toTopList(countBy(usageEvents, "assistant_use_case_selected")),
      localModes: toTopList(countBy(usageEvents, "local_mode_selected")),
      statuses: toTopList(countProfilesBy("status"))
    },
    providers: toTopList(countBy(usageEvents, "provider_selected")),
    models: toTopList(countBy(usageEvents, "model_selected")),
    recentEvents: usageEvents.slice(-8).reverse()
  };
}

function normalizeAssistantProfile(payload) {
  const now = new Date().toISOString();
  const status = payload.status === "finalized" ? "finalized" : "draft";
  const prompt = normalizePromptPayload(payload.prompt);
  return {
    id: payload.id || `profile_${Date.now()}`,
    userId: "dev_user",
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
    prompt
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
    safetyRules: normalizeStringList(source.safetyRules, defaultPromptSettings.safetyRules)
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

function recordUsageEvent(type, value) {
  usageEvents.push({
    id: `event_${Date.now()}_${usageEvents.length}`,
    type,
    value,
    createdAt: new Date().toISOString()
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

function getUsageSummary() {
  const totals = localUsageEvents.reduce((acc, event) => {
    acc.events += 1;
    if (event.mode === "local") {
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
    byProvider: toTopList(localUsageEvents.reduce((acc, event) => {
      acc[event.provider] = (acc[event.provider] || 0) + 1;
      return acc;
    }, {})),
    byModel: toTopList(localUsageEvents.reduce((acc, event) => {
      acc[event.model] = (acc[event.model] || 0) + 1;
      return acc;
    }, {})),
    recentEvents: localUsageEvents.slice(-10).reverse()
  };
}

function normalizeLocalUsagePayload(payload) {
  const now = new Date().toISOString();

  return {
    id: payload.id || `usage_${Date.now()}_${localUsageEvents.length}`,
    userId: "dev_user",
    deviceId: String(payload.deviceId || "device_local_dev"),
    assistantProfileId: payload.assistantProfileId ? String(payload.assistantProfileId) : null,
    mode: payload.mode === "cloud" ? "cloud" : "local",
    provider: String(payload.provider || "ollama"),
    model: String(payload.model || "unknown"),
    inputChars: Number.isFinite(Number(payload.inputChars)) ? Math.max(0, Math.round(Number(payload.inputChars))) : 0,
    outputChars: Number.isFinite(Number(payload.outputChars)) ? Math.max(0, Math.round(Number(payload.outputChars))) : 0,
    durationMs: Number.isFinite(Number(payload.durationMs)) ? Math.max(0, Math.round(Number(payload.durationMs))) : 0,
    success: payload.success !== false,
    createdAt: payload.createdAt || now
  };
}

function createAuthSession(user) {
  const token = `dev-token-${user.role}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  authSessions.set(token, {
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      locale: user.locale
    }
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

function upsertGoogleUser(payload) {
  const email = String(payload.email).toLowerCase();
  const existing = demoUsers.find((user) => user.email.toLowerCase() === email);
  if (existing) {
    existing.displayName = payload.name || existing.displayName;
    existing.locale = payload.locale || existing.locale;
    return existing;
  }

  const user = {
    id: `google_${payload.sub}`,
    email,
    password: "",
    displayName: payload.name || email.split("@")[0] || "MiVA User",
    role: "user",
    locale: payload.locale || "en"
  };
  demoUsers.push(user);
  return user;
}

function getUserFromSessionToken(token) {
  const session = authSessions.get(token);
  if (session) {
    return demoUsers.find((user) => user.id === session.userId) || null;
  }

  if (token === "dev-token-admin") {
    return demoUsers.find((user) => user.role === "admin") || null;
  }

  if (token === "dev-token-user") {
    return demoUsers.find((user) => user.role === "user") || null;
  }

  return null;
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

function recordAssistantProfileSyncEvents(profile) {
  recordUsageEvent("assistant_profile_synced", profile.id);
  recordUsageEvent("assistant_use_case_selected", profile.useCase);
  recordUsageEvent("provider_selected", profile.provider);
  recordUsageEvent("model_selected", profile.model);
  recordUsageEvent("local_mode_selected", profile.localMode);
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
        note: "Temporary cloud API contract. Move to NestJS and Prisma when persistence starts."
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/me") {
      sendJson(res, 200, {
        id: "dev_user",
        email: "dev@miva.local",
        displayName: "MiVA User",
        role: "user",
        locale: "ko"
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/login") {
      const payload = await readJson(req);
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const user = demoUsers.find((item) => item.email === email && item.password === password);

      if (!user) {
        sendJson(res, 401, {
          error: "INVALID_CREDENTIALS",
          message: "Use dev@miva.local / miva1234 or admin@miva.local / admin1234 for local testing."
        }, origin);
        return;
      }

      sendJson(res, 200, createAuthSession(user), origin);
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
      const user = upsertGoogleUser(googlePayload);
      recordUsageEvent("google_login_completed", user.role);
      sendJson(res, 200, createAuthSession(user), origin);
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

      const user = getUserFromSessionToken(String(payload.token || ""));
      if (!user) {
        sendJson(res, 401, { error: "INVALID_SESSION_TOKEN" }, origin);
        return;
      }

      request.status = "authorized";
      request.session = createAuthSession(user);
      recordUsageEvent("desktop_device_login_completed", user.role);
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
      sendJson(res, 200, {
        devices
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api-keys") {
      sendJson(res, 200, {
        keys: apiKeys
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api-keys") {
      const payload = await readJson(req);
      const existingKey = payload.id
        ? apiKeys.find((item) => item.id === payload.id)
        : payload.provider !== "custom"
          ? apiKeys.find((item) => item.provider === payload.provider)
          : null;
      const nextKey = normalizeApiKeyPayload({
        ...payload,
        id: existingKey?.id || payload.id,
        createdAt: existingKey?.createdAt
      });

      if (existingKey) {
        Object.assign(existingKey, nextKey);
      } else {
        apiKeys.unshift(nextKey);
      }

      recordUsageEvent("api_key_configured", nextKey.provider);
      sendJson(res, existingKey ? 200 : 201, {
        key: existingKey || nextKey
      }, origin);
      return;
    }

    const apiKeyTestMatch = url.pathname.match(/^\/api-keys\/([^/]+)\/test$/);
    if (req.method === "POST" && apiKeyTestMatch) {
      const key = apiKeys.find((item) => item.id === apiKeyTestMatch[1]);
      if (!key) {
        sendJson(res, 404, { error: "API_KEY_NOT_FOUND" }, origin);
        return;
      }

      key.status = key.maskedKey ? "verified" : "error";
      key.lastValidatedAt = new Date().toISOString();
      key.updatedAt = key.lastValidatedAt;
      recordUsageEvent("api_key_tested", key.provider);
      sendJson(res, 200, {
        key
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/assistant-profiles") {
      sendJson(res, 200, {
        profiles: assistantProfiles
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/assistant-profiles") {
      const payload = await readJson(req);
      const existingProfile = payload.id
        ? assistantProfiles.find((item) => item.id === payload.id)
        : null;
      const profile = existingProfile
        ? applyAssistantProfilePayload(existingProfile, payload)
        : normalizeAssistantProfile(payload);

      if (!existingProfile) {
        assistantProfiles.unshift(profile);
        if (profile.isDefault) {
          assistantProfiles.forEach((item) => {
            item.isDefault = item.id === profile.id;
          });
        }
      }

      recordAssistantProfileSyncEvents(profile);
      sendJson(res, existingProfile ? 200 : 201, {
        profile
      }, origin);
      return;
    }

    const finalizeMatch = url.pathname.match(/^\/assistant-profiles\/([^/]+)\/finalize$/);
    if (req.method === "POST" && finalizeMatch) {
      const profile = assistantProfiles.find((item) => item.id === finalizeMatch[1]);
      if (!profile) {
        sendJson(res, 404, { error: "PROFILE_NOT_FOUND" }, origin);
        return;
      }

      const now = new Date().toISOString();
      assistantProfiles.forEach((item) => {
        item.isDefault = item.id === profile.id;
      });
      profile.status = "finalized";
      profile.completedAt = now;
      profile.updatedAt = now;
      recordUsageEvent("assistant_profile_status", "finalized");
      recordUsageEvent("assistant_profile_finalized", profile.id);
      recordUsageEvent("provider_selected", profile.provider);
      recordUsageEvent("model_selected", profile.model);
      sendJson(res, 200, {
        profile
      }, origin);
      return;
    }

    const profileMatch = url.pathname.match(/^\/assistant-profiles\/([^/]+)$/);
    if (req.method === "PATCH" && profileMatch) {
      const profile = assistantProfiles.find((item) => item.id === profileMatch[1]);
      if (!profile) {
        sendJson(res, 404, { error: "PROFILE_NOT_FOUND" }, origin);
        return;
      }

      const payload = await readJson(req);
      applyAssistantProfilePayload(profile, payload);
      recordAssistantProfileSyncEvents(profile);
      sendJson(res, 200, {
        profile
      }, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/usage-events") {
      const payload = await readJson(req);
      if (typeof payload.type !== "string" || typeof payload.value !== "string") {
        sendJson(res, 400, {
          error: "INVALID_USAGE_EVENT"
        }, origin);
        return;
      }

      recordUsageEvent(payload.type, payload.value);
      sendJson(res, 201, {
        ok: true
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/usage/summary") {
      sendJson(res, 200, getUsageSummary(), origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/usage/local-events") {
      const payload = await readJson(req);
      const events = Array.isArray(payload.events) ? payload.events : [payload];
      const normalizedEvents = events.map(normalizeLocalUsagePayload);
      localUsageEvents.push(...normalizedEvents);
      for (const event of normalizedEvents) {
        recordUsageEvent("local_usage_synced", `${event.provider}:${event.model}`);
      }
      sendJson(res, 201, {
        ok: true,
        accepted: normalizedEvents.length
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/admin/stats") {
      sendJson(res, 200, getAdminStats(), origin);
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

server.listen(PORT, () => {
  console.log(`MiVA API placeholder listening on http://localhost:${PORT}`);
});
