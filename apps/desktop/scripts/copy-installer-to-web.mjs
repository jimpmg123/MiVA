import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cargoTargetDir = process.env.CARGO_TARGET_DIR?.trim()
  || join(desktopRoot, "src-tauri", "target");
const repoRoot = dirname(dirname(desktopRoot));
const bundleDir = join(cargoTargetDir, "release", "bundle", "nsis");
const webDownloadsDir = join(repoRoot, "apps", "web", "public", "downloads");
const targetFileName = process.env.MIVA_DESKTOP_INSTALLER_NAME?.trim() || "MiVA-Desktop-setup.exe";

function findWindowsInstaller() {
  if (!existsSync(bundleDir)) {
    return null;
  }

  const candidates = readdirSync(bundleDir)
    .filter((name) => name.toLowerCase().endsWith(".exe"))
    .sort();

  return candidates.at(-1) ?? null;
}

function main() {
  const installerName = findWindowsInstaller();
  if (!installerName) {
    console.error(`[miva-package] Windows installer not found under ${bundleDir}`);
    console.error("[miva-package] Run `npm run package:desktop` first.");
    process.exit(1);
  }

  mkdirSync(webDownloadsDir, { recursive: true });
  const sourcePath = join(bundleDir, installerName);
  const targetPath = join(webDownloadsDir, targetFileName);
  copyFileSync(sourcePath, targetPath);

  let version = "0.0.0";
  try {
    const packageJson = JSON.parse(readFileSync(join(desktopRoot, "package.json"), "utf8"));
    version = packageJson.version || version;
  } catch {
    // ignore
  }

  writeFileSync(
    join(webDownloadsDir, "manifest.json"),
    `${JSON.stringify({
      fileName: targetFileName,
      version,
      builtAt: new Date().toISOString(),
      sourceInstaller: installerName,
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(`[miva-package] copied ${sourcePath}`);
  console.log(`[miva-package] to ${targetPath}`);
  console.log("[miva-package] Web download path: /downloads/MiVA-Desktop-setup.exe");
  console.log("[miva-package] Next: configure Railway/Vercel/Google Cloud using docs/GO-LIVE.md");
  console.log("[miva-package] After domains are live: npm run apply:release-env && npm run package:desktop");
}

main();
