import { CLOUD_API_URL } from "../config.mjs";

const serviceKeywords = {
  calendar: ["calendar", "schedule", "event", "meeting", "\uc77c\uc815", "\uce98\ub9b0\ub354", "\ud68c\uc758", "\ubbf8\ud305", "\uc2a4\ucf00\uc904"],
  gmail: ["gmail", "email", "mail", "inbox", "\uba54\uc77c", "\uc774\uba54\uc77c", "\uc9c0\uba54\uc77c", "\ubc1b\uc740\ud3b8\uc9c0"],
  drive: ["drive", "file", "folder", "document", "\ub4dc\ub77c\uc774\ube0c", "\ud30c\uc77c", "\ud3f4\ub354"],
  docs: ["docs", "doc", "document", "google docs", "\uad6c\uae00 \ubb38\uc11c", "\uad6c\uae00 \ub3c5\uc2a4", "\ubb38\uc11c", "\ub3c5\uc2a4"],
  sheets: ["sheets", "spreadsheet", "sheet", "\uc2a4\ud504\ub808\ub4dc\uc2dc\ud2b8", "\uc2dc\ud2b8", "\ud45c"],
};
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

function messageMentionsService(prompt, service) {
  const lowerPrompt = String(prompt || "").toLowerCase();
  return serviceKeywords[service].some((keyword) => lowerPrompt.includes(keyword.toLowerCase()));
}

function mentionedWorkspaceServices(prompt) {
  return ["calendar", "gmail", "drive", "docs", "sheets"]
    .filter((service) => messageMentionsService(prompt, service));
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

  return ["calendar", "gmail", "drive", "docs", "sheets"]
    .filter((service) => (
      fallbackSelected.has(service) &&
      servicePolicyAllowsRead(settings, service) &&
      messageMentionsService(prompt, service)
    ))
    .slice(0, 3);
}

function promptRequestsWrite(prompt) {
  const lowerPrompt = String(prompt || "").toLowerCase();
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

function hasExplicitActionConfirmation(prompt) {
  const normalized = String(prompt || "").toLowerCase();
  return [
    "confirm",
    "confirmed",
    "approve",
    "approved",
    "yes, do it",
    "go ahead",
    "proceed",
    "\ud655\uc778",
    "\uc2b9\uc778",
    "\uc9c4\ud589\ud574",
    "\uc751",
    "\uadf8\ub798",
  ].some((marker) => normalized.includes(marker));
}

function latestUserInstruction(prompt) {
  return String(prompt || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) || String(prompt || "").trim();
}

function summarizeWorkspaceWriteRequest(prompt, locale) {
  const instruction = latestUserInstruction(prompt)
    .replace(/\s+/g, " ")
    .trim();
  const maxLength = locale === "en" ? 140 : 90;
  if (!instruction) {
    return locale === "en" ? "Run the requested Google Workspace change" : "요청한 Google Workspace 변경 작업";
  }
  return instruction.length > maxLength ? `${instruction.slice(0, maxLength - 1)}...` : instruction;
}

function buildWorkspaceWriteConfirmationMessage({ prompt, locale }) {
  const services = mentionedWorkspaceServices(prompt);
  const serviceLabel = joinWorkspaceServiceNames(services, locale);
  const summary = summarizeWorkspaceWriteRequest(prompt, locale);

  if (locale === "en") {
    return [
      "Before I change Google Workspace, please confirm.",
      "",
      `Request summary: ${summary}`,
      `Google Workspace used: ${serviceLabel}`,
      "",
      "Should I run this?",
    ].join("\n");
  }

  return [
    "Google Workspace를 변경하기 전에 확인이 필요합니다.",
    "",
    `요청 요약: ${summary}`,
    `사용할 Google Workspace: ${serviceLabel}`,
    "",
    "실행할까요?",
  ].join("\n");
}

function buildWorkspacePlannerPrompt({ prompt, locale, workspaceContext = "" }) {
  return [
    "You convert a user request into one Google Workspace write action JSON object.",
    "Return only JSON. Do not use markdown.",
    "Supported actions:",
    "- calendar.create: params must include summary, start, end, timeZone. Optional description, location.",
    "- calendar.update: params must include eventId and at least one field to change: summary, start, end, timeZone, description, location.",
    "- calendar.delete: params must include eventId. Use this when the user asks to delete/remove/cancel an existing event and the event id is available in context.",
    "- docs.append: params must include text. Optional documentId. If the user says latest/recent document and gives no id, omit documentId.",
    "Use ISO 8601 dateTime strings. Default timeZone is Asia/Seoul. Current date in Korea is " + new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }) + ".",
    "If the request is not a concrete Calendar create/update/delete or Docs append request, return {\"action\":\"none\",\"params\":{},\"reason\":\"...\"}.",
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

  const mentionedServices = mentionedWorkspaceServices(prompt);
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
  if (!workspaceEnabled(settings) || !promptRequestsWrite(prompt)) {
    return null;
  }

  if (!hasExplicitActionConfirmation(prompt)) {
    return buildWorkspaceWriteConfirmationMessage({ prompt, locale });
  }

  if (!authToken) {
    return "Google Workspace write action was requested, but this desktop session is not signed in. Ask the user to sign in and connect Google Workspace permissions.";
  }

  if (!apiKey) {
    return null;
  }

  try {
    const plan = await planWorkspaceAction({ prompt, provider, model, apiKey, locale, workspaceContext });
    const action = typeof plan?.action === "string" ? plan.action : "none";
    if (action === "none") {
      return null;
    }

    if (!["calendar.create", "calendar.update", "calendar.delete", "docs.append"].includes(action)) {
      return `Google Workspace write action was requested, but the planned action is unsupported: ${action}.`;
    }

    const result = await runCloudWorkspaceAction({
      authToken,
      action,
      params: plan?.params && typeof plan.params === "object" ? plan.params : {},
    });

    if (result?.ok === false || result?.status === "NEEDS_AUTH") {
      return "Google Workspace write action needs Google consent. Ask the user to connect Google Workspace permissions in the browser, then retry.";
    }

    return [
      "Google Workspace write action result:",
      JSON.stringify(result, null, 2),
      "This result is authoritative. If ok=true, tell the user that MiVA completed the action. Do not say you lack Calendar or Docs access when this action result is present.",
    ].join("\n");
  } catch (error) {
    return `Google Workspace write action failed: ${String(error?.message || error)}\nDo not claim the action was completed.`;
  }
}


