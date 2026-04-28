# MiVA TODO

## Current Priority

Build the Phase 1 Windows desktop app flow:

```text
Install app -> short survey -> detect hardware -> recommend model -> install/start Ollama -> download lightweight model -> chat locally
```

## Phase 1: Desktop App MVP

### 1. Tauri App Foundation

- [x] Decide app folder name: `apps/desktop`.
- [x] Create Tauri app.
- [x] Add a minimal app window.
- [x] Decide whether the current Node local-helper remains as a sidecar or gets replaced by Rust commands.
- [x] Add npm scripts for Tauri dev/build.
- [x] Verify Tauri dev mode runs on Windows.

### 2. Setup UI

- [x] Add welcome screen.
- [x] Add short setup survey.
- [x] Add hardware detection summary.
- [x] Add recommendation result screen.
- [x] Add setup dashboard screen.
- [x] Show Ollama install status.
- [x] Show Ollama running status.
- [x] Show selected model status.
- [x] Show setup progress steps.

### 3. Ollama Install Flow

- [x] Add explicit explanation of why Ollama is needed.
- [x] Add `Install Ollama` action.
- [x] Run `winget install Ollama.Ollama` only after user clicks install.
- [ ] Stream install logs/status.
- [x] Re-check Ollama CLI after install.
- [ ] Add fallback link to official Ollama Windows download page.

### 4. Ollama Runtime Flow

- [x] Add `Start Ollama` action.
- [x] Start Ollama through `ollama serve` when needed.
- [x] Re-check `http://localhost:11434/api/tags`.
- [x] Show running/failed state clearly.

### 5. Model Management

- [x] Show Phase 1 model catalog.
- [x] Show installed/not installed state.
- [x] Recommend a model from survey answers and hardware info.
- [x] Show a plain-language recommendation reason.
- [x] Allow manual override within the Phase 1 allowlist.
- [x] Add model download action.
- [ ] Stream download progress.
- [x] Prevent non-allowlisted model names.
- [x] Refresh model state after download.

### 6. Local Chat

- [x] Add simple chat screen inside the app.
- [x] Require an installed model before chat.
- [ ] Stream model response.
- [x] Show basic errors for missing model/Ollama not running.
- [ ] Add response timing for performance testing.

### 6.1 Hardware Detection

- [x] Add Rust command to read OS info.
- [x] Add Rust command to read CPU info/core count.
- [x] Add Rust command to read total RAM.
- [x] Add Rust command to read available disk space for model storage.
- [x] Add GPU detection if practical.
- [x] Keep hardware data local in Phase 1.
- [x] Show fallback/manual path if detection fails.

### 7. Packaging

- [ ] Build Windows dev app.
- [ ] Build Windows installer.
- [ ] Test installer on the development PC.
- [ ] Later: test installer in clean Windows environment.

## Phase 2: Web And Account Foundation

- [ ] Create real Next.js web app.
- [ ] Create real NestJS API.
- [ ] Add PostgreSQL.
- [ ] Add Prisma.
- [ ] Add login.
- [ ] Add user table.
- [ ] Add device table.
- [ ] Add assistant profile table.
- [ ] Add model catalog table.
- [ ] Add web device dashboard.

## Phase 3: Assistant Personalization

- [ ] Assistant profile editor.
- [ ] Tone/style settings.
- [ ] Basic local memory.
- [ ] Prompt templates.
- [ ] Template catalog.
- [ ] Device-specific model preferences.

## Phase 4: Integrations

- [ ] Google Workspace integration research spike.
- [ ] Google OAuth flow design.
- [ ] Google Calendar read-only agenda feature.
- [ ] Gmail summary feature.
- [ ] Permission dashboard.
- [ ] Tool execution confirmation UI.

## Phase 5: MCP And Agent Skills

- [ ] MCP architecture spike.
- [ ] MCP connector catalog design.
- [ ] Skill catalog design.
- [ ] Enable/disable skills per assistant.
- [ ] Local app tool execution logs.
- [ ] Risk-level display for tools.

## Phase 6: Voice And Virtual Character

- [ ] Speech recognition research spike.
- [ ] Lightweight TTS research spike.
- [ ] Character rendering approach decision.
- [ ] Open-LLM-VTuber compatibility/integration research.
- [ ] Character catalog.
- [ ] Voice catalog.
- [ ] Desktop character mode.

## Open Questions

- [x] Should the Phase 1 desktop implementation use Tauri Rust commands directly or keep a Node sidecar?
- [ ] Which model is the best default after CPU-only testing?
- [ ] Should telemetry be opt-in from the start or introduced later?
- [ ] Should Phase 2 login start with Google OAuth, email/password, or both?
