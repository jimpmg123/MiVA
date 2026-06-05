import { spawnSync } from "node:child_process";

function runCheck(label, command, args, options = {}) {
  console.log(`Checking ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const files = [
  "scripts/dev-services.mjs",
  "apps/local-helper/src/server.mjs",
  "apps/local-helper/src/extensions/providers.mjs",
  "apps/local-helper/src/extensions/tools.mjs",
  "apps/local-helper/src/routes/chat.mjs",
  "apps/local-helper/src/routes/daiso.mjs",
  "apps/local-helper/src/routes/voice.mjs",
  "apps/local-helper/src/services/daiso.mjs",
  "apps/local-helper/src/services/daiso-utils.mjs",
  "apps/local-helper/src/services/action-confirmation.mjs",
  "apps/local-helper/src/services/workspace.mjs",
  "apps/local-helper/src/services/voice-worker.mjs",
  "apps/local-helper/src/prompt.mjs",
  "apps/web/server.mjs",
  "apps/api/src/db.mjs",
  "apps/api/scripts/db-check.mjs",
  "packages/shared/src/extensions.js",
  "packages/shared/src/index.js"
];

for (const file of files) {
  runCheck(file, process.execPath, ["--check", file]);
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

runCheck("apps/api typecheck", process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"], {
  cwd: "apps/api",
});

for (const check of webChecks) {
  runCheck(`apps/web ${check.label}`, process.execPath, check.args, {
    cwd: "apps/web",
  });
}

runCheck("apps/desktop check", process.execPath, ["scripts/build.mjs"], {
  cwd: "apps/desktop",
});

console.log("All checks passed.");
