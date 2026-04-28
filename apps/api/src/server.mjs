import http from "node:http";
import { lightweightModels } from "../../../packages/shared/src/index.js";

const PORT = Number(process.env.MIVA_API_PORT || 4000);
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

const usageEvents = [
  { id: "event_1", type: "provider_selected", value: "gemini", createdAt: seedTimestamp },
  { id: "event_2", type: "model_selected", value: "gemini-2.5-flash", createdAt: seedTimestamp },
  { id: "event_3", type: "assistant_use_case_selected", value: "daily", createdAt: seedTimestamp },
  { id: "event_4", type: "assistant_use_case_selected", value: "work", createdAt: seedTimestamp },
  { id: "event_5", type: "local_mode_selected", value: "hybrid", createdAt: seedTimestamp },
  { id: "event_6", type: "assistant_profile_status", value: "finalized", createdAt: seedTimestamp }
];

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
    completedAt: status === "finalized" ? (payload.completedAt || now) : null
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

      sendJson(res, 200, {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          locale: user.locale
        },
        token: `dev-token-${user.role}`
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

    if (req.method === "GET" && url.pathname === "/admin/stats") {
      sendJson(res, 200, getAdminStats(), origin);
      return;
    }

    sendJson(res, 404, {
      error: "NOT_FOUND",
      path: url.pathname
    }, origin);
  } catch (error) {
    sendJson(res, 500, {
      error: "MIVA_API_ERROR",
      message: error.message
    }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`MiVA API placeholder listening on http://localhost:${PORT}`);
});
