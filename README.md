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

## How to Run Locally

### Prerequisites

- Node.js 22+
- Rust and Tauri prerequisites for desktop development
- Ollama for local model runtime
- Supabase PostgreSQL database
- Google OAuth web client ID for login
- Python 3.10+ only if testing the optional voice worker

### 1. Install dependencies

From the repository root:

```bash
npm install
```

### 2. Configure environment variables

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

Optional local-helper variables:

```env
MIVA_HELPER_PORT=43110
MIVA_CLOUD_API_URL=http://127.0.0.1:4000
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=optional-openai-key
GEMINI_API_KEY=optional-gemini-key
```

### 3. Prepare Prisma and database

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

### 4. Run the API server

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

### 5. Run the web console

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

### 6. Run the desktop app

In a separate terminal:

```bash
cd apps/desktop
npm run tauri:dev
```

The desktop app starts the local helper automatically in development if it is not already running.

### 7. Run the local helper manually, if needed

Normally the desktop app starts this automatically. To run it manually:

```bash
npm run dev:helper
```

Default local-helper URL:

```text
http://127.0.0.1:43110
```

### 8. Run Ollama

MiVA can start Ollama from the desktop app, but you can also run it manually:

```bash
ollama serve
```

Default Ollama URL:

```text
http://localhost:11434
```

### 9. Optional voice worker

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

Run all checks from the repository root:

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

## Additional Documentation

- [Product Requirements](docs/PRD.md)
- [System Architecture and Tech Stack](docs/TECH_STACK.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [Local Data Store](docs/LOCAL_DATA_STORE.md)
- [Software Design Document](docs/SOFTWARE_DESIGN_DOCUMENT.md)
- [Presentation API Design](docs/PRESENTATION_API_DESIGN.md)
- [Admin Page Notes](docs/ADMIN_PAGE.md)
- [Voice/STT Strategy](docs/STT_STRATEGY.md)
