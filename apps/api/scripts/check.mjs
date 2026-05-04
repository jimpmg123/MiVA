import { spawnSync } from "node:child_process";

const files = [
  "src/server.mjs",
  "src/db.mjs",
  "scripts/db-check.mjs"
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

console.log("API checks passed.");
