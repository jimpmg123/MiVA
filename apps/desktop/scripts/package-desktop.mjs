import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cargoTargetDir = join(desktopRoot, "src-tauri", "target");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const sharedBuildEnv = {
  ...process.env,
  CARGO_TARGET_DIR: cargoTargetDir,
};

function runScript(scriptName) {
  const result = spawnSync(process.execPath, [scriptName], {
    cwd: desktopRoot,
    stdio: "inherit",
    env: sharedBuildEnv,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const buildResult = spawnSync(npmCommand, ["run", "tauri:build"], {
  cwd: desktopRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: sharedBuildEnv,
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

if (process.env.MIVA_SKIP_WEB_INSTALLER_COPY !== "1") {
  runScript("scripts/copy-installer-to-web.mjs");
}
