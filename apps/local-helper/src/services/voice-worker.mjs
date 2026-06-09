import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOICE_WORKER_BASE_URL, VOICE_WORKER_HOST, VOICE_WORKER_PORT } from "../config.mjs";

const workerScript = fileURLToPath(new URL("../../../voice-worker/server.py", import.meta.url));

let voiceWorkerProcess = null;
let preferredVoicePython = null;

function pythonCandidates(preferredExecutable = null) {
  const userHome = process.env.USERPROFILE || process.env.HOME || "";
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    { command: preferredExecutable, argsPrefix: [] },
    { command: preferredVoicePython, argsPrefix: [] },
    { command: process.env.MIVA_PYTHON_BIN, argsPrefix: [] },
    { command: "py", argsPrefix: ["-3.12"] },
    {
      command: localAppData
        ? path.join(localAppData, "Programs", "Python", "Python312", "python.exe")
        : null,
      argsPrefix: [],
    },
    ...["miniforge3", "miniconda3", "anaconda3"].map((distribution) => ({
      command: userHome ? path.join(userHome, distribution, "python.exe") : null,
      argsPrefix: [],
    })),
    { command: "python", argsPrefix: [] },
    { command: "python3", argsPrefix: [] },
  ].filter((candidate) => candidate.command);

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${String(candidate.command).toLowerCase()}|${candidate.argsPrefix.join(" ")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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

function normalizeExecutable(value) {
  return path.resolve(String(value || "")).toLowerCase();
}

function sameExecutable(left, right) {
  return Boolean(left && right) && normalizeExecutable(left) === normalizeExecutable(right);
}

async function inspectPythonCandidate(candidate) {
  const result = await runProcess(candidate.command, [
    ...candidate.argsPrefix,
    "-c",
    "import json,platform,sys; print(json.dumps({'executable': sys.executable, 'version': platform.python_version()}))",
  ], 10000);

  if (!result.ok) {
    return null;
  }

  try {
    const info = JSON.parse(result.stdout.split(/\r?\n/).at(-1));
    const [major, minor] = String(info.version || "").split(".").map(Number);
    if (major !== 3 || minor !== 12 || !info.executable) {
      return null;
    }
    return {
      command: info.executable,
      argsPrefix: [],
      version: info.version,
    };
  } catch {
    return null;
  }
}

async function findPython312(preferredExecutable = null) {
  for (const candidate of pythonCandidates(preferredExecutable)) {
    try {
      const inspected = await inspectPythonCandidate(candidate);
      if (inspected) {
        preferredVoicePython = inspected.command;
        return inspected;
      }
    } catch {
      // Continue until a compatible Python 3.12 runtime is found.
    }
  }

  return null;
}

async function findVoiceWorkerPid(status) {
  const reportedPid = Number(status?.pid || voiceWorkerProcess?.pid || 0);
  if (reportedPid > 0) {
    return reportedPid;
  }

  if (process.platform !== "win32") {
    return 0;
  }

  try {
    const result = await runProcess("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-NetTCPConnection -LocalPort ${VOICE_WORKER_PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)`,
    ], 10000);
    return Number(result.stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function stopVoiceWorker(status) {
  const pid = await findVoiceWorkerPid(status);
  if (pid > 0) {
    try {
      process.kill(pid);
    } catch (error) {
      if (error?.code !== "ESRCH") {
        throw error;
      }
    }
  }
  voiceWorkerProcess = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const nextStatus = await getVoiceWorkerStatus();
    if (!nextStatus.running) {
      return;
    }
  }

  throw new Error("Unable to stop the incompatible Python voice worker.");
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

export async function startVoiceWorker({ pythonExecutable = null, forceRestart = false } = {}) {
  const candidate = await findPython312(pythonExecutable);
  if (!candidate) {
    throw new Error("Python 3.12 is required for the MiVA Voice Worker and Kokoro TTS.");
  }

  const current = await getVoiceWorkerStatus();
  if (current.running) {
    if (!forceRestart && sameExecutable(current.python?.executable, candidate.command)) {
      return {
        started: false,
        command: candidate.command,
        message: "MiVA Voice Worker is already running with Python 3.12.",
        status: current,
      };
    }
    await stopVoiceWorker(current);
  }

  if (!existsSync(workerScript)) {
    throw new Error(`Voice worker script was not found at ${workerScript}`);
  }

  const args = [
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
    if (nextStatus.running && sameExecutable(nextStatus.python?.executable, candidate.command)) {
      return {
        started: true,
        command: candidate.command,
        message: "MiVA Voice Worker started with Python 3.12.",
        status: nextStatus,
      };
    }

    throw new Error(nextStatus.error || "Voice worker did not become ready with Python 3.12.");
  } catch (error) {
    voiceWorkerProcess = null;
    throw new Error(`Unable to start MiVA Voice Worker with Python 3.12. ${String(error?.message || error)}`);
  }
}

export async function installKokoroDependencies({ pythonExecutable = null } = {}) {
  const candidate = await findPython312(pythonExecutable);
  if (!candidate) {
    throw new Error("Python 3.12 is required before installing Kokoro TTS.");
  }
  const packages = ["kokoro>=0.9.4", "soundfile", "numpy", "pyopenjtalk", "misaki[ja]", "fugashi[unidic-lite]"];
  const args = ["-m", "pip", "install", ...packages];
  const result = await runProcess(candidate.command, args);
  if (!result.ok) {
    throw new Error(
      `Unable to install Kokoro TTS dependencies with Python 3.12. ${
        result.stderr || result.stdout || "pip failed without output."
      }`
    );
  }

  const worker = await startVoiceWorker({
    pythonExecutable: candidate.command,
    forceRestart: true,
  });
  return {
    ok: true,
    message: "Kokoro TTS dependencies installed with Python 3.12.",
    packages,
    command: candidate.command,
    stdout: result.stdout,
    stderr: result.stderr,
    status: worker.status,
  };
}

export async function installDocumentDependencies() {
  const python = await findPython312();

  const packages = ["pandas", "openpyxl", "xlrd", "PyMuPDF"];
  const candidates = python ? [python] : pythonCandidates();

  let lastResult = null;
  for (const candidate of candidates) {
    const args = [...candidate.argsPrefix, "-m", "pip", "install", ...packages];
    try {
      const result = await runProcess(candidate.command, args);
      lastResult = result;
      if (result.ok) {
        return {
          ok: true,
          message: "Document parsing dependencies installed for the active Python runtime.",
          packages,
          command: candidate.command,
          stdout: result.stdout,
          stderr: result.stderr,
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
    `Unable to install document parsing dependencies. ${
      lastResult?.stderr || lastResult?.stdout || "No Python command worked."
    }`
  );
}

function parseDocumentResult(result) {
  const text = String(result.stdout || "").trim();
  const lastLine = text.split(/\r?\n/).filter(Boolean).at(-1) || "";
  try {
    return JSON.parse(lastLine);
  } catch {
    const detail = result.stderr || text || `Python exited with code ${result.code}`;
    throw new Error(`Document analysis failed: ${detail}`);
  }
}

async function runDocumentAnalysis(payload) {
  const candidate = await findPython312();
  if (!candidate) {
    throw new Error(
      "Python 3.12 is required to analyze documents. Install it and try again."
    );
  }

  const result = await runProcess(
    candidate.command,
    [...candidate.argsPrefix, workerScript, "--analyze-document", String(payload?.path ?? "")],
    180000
  );

  return parseDocumentResult(result);
}

// Document parsing runs as a short-lived Python process and never touches the
// long-running Kokoro voice worker, so attaching a file does not pay the TTS
// cold-start cost (or require the voice engine to be running at all).
export async function analyzeDocument(payload) {
  let data = await runDocumentAnalysis(payload);

  if (data?.error === "DOCUMENT_DEPENDENCIES_MISSING") {
    await installDocumentDependencies();
    data = await runDocumentAnalysis(payload);
  }

  if (!data?.ok) {
    const message = data?.message || data?.error || "Document analysis failed.";
    throw new Error(message);
  }

  return data;
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
