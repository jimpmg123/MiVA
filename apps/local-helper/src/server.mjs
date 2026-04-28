import http from "node:http";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { lightweightModels } from "../../../packages/shared/src/index.js";

function loadEnvFile() {
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));

  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [rawKey, ...rawValueParts] = trimmed.split("=");
      const key = rawKey.trim();
      const value = rawValueParts.join("=").trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional. Missing keys are reported by provider handlers.
  }
}

loadEnvFile();

const HELPER_PORT = Number(process.env.MIVA_HELPER_PORT || 43110);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OPENAI_DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";
const GEMINI_DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";
const execFileAsync = promisify(execFile);
const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));

const modelCatalog = lightweightModels;
const allowedModels = new Set(modelCatalog.map((model) => model.ollamaName));

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  `http://localhost:${HELPER_PORT}`,
  `http://127.0.0.1:${HELPER_PORT}`
]);

const staticContentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ico": "image/x-icon"
};

function sendJson(res, statusCode, data, origin) {
  const body = JSON.stringify(data, null, 2);
  writeCorsHeaders(res, origin);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function writeCorsHeaders(res, origin) {
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("access-control-allow-origin", origin);
  }
  res.setHeader("vary", "origin");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,x-miva-token");
}

async function serveStatic(req, res, url) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolve(PUBLIC_DIR, `.${decodeURIComponent(pathname)}`);
  const root = resolve(PUBLIC_DIR);

  if (!filePath.startsWith(root)) {
    sendJson(res, 403, {
      error: "FORBIDDEN"
    }, req.headers.origin);
    return true;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "content-type": staticContentTypes[extname(filePath)] || "application/octet-stream",
      "content-length": content.length
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
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

async function ollamaFetch(path, options = {}) {
  return fetch(`${OLLAMA_BASE_URL}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(5000)
  });
}

function getOllamaCliCandidates() {
  return [
    process.env.OLLAMA_BIN,
    "ollama",
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe` : null,
    process.env.PROGRAMFILES ? `${process.env.PROGRAMFILES}\\Ollama\\ollama.exe` : null
  ].filter(Boolean);
}

async function detectOllamaCli() {
  const errors = [];

  for (const candidate of getOllamaCliCandidates()) {
    try {
      const result = await execFileAsync(candidate, ["--version"], {
        timeout: 3000,
        windowsHide: true
      });
      return {
        installed: true,
        command: candidate,
        version: result.stdout.trim() || result.stderr.trim()
      };
    } catch (error) {
      errors.push({
        command: candidate,
        message: error.message
      });
    }
  }

  return {
    installed: false,
    command: null,
    error: errors.at(-1)?.message || "Ollama CLI was not found."
  };
}

function normalizeModelName(model) {
  return model?.name || model?.model || "";
}

function isModelInstalled(modelName, installedModels) {
  return installedModels.some((model) => normalizeModelName(model) === modelName);
}

async function getInstalledModels() {
  try {
    const response = await ollamaFetch("/api/tags");
    if (!response.ok) {
      return {
        ok: false,
        running: false,
        status: response.status,
        models: []
      };
    }

    const data = await response.json();
    return {
      ok: true,
      running: true,
      status: response.status,
      models: data.models || []
    };
  } catch (error) {
    return {
      ok: false,
      running: false,
      models: [],
      error: error.message
    };
  }
}

async function getOllamaStatus() {
  const [cli, installedModels] = await Promise.all([
    detectOllamaCli(),
    getInstalledModels()
  ]);

  return {
    installed: cli.installed,
    running: installedModels.running,
    command: cli.command,
    version: cli.version,
    status: installedModels.status,
    installedModelCount: installedModels.models.length,
    installedModels: installedModels.models.map(normalizeModelName).filter(Boolean),
    baseUrl: OLLAMA_BASE_URL,
    error: installedModels.error || cli.error
  };
}

async function startOllama() {
  const current = await getInstalledModels();
  if (current.running) {
    return {
      started: false,
      running: true,
      message: "Ollama is already running."
    };
  }

  const cli = await detectOllamaCli();
  if (!cli.installed) {
    return {
      started: false,
      running: false,
      error: "OLLAMA_NOT_INSTALLED",
      message: "Ollama CLI was not found."
    };
  }

  const child = spawn(cli.command, ["serve"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();

  await new Promise((resolve) => setTimeout(resolve, 1500));
  const status = await getInstalledModels();

  return {
    started: true,
    running: status.running,
    command: cli.command,
    error: status.error
  };
}

async function detectWinget() {
  try {
    const result = await execFileAsync("winget", ["--version"], {
      timeout: 3000,
      windowsHide: true
    });

    return {
      installed: true,
      version: result.stdout.trim()
    };
  } catch (error) {
    return {
      installed: false,
      error: error.message
    };
  }
}

function catalogWithInstallState(installedModels) {
  return modelCatalog.map((model) => ({
    ...model,
    installed: isModelInstalled(model.ollamaName, installedModels)
  }));
}

function sendOllamaUnavailable(res, origin, status) {
  sendJson(res, 503, {
    error: "OLLAMA_UNAVAILABLE",
    message: status.installed
      ? "Ollama is installed but not running."
      : "Ollama is not installed or was not found in PATH.",
    status
  }, origin);
}

async function getFullModelState() {
  const [status, installed] = await Promise.all([
    getOllamaStatus(),
    getInstalledModels()
  ]);

  return {
    status,
    installedModels: installed.models,
    catalog: catalogWithInstallState(installed.models)
  };
}

function isAllowedModel(model) {
  return typeof model === "string" && allowedModels.has(model);
}

function getCurrentDateLabel(locale) {
  const language = locale === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(language, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date());
}

function buildSystemPrompt({ locale = "ko", provider = "ollama", model = "" } = {}) {
  const languageInstruction = locale === "ko"
    ? "Always answer in natural Korean unless the user explicitly asks for another language. Do not mix in English, Japanese, Chinese, Thai, or other languages unless needed for names, commands, or technical terms."
    : "Always answer in clear English unless the user explicitly asks for another language.";

  const providerInstruction = provider === "ollama"
    ? "You are running as a local model. Prefer concise answers because the model may be lightweight."
    : "You are running through a cloud provider. Be accurate, practical, and transparent when external or paid provider behavior matters.";

  return [
    "You are MiVA, the user's personal AI assistant.",
    languageInstruction,
    "Be practical, concise, and direct. If you are unsure, say so instead of inventing facts.",
    `Current date and time in Korea: ${getCurrentDateLabel(locale)}.`,
    `Active provider: ${provider}. Active model: ${model || "unknown"}.`,
    providerInstruction
  ].join("\n");
}

function normalizeChatMessages(body, systemPrompt) {
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: ["system", "assistant", "user"].includes(message.role) ? message.role : "user",
      content: message.content.trim()
    }))
    .filter((message) => message.content);

  if (typeof body.prompt === "string" && body.prompt.trim()) {
    messages.push({
      role: "user",
      content: body.prompt.trim()
    });
  }

  const withoutSystem = messages.filter((message) => message.role !== "system");
  return [
    {
      role: "system",
      content: systemPrompt
    },
    ...withoutSystem
  ];
}

