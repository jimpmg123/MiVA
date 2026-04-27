# MiVA Initial Design

## 1. Product Concept

MiVA is a service that helps non-technical users create and run their own personal AI assistant on their computer.

The core idea is:

- Users should not need to understand API keys, prompts, model installation, or local runtime setup.
- The AI assistant should run locally when possible.
- Sensitive user data should stay on the user's computer by default.
- The web service should provide assistant management, model recommendations, templates, and setup guidance.

Initial positioning:

> MiVA: a personal AI assistant that runs on your own computer.

Korean positioning:

> MiVA: 내 컴퓨터에서 돌아가는 나만의 AI 비서

## 2. Core Validation Goal

The first thing to prove is not the full web service.

The first validation target is:

> Can a user install a local app, download a lightweight local model through that app, and use that model from a web UI as an AI assistant?

Minimum success flow:

1. User installs MiVA Local Helper.
2. Local Helper detects whether Ollama is installed and running.
3. Local Helper downloads a lightweight model.
4. Web UI connects to Local Helper through localhost.
5. Web UI sends a chat request.
6. Local Helper forwards the request to Ollama.
7. Ollama runs the local model and returns the answer.
8. Web UI displays the assistant response.

Target local URL:

```text
http://localhost:43110
```

Ollama default URL:

```text
http://localhost:11434
```

## 3. High-Level Architecture

```text
Browser / MiVA Web
  -> MiVA API Server
     - account
     - assistant settings
     - model catalog
     - templates
     - device records

Browser / MiVA Web
  -> Localhost MiVA Local Helper
     - local connection status
     - model installation
     - local chat requests

MiVA Local Helper
  -> Ollama
     - model pull
     - model list
     - chat generation
```

Sensitive assistant conversations should not need to pass through the central MiVA API server in the default local mode.

## 4. Planned Tech Stack

Recommended stack:

```text
Frontend: Next.js
Backend API: NestJS
Database: PostgreSQL
ORM: Prisma
Local install app: Tauri
Local model runtime: Ollama
Package manager: pnpm
Monorepo: Turborepo
```

Reasoning:

- Next.js is suitable for the web dashboard and assistant UI.
- NestJS is suitable for a structured backend with users, devices, assistants, catalogs, templates, and statistics.
- PostgreSQL is the safest default relational database.
- Prisma gives typed database access from TypeScript.
- Tauri is a good fit for a lightweight installable local helper app.
- Ollama handles local model download, storage, and inference.

FastAPI may be added later for separate AI-related server workloads, but it is not needed for the first version.

## 5. Monorepo Structure

Planned structure:

```text
MiVA
├─ apps
│  ├─ web
│  ├─ api
│  └─ local-helper
├─ packages
│  ├─ shared
│  └─ config
├─ infra
│  └─ docker-compose.yml
└─ docs
   └─ initial-design.md
```

## 6. Local Helper Responsibilities

MiVA Local Helper is the installable app users run on their computer.

Initial responsibilities:

- Run a local API server.
- Check whether Ollama is installed.
- Check whether Ollama is running.
- Start or guide the user to start Ollama.
- List installed Ollama models.
- Download allowed models through Ollama.
- Forward chat requests to Ollama.
- Stream model responses back to the web UI.

Future responsibilities:

- Pair with the user's MiVA web account.
- Manage local memory.
- Run Google Workspace CLI commands.
- Run local TTS engines.
- Integrate with Open-LLM-VTuber.
- Provide diagnostics and repair actions.
- Support auto-update.
- Run in the system tray.

## 7. Local Helper API Draft

Local Helper should expose APIs similar to:

```text
GET  /health
GET  /ollama/status
GET  /models
POST /models/pull
POST /chat
```

Future security-related APIs:

```text
GET  /pairing-code
POST /pair
POST /disconnect
```

Model pull flow:

```text
Web UI
  -> POST http://localhost:43110/models/pull
Local Helper
  -> POST http://localhost:11434/api/pull
Ollama
  -> downloads model and streams progress
Local Helper
  -> returns progress to Web UI
```

Chat flow:

```text
Web UI
  -> POST http://localhost:43110/chat
Local Helper
  -> POST http://localhost:11434/api/chat
Ollama
  -> local model response
Local Helper
  -> streams answer to Web UI
```

## 8. Security Notes

The Local Helper must not accept arbitrary requests from any website.

Required protections:

- Only allow trusted origins.
- Use a pairing code for first connection.
- Use a local token after pairing.
- Validate model names against an allowlist.
- Do not expose arbitrary command execution to the web.
- Do not send sensitive local data to the MiVA server by default.

Basic pairing idea:

1. Local Helper generates a pairing code.
2. User enters the code on the MiVA website.
3. MiVA Web stores a local token in the browser.
4. Local Helper only accepts requests with the valid token.

## 9. Lightweight Model Strategy

Strong/heavy models are excluded from the first phase.

Initial local model candidates:

```text
qwen3:4b
llama3.2:3b
gemma3:4b
phi3:mini
```

