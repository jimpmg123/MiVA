import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function run(script) {
  const result = spawnSync("node", [script], {
    cwd: desktopRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("scripts/prepare-desktop-bundle.mjs");
run("scripts/build.mjs");
