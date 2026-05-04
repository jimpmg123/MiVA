# MiVA Scope 1 Completion Target

Last updated: 2026-05-04

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

The API is still a temporary Node service for contract testing.

Required:

- `GET /health`
- `GET /assistant-profiles`
- `POST /assistant-profiles`
- `PATCH /assistant-profiles/:id`
- `DELETE /assistant-profiles/:id`
- `POST /assistant-profiles/:id/finalize`
- `GET /admin/stats`
- Development auth endpoints.
- Device auth scaffolding for later desktop/web login.

The API can remain in-memory for Scope 1. Persistence moves to NestJS, Prisma, and PostgreSQL after the data design is finalized.

## Out Of Scope For Scope 1

- Production Google OAuth.
- Real payment processing.
- Real billing enforcement.
- Production database migration.
- Full NestJS migration.
- Real installer release pipeline.
- Real TTS.
- Real STT.
- Live2D character runtime.
- Google Workspace actions.
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

