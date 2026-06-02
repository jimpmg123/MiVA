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

## Required Environment Variables

### Web

```text
VITE_MIVA_API_URL=https://your-miva-api.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
```

### API

```text
PORT=4000
DATABASE_URL=postgresql://...
MIVA_CORS_ORIGINS=https://your-vercel-domain.vercel.app,http://127.0.0.1:5173,http://localhost:5173
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_WORKSPACE_REDIRECT_URI=https://your-api-domain/workspace/google/callback
GOOGLE_WORKSPACE_SUCCESS_URL=https://your-vercel-domain.vercel.app/?workspaceConnected=1
PRISMA_QUERY_LOG=false
```

## Notes

- Do not deploy local-helper as a public service.
- Do not expose arbitrary shell execution from the hosted API.
- Do not upload local chat transcripts by default.
- Add production origins explicitly; wildcard CORS is not acceptable for authenticated routes.
