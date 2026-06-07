import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const checks = [];

function pass(label) {
  checks.push({ ok: true, label });
}

function fail(label, detail) {
  checks.push({ ok: false, label, detail });
}

function checkFile(relativePath, label = relativePath) {
  const path = join(repoRoot, relativePath);
  if (existsSync(path)) {
    pass(label);
    return path;
  }

  fail(label, "missing");
  return null;
}

function main() {
  checkFile("apps/desktop/scripts/package-desktop.mjs");
  checkFile("apps/desktop/scripts/copy-installer-to-web.mjs");
  checkFile("apps/desktop/scripts/prepare-desktop-bundle.mjs");
  checkFile("apps/desktop/.env.example");
  checkFile("apps/desktop/.env.production.example");
  checkFile("scripts/release.env.example");
  checkFile("scripts/apply-release-env.mjs");
  checkFile(".github/workflows/release-desktop.yml");
  checkFile("apps/web/vercel.json");
  checkFile("apps/api/railway.toml");
  checkFile("docs/GO-LIVE.md");

  const installerRelative = "apps/web/public/downloads/MiVA-Desktop-setup.exe";
  const installerPath = existsSync(join(repoRoot, installerRelative))
    ? join(repoRoot, installerRelative)
    : null;
  if (installerPath) {
    pass("Web installer (MiVA-Desktop-setup.exe)");
  }

  if (installerPath) {
    const sizeMb = (statSync(installerPath).size / (1024 * 1024)).toFixed(1);
    if (Number(sizeMb) < 10) {
      fail("Installer size", `too small (${sizeMb} MB)`);
    } else {
      pass(`Installer size OK (${sizeMb} MB)`);
    }
  } else {
    console.log("WARN  Web installer missing — run `npm run package:desktop` on Windows before Vercel deploy");
  }

  const endpointsSource = join(repoRoot, "apps/desktop/src/config/endpoints.ts");
  if (existsSync(endpointsSource)) {
    const source = readFileSync(endpointsSource, "utf8");
    if (source.includes("VITE_MIVA_API_URL") && source.includes("VITE_WEB_CONSOLE_URL")) {
      pass("Desktop endpoint env wiring");
    } else {
      fail("Desktop endpoint env wiring", "missing VITE_* constants");
    }
  }

  const authService = join(repoRoot, "apps/api/src/auth.service.ts");
  if (existsSync(authService)) {
    const source = readFileSync(authService, "utf8");
    if (source.includes("MIVA_WEB_CONSOLE_URL")) {
      pass("API device-login web console URL");
    } else {
      fail("API device-login web console URL", "MIVA_WEB_CONSOLE_URL not used");
    }
  }

  const failed = checks.filter((check) => !check.ok);
  for (const check of checks) {
    const prefix = check.ok ? "OK " : "FAIL";
    console.log(`${prefix}  ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
  }

  if (failed.length > 0) {
    process.exit(1);
  }

  console.log("\nPackaging baseline is ready. Next: follow docs/GO-LIVE.md for Railway, Vercel, and Google Cloud.");
}

main();
