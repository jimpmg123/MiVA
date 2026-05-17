import { CLOUD_API_URL } from "../config.mjs";

const serviceKeywords = {
  calendar: ["calendar", "schedule", "event", "meeting", "일정", "캘린더", "회의", "미팅", "스케줄"],
  gmail: ["gmail", "email", "mail", "inbox", "메일", "이메일", "지메일", "받은편지"],
  drive: ["drive", "file", "folder", "document", "드라이브", "파일", "폴더", "문서"],
  docs: ["docs", "doc", "document", "문서", "구글독스", "독스"],
  sheets: ["sheets", "spreadsheet", "sheet", "스프레드시트", "시트", "엑셀"],
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

export async function buildWorkspaceContext({ prompt, profile, authToken }) {
  const settings = getProfileSettings(profile);
  if (!workspaceEnabled(settings)) {
    console.info("[workspace] skipped: workspace integration disabled for this assistant");
    return null;
  }

  const services = requestedServices(prompt, settings);
  if (services.length === 0) {
    console.info("[workspace] skipped: no selected workspace service matched the prompt");
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
