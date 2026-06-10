import {
  CLOUD_API_URL,
  GEMINI_DEFAULT_MODEL,
  GROQ_DEFAULT_MODEL,
  OPENAI_DEFAULT_MODEL,
} from "../config.mjs";
import {
  buildActionConfirmationMessage,
  createActionPlan,
  hasExplicitActionConfirmation,
  isActionConfirmationMessage,
  summarizeActionRequest,
} from "./action-confirmation.mjs";

import { getProviderApiKey } from "./provider-keys.mjs";

const WORKSPACE_SLASH_PATTERN = /^\/(?:calendar|google-calendar|gcal|docs|google-docs|gdocs|drive|google-drive|gdrive|gmail|mail|email|sheets|google-sheets|spreadsheet)\b/i;

// Workspace services are activated ONLY by an explicit slash command (or a [Google X] label).
// There is intentionally no keyword/substring detection of plain message text.
const WORKSPACE_SLASH_SERVICE = {
  calendar: "calendar",
  "google-calendar": "calendar",
  gcal: "calendar",
  docs: "docs",
  "google-docs": "docs",
  gdocs: "docs",
  drive: "drive",
  "google-drive": "drive",
  gdrive: "drive",
  gmail: "gmail",
  mail: "gmail",
  email: "gmail",
  sheets: "sheets",
  "google-sheets": "sheets",
  spreadsheet: "sheets",
};

const WORKSPACE_LABEL_SERVICE = {
  "Google Calendar": "calendar",
  "Google Docs": "docs",
  "Google Drive": "drive",
  "Gmail": "gmail",
  "Google Sheets": "sheets",
};

const WORKSPACE_SERVICE_ORDER = ["calendar", "gmail", "drive", "docs", "sheets"];
function getProfileSettings(profile) {
  return profile?.prompt?.settings && typeof profile.prompt.settings === "object"
    ? profile.prompt.settings
    : null;
}

function workspaceEnabled(settings) {
  return settings?.toolConnections?.googleWorkspace === true;
}

function selectedWorkspaceServices(settings) {
  const selected = settings?.toolConnections?.googleWorkspaceServices;
  return Array.isArray(selected) ? new Set(selected) : new Set();
}

function servicePolicyAllowsRead(settings, service) {
  const rules = settings?.workspaceRules || {};
  const globalPolicy = rules.googleWorkspace || "disabled";
  const servicePolicy = rules[service] || globalPolicy;
  return globalPolicy !== "disabled" && servicePolicy !== "disabled";
}

export function workspaceServicesFromSlash(prompt) {
  const text = String(prompt || "");
  const services = new Set();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const slashMatch = line.match(/^\/([a-z-]+)/i);
    if (slashMatch) {
      const service = WORKSPACE_SLASH_SERVICE[slashMatch[1].toLowerCase()];
      if (service) {
        services.add(service);
      }
      continue;
    }

    for (const [label, service] of Object.entries(WORKSPACE_LABEL_SERVICE)) {
      if (line.startsWith(`[${label}]`)) {
        services.add(service);
      }
    }
  }

  return WORKSPACE_SERVICE_ORDER.filter((service) => services.has(service));
}

function formatWorkspaceServiceName(service, locale) {
  const ko = {
    calendar: "Google Calendar",
    gmail: "Gmail",
    drive: "Google Drive",
    docs: "Google Docs",
    sheets: "Google Sheets",
  };
  const en = {
    calendar: "Google Calendar",
    gmail: "Gmail",
    drive: "Google Drive",
    docs: "Google Docs",
    sheets: "Google Sheets",
  };
  return (locale === "en" ? en : ko)[service] || service;
}

function joinWorkspaceServiceNames(services, locale) {
  const names = services.map((service) => formatWorkspaceServiceName(service, locale));
  if (names.length === 0) {
    return locale === "en" ? "Google Workspace" : "Google Workspace";
  }
  if (locale === "en") {
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  }
  return names.join(", ");
}

function requestedServices(prompt, settings) {
  const selected = selectedWorkspaceServices(settings);
  const fallbackSelected = selected.size
    ? selected
    : new Set(["gmail", "calendar", "drive", "docs", "sheets"]);

  const slashServices = new Set(workspaceServicesFromSlash(prompt));
  return WORKSPACE_SERVICE_ORDER
    .filter((service) => (
      fallbackSelected.has(service) &&
      servicePolicyAllowsRead(settings, service) &&
      slashServices.has(service)
    ))
    .slice(0, 3);
}

