import { execFile } from "node:child_process";
import { env } from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_CONTEXT_CHARS = 6000;
const GWS_TIMEOUT_MS = 20000;

const serviceKeywords = {
  calendar: ["calendar", "schedule", "event", "meeting", "\uC77C\uC815", "\uCE98\uB9B0\uB354", "\uD68C\uC758", "\uBBF8\uD305", "\uC2A4\uCF00\uC904"],
  gmail: ["gmail", "email", "mail", "inbox", "\uBA54\uC77C", "\uC774\uBA54\uC77C", "\uC9C0\uBA54\uC77C", "\uBC1B\uC740\uD3B8\uC9C0"],
  drive: ["drive", "file", "folder", "document", "\uB4DC\uB77C\uC774\uBE0C", "\uD30C\uC77C", "\uD3F4\uB354", "\uBB38\uC11C"],
  docs: ["docs", "doc", "document", "\uBB38\uC11C", "\uAD6C\uAE00\uB3C5\uC2A4", "\uB3C5\uC2A4"],
  sheets: ["sheets", "spreadsheet", "sheet", "\uC2A4\uD504\uB808\uB4DC\uC2DC\uD2B8", "\uC2DC\uD2B8", "\uC5D1\uC140"],
};

function getProfileSettings(profile) {
  return profile?.prompt?.settings && typeof profile.prompt.settings === "object"
    ? profile.prompt.settings
    : null;
}

function workspaceEnabled(settings) {
  return settings?.toolConnections?.googleWorkspaceCli === true;
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
  const services = ["calendar", "gmail", "drive", "docs", "sheets"].filter((service) => (
    selected.has(service) &&
    servicePolicyAllowsRead(settings, service) &&
    messageMentionsService(prompt, service)
  ));

  return services.slice(0, 3);
}

function gwsCandidates() {
  const candidates = [];
  if (env.GWS_BIN) {
    candidates.push(env.GWS_BIN);
  }
  candidates.push("gws");
  candidates.push("gws.cmd");
  if (env.APPDATA) {
    candidates.push(`${env.APPDATA}\\npm\\gws.cmd`);
  }
  return candidates;
}

async function findGwsCommand() {
  for (const candidate of gwsCandidates()) {
    try {
      await execFileAsync(candidate, ["--version"], { timeout: 5000 });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function runGws(command, args) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    timeout: GWS_TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
  });

  const output = String(stdout || "").trim();
  const errorOutput = String(stderr || "").trim();
  return output || errorOutput || "Command completed with no output.";
}

function truncate(value, maxLength = MAX_CONTEXT_CHARS) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...[truncated]` : text;
}

function safeJson(value) {
  return JSON.stringify(value);
}

function calendarParams() {
  const now = new Date();
  const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 10,
  };
}

function commandForService(service) {
  if (service === "calendar") {
    return ["calendar", "events", "list", "--params", safeJson(calendarParams())];
  }

  if (service === "gmail") {
    return ["gmail", "users", "messages", "list", "--params", safeJson({ userId: "me", maxResults: 10 })];
  }

  if (service === "docs") {
    return ["drive", "files", "list", "--params", safeJson({
      pageSize: 10,
      q: "mimeType='application/vnd.google-apps.document'",
      fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    })];
  }

  if (service === "sheets") {
    return ["drive", "files", "list", "--params", safeJson({
      pageSize: 10,
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    })];
  }

  return ["drive", "files", "list", "--params", safeJson({
    pageSize: 10,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
  })];
}

export async function buildWorkspaceContext({ prompt, profile }) {
  const settings = getProfileSettings(profile);
  if (!workspaceEnabled(settings)) {
    return null;
  }

  const services = requestedServices(prompt, settings);
  if (services.length === 0) {
    return null;
  }

  const gwsCommand = await findGwsCommand();
  if (!gwsCommand) {
    return "Google Workspace context was requested, but the gws CLI is not installed or was not found. Do not claim Workspace data was checked.";
  }

  const blocks = [];
  for (const service of services) {
    const args = commandForService(service);
    try {
      const output = await runGws(gwsCommand, args);
      blocks.push(`## ${service}\nCommand: gws ${args.join(" ")}\nResult:\n${truncate(output, 1800)}`);
    } catch (error) {
      blocks.push(`## ${service}\nWorkspace lookup failed: ${String(error?.message || error)}\nDo not claim ${service} data was checked successfully.`);
    }
  }

  if (blocks.length === 0) {
    return null;
  }

  return [
    "Google Workspace read-only context is available for this request.",
    "Use this context only as supporting information. Do not claim create/update/delete actions were completed.",
    "If the user asks to modify Calendar, Gmail, Drive, Docs, or Sheets, ask for confirmation and explain that write actions are not enabled in this runtime yet.",
    "",
    ...blocks,
  ].join("\n");
}
