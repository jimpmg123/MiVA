# MiVA Scope 1 Completion Target

Last updated: 2026-06-01

## Goal

Scope 1 should prove that MiVA can work as a local-first assistant platform:

```text
Desktop app creates and runs an assistant locally.
Web console can show the assistant profile after manual sync.
```

The goal is not to finish the final SaaS product. The goal is to make the first app/web loop stable enough to demonstrate and continue designing from.

## Desktop App Scope

The desktop app is the primary Scope 1 product.

Required:

- Setup mode for first-time local assistant setup.
- Studio mode for managing assistant profiles after setup.
- Runtime mode for persistent local chat.
- Local assistant profile storage on the user's PC.
- Multiple local assistants with create, edit, delete, select, and finalize actions.
- Survey-driven setup inputs:
  - use case
  - answer style
  - priority
  - language preference
  - local/cloud/hybrid mode
  - future features
- Hardware check for local model recommendation.
- Ollama status, start, install, and local model download flow.
- Lightweight local model catalog:
  - `llama3.2:3b`
  - `qwen3:4b`
  - `exaone3.5:2.4b`
  - `exaone3.5:7.8b`
  - `gemma3:4b`
  - `phi3:mini`
- Cloud provider selection for development testing:
  - OpenAI
  - Gemini
  - Groq
- Provider key override fields stored locally.
- Simple and developer prompt builders.
- Coding capability policy for assistants:
  - chat only
  - code explanation
  - code editing
  - Claw Code
- Coding guardrail:
  - code editing and Claw Code should prefer or require cloud/API models by default.
  - local coding fallback must be explicitly marked experimental.
- Test chat for setup validation.
- Runtime chat saved locally across app restarts.
- Manual `Sync to Web` button from Desktop Studio.

## Web Scope

The web app is a Scope 1 companion console, not the main runtime.

Required:

- Public home page before login.
- Development login state:
  - guest
  - user
  - admin
- My Assistants view that reads synced assistant profiles from the API.
- Assistant profile detail cards showing:
  - assistant name and description
  - provider and model
  - survey preferences
  - prompt summary
  - coding capability policy
  - source badge such as `desktop-setup`
- Admin analytics view for development:
  - synced assistant count
  - provider count
  - model count
  - local mode count
  - coding capability count
  - recent sync events
- API key management planning screen.
- Usage and billing planning screens may remain mock screens.

## API Scope

The API now runs as a NestJS service backed by Prisma and Supabase PostgreSQL.

Required:

- `GET /health`
- `GET /me`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/device/start`
- `GET /auth/device/:deviceCode`
- `POST /auth/device/complete`
- `GET /catalog/models`
- `GET /devices`
- `POST /devices`
- `GET /assistant-profiles`
- `POST /assistant-profiles`
- `GET /assistant-profiles/:profileId`
- `PATCH /assistant-profiles/:profileId`
- `DELETE /assistant-profiles/:profileId`
- `GET /api-keys`
- `POST /api-keys`
- `POST /api-keys/:keyId/test`
- `POST /usage-events`
- `GET /usage/summary`
- `POST /usage/local-events`
- `GET /admin/stats`
- `GET /workspace/google/status`
- `GET /workspace/google/auth-url`
- `GET /workspace/google/callback`
- `POST /workspace/google/token`
- `POST /workspace/context`
- `POST /workspace/actions`

Some short-lived device-auth and OAuth state can remain in memory during Scope 1, but durable account, device, assistant profile, Workspace connection, provider credential, and usage data should stay in PostgreSQL.

## Out Of Scope For Scope 1

- Production hardening for Google OAuth.
- Real payment processing.
- Real billing enforcement.
- Production database hardening.
- Advanced backend modules beyond the current NestJS service split.
- Real installer release pipeline.
- Production-grade TTS.
- Real STT.
- Live2D character runtime.
- Production-grade Google Workspace automation beyond the current bounded context/action MVP.
- MCP server execution.
- Automatic cloud sync.
- Conflict resolution between web and desktop profiles.
- Remote execution of local tools.

## Completion Checklist

Scope 1 is complete when:

- A user can create or select a desktop assistant profile.
- The profile can be finalized locally.
- The profile can chat through either local Ollama or a configured cloud provider.
- Runtime chat persists locally after restart.
- The profile can be manually synced to the API.
- The web app shows the synced profile in My Assistants.
- Admin analytics updates after sync.
- The project passes:
  - `node scripts/check.mjs`
  - `node scripts/build.mjs` in `apps/desktop`
  - `cargo check` in `apps/desktop/src-tauri`
