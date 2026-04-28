import { spawn } from "node:child_process";
import { modelCatalog } from "../config.mjs";
import { readJson, sendJson, writeCorsHeaders } from "../utils/http.mjs";
import {
  detectWinget,
  getAllowedModelNames,
  getFullModelState,
  getInstalledModels,
  getOllamaStatus,
  isAllowedModel,
  isModelInstalled,
  ollamaFetch,
  startOllama
} from "../services/ollama.mjs";

export function sendOllamaUnavailable(res, origin, status) {
  sendJson(res, 503, {
    error: "OLLAMA_UNAVAILABLE",
    message: status.installed
      ? "Ollama is installed but not running."
      : "Ollama is not installed or was not found in PATH.",
    status
  }, origin);
}

export function handleCatalog(req, res, origin) {
  sendJson(res, 200, {
    models: modelCatalog
  }, origin);
}

export async function handleModels(req, res, origin) {
  const state = await getFullModelState();
  sendJson(res, 200, {
    ollama: state.status,
    models: state.installedModels,
    catalog: state.catalog
  }, origin);
}

export async function handleModelPull(req, res, origin) {
  const { model } = await readJson(req);
  if (!isAllowedModel(model)) {
    sendJson(res, 400, {
      error: "MODEL_NOT_ALLOWED",
      allowedModels: getAllowedModelNames()
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

export async function handleOllamaStart(req, res, origin) {
  sendJson(res, 200, await startOllama(), origin);
}

export async function handleOllamaInstall(req, res, origin) {
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
