# MiVA Desktop

Tauri desktop shell for local models, local helper, and assistant studio/runtime.

## Production packaging (Windows)

1. Copy `apps/desktop/.env.example` to `apps/desktop/.env.production` and set production URLs:

```env
VITE_MIVA_API_URL=https://your-miva-api.up.railway.app
VITE_WEB_CONSOLE_URL=https://your-vercel-domain.vercel.app
MIVA_WEB_ORIGINS=https://your-vercel-domain.vercel.app
```

2. From repo root, build the installer:

```bash
npm run package:desktop
```

3. Output:
   - Installer: `apps/desktop/src-tauri/target/release/bundle/nsis/*.exe`
   - Web download copy: `apps/web/public/downloads/MiVA-Desktop-setup.exe`

4. Deploy the web app so the dashboard download button serves `/downloads/MiVA-Desktop-setup.exe`.

## CI release

Push a tag like `desktop-v0.1.0` to run `.github/workflows/release-desktop.yml`.

Set GitHub repository variables:
- `MIVA_API_URL`
- `MIVA_WEB_CONSOLE_URL`
- `MIVA_WEB_ORIGINS`

## Local development

```bash
npm run tauri:dev
```

Uses local defaults:
- Cloud API: `http://127.0.0.1:4000`
- Web console: `http://127.0.0.1:5173`