Initial recommendation:

```text
Default Korean/general assistant: qwen3:4b
Low-spec fallback: llama3.2:3b
Alternative lightweight option: gemma3:4b
Very small fallback: phi3:mini
```

The model catalog should present models by user-friendly labels instead of raw model names:

```text
Lightweight
Balanced
Korean recommended
Low-spec PC
Fast response
```

Model metadata to store later:

- Display name
- Ollama model name
- Recommended RAM
- Download size
- Korean quality
- General quality
- Speed
- License
- CPU suitability
- GPU suitability

## 10. Web Service Responsibilities

MiVA Web should eventually become the control center for the user's local AI assistant.

Core web features:

- Account login
- Device connection status
- Assistant creation and management
- Model catalog
- Template selection
- Chat UI
- Privacy and memory settings
- Basic usage statistics

Future web features:

- Voice catalog
- Google Workspace permission dashboard
- Template marketplace
- Model popularity and satisfaction data
- Admin dashboard
- Billing, if paid features are introduced

Important product principle:

> The web service should make local AI setup understandable for ordinary users.

## 11. Data Storage Direction

Central server database:

- Users
- Devices
- Assistant settings
- Model catalog
- Voice catalog
- Templates
- Non-sensitive usage statistics
- Pairing records

Local computer:

- Conversation history by default
- Local assistant memory by default
- Installed model state
- Local logs
- Google Workspace tokens, if possible

Sensitive data should remain local unless the user explicitly opts into sync.

## 12. Future Integrations

### Google Workspace CLI

Purpose:

- Calendar reading
- Gmail summary
- Drive search
- Docs and Sheets automation

This should be added after the local model and web connection are proven.

Main risk:

- OAuth setup
- Sensitive Google permission scopes
- User trust and consent

### TTS

Initial TTS should not depend on Qwen TTS.

Recommended order:

1. Text chat only
2. OS default TTS or lightweight TTS
3. Piper or similar lightweight local TTS
4. Qwen TTS 0.6B as advanced option
5. Qwen TTS 1.7B or voice cloning as GPU-oriented advanced option

### Open-LLM-VTuber

Purpose:

- Voice conversation
- Live2D avatar mode
- More emotional assistant experience

This should be treated as a later optional avatar mode, not part of the first MVP.

## 13. Development Phases

### Phase 1: Core Local Proof of Concept

Goal:

```text
Web UI can use a local Ollama model through MiVA Local Helper.
```

Tasks:

1. Create local-helper project.
2. Expose `GET /health`.
3. Check Ollama status.
4. List installed models.
5. Pull `llama3.2:3b` or `qwen3:4b`.
6. Send chat request to Ollama.
7. Create minimal web UI to test connection and chat.

### Phase 2: Installable Local Helper

Goal:

```text
Turn the local helper into an installable Tauri app.
```

Tasks:

1. Create Tauri app.
2. Add local server inside the app.
3. Add simple status UI.
4. Package for Windows.
5. Test install and launch flow.

### Phase 3: Web Service Foundation

Goal:

```text
Add account, assistant settings, model catalog, and device records.
```

Tasks:

1. Create Next.js web app.
2. Create NestJS API.
3. Add PostgreSQL and Prisma.
4. Add user/device/assistant/model tables.
5. Add basic assistant creation UI.

### Phase 4: Personal Assistant Features

Goal:

```text
Make the assistant feel personal.
```

Tasks:

1. Assistant profile.
2. Tone and role settings.
3. Local memory.
4. Prompt templates.
5. Basic usage feedback.

### Phase 5: Integrations

Goal:

```text
Add useful assistant capabilities beyond chat.
```

Tasks:

1. Google Calendar read.
2. Gmail summary.
3. Lightweight TTS.
4. Advanced TTS.
5. Avatar mode.

## 14. First Implementation Target

The next concrete development target is:

```text
Create apps/local-helper with a minimal local API:

GET /health
GET /ollama/status
GET /models
POST /models/pull
POST /chat
```

Once this works, create a minimal `apps/web` page that connects to it.

## 15. Current Skeleton

Created workspace skeleton:

```text
MiVA
├─ apps
│  ├─ api
│  │  └─ Minimal placeholder HTTP API
│  ├─ local-helper
│  │  └─ Local Ollama helper HTTP API
│  └─ web
│     └─ Minimal browser demo UI
├─ infra
│  └─ PostgreSQL docker-compose placeholder
├─ packages
│  └─ shared
│     └─ Shared constants and lightweight model catalog
├─ scripts
│  └─ check.mjs
└─ docs
   └─ initial-design.md
```

Current commands:

```text
npm run check
npm run dev:helper
npm run dev:web
npm run dev:api
```

Current local URLs:

```text
MiVA Web demo:     http://localhost:5173
MiVA Local Helper: http://localhost:43110
MiVA API:          http://localhost:4000
Ollama:            http://localhost:11434
```

Current local-helper endpoints:

```text
GET  /health
GET  /ollama/status
GET  /models
POST /models/pull
POST /chat
```
