import { spawnSync } from "node:child_process";

const files = [
  "apps/local-helper/src/server.mjs",
  "apps/local-helper/src/routes/chat.mjs",
  "apps/local-helper/src/routes/voice.mjs",
  "apps/local-helper/src/services/workspace.mjs",
  "apps/local-helper/src/services/voice-worker.mjs",
  "apps/local-helper/src/prompt.mjs",
  "apps/web/server.mjs",
  "apps/api/src/db.mjs",
  "apps/api/scripts/db-check.mjs",
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

const webChecks = [
  {
    label: "typecheck",
    args: ["node_modules/typescript/bin/tsc", "--noEmit"]
  },
  {
    label: "build",
    args: ["node_modules/vite/bin/vite.js", "build"]
  }
];

console.log("Checking apps/api typecheck");
const apiResult = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"], {
  cwd: "apps/api",
  stdio: "inherit",
  shell: false
});

if (apiResult.status !== 0) {
  process.exit(apiResult.status || 1);
}

for (const check of webChecks) {
  console.log(`Checking apps/web ${check.label}`);
  const webResult = spawnSync(process.execPath, check.args, {
    cwd: "apps/web",
    stdio: "inherit",
    shell: false
  });

  if (webResult.status !== 0) {
    process.exit(webResult.status || 1);
  }
}

console.log("All checks passed.");
