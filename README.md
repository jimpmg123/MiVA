# MiVA

MiVA is a local-first workspace for creating and running personalized AI assistants. It combines desktop setup, local model runtime control, assistant profile management, cloud sync, and web-based review/admin tools in one system.

## Team Members

- Jinu Hong - Full-stack Developer

## Problem Statement

Local AI assistants are becoming more useful, but setting them up is still difficult for non-technical users. Users often need to manage local model installation, Ollama runtime setup, API keys, prompt configuration, OAuth login, and tool connections separately.

## Solution Overview

MiVA provides a desktop-first assistant workspace. The desktop app guides users through initial setup, recommends local or cloud model options, creates assistant profiles, and runs chat through either Ollama or external model APIs. Synced assistant profiles and usage metadata are handled through a cloud API and can be reviewed in the web console.

## Workspace Structure

```text
apps/desktop       Tauri + React desktop app for setup, studio, and runtime chat
apps/local-helper  Local Node.js helper API for Ollama, model downloads, chat routing, and voice worker bridge
apps/api           NestJS backend API for auth, sync, usage events, Workspace context, and admin data
apps/web           React web console for login, synced assistant review, and admin analytics
apps/voice-worker  Optional Python voice worker for local Kokoro TTS and future STT support
packages/shared    Shared model catalog and constants
docs               Architecture, data design, and project documentation
```

## Beta Release Links

- Web beta / console: https://mi-va.vercel.app
- Cloud API health: https://miva-production.up.railway.app/health
- Desktop installer path on web beta: https://mi-va.vercel.app/downloads/MiVA-Desktop-setup.exe
- GitHub repository: https://github.com/jimpmg123/MiVA

The hosted web console is the beta entry point for login, device review, model/device pages, synced assistant review, Persona Hub, billing placeholder, usage, and admin views. Local model execution still requires MiVA Desktop and the localhost Local Helper running on the user's machine.

## How to Run Locally

### Supported development OS

These instructions are intended for Windows 11, which is the current development and test environment for MiVA Desktop, Local Helper, Ollama, Claw Code setup, and the optional voice worker. The web/API commands also work on macOS or Linux if Node.js 22+, Python, PostgreSQL access, and the required environment variables are available, but Tauri packaging has only been validated on Windows.

### Prerequisites

- Node.js 22+
- Rust and Tauri prerequisites for desktop development
- Ollama for local model runtime
- Supabase PostgreSQL database
- Google OAuth web client ID for login
- Python 3.10+ only if testing the optional voice worker

### 1. Check out the source code

Clone the repository and use the main development branch or the latest release tag available in GitHub:

```bash
git clone https://github.com/jimpmg123/MiVA.git
cd MiVA
git pull origin main
```

If a release tag is provided for grading, check it out instead:

```bash
git fetch --tags
git checkout <release-tag>
```

### 2. Install dependencies

From the repository root:

```bash
npm install
```

### 3. Configure environment variables

Create environment files from the examples:

```text
apps/api/.env
apps/web/.env
apps/local-helper/.env
```

Required API variables:

```env
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
DATABASE_URL=postgresql://...
PRISMA_QUERY_LOG=false
```

Required web variable:

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
```

Copy `apps/local-helper/demo.env.example` to `apps/local-helper/demo.env` and add your provider keys for local grading.
MiVA loads those keys automatically when app Settings or web API key fields are left empty.

Optional overrides:

```env
# apps/local-helper/.env
MIVA_HELPER_PORT=43110
MIVA_CLOUD_API_URL=http://127.0.0.1:4000
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=optional-openai-override
GEMINI_API_KEY=optional-gemini-override
```

### 4. Prepare Prisma and database

From `apps/api`:

```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate
npm run db:check
```

Optional Prisma GUI:

```bash
npm run prisma:studio
```

### 5. Run the API server

The API server is required for Google login, desktop session connection, assistant sync, usage events, Workspace context, and admin data.

From the repository root:

```bash
npm run dev:api
```

Or from `apps/api`:

```bash
cd apps/api
npm run dev
```

Default API URL:

```text
http://127.0.0.1:4000
```

### 6. Run the web console

In a separate terminal, from the repository root:

```bash
npm run dev:web
```

Or from `apps/web`:

```bash
cd apps/web
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The web console is used for Google login, synced assistant review, and admin analytics.

### 7. Run the desktop app

