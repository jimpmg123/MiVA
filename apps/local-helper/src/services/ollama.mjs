import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
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

export function isModelInstalled(modelName, installedModels) {
  return installedModels.some((model) => normalizeModelName(model) === modelName);
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
