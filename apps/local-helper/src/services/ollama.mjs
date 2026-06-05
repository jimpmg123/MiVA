import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { readdir, rm, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { allowedModels, modelCatalog, OLLAMA_BASE_URL } from "../config.mjs";

const execFileAsync = promisify(execFile);

export async function ollamaFetch(path, options = {}) {
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

export async function detectOllamaCli() {
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

export function normalizeModelName(model) {
  return model?.name || model?.model || "";
}

export function modelNamesMatch(left, right) {
  const a = String(left || "").trim().toLowerCase();
  const b = String(right || "").trim().toLowerCase();
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }

  return a.startsWith(`${b}:`) || b.startsWith(`${a}:`);
}

export function isModelInstalled(modelName, installedModels) {
  return installedModels.some((model) => modelNamesMatch(normalizeModelName(model), modelName));
}

export function resolveInstalledModelName(requestedModel, installedModels) {
  const match = installedModels
    .map(normalizeModelName)
    .find((name) => modelNamesMatch(name, requestedModel));

  return match || requestedModel;
}

export async function waitUntilModelRemoved(modelName, attempts = 6, delayMs = 300) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const installed = await getInstalledModels();
    if (!isModelInstalled(modelName, installed.models)) {
      return true;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

export async function getInstalledModels() {
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

export async function getOllamaStatus() {
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

export async function startOllama() {
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

export async function detectWinget() {
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

export function catalogWithInstallState(installedModels) {
  return modelCatalog.map((model) => ({
    ...model,
    installed: isModelInstalled(model.ollamaName, installedModels)
  }));
}

export async function getFullModelState() {
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

export function isAllowedModel(model) {
  return typeof model === "string" && allowedModels.has(model);
}

export function getAllowedModelNames() {
  return Array.from(allowedModels);
}

async function requestOllamaDelete(modelName, method) {
  return ollamaFetch("/api/delete", {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: modelName
    }),
    signal: AbortSignal.timeout(30000)
  });
}

function resolveOllamaModelsDir() {
  return process.env.OLLAMA_MODELS || path.join(homedir(), ".ollama", "models");
}

function splitModelRef(modelName) {
  const [name, tag = "latest"] = String(modelName || "").split(":");
  return { name, tag };
}

function digestMatchesBlobFile(digest, fileName) {
  const normalized = String(digest || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const hash = normalized.replace(/^sha256:/, "");
  const lowered = fileName.toLowerCase();
  return lowered.includes(hash) || lowered.includes(`sha256-${hash}`);
}

async function removePartialBlobArtifacts(digests = []) {
  const blobsDir = path.join(resolveOllamaModelsDir(), "blobs");
  const removed = [];

  try {
    const files = await readdir(blobsDir);
    for (const file of files) {
      if (!file.includes("-partial")) {
        continue;
      }

      const matchesDigest = digests.length === 0
        || digests.some((digest) => digestMatchesBlobFile(digest, file));

      if (!matchesDigest) {
        continue;
      }

      await unlink(path.join(blobsDir, file));
      removed.push(file);
    }
  } catch {
    // Best-effort cleanup for interrupted pulls.
  }

  return removed;
}

async function removeModelManifestIfPresent(modelName) {
  const { name, tag } = splitModelRef(modelName);
  const manifestPath = path.join(
    resolveOllamaModelsDir(),
    "manifests",
    "registry.ollama.ai",
    "library",
    name,
    tag
  );

  try {
    await rm(manifestPath, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function runOllamaPruneIfAvailable() {
  const cli = await detectOllamaCli();
  if (!cli.installed || !cli.command) {
    return { attempted: false, ok: false };
  }

  try {
    await execFileAsync(cli.command, ["prune"], {
      timeout: 30000,
      windowsHide: true
    });
    return { attempted: true, ok: true };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: error.message
    };
  }
}

export async function cleanupCancelledPull(modelName, options = {}) {
  const digests = Array.isArray(options.digests) ? options.digests : [];
  const waitMs = Number.isFinite(options.waitMs) ? options.waitMs : 500;

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const deleteResult = await deleteModel(modelName);
  const manifestRemoved = await removeModelManifestIfPresent(modelName);
  const removedPartialBlobs = await removePartialBlobArtifacts(digests);
  const prune = await runOllamaPruneIfAvailable();

  return {
    deleted: deleteResult.ok,
    attempted: true,
    error: deleteResult.error,
    manifestRemoved,
    removedPartialBlobs,
    prune
  };
}

export async function deleteModel(modelName) {
  try {
    let response = await requestOllamaDelete(modelName, "DELETE");

    if (response.status === 405) {
      response = await ollamaFetch("/api/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: modelName,
          model: modelName
        }),
        signal: AbortSignal.timeout(30000)
      });
    }

    let error = null;
    if (!response.ok) {
      try {
        const payload = await response.json();
        error = payload?.error || payload?.message || `Ollama returned HTTP ${response.status}`;
      } catch {
        error = `Ollama returned HTTP ${response.status}`;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      error
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

export async function getOllamaAnswer(model, messages) {
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
