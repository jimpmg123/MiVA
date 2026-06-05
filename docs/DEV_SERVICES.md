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
- runs `tauri dev` through the local Node CLI without opening separate command windows.

Service groups:

- `core`: local-helper, API, web, and the desktop Tauri app.
- `all`: every managed service, including the optional Python voice worker.

Do not start the desktop debug executable directly during development.

`npm run dev:app` starts the full desktop Tauri shell. Its configured
`beforeDevCommand` starts the Vite UI at `http://127.0.0.1:1421`.

The equivalent foreground command is:

```text
cd apps/desktop
npm run tauri:dev
```

Do not run both commands at once because they use the same Vite port and Tauri build directory.