function getLastUserMessage(messages) {
  return [...messages].reverse().find((message) => message.role === "user");
}

function sendProviderMissingKey(res, origin, provider) {
  sendJson(res, 400, {
    error: "PROVIDER_KEY_REQUIRED",
    provider,
    message: `${provider} API key is required. Set it in apps/local-helper/.env or pass an app override key.`
  }, origin);
}

function getProviderApiKey(provider, overrideKey) {
  if (typeof overrideKey === "string" && overrideKey.trim()) {
    return overrideKey.trim();
  }

  if (provider === "openai") {
    return process.env.OPENAI_API_KEY || "";
  }

  if (provider === "gemini") {
    return process.env.GEMINI_API_KEY || "";
  }

  return "";
}

async function sendOllamaStream(res, origin, model, messages) {
  const response = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    }),
    signal: AbortSignal.timeout(1000 * 60 * 10)
  });

  writeCorsHeaders(res, origin);
  res.writeHead(response.ok ? 200 : 502, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache"
  });

  if (!response.body) {
    res.end(JSON.stringify({ error: "NO_STREAM" }) + "\n");
    return;
  }

  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}

async function getOllamaAnswer(model, messages) {
  const response = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    }),
    signal: AbortSignal.timeout(1000 * 60 * 10)
  });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const answer = data?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("Ollama returned an empty response.");
  }

  return answer.trim();
}

