import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pidFile = path.join(rootDir, ".miva-dev-pids.json");
const logDir = path.join(rootDir, ".codex-run-logs");

const services = {
  helper: {
    cwd: path.join(rootDir, "apps/local-helper"),
    command: process.execPath,
    args: ["src/server.mjs"],
    ports: [43110],
    healthUrl: "http://127.0.0.1:43110/health",
  },
  api: {
    cwd: path.join(rootDir, "apps/api"),
    command: process.execPath,
    args: ["./node_modules/tsx/dist/cli.mjs", "src/main.ts"],
    ports: [4000],
    healthUrl: "http://127.0.0.1:4000/health",
  },
  web: {
    cwd: path.join(rootDir, "apps/web"),
    command: process.execPath,
    args: ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5173"],
    ports: [5173],
    healthUrl: "http://127.0.0.1:5173",
  },
  desktop: {
    cwd: path.join(rootDir, "apps/desktop"),
    command: process.execPath,
    args: ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "1421"],
    ports: [1421],
    healthUrl: "http://127.0.0.1:1421",
  },
  voice: {
    cwd: rootDir,
    command: process.platform === "win32" ? "python.exe" : "python",
    args: ["apps/voice-worker/server.py"],
    ports: [43120],
    healthUrl: "http://127.0.0.1:43120/voice/status",
  },
};

const coreServices = ["helper", "api", "web", "desktop"];
const allServiceNames = Object.keys(services);

function log(message) {
  console.log(`[miva-dev] ${message}`);
}

function normalizeServiceNames(names, defaultNames = allServiceNames) {
  if (!names.length) {
    return [...defaultNames];
  }

  const expanded = names.flatMap((name) => {
    if (name === "core") {
      return coreServices;
    }
    if (name === "all") {
      return allServiceNames;
    }
    return [name];
  });
  const unique = Array.from(new Set(expanded));
  const unknown = unique.filter((name) => !services[name]);
  if (unknown.length) {
    throw new Error(`Unknown service(s): ${unknown.join(", ")}. Allowed: ${allServiceNames.join(", ")}, core, all.`);
  }
  return unique;
}

function execFileText(file, args, options = {}) {
  return new Promise((resolve) => {
    execFile(file, args, {
      timeout: 15000,
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        error: error ? String(error.message || error) : null,
        stdout,
        stderr,
      });
    });
  });
}

function loadPidStore() {
  if (!existsSync(pidFile)) {
    return {};
  }

  try {
    const raw = JSON.parse(readFileSync(pidFile, "utf8"));
    return Object.fromEntries(
      Object.entries(raw).map(([name, value]) => {
        if (typeof value === "number") {
          return [name, { pid: value }];
        }
        if (value && typeof value === "object") {
          return [name, value];
        }
        return [name, null];
      }).filter(([, value]) => value),
    );
  } catch {
    return {};
  }
}

function savePidStore(store) {
  writeFileSync(pidFile, JSON.stringify(store, null, 2));
}

function isPidAlive(pid) {
  if (!Number.isFinite(Number(pid)) || Number(pid) <= 0) {
    return false;
  }

  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

async function killPidTree(pid) {
  if (!isPidAlive(pid)) {
    return false;
  }

  if (process.platform === "win32") {
    const result = await execFileText("taskkill.exe", ["/PID", String(pid), "/T", "/F"]);
    return result.ok;
  }

  try {
    process.kill(Number(pid), "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

async function pidsListeningOnPorts(ports) {
  if (process.platform !== "win32") {
    return [];
  }

  const result = await execFileText("netstat.exe", ["-ano"], { timeout: 20000 });
  if (!result.ok) {
    return [];
  }

  const portPattern = new RegExp(`:(${ports.join("|")})\\b.*LISTENING\\s+(\\d+)\\s*$`);
  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(portPattern);
    if (match) {
      pids.add(Number(match[2]));
    }
  }
  return Array.from(pids).filter((pid) => Number.isFinite(pid) && pid > 0);
}

async function stopServices(names) {
  const store = loadPidStore();
  const selected = normalizeServiceNames(names);
  const stopped = [];

  for (const name of selected) {
    const configured = services[name];
    const storedPid = store[name]?.pid;
    if (storedPid) {
      const killed = await killPidTree(storedPid);
      if (killed) {
        stopped.push(`${name}:${storedPid}`);
      }
    }

    const portPids = await pidsListeningOnPorts(configured.ports);
    for (const pid of portPids) {
      if (pid === process.pid) {
        continue;
      }
      const killed = await killPidTree(pid);
      if (killed) {
        stopped.push(`${name}:port-owner-${pid}`);
      }
    }

    delete store[name];
  }

  savePidStore(store);
  if (stopped.length) {
    log(`stopped ${stopped.join(", ")}`);
  } else {
    log("no matching dev services were running");
  }
}

async function checkHealth(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body: text.slice(0, 180),
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function startDetachedService(name) {
  const configured = services[name];
  mkdirSync(logDir, { recursive: true });
  const out = openSync(path.join(logDir, `${name}.out.log`), "w");
  const err = openSync(path.join(logDir, `${name}.err.log`), "w");
  const child = spawn(configured.command, configured.args, {
    cwd: configured.cwd,
    detached: true,
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
    shell: false,
    stdio: ["ignore", out, err],
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

async function startServices(names) {
  const selected = normalizeServiceNames(names, coreServices);
  await stopServices(selected);

  const store = loadPidStore();
  for (const name of selected) {
    const pid = startDetachedService(name);
    store[name] = {
      pid,
      ports: services[name].ports,
      startedAt: new Date().toISOString(),
      command: [services[name].command, ...services[name].args].join(" "),
      cwd: services[name].cwd,
    };
    log(`started ${name} pid=${pid}`);
  }
  savePidStore(store);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await statusServices(selected);
}

async function statusServices(names) {
  const selected = normalizeServiceNames(names);
  const store = loadPidStore();
  for (const name of selected) {
    const configured = services[name];
    const storedPid = store[name]?.pid;
    const alive = storedPid ? isPidAlive(storedPid) : false;
    const health = await checkHealth(configured.healthUrl);
    const healthLabel = health.ok
      ? `health=${health.status}`
      : `health=down (${health.error || health.status || "unknown"})`;
    log(`${name}: pid=${storedPid || "-"} alive=${alive ? "yes" : "no"} ${healthLabel}`);
  }
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/dev-services.mjs start [helper api web desktop voice core all]",
    "  node scripts/dev-services.mjs stop [helper api web desktop voice core all]",
    "  node scripts/dev-services.mjs status [helper api web desktop voice core all]",
    "",
    "Notes:",
    "  - Starts services detached with shell:false and windowsHide:true on Windows.",
    "  - `core` means helper, api, web, and desktop Vite. `all` includes voice too.",
    "  - Cleans recorded PIDs and fixed MiVA dev ports before starting.",
    "  - Does not launch apps/desktop/src-tauri/target/debug/miva-desktop.exe directly.",
    "  - Does not run tauri dev automatically from this background launcher; desktop starts the Vite dev UI only.",
  ].join("\n"));
}

async function main() {
  const [command = "status", ...names] = process.argv.slice(2);
  if (command === "start") {
    await startServices(names);
    return;
  }
  if (command === "stop") {
    await stopServices(names);
    return;
  }
  if (command === "status") {
    await statusServices(names);
    return;
  }
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`[miva-dev] ${error.message}`);
  process.exit(1);
});
