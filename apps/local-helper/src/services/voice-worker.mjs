import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VOICE_WORKER_BASE_URL, VOICE_WORKER_HOST, VOICE_WORKER_PORT } from "../config.mjs";

const workerScript = fileURLToPath(new URL("../../../voice-worker/server.py", import.meta.url));

let voiceWorkerProcess = null;

function pythonCandidates() {
  return [
    { command: process.env.MIVA_PYTHON_BIN, argsPrefix: [] },
    { command: "python", argsPrefix: [] },
    { command: "py", argsPrefix: ["-3"] },
    { command: "python3", argsPrefix: [] },
  ].filter((candidate) => candidate.command);
}

async function fetchJson(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept": "application/json",
      },
    });
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson(url, payload, timeoutMs = 180000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload ?? {})
    });
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getVoiceWorkerStatus() {
  try {
    const response = await fetchJson(`${VOICE_WORKER_BASE_URL}/voice/status`);
    if (response.ok && response.data) {
      return {
        running: true,
        baseUrl: VOICE_WORKER_BASE_URL,
        workerScript,
        ...response.data,
      };
    }

    return {
      running: false,
      baseUrl: VOICE_WORKER_BASE_URL,
      workerScript,
      error: `Voice worker returned HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      running: false,
      baseUrl: VOICE_WORKER_BASE_URL,
      workerScript,
      error: String(error?.message || error),
    };
  }
}

export async function startVoiceWorker() {
  const current = await getVoiceWorkerStatus();
  if (current.running) {
    return {
      started: false,
      message: "MiVA Voice Worker is already running.",
      status: current,
    };
  }

  if (!existsSync(workerScript)) {
    throw new Error(`Voice worker script was not found at ${workerScript}`);
  }

  let lastError = null;
  for (const candidate of pythonCandidates()) {
    const args = [
      ...candidate.argsPrefix,
      workerScript,
      "--host",
      VOICE_WORKER_HOST,
      "--port",
      String(VOICE_WORKER_PORT),
    ];

    try {
      const child = spawn(candidate.command, args, {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
      voiceWorkerProcess = child;

      await new Promise((resolve) => setTimeout(resolve, 700));
      const nextStatus = await getVoiceWorkerStatus();
      if (nextStatus.running) {
        return {
          started: true,
          command: candidate.command,
          message: "MiVA Voice Worker started.",
          status: nextStatus,
        };
      }

      lastError = nextStatus.error || "Voice worker did not become ready.";
    } catch (error) {
      lastError = String(error?.message || error);
    }
  }

  throw new Error(`Unable to start MiVA Voice Worker. ${lastError || "No Python command worked."}`);
}

export async function synthesizeVoice(payload) {
  await startVoiceWorker();
  const response = await postJson(`${VOICE_WORKER_BASE_URL}/voice/tts`, payload);
  if (!response.ok || !response.data?.ok) {
    const message = response.data?.message || response.data?.error || `Voice worker returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.data;
}