async function getOpenAiAnswer({ model, messages, apiKey }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4
    }),
    signal: AbortSignal.timeout(1000 * 60 * 3)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI returned HTTP ${response.status}`);
  }

  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return answer.trim();
}

function toGeminiContents(messages) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));
}

async function getGeminiAnswer({ model, messages, systemPrompt, apiKey }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.4
        }
      }),
      signal: AbortSignal.timeout(1000 * 60 * 3)
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini returned HTTP ${response.status}`);
  }

  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Gemini returned an empty response.");
  }

  return answer;
}

async function handleModels(req, res, origin) {
  const state = await getFullModelState();
  sendJson(res, 200, {
    ollama: state.status,
    models: state.installedModels,
    catalog: state.catalog
  }, origin);
}

async function handleModelPull(req, res, origin) {
  const { model } = await readJson(req);
  if (!isAllowedModel(model)) {
    sendJson(res, 400, {
      error: "MODEL_NOT_ALLOWED",
      allowedModels: Array.from(allowedModels)
    }, origin);
    return;
  }

  const status = await getOllamaStatus();
  if (!status.running) {
    sendOllamaUnavailable(res, origin, status);
    return;
  }

  const installed = await getInstalledModels();
  if (isModelInstalled(model, installed.models)) {
    writeCorsHeaders(res, origin);
    res.writeHead(200, {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache"
    });
    res.end(JSON.stringify({
      status: "already installed",
      model
    }) + "\n");
    return;
  }

  const response = await ollamaFetch("/api/pull", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      name: model,
      stream: true
    }),
    signal: AbortSignal.timeout(1000 * 60 * 60)
  });

  writeCorsHeaders(res, origin);
  res.writeHead(response.ok ? 200 : 502, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache"
  });

  if (!response.body) {
    res.end(JSON.stringify({ error: "NO_STREAM" }) + "\n");
    return;
  }

  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}

async function handleChat(req, res, origin) {
  const body = await readJson(req);
  const provider = typeof body.provider === "string" ? body.provider : "ollama";
  const model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : provider === "openai"
        ? OPENAI_DEFAULT_MODEL
        : provider === "gemini"
          ? GEMINI_DEFAULT_MODEL
          : "llama3.2:3b";
  const locale = body.locale === "en" ? "en" : "ko";

  if (!["ollama", "openai", "gemini"].includes(provider)) {
    sendJson(res, 400, {
      error: "PROVIDER_NOT_ALLOWED",
      allowedProviders: ["ollama", "openai", "gemini"]
    }, origin);
    return;
  }

  const systemPrompt = buildSystemPrompt({ locale, provider, model });
  const messages = normalizeChatMessages(body, systemPrompt);
  if (!getLastUserMessage(messages)) {
    sendJson(res, 400, {
      error: "MESSAGES_REQUIRED"
    }, origin);
    return;
  }

  if (provider === "ollama") {
    if (!isAllowedModel(model)) {
      sendJson(res, 400, {
        error: "MODEL_NOT_ALLOWED",
        allowedModels: Array.from(allowedModels)
      }, origin);
      return;
    }

    const status = await getOllamaStatus();
    if (!status.running) {
      sendOllamaUnavailable(res, origin, status);
      return;
    }

    const installed = await getInstalledModels();
    if (!isModelInstalled(model, installed.models)) {
      sendJson(res, 409, {
        error: "MODEL_NOT_INSTALLED",
        message: `${model} is not installed yet.`,
        model
      }, origin);
      return;
    }

    if (body.stream === true) {
      await sendOllamaStream(res, origin, model, messages);
      return;
    }

    const answer = await getOllamaAnswer(model, messages);
    sendJson(res, 200, {
      ok: true,
      provider,
      model,
      answer
    }, origin);
    return;
  }

  const apiKey = getProviderApiKey(provider, body.apiKey);
  if (!apiKey) {
    sendProviderMissingKey(res, origin, provider);
    return;
  }

  const answer = provider === "openai"
    ? await getOpenAiAnswer({ model, messages, apiKey })
    : await getGeminiAnswer({ model, messages, systemPrompt, apiKey });

  sendJson(res, 200, {
    ok: true,
    provider,
    model,
    answer
  }, origin);
}

