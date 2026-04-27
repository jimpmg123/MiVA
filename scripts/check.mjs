import { spawnSync } from "node:child_process";

const files = [
  "apps/local-helper/src/server.mjs",
  "apps/web/server.mjs",
  "apps/api/src/server.mjs",
  "packages/shared/src/index.js"
];

for (const file of files) {
  console.log(`Checking ${file}`);
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("All checks passed.");

