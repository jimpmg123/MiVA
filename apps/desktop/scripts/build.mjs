import { spawnSync } from "node:child_process";
import { join } from "node:path";

const commands = [
  [process.execPath, [join("node_modules", "typescript", "bin", "tsc")]],
  [process.execPath, [join("node_modules", "vite", "bin", "vite.js"), "build"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

