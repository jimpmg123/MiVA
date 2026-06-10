# Milestone

Combined milestone submission package for MiVA.

Generated from the documents in `docs/milestone`.

## Contents
- Milestone README and Setup Instructions
- Milestone 4 Progress Update
- Milestone 1-4 Schedule Update
- Milestone 4 API Design Update
- Milestone 4 Bug Tracking
- Milestone 1-4 Change Review

---

# Milestone README and Setup Instructions

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

Full cloud-only checklist: [docs/GO-LIVE.md](../GO-LIVE.md)

## Bug Reports and GitHub Issues

Outstanding bugs are tracked through GitHub Issues:

- Issue list: https://github.com/jimpmg123/MiVA/issues
- New bug report: https://github.com/jimpmg123/MiVA/issues/new

When reporting a bug, include the environment, steps to reproduce, expected result, actual result, screenshots or logs if available, and severity. Because MiVA is currently a solo project, serious bugs are owned by Jinu Hong by default and should be linked to a verification plan and schedule slot. The Milestone 4 bug tracking summary is in [BUG_TRACKING.md](BUG_TRACKING.md).

## Additional Documentation

- [Deployment Plan](../DEPLOYMENT.md)
- [Go-Live Checklist (Railway / Vercel / Google Cloud)](../GO-LIVE.md)
- [System Architecture and Tech Stack](../TECH_STACK.md)
- [Database Design](../DATABASE_DESIGN.md)
- [Local Data Store](../LOCAL_DATA_STORE.md)
- [Software Design Document](../SOFTWARE_DESIGN_DOCUMENT.md)
- [Presentation API Design](../PRESENTATION_API_DESIGN.md)
- [Admin Page Notes](../ADMIN_PAGE.md)
- [Voice/STT Strategy](../STT_STRATEGY.md)
- [Milestone 4 Progress Update](MILESTONE_4_PROGRESS_UPDATE.md)
- [Milestone Schedule Update](SCHEDULE_UPDATE.md)
- [Milestone API Design Update](API_DESIGN_UPDATE.md)
- [Milestone Change Review](CHANGE_REVIEW.md)

---

# Milestone 4 Progress Update

Milestone period: May 12, 2026 to June 5, 2026
Document update date: June 10, 2026

## Individual Progress Update - Jinu Hong

Role: Full-stack developer / solo implementation lead

### Scheduled to Complete by Milestone 4

- Local Helper support for Ollama install/start/status.
- Local model catalog and model download flow.
- Claw Code installation support.
- Initial Profile Setup UI.
- Survey step layout.
- User/assistant profile database schema.
- README setup/build/test/run instructions.
- Bug tracking setup with GitHub Issues link.
- Beta deployment link.

### Scheduled to Be In Progress by Milestone 4

- Studio prompt generation flow.
- Assistant profile sync between desktop and web.
- Web assistant review/sharing surface.
- Voice and 2D character experimentation.
- Conversation memory support.
- Google Workspace context/action support.

### Actually Completed

- Built a desktop setup flow for local/cloud model setup.
- Added Ollama status/start/install, model catalog, model pull/cancel/delete support through Local Helper.
- Added Claw Code status/install/workspace/run support and connected it to setup/settings/studio UI.
- Redesigned the Survey/Profile UI into a more guided one-question-at-a-time personalization flow.
- Created assistant profile data flow with prompt settings, capabilities, sync metadata, and cloud API persistence.
- Added Studio prompt generation endpoints: `generate-questions`, `generate-preview`, `refine-rules`, and `finalize-prompt`.
- Added Runtime chat with local/cloud provider routing, streaming, Gemini vision fallback, Workspace context, tool context, and rolling memory summary injection.
- Added web console sections for devices, models, assistant profiles, API keys, usage, billing placeholder, admin, and Persona Hub/share pages.
- Added a server-seeded persona preset catalog for the assistant sharing surface.
- Added optional voice worker/Kokoro TTS path.
- Added 2D/Live2D character page and overlay runtime path.
- Added Google Workspace OAuth/status/context/action API paths.
- Added usage/admin APIs and local usage event sync.
- Prepared Vercel/Railway beta deployment links and release environment wiring.
- Updated README, schedule, API design, bug tracking, and Milestone 4 documentation.

### Partially Completed

