# MiVA Dev Service Launcher

Use the root dev service wrapper when MiVA services need to be started from Codex or another background process runner:

```text
npm run dev:all
npm run dev:core
npm run dev:app
npm run dev:api
npm run dev:web
npm run dev:helper
npm run dev:status
npm run dev:stop
```

The wrapper is `scripts/dev-services.mjs`.

It intentionally:

- starts processes with `shell: false`;
- hides Windows console windows with `windowsHide: true`;
- records PIDs in `.miva-dev-pids.json`;
- clears fixed MiVA dev ports before restart;
- writes logs to `.codex-run-logs/`;
- never launches `apps/desktop/src-tauri/target/debug/miva-desktop.exe` directly.
- does not run `tauri dev` automatically from the Codex background launcher.

Service groups:

- `core`: local-helper, API, web, and desktop Vite UI.
- `all`: every managed service, including the optional Python voice worker.

Do not start the desktop debug executable directly during development.

This wrapper is not intended to replace the normal VS Code terminal workflow for the full Tauri shell.

`npm run dev:app` starts only the desktop Vite UI at `http://127.0.0.1:1421`.
It intentionally does not open the Tauri shell from the Codex background launcher. Starting Tauri detached from Codex can create visible Windows `cmd.exe` children; running it in a normal terminal is the safer dev flow.

For a full Tauri shell run, run Tauri manually from an existing VS Code or PowerShell terminal if a real desktop window is needed:

```text
cd apps/desktop
npm run tauri:dev
```

Do not run `npm run dev:app` first in that flow. The Tauri config keeps `beforeDevCommand`, so normal `npm run tauri:dev` starts the desktop Vite server itself from a visible terminal.