function promptRequestsWrite(prompt) {
  const lowerPrompt = String(prompt || "").toLowerCase();
  const asksForActionStatus = [
    "is it done",
    "was it added",
    "was it created",
    "did you add",
    "did you create",
    "completed?",
    "finished?",
    "\uc644\ub8cc\ub410",
    "\uc644\ub8cc\ud588",
    "\ucd94\uac00\ub410",
    "\uc0dd\uc131\ub410",
    "\ub4f1\ub85d\ub410",
    "\ud588\uc5b4?",
    "\ub410\uc5b4?",
    "\ub05d\ub0ac",
  ].some((marker) => lowerPrompt.includes(marker));
  if (asksForActionStatus) {
    return false;
  }

  return [
    "create",
    "add",
    "append",
    "update",
    "edit",
    "modify",
    "delete",
    "remove",
    "cancel",
    "book",
    "reserve",
    "schedule",
    "\ub9cc\ub4e4",
    "\uc0dd\uc131",
    "\ucd94\uac00",
    "\uc218\uc815",
    "\ubcc0\uacbd",
    "\uc0ad\uc81c",
    "\ucde8\uc18c",
    "\ub4f1\ub85d",
    "\uc368\uc918",
    "\uc801\uc5b4",
    "\uc608\uc57d",
    "\uc785\ub825",
    "\ub123\uc5b4",
  ].some((keyword) => lowerPrompt.includes(keyword));
}

function extractJsonObject(value) {
  const text = String(value || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildWorkspaceWriteConfirmationMessage({ prompt, locale }) {
  const services = workspaceServicesFromSlash(prompt);
  const serviceLabel = joinWorkspaceServiceNames(services, locale);
  const toolLabel = services.length === 1
    ? formatWorkspaceServiceName(services[0], locale)
    : (locale === "en" ? "Google apps" : "Google 앱");
  return buildActionConfirmationMessage(createActionPlan({
    toolId: "googleWorkspace",
    toolLabel,
    requestSummary: summarizeActionRequest(prompt, locale),
    affectedResources: [serviceLabel],
    locale,
  }));
}

function resolveWorkspacePlannerCredentials({ provider, model, apiKey }) {
  if (apiKey) {
    return { provider, model, apiKey };
  }

  const candidates = [
    { provider: "gemini", model: GEMINI_DEFAULT_MODEL },
    { provider: "openai", model: OPENAI_DEFAULT_MODEL },
    { provider: "groq", model: GROQ_DEFAULT_MODEL },
  ];

  for (const candidate of candidates) {
    const plannerKey = getProviderApiKey(candidate.provider, "");
    if (plannerKey) {
      return {
        provider: candidate.provider,
        model: candidate.model,
        apiKey: plannerKey,
      };
    }
  }

  return null;
}

function directWorkspaceAnswer(answer) {
  return {
    type: "direct-answer",
    answer,
  };
}

function workspaceActionService(action) {
  if (String(action || "").startsWith("calendar.")) {
    return "calendar";
  }
  if (String(action || "").startsWith("docs.")) {
    return "docs";
  }
  return "";
}

export function userMessageUsesWorkspaceSlash(content) {
  const text = String(content || "").trim();
  if (WORKSPACE_SLASH_PATTERN.test(text)) {
    return true;
  }

  return Object.keys(WORKSPACE_LABEL_SERVICE).some((label) => text.startsWith(`[${label}]`));
}

export function isWorkspaceSlashSession({ workspaceSlashForced, messages, latestUserPrompt }) {
  if (workspaceSlashForced) {
    return true;
  }

  const lastAssistant = [...(messages || [])].reverse().find((message) => message.role === "assistant");
  if (!isActionConfirmationMessage(lastAssistant?.content)) {
    return false;
  }

  const confirming = hasExplicitActionConfirmation(latestUserPrompt);
  if (!confirming) {
    return false;
  }

  return (messages || []).some((message) => (
    message.role === "user" && userMessageUsesWorkspaceSlash(message.content)
  ));
}

function buildWorkspaceActionCompletedMessage(result, locale) {
  const action = String(result?.action || "");
  const eventSummary = String(result?.event?.summary || "").trim();
  const documentTitle = String(result?.document?.title || "").trim();

  if (locale === "en") {
    if (action === "calendar.create") {
      return `Added${eventSummary ? ` "${eventSummary}"` : " the event"} to Google Calendar.`;
    }
    if (action === "calendar.update") {
      return `Updated${eventSummary ? ` "${eventSummary}"` : " the event"} in Google Calendar.`;
    }
    if (action === "calendar.delete") {
      return "Deleted the event from Google Calendar.";
    }
    if (action === "docs.create") {
      return `Created${documentTitle ? ` "${documentTitle}"` : " a new document"} in Google Docs.`;
    }
    if (action === "docs.append") {
      return `Added the requested content to${documentTitle ? ` "${documentTitle}"` : " the Google Doc"}.`;
    }
    return "The Google Workspace action was completed.";
  }

  if (action === "calendar.create") {
    return `Google Calendar\uc5d0 ${eventSummary ? `"${eventSummary}" ` : ""}\uc77c\uc815\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4.`;
  }
  if (action === "calendar.update") {
    return `Google Calendar\uc758 ${eventSummary ? `"${eventSummary}" ` : ""}\uc77c\uc815\uc744 \uc218\uc815\ud588\uc2b5\ub2c8\ub2e4.`;
  }
  if (action === "calendar.delete") {
    return "Google Calendar\uc5d0\uc11c \uc77c\uc815\uc744 \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.";
  }
  if (action === "docs.create") {
    return `Google Docs\uc5d0 ${documentTitle ? `"${documentTitle}" ` : "\uc0c8 "}\ubb38\uc11c\ub97c \ub9cc\ub4e4\uace0 \ub0b4\uc6a9\uc744 \uc791\uc131\ud588\uc2b5\ub2c8\ub2e4.`;
  }
  if (action === "docs.append") {
    return `${documentTitle ? `"${documentTitle}"` : "Google Docs \ubb38\uc11c"}\uc5d0 \uc694\uccad\ud55c \ub0b4\uc6a9\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4.`;
  }
  return "Google Workspace \uc791\uc5c5\uc744 \uc644\ub8cc\ud588\uc2b5\ub2c8\ub2e4.";
}

function buildWorkspacePlannerPrompt({ prompt, locale, workspaceContext = "" }) {
  return [
    "You convert a user request into one Google Workspace write action JSON object.",
    "Return only JSON. Do not use markdown.",
    "Only choose an action for the Workspace product explicitly selected by slash command or label in the user request.",
    "Do not choose docs.* unless the request contains /docs, /google-docs, /gdocs, or [Google Docs].",
    "Supported actions:",
    "- calendar.create: params must include summary, start, end, timeZone. Optional description, location.",
    "- calendar.update: params must include eventId and at least one field to change: summary, start, end, timeZone, description, location.",
    "- calendar.delete: params must include eventId when available in context. If only summary/time are known, include summary and optional start so MiVA can resolve the event.",
    "- docs.create: params must include title and text. Use this when the user asks to create or write a new Google Doc.",
    "- docs.append: params must include text. Optional documentId. If the user says latest/recent document and gives no id, omit documentId.",
    "Use ISO 8601 dateTime strings. Default timeZone is Asia/Seoul. Current date in Korea is " + new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }) + ".",
    "If the request is not a concrete Calendar create/update/delete or Docs create/append request, return {\"action\":\"none\",\"params\":{},\"reason\":\"...\"}.",
    `User locale: ${locale}.`,
    workspaceContext
      ? `Available Workspace context. Use event IDs and document IDs from this context when needed:\n${workspaceContext}`
      : "",
    `User request: ${prompt}`,
  ].filter(Boolean).join("\n");
}