In a separate terminal:

```bash
cd apps/desktop
npm run tauri:dev
```

The desktop app starts the local helper automatically in development if it is not already running.

### 8. Run the local helper manually, if needed

Normally the desktop app starts this automatically. To run it manually:

```bash
npm run dev:helper
```

Default local-helper URL:

```text
http://127.0.0.1:43110
```

### 9. Run Ollama

MiVA can start Ollama from the desktop app, but you can also run it manually:

```bash
ollama serve
```

Default Ollama URL:

```text
http://localhost:11434
```

### 10. Optional voice worker

The voice worker is the local STT/TTS extension point. It is not required for the main app, but local TTS uses it when an assistant enables Kokoro voice output.

```bash
npm run dev:voice
```

Install optional Kokoro TTS dependencies:

```bash
cd apps/voice-worker
python -m pip install -r requirements.txt
```

Default voice worker URL:

```text
http://127.0.0.1:43120
```

## Local Development Notes

- The API server must be running before Google login or assistant sync will work.
- The web console uses the API server for authentication and database-backed data.
- The desktop app uses the local helper for local runtime operations and passes cloud-session data to the helper when Workspace context is needed.
- Local chat history and local-only assistant profiles are stored on the device.
- Synced assistant profiles, devices, auth sessions, and usage metadata are stored in Supabase PostgreSQL through the API server.
- Some cloud model features require provider API keys.

## Check Commands

Run all checks from the repository root. This validates local-helper syntax, API type checks, web type checks/build, and desktop build:

```bash
npm run check
```

Individual checks:

```bash
cd apps/api && npm run check
cd apps/web && npm run check
cd apps/desktop && npm run check
cd apps/local-helper && npm run check
```

For Tauri/Rust validation:

```bash
cd apps/desktop/src-tauri
cargo check
```

## Build and Run Summary

| Goal | Command | Notes |
| --- | --- | --- |
| Start core dev services | `npm run dev` | Starts the core local development services managed by `scripts/dev-services.mjs`. |
| Start all services | `npm run dev:all` | Includes optional services such as the voice worker when configured. |
| Check service status | `npm run dev:status` | Shows local helper, API, web, desktop, and voice service health. |
| Stop services | `npm run dev:stop` | Stops managed local development services. |
| Build/check everything | `npm run check` | Main validation command for developers. |
| Package desktop beta | `npm run package:desktop` | Builds the Windows desktop installer after production env is applied. |

## Production Go-Live

Desktop packaging is already wired in this repo. After Railway and Vercel are live, use:

```bash
npm run verify:packaging
npm run apply:release-env
npm run package:desktop
```

Full cloud-only checklist: [docs/GO-LIVE.md](docs/GO-LIVE.md)

## Bug Reports and GitHub Issues

Outstanding bugs are tracked through GitHub Issues:

- Issue list: https://github.com/jimpmg123/MiVA/issues
- New bug report: https://github.com/jimpmg123/MiVA/issues/new

When reporting a bug, include the environment, steps to reproduce, expected result, actual result, screenshots or logs if available, and severity. Because MiVA is currently a solo project, serious bugs are owned by Jinu Hong by default and should be linked to a verification plan and schedule slot. The Milestone 4 bug tracking summary is in [docs/milestone/BUG_TRACKING.md](docs/milestone/BUG_TRACKING.md).

## Additional Documentation

- [Deployment Plan](docs/DEPLOYMENT.md)
- [Go-Live Checklist (Railway / Vercel / Google Cloud)](docs/GO-LIVE.md)
- [System Architecture and Tech Stack](docs/TECH_STACK.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [Local Data Store](docs/LOCAL_DATA_STORE.md)
- [Software Design Document](docs/SOFTWARE_DESIGN_DOCUMENT.md)
- [Presentation API Design](docs/PRESENTATION_API_DESIGN.md)
- [Admin Page Notes](docs/ADMIN_PAGE.md)
- [Voice/STT Strategy](docs/STT_STRATEGY.md)
- [Milestone 4 Progress Update](docs/milestone/MILESTONE_4_PROGRESS_UPDATE.md)
- [Milestone Schedule Update](docs/milestone/SCHEDULE_UPDATE.md)
- [Milestone API Design Update](docs/milestone/API_DESIGN_UPDATE.md)
- [Milestone Change Review](docs/milestone/CHANGE_REVIEW.md)
