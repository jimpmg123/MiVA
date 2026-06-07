# MiVA Deployment Plan

## Target Deployment

```text
MiVA Web        -> Vercel
MiVA Cloud API  -> Railway
Database        -> Supabase PostgreSQL
Desktop App     -> User PC
Local Helper    -> User PC localhost
```

The hosted web app is a control console. Local model execution, local tools, and Ollama remain on the user's PC through MiVA Desktop and Local Helper.

## Deployment Order

1. Prepare deploy-ready configuration.
   - Web reads the API URL from `VITE_MIVA_API_URL`.
   - API reads runtime port from `PORT` or `MIVA_API_PORT`.
   - API reads production CORS origins from `MIVA_CORS_ORIGINS`.
   - API has a production `start` script.

2. Deploy the API to Railway.
   - Set Railway root directory to `apps/api`.
   - Build command: `npm run build`.
   - Start command: `npm run start`.
   - Set `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID`, and any Google Workspace OAuth variables.
   - Add the deployed Vercel origin to `MIVA_CORS_ORIGINS`.

3. Connect Supabase PostgreSQL.
   - Use Supabase direct database URL for migrations.
   - Use pooled URL for Railway runtime if connection pooling is needed.
   - Run Prisma migrations before relying on the deployed API.

4. Deploy the web app to Vercel.
   - Set Vercel root directory to `apps/web`.
   - Build command: `npm run build`.
   - Output directory: `dist`.
   - Set `VITE_MIVA_API_URL` to the Railway API URL.
   - Set `VITE_GOOGLE_CLIENT_ID` to the Google OAuth web client ID.

5. Configure Google OAuth.
   - Add the Vercel domain to authorized JavaScript origins.
   - Add the Railway Google Workspace callback URL to authorized redirect URIs if Workspace OAuth is enabled.
   - Keep local development origins and callbacks for local testing.

6. Smoke test production.
   - Open Vercel web URL.
   - Check Cloud API health.
   - Sign in with Google.
   - Load My Assistants.
   - Load API Keys and Usage pages.
   - Verify CORS errors do not appear in the browser console.

7. Finish cloud setup using the go-live checklist.
   - Follow [GO-LIVE.md](GO-LIVE.md) for Railway, Vercel, and Google Cloud only.
   - Run `npm run apply:release-env` after domains are ready.
   - Rebuild the desktop installer with `npm run package:desktop`.
   - Redeploy Vercel so `/downloads/MiVA-Desktop-setup.exe` is updated.

## Required Environment Variables

### Web

```text
VITE_MIVA_API_URL=https://your-miva-api.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
VITE_DESKTOP_DOWNLOAD_URL=/downloads/MiVA-Desktop-setup.exe
# Optional overrides for local bridge checks from the hosted web console:
# VITE_DESKTOP_BRIDGE_URL=http://127.0.0.1:43111
# VITE_LOCAL_HELPER_URL=http://127.0.0.1:43110
```

### Desktop (build-time)

```text
VITE_MIVA_API_URL=https://your-miva-api.up.railway.app
VITE_WEB_CONSOLE_URL=https://your-vercel-domain.vercel.app
MIVA_WEB_ORIGINS=https://your-vercel-domain.vercel.app
```

### API

```text
PORT=4000
DATABASE_URL=postgresql://...
MIVA_CORS_ORIGINS=https://your-vercel-domain.vercel.app,http://127.0.0.1:5173,http://localhost:5173
MIVA_WEB_CONSOLE_URL=https://your-vercel-domain.vercel.app
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_WORKSPACE_REDIRECT_URI=https://your-api-domain/workspace/google/callback
GOOGLE_WORKSPACE_SUCCESS_URL=https://your-vercel-domain.vercel.app/?workspaceConnected=1
PRISMA_QUERY_LOG=false
```

## Desktop ↔ Web connection model

- **Desktop → Cloud API**: packaged desktop reads `VITE_MIVA_API_URL` at build time for sign-in, profile sync, and usage events.
- **Desktop → Web console**: help button and device login open `VITE_WEB_CONSOLE_URL`.
- **API → Web console**: device login links use `MIVA_WEB_CONSOLE_URL`.
- **Web console → Desktop/Helper**: hosted HTTPS web pages call `http://127.0.0.1:43111` (desktop bridge) and `http://127.0.0.1:43110` (local helper). Bundled helper allows the production web origin through `MIVA_WEB_ORIGINS`, and both bridge/helper return `Access-Control-Allow-Private-Network: true` for browser private-network access checks.

## Notes

- Do not deploy local-helper as a public service.
- Do not expose arbitrary shell execution from the hosted API.
- Do not upload local chat transcripts by default.
- Add production origins explicitly; wildcard CORS is not acceptable for authenticated routes.
