# Milestone 4 API Design Update

Milestone period: May 12, 2026 to June 5, 2026  
Document update date: June 9, 2026

## API Architecture

MiVA now uses two API layers:

| Layer | Runtime | Purpose |
| --- | --- | --- |
| Cloud API | NestJS + Prisma + Supabase PostgreSQL, deployed to Railway | Account/session auth, device sync, assistant profile sync, provider key metadata, usage/admin data, Google Workspace OAuth/context/actions, Studio generation endpoints, persona preset catalog. |
| Local Helper API | Node.js localhost service, bundled with desktop/local dev | Ollama detection/start/install, local model pull/delete/cancel, chat routing, cloud-provider forwarding, Claw Code, voice worker bridge, Daiso/image/document extensions, Workspace runtime context. |

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
| `GET` | `/daiso/status` | Check Daiso CLI bridge availability | Implemented |
| `POST` | `/daiso/run` | Run Daiso CLI bridge command | Implemented |
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

