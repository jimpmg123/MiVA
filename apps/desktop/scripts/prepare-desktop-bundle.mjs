import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(desktopRoot));
const bundleRoot = join(desktopRoot, "src-tauri", "bundle-resources");
const helperSource = join(repoRoot, "apps", "local-helper");
const sharedSource = join(repoRoot, "packages", "shared");
const helperTarget = join(bundleRoot, "apps", "local-helper");
const sharedTarget = join(bundleRoot, "packages", "shared");

function copyDirectory(source, target) {
  if (!existsSync(source)) {
    throw new Error(`Missing bundle source: ${source}`);
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, {
    recursive: true,
    filter: (src) => {
      const normalized = src.replace(/\\/g, "/");
      return !normalized.includes("/node_modules/")
        && !normalized.endsWith("/demo.env");
    },
  });
}

function copyOptionalLive2dAssets() {
  const candidates = [
    join(repoRoot, "VtuberLLM", "Open-LLM-VTuber-main", "live2d-models"),
    join(repoRoot, "apps", "desktop", "public", "live2d-models"),
    join(desktopRoot, "dist", "live2d-models"),
  ];

  const coreCandidates = [
    join(repoRoot, "VtuberLLM", "Open-LLM-VTuber-main", "frontend-source", "libs", "live2dcubismcore.min.js"),
    join(desktopRoot, "public", "live2d", "live2dcubismcore.min.js"),
  ];

  const modelsSource = candidates.find((path) => existsSync(path));
  if (modelsSource) {
    cpSync(modelsSource, join(bundleRoot, "live2d-models"), { recursive: true });
    console.log(`[miva-package] bundled Live2D models from ${modelsSource}`);
  } else {
    console.warn("[miva-package] Live2D models not found. Character install will be skipped in packaged builds.");
  }

  const coreSource = coreCandidates.find((path) => existsSync(path));
  if (coreSource) {
    mkdirSync(bundleRoot, { recursive: true });
    cpSync(coreSource, join(bundleRoot, "live2dcubismcore.min.js"));
    console.log(`[miva-package] bundled Live2D core script from ${coreSource}`);
  } else {
    console.warn("[miva-package] Live2D core script not found. Character install will be skipped in packaged builds.");
  }
}

function installHelperDependencies() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    npmCommand,
    ["install", "--omit=dev", "--no-audit", "--no-fund"],
    {
      cwd: helperTarget,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        npm_config_update_notifier: "false",
      },
    },
  );

  if (result.status !== 0) {
    throw new Error("Failed to install local-helper production dependencies for packaging.");
  }
}

function parseEnvFile(filePath) {
  const values = {};

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [rawKey, ...rawValueParts] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rawValueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key) {
      values[key] = value;
    }
  }

  return values;
}

function loadDesktopProductionEnv() {
  const envPath = join(desktopRoot, ".env.production");
  if (!existsSync(envPath)) {
    return {};
  }

  return parseEnvFile(envPath);
}

function writeBundledHelperEnv() {
  const productionEnv = loadDesktopProductionEnv();
  const cloudApiUrl = process.env.VITE_MIVA_API_URL?.trim()
    || productionEnv.VITE_MIVA_API_URL?.trim()
    || process.env.MIVA_CLOUD_API_URL?.trim()
    || "http://127.0.0.1:4000";
  const webOrigins = process.env.MIVA_WEB_ORIGINS?.trim()
    || productionEnv.MIVA_WEB_ORIGINS?.trim()
    || process.env.MIVA_CORS_ORIGINS?.trim()
    || "";
  const lines = [
    "# Generated during desktop packaging",
    `MIVA_CLOUD_API_URL=${cloudApiUrl}`,
  ];

  if (webOrigins) {
    lines.push(`MIVA_WEB_ORIGINS=${webOrigins}`);
  }

  writeFileSync(join(helperTarget, ".env"), `${lines.join("\n")}\n`, "utf8");
  console.log(`[miva-package] wrote bundled helper env (cloud API: ${cloudApiUrl})`);
}

function main() {
  console.log("[miva-package] preparing desktop bundle resources...");
  rmSync(bundleRoot, { recursive: true, force: true });
  mkdirSync(bundleRoot, { recursive: true });

  copyDirectory(helperSource, helperTarget);
  copyDirectory(sharedSource, sharedTarget);
  writeBundledHelperEnv();
  copyOptionalLive2dAssets();
  installHelperDependencies();

  console.log(`[miva-package] bundle resources ready at ${bundleRoot}`);
}

main();