| Item | Percent Complete | What Is Done | Remaining Work |
| --- | ---: | --- | --- |
| Studio prompt generation flow | 70% | Endpoint structure and desktop UI flow exist; assistant profile payloads can store prompt settings. | Need stronger validation, prompt quality QA, error states, and final user testing. |
| Persona Hub / assistant sharing | 55% | Web surface and persona preset catalog exist. | Need real import/export/community workflow and production moderation/data model. |
| Voice support | 45% | Optional voice worker and Kokoro TTS path exist. | STT, install robustness, voice UX, and clean Windows dependency checks remain. |
| 2D character / Live2D | 50% | Character page, catalog, overlay app, and Live2D runtime path exist. | Need asset polish, reaction mapping, viewport QA, and performance checks. |
| Conversation memory | 60% | Rolling summary memory can be injected into runtime prompts. | Need user controls, memory reset/export behavior, and longer conversation verification. |
| Google Workspace actions | 60% | OAuth/status/context/actions routes and runtime context path exist. | Need stricter confirmation, permission auditing, and more Gmail/Docs/Calendar QA. |
| Bug tracking in GitHub Issues | 80% | README and bug tracking docs link to GitHub Issues; issues [#1-#17](https://github.com/jimpmg123/MiVA/issues) were created for current bug/regression candidates. | Need to verify, prioritize, and close or update each issue during final QA. |

### Blockers / Risks

- Most development was done by one person, so independent feature verification was not completed.
- Implementation started late, and several broad features were added near the integration phase.
- Because MiVA combines local runtime setup, cloud sync, assistant customization, and optional voice/character features, keeping a narrow solo-project scope was difficult. The final release plan now treats the setup/runtime path as the required scope and the broader features as beta unless verified.
- Feature breadth is now larger than the original scope, so final release risk is mostly QA, polish, and bug fixing rather than missing prototype code.
- Workspace actions, provider key storage, local-helper security, and voice/character polish need careful final-release review.

## Group Progress Update

Team: MiVA
Team member currently represented in this milestone update: Jinu Hong

### Original Scope vs Current Beta

The original scope was a smaller local-first helper: help users install/start Ollama, download a local model, and prepare Claw Code or local coding support. By Milestone 4, MiVA expanded into a broader personalized assistant workspace:

- Desktop setup, Studio, and runtime chat.
- Survey-driven assistant personalization.
- Assistant profile sync through a cloud API.
- Web Persona Hub and assistant sharing surface.
- Voice worker and 2D/Live2D character support.
- Rolling conversation memory.
- Google Workspace context/actions.
- Usage/admin/billing placeholder pages and deployment wiring.

### Progress Assessment

Overall progress is slightly behind schedule on verification and polish, but ahead of the original feature scope in terms of implemented prototype breadth. Core beta use cases are now demonstrable, but several expanded features should be presented as beta/partial rather than final.

### Team Grade

We assess the current progress as a **B+**.

Reasoning: the project started late and peer verification is incomplete, but the beta now covers more than the original local-helper scope. The main product path is demonstrable: setup, model/runtime support, assistant profiles, Studio, web console, Persona Hub, voice/character beta, and cloud sync. The grade is not an A because QA, actual GitHub issue creation, production hardening, and final polish remain.

### Adjustment Plan

- Treat setup, Ollama/local-helper, assistant profiles, runtime chat, and beta web deployment as the primary final-release path.
- Keep Persona Hub, voice, character, memory, and Workspace actions as beta features unless final QA verifies them.
- Verify and prioritize GitHub Issues [#1-#17](https://github.com/jimpmg123/MiVA/issues), with serious bugs reserved for the next QA/fix window.
- Reserve the next schedule window for QA and bug fixing, not additional scope expansion.
- Update API docs again after any final route/schema changes.

## Beta Release

- Web beta: https://mi-va.vercel.app
- API health: https://miva-production.up.railway.app/health
- Desktop installer path: https://mi-va.vercel.app/downloads/MiVA-Desktop-setup.exe
- Repository: https://github.com/jimpmg123/MiVA

## Verification Evidence

The following checks were used as the current Milestone 4 verification record:

| Area | Verification | Result |
| --- | --- | --- |
| Local Helper | `npm run check --prefix apps/local-helper` | Passed. Validates Node syntax for server, chat, documents, voice, Workspace, and prompt modules. |
| Desktop release build path | `npm run check --prefix apps/desktop` | Passed. Builds the desktop React/Tauri frontend bundle used by release packaging. |
| Desktop Rust/Tauri backend | `cargo check` in `apps/desktop/src-tauri` | Passed with existing non-blocking warnings only. |
| Web beta | `GET https://mi-va.vercel.app` | Returned HTTP 200. |
| Cloud API health | `GET https://miva-production.up.railway.app/health` | Returned HTTP 200 with `ok: true`. |
| Desktop installer artifact | `HEAD https://mi-va.vercel.app/downloads/MiVA-Desktop-setup.exe` | Returned HTTP 200. Latest packaged installer in the repository is 41,969,173 bytes. |

## Milestone 4 Requirement Checklist

| Requirement | Status |
| --- | --- |
| README setup/build/test/run instructions | Completed |
| Bug report method and GitHub Issues link in README | Completed |
| Schedule update | Completed in `SCHEDULE_UPDATE.md` |
| API Design update | Completed in `API_DESIGN_UPDATE.md` |
| Bug tracking prepared | Completed in `BUG_TRACKING.md`; GitHub Issues [#1-#17](https://github.com/jimpmg123/MiVA/issues) created |
| Another teammate tests completed features | Not completed / skipped due solo workflow |
| Beta deployment link prepared | Completed |
| Individual progress update | Completed |
| Group progress update | Completed |
| Commit to GitHub repository | Completed in final milestone documentation push |

---

# Milestone 1-4 Schedule Update

Milestone period: May 12, 2026 to June 5, 2026
Document update date: June 10, 2026

## Summary

The original schedule was based on a smaller product: a local-first helper that installs/starts Ollama, supports model setup, and prepares Claw Code installation. During the milestone period, the scope expanded into a personalized assistant workspace with desktop setup, Studio prompt generation, runtime chat, cloud sync, web sharing, voice, character, memory, and Workspace integration.

Progress started later than planned and was mostly completed by one developer, so the schedule below reflects both the original plan and the expanded implementation reality.

## Completed / Adjusted Schedule

| Period | Planned Work | Actual Work Completed | Status |
| --- | --- | --- | --- |
| May 12-May 16 | Local helper architecture, initial runtime setup, chat memory exploration | Confirmed local-helper boundary, updated Workspace/chat memory direction, prepared first assistant runtime changes | Completed |
| May 17-May 23 | Ollama setup, local helper install/start flow, README and web checks | Preserved assistant model selection, added voice settings/worker scaffold, replaced Workspace CLI with direct Google API direction, updated README/web checks | Completed |
| May 24-May 30 | Local model runtime polish, optional voice path | Added local Kokoro TTS runtime path and planned voice worker integration | Completed |
| May 31-June 2 | Database/API schema, web console profile review, bug tracking docs | Updated API schema, Workspace services, local helper voice/runtime paths, web console assistant review, deployment/API/bug tracking docs, setup chat bug fix | Completed |
| June 3-June 5 | Integration and beta release | Added Claw Code agent service and install UI, character overlay, Live2D runtime, Studio/runtime pages, streaming chat, vision, documents, Workspace APIs, dev services, desktop shell, web redesign/i18n, and release packaging docs | Completed |

## Updated Feature Status

| Feature / Work Item | Original Plan Status | Milestone 4 Status | Notes |
| --- | --- | --- | --- |
| Ollama install/start support | Core scope | Completed | Desktop/local-helper can detect, start, and guide Ollama/model setup. |
| Model catalog and model download | Core scope | Completed | Local helper supports allowed catalog, status, pull, cancel, and delete flows. |
| Claw Code install helper | Core scope | Completed | Added setup/settings/studio UI and local-helper service path. Runtime routing is functional but still needs deeper test coverage. |
| Initial profile setup UI | Added scope | Completed | Survey/profile setup flow was redesigned into a clearer one-question-at-a-time flow. |
| Survey-based personalization | Added scope | Completed | Survey answers drive assistant profile defaults and Studio context. |
| User/assistant profile database schema | Added scope | Completed | Cloud API and Prisma-backed profile sync path exist. |
| Studio prompt generation flow | Added scope | In Progress | Implemented question/preview/refine/finalize endpoint structure and desktop UI. Needs final QA, stronger validation, and documentation polish. |
| Runtime chat | Added scope | Completed | Supports local/cloud routing, streaming, Workspace context, images/vision path, tool context, and memory summary. |
| Rolling conversation memory | Added scope | Partially completed | Runtime can pass rolling memory into model context. Needs user-facing controls and long-run verification. |
| Web Persona Hub / assistant sharing area | Added scope | Partially completed | Web has Persona Hub/share surface and persona presets. Import/export/community workflow is still placeholder-like. |
| 2D character / Live2D | Added scope | Partially completed | Character page/overlay/runtime path exists. Needs final asset polish and interaction testing. |
| Voice / Kokoro TTS | Added scope | Partially completed | Optional voice worker and TTS endpoint exist. STT remains planned. |
| Google Workspace context/actions | Added scope | Partially completed | OAuth/status/context/action routes exist. Needs stricter production permission and verification passes. |
| Beta deployment link | Milestone 4 requirement | Completed | Web beta: https://mi-va.vercel.app. API health: https://miva-production.up.railway.app/health. |
| Completed-feature peer verification | Milestone task | Not completed | Skipped per project constraint and current solo workflow. Bug verification plan is documented instead. |

## Remaining Schedule After Milestone 4

| Target Date | Work Item | Owner | Priority |
| --- | --- | --- | --- |
| June 6-June 9 | Milestone documentation, README, API update, bug tracking, beta link verification | Jinu Hong | High |
| June 10-June 13 | Run focused QA on setup, model download, runtime chat, profile sync, Persona Hub, voice, character overlay, and Studio question generation | Jinu Hong | High |
| June 14-June 17 | Fix serious bugs from GitHub Issues [#1-#17](https://github.com/jimpmg123/MiVA/issues); verify Workspace and Claw Code edge cases | Jinu Hong | High |
| June 18-June 20 | Production packaging, desktop installer refresh, Vercel/Railway smoke test | Jinu Hong | High |
| Final release window | Final polish, test evidence, presentation/demo script, final report/API docs | Jinu Hong | High |

## Schedule Adjustments

- The schedule changed from a narrow local-helper deliverable to a broader assistant platform beta.
- The broadened scope increased feature surface area but left less time for peer verification and test coverage.
- Serious bugs will be handled by Jinu Hong through GitHub Issues [#1-#17](https://github.com/jimpmg123/MiVA/issues) with a verification plan and schedule slot.
- Voice, character, Persona Hub sharing, and Workspace actions should be presented as beta/partial features unless final QA verifies them before release.

---

# Milestone 4 API Design Update

Milestone period: May 12, 2026 to June 5, 2026
Document update date: June 10, 2026

## API Architecture

MiVA now uses two API layers:

| Layer | Runtime | Purpose |
| --- | --- | --- |
| Cloud API | NestJS + Prisma + Supabase PostgreSQL, deployed to Railway | Account/session auth, device sync, assistant profile sync, provider key metadata, usage/admin data, Google Workspace OAuth/context/actions, Studio generation endpoints, persona preset catalog. |
| Local Helper API | Node.js localhost service, bundled with desktop/local dev | Ollama detection/start/install, local model pull/delete/cancel, chat routing, cloud-provider forwarding, Claw Code, voice worker bridge, image/document extensions, Workspace runtime context. |

Production links prepared for beta:

- Web console: https://mi-va.vercel.app
- Cloud API health: https://miva-production.up.railway.app/health
- GitHub Issues: https://github.com/jimpmg123/MiVA/issues

## Cloud API Endpoints

| Method | Endpoint | Purpose | Milestone 4 Status |
| --- | --- | --- | --- |
| `GET` | `/health` | Cloud API health check | Implemented |
| `GET` | `/me` | Resolve current bearer-token user | Implemented |
| `POST` | `/auth/login` | Local development login | Implemented, dev-only |
| `POST` | `/auth/google` | Google ID token login/session creation | Implemented |
| `POST` | `/auth/device/start` | Start desktop device login flow | Implemented, in-memory |
| `GET` | `/auth/device/:deviceCode` | Desktop polls device login status | Implemented, in-memory |
| `POST` | `/auth/device/complete` | Web completes desktop login | Implemented, in-memory |
| `GET` | `/catalog/models` | Return allowed lightweight model catalog | Implemented |
| `GET` | `/catalog/persona-presets` | Return server-seeded persona/assistant sharing presets | Implemented, draft schema |
| `GET` | `/devices` | List current user's devices | Implemented |
| `POST` | `/devices` | Register/update desktop device | Implemented |
| `GET` | `/api-keys` | List provider credential metadata | Implemented |
| `GET` | `/api-keys/sync` | Sync provider key metadata for desktop/client use | Implemented |
| `POST` | `/api-keys` | Save provider credential metadata/key material | Implemented |
| `POST` | `/api-keys/:keyId/test` | Test/mark provider key | Implemented |
| `GET` | `/assistant-profiles` | List synced assistant profiles | Implemented |
| `POST` | `/assistant-profiles` | Create/upsert synced assistant profile | Implemented |
| `GET` | `/assistant-profiles/:profileId` | Read one synced assistant profile | Implemented |
| `PATCH` | `/assistant-profiles/:profileId` | Update one assistant profile | Implemented |
| `DELETE` | `/assistant-profiles/:profileId` | Delete one assistant profile | Implemented |
| `POST` | `/usage-events` | Record simple web usage events | Implemented |
| `GET` | `/usage/summary` | Return user usage summary | Implemented |
| `POST` | `/usage/local-events` | Sync local runtime usage metadata | Implemented |
| `GET` | `/admin/stats` | Admin dashboard statistics | Implemented |
| `GET` | `/workspace/google/status` | Return Google Workspace connection state | Implemented |
| `GET` | `/workspace/google/auth-url` | Create Workspace OAuth authorization URL | Implemented |
| `GET` | `/workspace/google/callback` | Complete Workspace OAuth callback | Implemented |
| `POST` | `/workspace/google/token` | Save Workspace token from web fallback | Implemented |
| `POST` | `/workspace/context` | Fetch bounded Workspace context for prompts | Implemented |
| `POST` | `/workspace/actions` | Run approved Workspace actions | Implemented, needs strict QA |
| `POST` | `/studio/generate-questions` | Generate Studio follow-up questions for assistant creation | Implemented |
| `POST` | `/studio/generate-preview` | Generate preview assistant prompt/rules | Implemented |
| `POST` | `/studio/refine-rules` | Refine prompt rules from Studio edits | Implemented |
| `POST` | `/studio/finalize-prompt` | Finalize generated assistant prompt | Implemented |

## Local Helper Endpoints

| Method | Endpoint | Purpose | Milestone 4 Status |
| --- | --- | --- | --- |
| `GET` | `/health` | Local helper health check | Implemented |
| `GET` | `/ollama/status` | Detect Ollama install/running/models | Implemented |
| `POST` | `/ollama/start` | Start Ollama locally | Implemented |
| `POST` | `/ollama/install` | Install Ollama through supported local path | Implemented |
| `GET` | `/catalog/models` | Return allowed local model catalog | Implemented |
| `GET` | `/models` | Return model catalog with installed flags | Implemented |
| `POST` | `/models/pull` | Download allowed Ollama model with progress | Implemented |
| `POST` | `/models/pull/cancel` | Cancel model download | Implemented |
| `POST` | `/models/delete` | Delete local Ollama model | Implemented |
| `POST` | `/chat` | Route chat to Ollama/OpenAI/Gemini/Groq with optional streaming, memory, vision, Workspace, and Claw Code context | Implemented |
| `GET` | `/voice/status` | Check optional voice worker state | Implemented |
| `POST` | `/voice/start` | Start voice worker | Implemented |
| `POST` | `/voice/install-kokoro` | Install Kokoro TTS dependencies | Implemented |
| `POST` | `/voice/tts` | Generate local TTS audio through voice worker | Implemented |
| `GET` | `/claw-code/status` | Check Claw Code setup state | Implemented |
| `POST` | `/claw-code/install` | Install/prepare Claw Code agent support | Implemented |
| `POST` | `/claw-code/workspace` | Select or store Claw Code workspace | Implemented |
| `POST` | `/claw-code/run` | Run Claw Code agent path | Implemented |
| `GET` | `/image-gen/status` | Check image generation extension status | Implemented |
| `POST` | `/image-gen/generate` | Generate image through configured provider path | Implemented |
| `POST` | `/documents/analyze` | Analyze document input through local helper path | Implemented |
| `POST` | `/debug/client-log` | Append client debug log for local troubleshooting | Implemented, dev/debug use |

## Updated Data and Capability Design

### Assistant Profiles

Assistant profiles now include:

- Use case, answer style, priority, language mode, and local/cloud mode.
- Provider and model selection.
- Prompt configuration and generated prompt settings.
- Capabilities such as voice, character, Workspace, coding/Claw Code, files/tools, and imported skills.
- Cloud sync metadata while keeping chat transcripts local by default.

### Persona Presets / Sharing

`GET /catalog/persona-presets` provides draft server-seeded presets used by the web Persona Hub/share surface. This is currently a beta sharing/catalog model rather than a full community marketplace.

### Studio Generation

The Studio API group supports assistant-building steps:

1. Generate follow-up questions from user profile/context.
2. Generate preview prompt/rules.
3. Refine rules.
4. Finalize prompt.

This flow is implemented but should be treated as beta because validation, QA, and final prompt quality tuning are still in progress.

### Runtime Chat

`POST /chat` now supports:

- Ollama local runtime.
- Cloud providers: OpenAI, Gemini, Groq.
- Streaming responses.
- Image attachment routing through Gemini vision.
- Rolling memory summary injection.
- Tool context injection.
- Google Workspace slash/context/action path.
- Claw Code routing when enabled by profile or forced command.

## Endpoint Schemas and Examples

The examples below document the main request/response shapes expected for Milestone 4 grading. IDs and timestamps are examples.

### Auth: `POST /auth/google`

Request:

```json
{
  "idToken": "google-id-token-from-web-client"
}
```

Response:

```json
{
  "session": {
    "token": "miva-session-token",
    "user": {
      "id": "user_123",
      "email": "student@example.com",
      "displayName": "Jinu Hong",
      "role": "USER",
      "locale": "en"
    }
  }
}
```

### Assistant Profiles: `POST /assistant-profiles`

Request:

```json
{
  "name": "Study Assistant",
  "description": "Explains course material and helps with assignments.",
  "provider": "ollama",
  "model": "llama3.2:3b",
  "answerStyle": "moderate",
  "localMode": "hybrid",
  "prompt": {
    "systemPrompt": "You are MiVA...",
    "settings": {
      "persona": "Patient study assistant",
      "roleGoal": "Help the user understand class material",
      "responseRules": ["Use clear steps", "Ask when requirements are ambiguous"]
    }
  },
  "capabilities": {
    "voice": { "enabled": false },
    "character": { "enabled": false },
    "googleWorkspace": { "enabled": false },
    "coding": { "capability": "chatOnly" }
  }
}
```

Response:

```json
{
  "profile": {
    "id": "profile_123",
    "name": "Study Assistant",
    "provider": "ollama",
    "model": "llama3.2:3b",
    "updatedAt": "2026-06-09T00:00:00.000Z"
  }
}
```

### Studio Prompt Generation: `POST /studio/generate-preview`

Request:

```json
{
  "assistantPurpose": "Study support",
  "userProfile": {
    "educationLevel": "College",
    "majorOrField": "Computer Science",
    "expertiseLevel": "Intermediate"
  },
  "answers": [
    {
      "question": "What should this assistant help with most?",
      "answer": "Summarize lecture material and help draft assignment answers."
    }
  ]
}
```

Response:

```json
{
  "preview": {
    "persona": "Patient CS study assistant",
    "roleGoal": "Help the user understand course material and produce useful drafts.",
    "responseRules": [
      "Start with the direct answer.",
      "Use steps when explaining technical concepts.",
      "End with a sentence the user can reuse when appropriate."
    ],
    "systemPrompt": "You are MiVA..."
  }
}
```

### Workspace Context: `POST /workspace/context`

Request:

```json
{
  "services": ["gmail", "calendar", "drive"],
  "prompt": "What should I prepare for tomorrow?",
  "maxResults": 5
}
```

Response:

```json
{
  "context": "Recent Gmail messages: ...\nUpcoming Calendar events: ...",
  "sources": [
    { "service": "gmail", "count": 5 },
    { "service": "calendar", "count": 3 }
  ]
}
```

### Workspace Actions: `POST /workspace/actions`

Request:

```json
{
  "action": "calendar.createEvent",
  "confirmed": true,
  "payload": {
    "title": "Study session",
    "start": "2026-06-10T19:00:00+09:00",
    "end": "2026-06-10T20:00:00+09:00"
  }
}
```

Response:

```json
{
  "ok": true,
  "service": "calendar",
  "action": "calendar.createEvent",
  "result": {
    "id": "calendar_event_123",
    "status": "created"
  }
}
```

### Local Helper Chat: `POST /chat`

Request:

```json
{
  "provider": "ollama",
  "model": "llama3.2:3b",
  "prompt": "Summarize this project status.",
  "locale": "en",
  "stream": true,
  "profile": {
    "name": "Study Assistant",
    "answerStyle": "moderate",
    "prompt": {
      "settings": {
        "persona": "Patient study assistant",
        "responseRules": ["Use Markdown when helpful"]
      }
    }
  },
  "messages": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ],
  "memorySummary": "The user is working on MiVA Milestone 4.",
  "toolContext": "Connected local tool context, if any."
}
```

Streaming response uses newline-delimited JSON:

```json
{"message":{"role":"assistant","content":"## Summary\n"}}
{"message":{"role":"assistant","content":"MiVA is ready for beta review."}}
{"done":true,"answer":"## Summary\nMiVA is ready for beta review."}
```

## Security and Privacy Boundaries

- Local chat content remains local by default.
- Cloud API stores users, sessions, devices, assistant settings, provider key metadata, usage metadata, and Workspace token metadata.
- Production provider key storage should be encrypted at rest.
- Workspace write actions must require confirmation.
- Local Helper must remain localhost-only and should not expose arbitrary shell execution to hosted web pages.
- Desktop/web production URLs are configured through `release.env` and build-time environment variables.

## API Items Still Needing Final Release Work

| Item | Status |
| --- | --- |
| Full production-grade provider key encryption | Planned |
| Stronger local-helper request authentication from hosted web console | Planned |
| Persistent device auth request storage | Planned; currently in-memory |
| Persona Hub real import/export/community workflow | Partial |
| Studio prompt-generation QA and validation | In progress |
| Workspace action permission and audit hardening | In progress |
| Voice STT support | Planned |

---

# Milestone 4 Bug Tracking

Milestone period: May 12, 2026 to June 5, 2026
Document update date: June 10, 2026

## GitHub Issues

- Issue list: https://github.com/jimpmg123/MiVA/issues
- New issue form: https://github.com/jimpmg123/MiVA/issues/new

GitHub Issues is the bug tracking system for MiVA. This document lists the current bugs and regression checks mirrored into GitHub Issues for Milestone 4 and final release work.

## Reporting Instructions

When reporting a bug, include:

- Clear title.
- Environment: desktop/web/API/local-helper/voice-worker, OS, browser, model provider, and whether the app was local or deployed.
- Steps to reproduce.
- Expected result.
- Actual result.
- Screenshots, logs, API responses, or console errors if available.
- Severity: Critical, Major, Minor, Low.
- Verification plan.

## Bug List / GitHub Issue Candidates

| Issue ID | Title | Status | Severity | GitHub Issue | Verification Plan |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Initial setup test chat intro card blocked chat content | Fixed (closed via 651d640) | Minor | [#1](https://github.com/jimpmg123/MiVA/issues/1) | Open setup chat and confirm intro card does not cover messages or composer. |
| BUG-002 | Runtime sidebar showed misleading conversation grouping | Fixed (closed via ae82c7b, 7f4b831) | Minor | [#2](https://github.com/jimpmg123/MiVA/issues/2) | Open runtime sidebar and verify assistant/conversation grouping is understandable. |
| BUG-003 | Deleted local assistant can remain visible in web console after sync | Needs verification | Major | [#3](https://github.com/jimpmg123/MiVA/issues/3) | Delete a local assistant, sync, refresh web console, and confirm removal. |
| BUG-004 | Google Workspace context is not consistently trusted by every model | In progress | Major | [#4](https://github.com/jimpmg123/MiVA/issues/4) | Ask Gmail/Docs/Calendar questions with Gemini/OpenAI and verify injected context is used correctly. |
| BUG-005 | Ollama can initially use CPU instead of GPU | Fixed, needs environment verification | Major | [#5](https://github.com/jimpmg123/MiVA/issues/5) | Run a local model and check `ollama ps` plus GPU utilization. |
| BUG-006 | Local Helper unavailable errors need clearer runtime recovery UI | Open | Major | [#6](https://github.com/jimpmg123/MiVA/issues/6) | Stop Local Helper, send a runtime message, and confirm the UI tells the user how to recover. |
| BUG-007 | Model download failure/cancel may leave stale progress state | Open | Major | [#7](https://github.com/jimpmg123/MiVA/issues/7) | Cancel and fail a model pull; verify the progress UI resets and offers retry. |
| BUG-008 | Cloud/local assistant sync conflict behavior is not fully defined | Open | Major | [#8](https://github.com/jimpmg123/MiVA/issues/8) | Edit same assistant locally and remotely; verify conflict behavior and user-facing status. |
| BUG-009 | Admin-only API access needs normal-user denial verification | Open | Critical | [#9](https://github.com/jimpmg123/MiVA/issues/9) | Call admin endpoints with a normal user token and confirm access is denied. |
| BUG-010 | Persona Hub sharing/import workflow is still beta placeholder | Open | Minor | [#10](https://github.com/jimpmg123/MiVA/issues/10) | Verify web users understand presets are beta and cannot assume full community import/export. |
| BUG-011 | Voice worker/Kokoro install may fail silently on missing Python packages | Open | Major | [#11](https://github.com/jimpmg123/MiVA/issues/11) | Run install/start on a clean Windows machine and verify actionable errors. |
| BUG-012 | Live2D/2D character overlay needs viewport and asset loading regression test | Open | Minor | [#12](https://github.com/jimpmg123/MiVA/issues/12) | Open character page/overlay at desktop viewport and confirm assets render without overlap. |
| BUG-013 | Billing route deployment needs verification | Open | Minor | [#13](https://github.com/jimpmg123/MiVA/issues/13) | Deploy web, open `https://mi-va.vercel.app/?page=billing`, and verify Billing page is active. |
| BUG-014 | Studio question generation can fall back after OpenAI timeout | Fixed (closed via 143bbe1, c020bf6) | Major | [#14](https://github.com/jimpmg123/MiVA/issues/14) | Use the packaged app against Railway, generate Studio questions for study/coding/companion assistants, and confirm no blocking `Failed to fetch` error appears. |
| BUG-015 | Material Symbols icons render as missing glyphs when offline or packaged | Fixed (closed via 20f5c6b) | Minor | [#15](https://github.com/jimpmg123/MiVA/issues/15) | Run the packaged desktop app offline and confirm Studio/setup icons render instead of showing boxes. |
| BUG-016 | Deployed web console cannot reach the local helper (CORS origin not allowed) | Fixed (closed via d763fea) | Major | [#16](https://github.com/jimpmg123/MiVA/issues/16) | Run the local helper, open https://mi-va.vercel.app, and confirm Local Helper shows Connected (GET /health returns access-control-allow-origin). |
| BUG-017 | Studio Models list drag-to-reorder did not work in the desktop (Tauri) build | Fixed (pointer-based reorder; commit pending) | Minor | [#17](https://github.com/jimpmg123/MiVA/issues/17) | In Studio > Models, drag a row by its handle above/below another row; confirm the order changes, persists as User sort, and survives navigating away and back. |

## Serious Bug Policy

A bug is serious if it is Critical severity or Major severity with user-facing impact. Serious bugs must have:

- GitHub Issue created.
- Expected fix or investigation date.
- Verification plan.
- Schedule slot in `SCHEDULE_UPDATE.md`.

MiVA is currently a solo project, so all bug candidates are owned by Jinu Hong. Serious bug fixing time is reserved in the remaining schedule.

## GitHub Issue Template

```md
## Summary

## Environment
- App area:
- OS/browser:
- Local or deployed:
- Provider/model:

## Steps to Reproduce
1.
2.
3.

## Expected Result

## Actual Result

## Evidence

## Severity
Critical / Major / Minor / Low

## Verification Plan
```

## Peer Verification Note

The milestone instruction recommends having another teammate verify completed features. MiVA is currently being implemented as a solo workflow, so the peer verification step was not completed. Instead, this bug list provides the verification plan that should be used for final-release QA.

---

# Milestone 1-4 Change Review

Milestone period: May 12, 2026 to June 5, 2026
Document update date: June 10, 2026

## Scope Context

The original planned scope for MiVA was intentionally narrow: a local helper that could help non-technical users install/start Ollama and prepare Claw Code/local coding support. Because implementation started late and was mostly completed by one person, the project initially needed to stay small enough to ship.

During Milestones 1-4, the scope expanded beyond that local-helper baseline. The implemented beta now includes survey-driven assistant personalization, desktop setup/studio/runtime flows, synced assistant profiles, a web Persona Hub-style sharing area, voice and 2D character work, rolling conversation memory, Workspace context/action support, and a broader cloud API.

Git commit timestamps are concentrated near the end of the period, especially June 5, but the documentation below distributes the work across the full May 12-June 5 milestone window as design, implementation, integration, and documentation activity.

## Reviewed Change Sources

- `git log --since=2026-05-12 --until=2026-06-06`
- Current working tree diff/stat across `apps/api`, `apps/desktop`, `apps/local-helper`, `apps/voice-worker`, `apps/web`, and `docs`
- Milestone PDF requirements from `Project_Milestones_1_4_S26.pdf`
- Existing project docs: README, API design, bug list, deployment/go-live docs, software design document, and work priorities

## Current Working Tree Summary

The active working tree contains changes across 56 tracked files with about 5,777 insertions and 1,514 deletions. The largest changed areas are:

| Area | Main Change Themes |
| --- | --- |
| `apps/desktop` | Setup navigation, Studio, runtime chat, assistant cards, prompt generation UI, character page, Live2D/overlay, rolling memory, profile menu, settings, packaging dependencies. |
| `apps/api` | Catalog expansion, persona presets, API key sync, Studio prompt-generation endpoints, Workspace and usage APIs. |
| `apps/local-helper` | Chat routing, provider/tool prompts, Workspace context/actions, Claw Code service, voice worker bridge, image/document routes. |
| `apps/voice-worker` | Local voice worker endpoint improvements for Kokoro/local TTS path. |
| `apps/web` | Web console expansion, Persona Hub/share page, billing route, assistant profile/API service updates. |
| `docs` | Design documentation updates and this Milestone 4 documentation package. |

## Feature Expansion From Original Scope

| Original / Narrow Scope | Added During Milestones 1-4 |
| --- | --- |
| Local Helper starts/installs Ollama | Full local helper routes for model status, model pull/delete/cancel, chat routing, voice, Claw Code, Workspace, image/document extensions. |
| Claw Code install support | Claw Code setup/settings/studio UI, runtime routing, and OpenAI-backed agent service path. |
| Basic desktop setup | Survey-based profile setup, one-question-at-a-time user profile flow, model recommendation, assistant profile sync, setup persistence. |
| Local model runtime | Local/cloud provider routing for Ollama, OpenAI, Gemini, Groq, streaming chat, image/vision fallback, prompt capability injection. |
| Minimal web console/mockup | Hosted web console with devices, models, profiles, API keys, usage, billing placeholder, admin, Persona Hub/share surface. |
| No voice/character requirement | Optional voice worker, Kokoro TTS path, voice settings, 2D/Live2D character page and overlay runtime. |
| No memory requirement | Rolling assistant memory summary support in runtime chat and prompt context. |

## Milestone Documentation Actions

This milestone package adds or updates:

- Root `README.md` with setup/build/test/run instructions, beta links, and GitHub Issues bug reporting.
- `docs/milestone/README.md` as the milestone submission copy of README.
- `docs/milestone/SCHEDULE_UPDATE.md`
- `docs/milestone/API_DESIGN_UPDATE.md`
- `docs/milestone/BUG_TRACKING.md`
- `docs/milestone/MILESTONE_4_PROGRESS_UPDATE.md`