async function planWorkspaceActionWithGemini({ prompt, model, apiKey, locale, workspaceContext }) {
  const plannerPrompt = buildWorkspacePlannerPrompt({ prompt, locale, workspaceContext });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: plannerPrompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(1000 * 60),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini planner returned HTTP ${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();
  return extractJsonObject(text);
}

async function planWorkspaceActionWithChatCompletions({ prompt, provider, model, apiKey, locale, workspaceContext }) {
  const baseUrl = provider === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Return only valid JSON for the requested Google Workspace action." },
        { role: "user", content: buildWorkspacePlannerPrompt({ prompt, locale, workspaceContext }) },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(1000 * 60),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `${provider} planner returned HTTP ${response.status}`);
  }

  const text = data?.choices?.[0]?.message?.content;
  return extractJsonObject(text);
}

async function planWorkspaceAction({ prompt, provider, model, apiKey, locale, workspaceContext }) {
  if (provider === "gemini") {
    return planWorkspaceActionWithGemini({ prompt, model, apiKey, locale, workspaceContext });
  }

  if (provider === "openai" || provider === "groq") {
    return planWorkspaceActionWithChatCompletions({ prompt, provider, model, apiKey, locale, workspaceContext });
  }

  return null;
}

async function fetchCloudWorkspaceContext({ authToken, prompt, profile, services }) {
  const response = await fetch(`${CLOUD_API_URL}/workspace/context`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${authToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prompt, profile, services }),
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `${response.status} ${response.statusText}`);
  }

  return payload.context || null;
}

async function runCloudWorkspaceAction({ authToken, action, params }) {
  const response = await fetch(`${CLOUD_API_URL}/workspace/actions`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${authToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, params }),
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `${response.status} ${response.statusText}`);
  }

  return payload;
}

