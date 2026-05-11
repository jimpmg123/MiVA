import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const commands = [
  [process.execPath, [join("node_modules", "typescript", "bin", "tsc")]],
  [process.execPath, [join("node_modules", "vite", "bin", "vite.js"), "build"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