function handleCatalog(req, res, origin) {
  sendJson(res, 200, {
    models: modelCatalog
  }, origin);
}

async function handleOllamaStart(req, res, origin) {
  sendJson(res, 200, await startOllama(), origin);
}

async function handleOllamaInstall(req, res, origin) {
  const status = await getOllamaStatus();
  if (status.installed) {
    sendJson(res, 200, {
      installed: true,
      message: "Ollama is already installed.",
      status
    }, origin);
    return;
  }

  const winget = await detectWinget();
  if (!winget.installed) {
    sendJson(res, 501, {
      error: "WINGET_NOT_AVAILABLE",
      message: "winget is not available on this Windows system.",
      fallbackUrl: "https://ollama.com/download/windows",
      winget
    }, origin);
    return;
  }

  writeCorsHeaders(res, origin);
  res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache"
  });

  res.write(JSON.stringify({
    status: "starting",
    message: "Starting Ollama installation through winget."
  }) + "\n");

  const child = spawn("winget", [
    "install",
    "--id",
    "Ollama.Ollama",
    "--source",
    "winget",
    "--accept-package-agreements",
    "--accept-source-agreements"
  ], {
    windowsHide: false
  });

  child.stdout.on("data", (chunk) => {
    res.write(JSON.stringify({
      status: "output",
      stream: "stdout",
      message: chunk.toString("utf8")
    }) + "\n");
  });

  child.stderr.on("data", (chunk) => {
    res.write(JSON.stringify({
      status: "output",
      stream: "stderr",
      message: chunk.toString("utf8")
    }) + "\n");
  });

  child.on("error", (error) => {
    res.write(JSON.stringify({
      status: "error",
      message: error.message
    }) + "\n");
    res.end();
  });

  child.on("close", async (code) => {
    res.write(JSON.stringify({
      status: code === 0 ? "success" : "failed",
      code
    }) + "\n");

    const nextStatus = await getOllamaStatus();
    res.write(JSON.stringify({
      status: "checked",
      ollama: nextStatus
    }) + "\n");
    res.end();
  });
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
        service: "miva-local-helper",
        port: HELPER_PORT
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/ollama/status") {
      sendJson(res, 200, await getOllamaStatus(), origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/ollama/start") {
      await handleOllamaStart(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/ollama/install") {
      await handleOllamaInstall(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/catalog/models") {
      handleCatalog(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/models") {
      await handleModels(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/models/pull") {
      await handleModelPull(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      await handleChat(req, res, origin);
      return;
    }

    sendJson(res, 404, {
      error: "NOT_FOUND",
      path: url.pathname
    }, origin);
  } catch (error) {
    sendJson(res, 500, {
      error: "LOCAL_HELPER_ERROR",
      message: error.message
    }, origin);
  }

  if (req.method === "GET" && await serveStatic(req, res, url)) {
    return;
  }
});

server.listen(HELPER_PORT, () => {
  console.log(`MiVA Local Helper listening on http://localhost:${HELPER_PORT}`);
  console.log(`Ollama base URL: ${OLLAMA_BASE_URL}`);
});
