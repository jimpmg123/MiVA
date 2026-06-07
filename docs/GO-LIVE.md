# MiVA Go-Live Checklist

Packaging work in this repo is already done. You only need to configure **Railway**, **Vercel**, and **Google Cloud**, then rebuild the desktop installer once with production URLs.

## What is already prepared

- Windows desktop packaging: `npm run package:desktop`
- Web download path: `/downloads/MiVA-Desktop-setup.exe`
- Desktop/API/Web env wiring for production URLs
- Local helper + desktop bridge CORS for hosted web console → localhost
- Railway config: `apps/api/railway.toml`
- Vercel config: `apps/web/vercel.json`
- GitHub Actions desktop release workflow: `.github/workflows/release-desktop.yml`

Verify locally:

```bash
npm run verify:packaging
```

## Step 0 — Fill one file

```bash
npm run apply:release-env
```

This creates `release.env` from `scripts/release.env.example` on first run. Fill in your real domains, then run again. It will:

1. Generate `apps/desktop/.env.production`
2. Print the exact env vars to paste into Railway and Vercel
3. Print Google Cloud OAuth settings

## Step 1 — Supabase PostgreSQL

1. Create a Supabase project.
2. Copy the direct database URL for migrations.
3. Copy the pooled URL for Railway runtime if needed.

Run migrations once against the direct URL:

```bash
cd apps/api
DATABASE_URL=<direct-url> npx prisma migrate deploy
```

## Step 2 — Railway (Cloud API)

1. Create a Railway service from this repo.
2. Use repo root (not `apps/api` alone).
3. Config file: `apps/api/railway.toml`
4. Set environment variables:

```text
PORT=4000
DATABASE_URL=<supabase pooled or direct url>
DIRECT_DATABASE_URL=<supabase direct url>
MIVA_CORS_ORIGINS=https://YOUR-VERCEL-APP.vercel.app,http://127.0.0.1:5173,http://localhost:5173
MIVA_WEB_CONSOLE_URL=https://YOUR-VERCEL-APP.vercel.app
GOOGLE_OAUTH_CLIENT_ID=<google web client id>
GOOGLE_OAUTH_CLIENT_SECRET=<google client secret>
GOOGLE_WORKSPACE_REDIRECT_URI=https://YOUR-RAILWAY-API.up.railway.app/workspace/google/callback
GOOGLE_WORKSPACE_SUCCESS_URL=https://YOUR-VERCEL-APP.vercel.app/?workspaceConnected=1
PRISMA_QUERY_LOG=false
```

5. Deploy and confirm health:

```text
GET https://YOUR-RAILWAY-API.up.railway.app/health
```

## Step 3 — Vercel (Web Console)

1. Import this repo into Vercel.
2. Root directory: `apps/web`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set environment variables:

```text
VITE_MIVA_API_URL=https://YOUR-RAILWAY-API.up.railway.app
VITE_GOOGLE_CLIENT_ID=<google web client id>
VITE_DESKTOP_DOWNLOAD_URL=/downloads/MiVA-Desktop-setup.exe
```

6. Deploy the web app.

## Step 4 — Google Cloud OAuth

In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs:

**Application type:** Web application

**Authorized JavaScript origins**

```text
https://YOUR-VERCEL-APP.vercel.app
http://127.0.0.1:5173
http://localhost:5173
```

**Authorized redirect URIs**

```text
https://YOUR-RAILWAY-API.up.railway.app/workspace/google/callback
```

Use the same client ID in:

- Vercel `VITE_GOOGLE_CLIENT_ID`
- Railway `GOOGLE_OAUTH_CLIENT_ID`

## Step 5 — Rebuild desktop with production URLs

After Railway and Vercel URLs are live:

```bash
npm run apply:release-env
npm run package:desktop
```

This produces:

- `apps/desktop/src-tauri/target/release/bundle/nsis/*.exe`
- `apps/web/public/downloads/MiVA-Desktop-setup.exe`

Redeploy Vercel so the download button serves the new installer.

Alternative: tag a release and let GitHub Actions publish the installer:

```bash
git tag desktop-v0.1.0
git push origin desktop-v0.1.0
```

Then set `VITE_DESKTOP_DOWNLOAD_URL` to the GitHub Release asset URL if you prefer not to ship the EXE inside the web deploy.

## Step 6 — Smoke test

1. Download MiVA Desktop from the web console.
2. Install and launch the desktop app.
3. Sign in from desktop → browser opens your Vercel URL → approve device login.
4. Open the hosted web console while desktop is running.
5. Confirm Devices / Models pages detect the local desktop bridge and helper.
6. Sync an assistant profile desktop ↔ cloud.
7. Test Google sign-in and Google Workspace consent if enabled.

## Troubleshooting

| Problem | Check |
|---------|-------|
| Web cannot reach desktop/helper | Desktop app must be running; browser must allow private network access to `127.0.0.1:43110` and `:43111` |
| Desktop cannot sign in | `VITE_MIVA_API_URL` in rebuilt installer must match Railway URL |
| Device login opens wrong site | Railway `MIVA_WEB_CONSOLE_URL` must match Vercel URL |
| Google sign-in fails | Vercel origin must be in Google OAuth authorized JavaScript origins |
| Workspace consent fails | Redirect URI must exactly match Railway callback URL |
| CORS errors in web console | Railway `MIVA_CORS_ORIGINS` must include your Vercel domain |

## Local-only installer (current default)

The installer currently in `apps/web/public/downloads/` was built with localhost defaults:

- API: `http://127.0.0.1:4000`
- Web console: `http://127.0.0.1:5173`

That is fine for local testing. Production users need the Step 5 rebuild after domains are configured.
