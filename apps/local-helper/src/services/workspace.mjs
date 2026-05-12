import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
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
  const fallbackSelected = selected.size
    ? selected
    : new Set(["gmail", "calendar", "drive", "docs", "sheets"]);
  const services = ["calendar", "gmail", "drive", "docs", "sheets"].filter((service) => (
    fallbackSelected.has(service) &&
    servicePolicyAllowsRead(settings, service) &&
    messageMentionsService(prompt, service)
  ));

  return services.slice(0, 3);
}

function gwsCandidates() {
  const candidates = [];
  if (env.GWS_BIN) {
    candidates.push({ command: env.GWS_BIN, argsPrefix: [], label: env.GWS_BIN });
  }
  if (env.APPDATA) {
    const globalRunJs = `${env.APPDATA}\\npm\\node_modules\\@googleworkspace\\cli\\run.js`;
    if (existsSync(globalRunJs)) {
      candidates.push({ command: "node", argsPrefix: [globalRunJs], label: globalRunJs });
    }
    candidates.push({ command: `${env.APPDATA}\\npm\\gws.cmd`, argsPrefix: [], label: `${env.APPDATA}\\npm\\gws.cmd` });
  }
  candidates.push({ command: "gws.cmd", argsPrefix: [], label: "gws.cmd" });
  candidates.push({ command: "gws", argsPrefix: [], label: "gws" });
  return candidates;
}

async function findGwsCommand() {
  for (const candidate of gwsCandidates()) {
    try {
      await execFileAsync(candidate.command, [...candidate.argsPrefix, "--version"], { timeout: 5000 });
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function runGws(command, args) {
  const { stdout, stderr } = await execFileAsync(command.command, [...command.argsPrefix, ...args], {
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

function extractGmailMessageIds(output) {
  try {
    const parsed = JSON.parse(output);
    const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
    return messages
      .map((message) => message?.id)
      .filter((id) => typeof id === "string" && id.trim())
      .slice(0, 5);
  } catch {
    return [];
  }
}

function extractDriveFileIds(output) {
  try {
    const parsed = JSON.parse(output);
    const files = Array.isArray(parsed?.files) ? parsed.files : [];
    return files
      .map((file) => ({
        id: typeof file?.id === "string" ? file.id : "",
        name: typeof file?.name === "string" ? file.name : "",
        modifiedTime: typeof file?.modifiedTime === "string" ? file.modifiedTime : "",
        webViewLink: typeof file?.webViewLink === "string" ? file.webViewLink : "",
      }))
      .filter((file) => file.id)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function summarizeGmailMessage(output) {
  try {
    const message = JSON.parse(output);
    const headers = Array.isArray(message?.payload?.headers) ? message.payload.headers : [];
    const headerMap = new Map(headers.map((header) => [String(header?.name || "").toLowerCase(), String(header?.value || "")]));
    return {
      id: message.id,
      threadId: message.threadId,
      from: headerMap.get("from") || "",
      subject: headerMap.get("subject") || "(no subject)",
      date: headerMap.get("date") || "",
      snippet: message.snippet || "",
    };
  } catch {
    return { raw: truncate(output, 600) };
  }
}

function extractDocsText(document) {
  const chunks = [];
  const content = Array.isArray(document?.body?.content) ? document.body.content : [];

  for (const block of content) {
    const elements = Array.isArray(block?.paragraph?.elements) ? block.paragraph.elements : [];
    for (const element of elements) {
      const text = element?.textRun?.content;
      if (typeof text === "string" && text.trim()) {
        chunks.push(text.trim());
      }
    }
  }

  return chunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function summarizeDocContent(output, file) {
  try {
    const document = JSON.parse(output);
    return {
      id: file.id,
      name: file.name || document.title || "(untitled)",
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      excerpt: truncate(extractDocsText(document), 1200),
    };
  } catch {
    return {
      id: file.id,
      name: file.name || "(untitled)",
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      excerpt: truncate(output, 600),
    };
  }
}

async function buildGmailContext(command) {
  const listArgs = commandForService("gmail");
  const listOutput = await runGws(command, listArgs);
  const ids = extractGmailMessageIds(listOutput);
  if (ids.length === 0) {
    return `Command: gws ${listArgs.join(" ")}\nResult:\n${truncate(listOutput, 1800)}`;
  }

  const summaries = [];
  for (const id of ids) {
    const getArgs = [
      "gmail",
      "users",
      "messages",
      "get",
      "--params",
      safeJson({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      }),
    ];
    const output = await runGws(command, getArgs);
    summaries.push(summarizeGmailMessage(output));
  }

  return [
    `Command: gws ${listArgs.join(" ")}`,
    "Recent Gmail messages:",
    truncate(JSON.stringify(summaries, null, 2), 2600),
  ].join("\n");
}

async function buildDocsContext(command) {
  const listArgs = commandForService("docs");
  const listOutput = await runGws(command, listArgs);
  const files = extractDriveFileIds(listOutput);
  if (files.length === 0) {
    return `Command: gws ${listArgs.join(" ")}\nResult:\n${truncate(listOutput, 1800)}`;
  }

  const summaries = [];
  for (const file of files) {
    const getArgs = [
      "docs",
      "documents",
      "get",
      "--params",
      safeJson({
        documentId: file.id,
      }),
    ];
    const output = await runGws(command, getArgs);
    summaries.push(summarizeDocContent(output, file));
  }

  return [
    `Command: gws ${listArgs.join(" ")}`,
    "Recent Google Docs documents and excerpts:",
    truncate(JSON.stringify(summaries, null, 2), 4200),
  ].join("\n");
}

export async function buildWorkspaceContext({ prompt, profile }) {
  const settings = getProfileSettings(profile);
  if (!workspaceEnabled(settings)) {
    console.info("[workspace] skipped: workspace cli disabled for this assistant");
    return null;
  }

  const services = requestedServices(prompt, settings);
  if (services.length === 0) {
    console.info("[workspace] skipped: no selected workspace service matched the prompt");
    return null;
  }

  const gwsCommand = await findGwsCommand();
  if (!gwsCommand) {
    console.warn("[workspace] gws command not found");
    return "Google Workspace context was requested, but the gws CLI is not installed or was not found. Do not claim Workspace data was checked.";
  }

  console.info(`[workspace] using ${gwsCommand.label} for services: ${services.join(", ")}`);
  const blocks = [];
  for (const service of services) {
    const args = commandForService(service);
    try {
      const output = service === "gmail"
        ? await buildGmailContext(gwsCommand)
        : service === "docs"
          ? await buildDocsContext(gwsCommand)
          : await runGws(gwsCommand, args);
      console.info(`[workspace] ${service} lookup completed`);
      blocks.push(`## ${service}\n${truncate(output, service === "docs" ? 4600 : service === "gmail" ? 3200 : 1800)}`);
    } catch (error) {
      console.warn(`[workspace] ${service} lookup failed: ${String(error?.message || error)}`);
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
