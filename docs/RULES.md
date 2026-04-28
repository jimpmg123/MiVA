# MiVA Development Rules

## 1. Product Rules

- Phase 1 is Windows-first.
- Phase 1 is app-first.
- Phase 1 does not require login, DB, or cloud sync.
- Phase 1 focuses on local setup, model download, and local chat.
- Phase 1 should guide users through a short survey before model selection.
- Phase 1 should recommend a model using survey answers and local hardware capability.
- Do not add TTS, speech recognition, virtual character mode, Google Workspace, MCP, or agent skills to Phase 1 unless the PRD is updated first.

## 2. Local-First Rules

- Sensitive data should stay local by default.
- Hardware information should stay local by default.
- Local chat history should not be sent to the MiVA server by default.
- OAuth tokens should stay local where possible.
- Cloud sync must be explicit and opt-in.
- External write actions must require user confirmation.

## 3. Model Rules

Only these Ollama models are allowed in Phase 1:

```text
qwen3:4b
llama3.2:3b
gemma3:4b
phi3:mini
```

Rules:

- Do not add large models to the default Phase 1 catalog.
- Always validate model names against the allowlist.
- Present user-friendly labels in the UI.
- Prefer recommendation-first UX over raw model selection.
- Explain why a model was recommended.
- Show installation state clearly.
- Use Ollama's default model storage path in Phase 1.

## 4. App Rules

- The desktop app should own local execution.
- The app may call OS commands only for explicit user-approved actions.
- The app must not expose arbitrary command execution through HTTP APIs.
- The app should explain why Ollama is needed before installing it.
- The app should show clear setup state: missing, installed, running, model installed, ready.
- The app should ask a short non-technical survey before recommending a model.
- The app may detect local hardware for model recommendation.
- Hardware detection failure must not block manual model selection.
- The app should avoid terminal-only workflows for normal users.

## 5. Web Rules

- The web service is Phase 2+.
- The web should become a control center, not the default local execution runtime.
- Web pages may manage settings, accounts, catalogs, permissions, devices, OAuth, MCP, and skills.
- Actual sensitive execution should happen in the local app when practical.

## 6. Integration Rules

Google Workspace:

- Not part of Phase 1.
- Start with low-risk/read-only features when added.
- Write actions require confirmation.
- Scope requests must be minimal and explainable.

MCP and agent skills:

- Not part of Phase 1.
- Treat each connector/skill as a permissioned capability.
- Show required permissions and risk level.
- Allow enable/disable per assistant.

Virtual character:

- Not part of Phase 1.
- Treat as a later app mode.
- Do not block Phase 1 setup/chat work on avatar features.

## 7. Security Rules

- Local HTTP APIs must restrict origins.
- Add pairing/token security before exposing local APIs to a hosted web app.
- Do not allow arbitrary shell commands from web requests.
- Do not collect conversation content unless the user explicitly opts in.
- Do not send local hardware information to the server unless the user explicitly opts in.
- Logs should avoid storing sensitive content by default.

## 8. Engineering Rules

- Keep changes scoped to the current phase.
- Prefer simple working flows over broad abstractions.
- Do not refactor unrelated areas.
- Commit lock files for package managers.
- Ignore local runtime files like `.miva-dev-pids.json`.
- Run checks before committing:

```text
npm run check
```

When Tauri is added, also run the relevant Rust/Tauri checks before packaging.

## 9. Documentation Rules

- PRD defines goals.
- RULES defines implementation boundaries.
- TODO defines execution order.
- If product scope changes, update PRD first.
- If engineering standards change, update RULES.
- If work order changes, update TODO.