export async function buildWorkspaceContext({ prompt, profile, authToken }) {
  const settings = getProfileSettings(profile);
  if (!workspaceEnabled(settings)) {
    console.info("[workspace] skipped: workspace integration disabled for this assistant");
    return null;
  }

  const mentionedServices = workspaceServicesFromSlash(prompt);
  const services = requestedServices(prompt, settings);
  if (services.length === 0) {
    if (mentionedServices.length > 0) {
      console.info(`[workspace] skipped: requested service is not enabled for this assistant: ${mentionedServices.join(",")}`);
      return [
        "Google Workspace was requested, but the requested service is not enabled for this assistant profile.",
        `Detected requested services: ${mentionedServices.join(", ")}.`,
        "Do not claim Gmail, Docs, Drive, Calendar, or Sheets data was checked.",
        "Tell the user to enable the requested product in Studio > Google Workspace > Product access, then retry.",
      ].join("\n");
    }

    console.info("[workspace] skipped: no workspace service matched the prompt");
    return null;
  }

  if (!authToken) {
    console.warn("[workspace] skipped: signed-in cloud session is required for Google Workspace context");
    return "Google Workspace context was requested, but this desktop session is not signed in. Do not claim Workspace data was checked.";
  }

  try {
    const context = await fetchCloudWorkspaceContext({ authToken, prompt, profile, services });
    if (!context) {
      return "Google Workspace context was requested, but no relevant Workspace data was returned. Do not claim Workspace data was checked successfully.";
    }

    return context;
  } catch (error) {
    console.warn(`[workspace] direct API lookup failed: ${String(error?.message || error)}`);
    return `Google Workspace lookup failed through MiVA direct API: ${String(error?.message || error)}\nDo not claim Workspace data was checked successfully.`;
  }
}

export async function buildWorkspaceActionContext({ prompt, profile, authToken, provider, model, apiKey, locale, workspaceContext = "" }) {
  const settings = getProfileSettings(profile);
  const allowedServices = requestedServices(prompt, settings);
  const writableServices = allowedServices.filter((service) => service === "calendar" || service === "docs");
  if (!workspaceEnabled(settings) || writableServices.length === 0 || !promptRequestsWrite(prompt)) {
    return null;
  }

  if (!hasExplicitActionConfirmation(prompt)) {
    return directWorkspaceAnswer(buildWorkspaceWriteConfirmationMessage({ prompt, locale }));
  }

  if (!authToken) {
    return directWorkspaceAnswer("Google Workspace write action was requested, but this desktop session is not signed in. Sign in and connect Google permissions, then retry.");
  }

  const planner = resolveWorkspacePlannerCredentials({ provider, model, apiKey });
  if (!planner) {
    return directWorkspaceAnswer(
      locale === "en"
        ? "A cloud planner API key is required to run Google Calendar or Google Docs actions while using a local model. Add a Gemini, OpenAI, or Groq key in local-helper/.env or demo.env, then retry."
        : "로컬 모델을 사용하는 동안 Google Calendar 또는 Google Docs 작업을 실행하려면 Gemini, OpenAI, Groq API 키가 필요합니다. local-helper/.env 또는 demo.env에 키를 추가한 뒤 다시 시도해 주세요.",
    );
  }

  try {
    const plan = await planWorkspaceAction({
      prompt,
      provider: planner.provider,
      model: planner.model,
      apiKey: planner.apiKey,
      locale,
      workspaceContext,
    });
    const action = typeof plan?.action === "string" ? plan.action : "none";
    if (action === "none") {
      return null;
    }

    if (!["calendar.create", "calendar.update", "calendar.delete", "docs.create", "docs.append"].includes(action)) {
      return directWorkspaceAnswer(`Google Workspace write action was requested, but the planned action is unsupported: ${action}.`);
    }

    const actionService = workspaceActionService(action);
    if (!actionService || !allowedServices.includes(actionService)) {
      return directWorkspaceAnswer(`Google Workspace write action was requested, but the planned action does not match the selected Google app: ${action}.`);
    }

    const result = await runCloudWorkspaceAction({
      authToken,
      action,
      params: plan?.params && typeof plan.params === "object" ? plan.params : {},
    });

    if (result?.ok === false || result?.status === "NEEDS_AUTH") {
      return directWorkspaceAnswer("Google Workspace write action needs Google consent. Connect Google Workspace permissions in the browser, then retry.");
    }

    return directWorkspaceAnswer(buildWorkspaceActionCompletedMessage(result, locale));
  } catch (error) {
    return directWorkspaceAnswer(`Google Workspace write action failed: ${String(error?.message || error)}`);
  }
}


