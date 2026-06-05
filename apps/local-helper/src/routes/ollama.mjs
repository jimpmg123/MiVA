import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { modelCatalog } from "../config.mjs";
import { readJson, sendJson, writeCorsHeaders } from "../utils/http.mjs";
import {
  cleanupCancelledPull,
  deleteModel,
  detectWinget,
  getAllowedModelNames,
  getFullModelState,
  getInstalledModels,
  getOllamaStatus,
  isAllowedModel,
  isModelInstalled,
  ollamaFetch,
  resolveInstalledModelName,
  startOllama,
  waitUntilModelRemoved
} from "../services/ollama.mjs";

let activeModelPull = null;

function agentDebugLog(location, message, data, hypothesisId) {
  try {
    const logPath = path.resolve(fileURLToPath(new URL("../../../../debug-e45fd0.log", import.meta.url)));
    appendFileSync(logPath, `${JSON.stringify({ sessionId: "e45fd0", location, message, data, hypothesisId, timestamp: Date.now() })}\n`);
  } catch {
    // ignore debug logging failures
  }
}

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

function captureActivePullDigests(model) {
  if (activeModelPull?.model !== model) {
    return [];
  }

  return activeModelPull.digests ? [...activeModelPull.digests] : [];
}

function clearActiveModelPull(model) {
  if (activeModelPull?.model === model) {
    activeModelPull = null;
  }
}

export async function handleModelDelete(req, res, origin) {
  const { model } = await readJson(req);
  if (!isAllowedModel(model)) {
    sendJson(res, 400, {
      error: "MODEL_NOT_ALLOWED",
      allowedModels: getAllowedModelNames()
    }, origin);
    return;
  }

  if (activeModelPull?.model === model) {
    activeModelPull.abortController.abort();
    activeModelPull = null;
  }

  const status = await getOllamaStatus();
  if (!status.running) {
    sendOllamaUnavailable(res, origin, status);
    return;
  }

  const installedBefore = await getInstalledModels();
  agentDebugLog("ollama.mjs:handleModelDelete:before", "delete requested", {
    model,
    installedBefore: installedBefore.models.map((entry) => entry?.name || entry?.model).filter(Boolean),
    running: status.running
  }, "D");

  if (!isModelInstalled(model, installedBefore.models)) {
    agentDebugLog("ollama.mjs:handleModelDelete:alreadyRemoved", "model not installed", { model }, "D");
    sendJson(res, 200, {
      ok: true,
      model,
      alreadyRemoved: true,
      error: null
    }, origin);
    return;
  }

  const resolvedModel = resolveInstalledModelName(model, installedBefore.models);
  const deleteResult = await deleteModel(resolvedModel);
  agentDebugLog("ollama.mjs:handleModelDelete:deleteResult", "ollama delete api result", {
    model,
    resolvedModel,
    deleteResult
  }, "D");

  if (!deleteResult.ok) {
    sendJson(res, 502, {
      ok: false,
      model,
      resolvedModel,
      error: deleteResult.error || `Failed to delete ${resolvedModel}.`,
      status: deleteResult.status
    }, origin);
    return;
  }

  const removed = await waitUntilModelRemoved(model);
  agentDebugLog("ollama.mjs:handleModelDelete:removedCheck", "post-delete verification", {
    model,
    resolvedModel,
    removed
  }, "D-E");

  if (!removed) {
    sendJson(res, 502, {
      ok: false,
      model,
      resolvedModel,
      error: `Model ${model} is still present after delete.`,
      status: deleteResult.status
    }, origin);
    return;
  }

  sendJson(res, 200, {
    ok: true,
    model,
    resolvedModel,
    error: null,
    status: deleteResult.status
  }, origin);
}

export async function handleModelPullCancel(req, res, origin) {
  const { model } = await readJson(req);
  if (!isAllowedModel(model)) {
    sendJson(res, 400, {
      error: "MODEL_NOT_ALLOWED",
      allowedModels: getAllowedModelNames()
    }, origin);
    return;
  }

  const digests = captureActivePullDigests(model);

  if (activeModelPull?.model === model) {
    activeModelPull.abortController.abort();
    activeModelPull = null;
  }

  const cleanup = await cleanupCancelledPull(model, { digests });
  sendJson(res, 200, {
    cancelled: true,
    model,
    cleanup
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

  const abortController = new AbortController();
  activeModelPull = {
    model,
    abortController,
    digests: new Set()
  };

  let clientClosed = false;
  req.on("close", () => {
    clientClosed = true;
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
    const digests = captureActivePullDigests(model);
    clearActiveModelPull(model);
    void cleanupCancelledPull(model, { digests });
  });

  writeCorsHeaders(res, origin);
  res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache"
  });

  try {
    const response = await ollamaFetch("/api/pull", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: model,
        stream: true
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      res.write(JSON.stringify({
        error: "OLLAMA_PULL_FAILED",
        status: response.status
      }) + "\n");
      res.end();
      return;
    }

    if (!response.body) {
      res.write(JSON.stringify({ error: "NO_STREAM" }) + "\n");
      res.end();
      return;
    }

    let pullBuffer = "";

    for await (const chunk of response.body) {
      if (clientClosed || abortController.signal.aborted) {
        break;
      }

      pullBuffer += Buffer.from(chunk).toString("utf8");
      const lines = pullBuffer.split("\n");
      pullBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const event = JSON.parse(line);
          if (event?.digest && activeModelPull?.model === model) {
            activeModelPull.digests.add(event.digest);
          }
        } catch {
          // Ignore malformed pull stream lines.
        }
      }

      res.write(chunk);
    }

    if (abortController.signal.aborted) {
      const digests = captureActivePullDigests(model);
      await cleanupCancelledPull(model, { digests });
    }
  } catch (error) {
    if (!clientClosed && !res.writableEnded) {
      res.write(JSON.stringify({
        status: "error",
        message: error.message
      }) + "\n");
    }

    if (abortController.signal.aborted) {
      const digests = captureActivePullDigests(model);
      await cleanupCancelledPull(model, { digests });
    }
  } finally {
    clearActiveModelPull(model);
    if (!res.writableEnded) {
      res.end();
    }
  }
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
