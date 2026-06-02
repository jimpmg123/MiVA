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

function tailLog(value) {
  return String(value || "")
    .split(/\r?\n/)
    .slice(-80)
    .join("\n")
    .trim();
}

function runProcess(command, args, timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} timed out after ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        code,
        command,
        args,
        stdout: tailLog(stdout),
        stderr: tailLog(stderr),
      });
    });
  });
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

export async function installKokoroDependencies() {
  let status = null;
  try {
    const startResult = await startVoiceWorker();
    status = startResult.status;
  } catch {
    status = await getVoiceWorkerStatus();
  }

  const packages = ["kokoro>=0.9.4", "soundfile", "numpy", "pyopenjtalk", "misaki[ja]", "fugashi[unidic-lite]"];
  const candidates = status?.python?.executable
    ? [{ command: status.python.executable, argsPrefix: [] }]
    : pythonCandidates();

  let lastResult = null;
  for (const candidate of candidates) {
    const args = [...candidate.argsPrefix, "-m", "pip", "install", ...packages];
    try {
      const result = await runProcess(candidate.command, args);
      lastResult = result;
      if (result.ok) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          ok: true,
          message: "Kokoro TTS dependencies installed for the active Python runtime.",
          packages,
          command: candidate.command,
          stdout: result.stdout,
          stderr: result.stderr,
          status: await getVoiceWorkerStatus(),
        };
      }
    } catch (error) {
      lastResult = {
        ok: false,
        command: candidate.command,
        args,
        stderr: String(error?.message || error),
      };
    }
  }

  throw new Error(
    `Unable to install Kokoro TTS dependencies. ${
      lastResult?.stderr || lastResult?.stdout || "No Python command worked."
    }`
  );
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
