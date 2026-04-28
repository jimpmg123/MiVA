# MiVA PRD

## 1. Product Goal

MiVA helps ordinary users set up a local AI assistant on their own computer.

Long-term, MiVA should also help users set up an AI virtual character experience, similar in spirit to projects like Open-LLM-VTuber, but with easier setup, model management, permissions, and user-facing configuration.

## 2. Target Users

Primary early user:

- Windows user
- Non-programmer or light technical user
- Wants a personal AI assistant without manually learning local model setup
- Prefers free or local models where possible
- May later want voice, character, and external app integrations

## 3. Core Positioning

MiVA is a local-first personal AI assistant setup app.

The user should not need to understand:

- API keys
- model runtimes
- command-line model downloads
- prompt engineering
- local server setup
- OAuth tool wiring

## 4. Phase 1 MVP

Phase 1 is app-first and Windows-only.

The Phase 1 MVP goal:

> A Windows user installs MiVA Desktop, installs or starts Ollama from the app, downloads a lightweight local model, and chats with a local AI assistant without typing terminal commands.

Updated Phase 1 user flow:

> A Windows user answers a short setup survey, MiVA reads local hardware capability, recommends a lightweight model and assistant preset, then guides the user through Ollama setup, model download, and local chat.

### Included

- Windows desktop app
- Ollama install detection
- Ollama install action through `winget`
- Ollama start/status action
- Lightweight model catalog
- Short setup survey
- Local hardware capability detection
- Model recommendation based on survey and hardware
- Model download through Ollama
- Local chat test inside the app
- Basic setup status UI

### Excluded

- Login
- Database
- Cloud sync
- Full web service
- TTS
- speech recognition
- virtual character/avatar mode
- Open-LLM-VTuber integration
- Google Workspace integration
- MCP integration
- custom model storage path
- macOS/Linux official support

## 5. Phase 1 Supported Models

Only these models are allowed in Phase 1:

```text
qwen3:4b
llama3.2:3b
gemma3:4b
phi3:mini
```

Large models are excluded from Phase 1.

The app should present these models with user-friendly labels, not raw model names only.

## 5.1 Phase 1 Survey And Recommendation

Ordinary users should not be forced to choose between raw model names.

MiVA should first ask a short setup survey, then recommend a model.

Initial survey questions:

1. What do you want your assistant to help with?
   - daily planning
   - study or writing
   - work support
   - fast casual chat
   - future character assistant
2. What answer style do you prefer?
   - short and fast
   - detailed
   - friendly
   - practical
3. What matters most?
   - speed
   - Korean quality
   - low resource use
   - balanced

MiVA should combine the survey with hardware detection.

Initial recommendation logic:

```text
RAM <= 8GB or very low-spec:
  recommend phi3:mini or llama3.2:3b

RAM around 16GB:
  recommend qwen3:4b for Korean/balanced use
  recommend llama3.2:3b for speed

Korean quality priority:
  prefer qwen3:4b

Speed priority:
  prefer llama3.2:3b or phi3:mini
```

The recommendation should be explainable in normal language.

Example:

```text
Recommended: Qwen3 4B
Reason: Your PC has enough memory, and you selected Korean quality and balanced answers.
```

The user may still manually choose another Phase 1 allowlisted model.

## 5.2 Hardware Detection

MiVA Desktop may read local hardware information to make a local recommendation.

Phase 1 hardware fields:

- OS name/version
- CPU brand/name if available
- CPU core count
- total RAM
- available RAM if practical
- disk free space for the default model location
- GPU name if practical

Rules:

- Hardware detection runs locally.
- Hardware data is used for local recommendations in Phase 1.
- Hardware data must not be sent to a MiVA server without explicit user consent.
- The UI should explain why the information is being read.
- The user should be able to continue with manual model selection if detection fails.

## 6. Model Storage

Phase 1 uses Ollama's default model storage path.

Custom model storage paths are deferred to a later phase.

The app may explain that model files are stored by Ollama and may require several GB of disk space.

## 7. Product Architecture

### MiVA Desktop App

The desktop app is where the user actually runs MiVA.

Responsibilities:

- local assistant setup
- Ollama installation and status
- setup survey
- hardware detection
- local model recommendation
- model download
- local chat
- later: voice, character, local tools, MCP servers, external integrations

### MiVA Web

The web service is not part of Phase 1, but is planned for Phase 2+.

Future responsibilities:

- account login
- device management
- assistant settings
- model catalog
- character catalog
- voice catalog
- template management
- OAuth connection management
- permission dashboard
- external API integration management
- MCP and agent skills marketplace

### MiVA Server

The server is planned for Phase 2+.

Future responsibilities:

- user accounts
- device records
- assistant profiles
- shared catalogs
- templates
- non-sensitive usage statistics
- billing if paid features are introduced

## 8. Future Web Features

The web page should eventually become the MiVA control center.

Possible features:

- Manage assistants
- Manage connected devices
- View installed app status per device
- Choose default models
- Choose character profiles
- Choose voices
- Browse templates
- Browse model popularity
- Browse MCP connectors
- Browse agent skills
- Manage OAuth connections
- Review tool permissions
- View recent tool execution history
- Disconnect external accounts
- Delete synced data

## 9. Google Workspace Direction

Google Workspace integration is a future feature.

Potential approach:

- Use Google OAuth
- Use Google Workspace CLI where practical
- Start with read-only or low-risk actions
- Prefer local token storage for early versions
- Require explicit user approval for write actions

Initial useful capabilities:

- Calendar agenda reading
- Gmail summary
- Drive file search
- Docs draft creation
- Sheets read/write helpers

Google Workspace integration is not part of Phase 1.

## 10. MCP And Agent Skills Direction

MiVA should eventually support external tools through MCP and agent skills.

MCP and skills should be treated as installable capabilities with clear permissions.

Future web responsibilities:

- catalog available MCP servers
- catalog available agent skills
- show required permissions
- show risk level
- enable/disable per assistant
- sync approved configuration to the local app

Future app responsibilities:

- run or connect to local MCP servers
- execute tools locally where possible
- ask for confirmation before risky actions
- show recent tool execution logs

MCP and agent skills are not part of Phase 1.

## 11. Virtual Character Direction

The long-term differentiator is simple setup for a local AI assistant and AI virtual character.

Future character features:

- character selection
- Live2D or similar avatar support
- voice selection
- speech recognition
- TTS
- expression/emotion mapping
- always-on desktop character mode
- optional Open-LLM-VTuber compatibility or integration

Virtual character mode is not part of Phase 1.

## 12. Privacy Principles

Default direction:

- local conversations stay local
- local model state stays local
- sensitive OAuth tokens should stay local where possible
- cloud sync should be opt-in
- write actions require explicit user confirmation

The app must clearly explain what runs locally and what may be sent to a server.

## 13. Phase 1 Success Criteria

Phase 1 is successful when:

1. A clean Windows environment can run MiVA Desktop.
2. MiVA detects whether Ollama is installed.
3. If Ollama is missing, MiVA can start the installation flow.
4. MiVA detects whether Ollama is running.
5. MiVA can start Ollama.
6. MiVA asks a short setup survey.
7. MiVA detects basic local hardware information.
8. MiVA recommends a lightweight model with a human-readable reason.
9. MiVA still allows manual choice from the allowlisted models.
10. MiVA downloads one selected model.
11. MiVA can chat with the downloaded model.
12. The user does not need to type terminal commands.

## 14. Open Questions

- Should Phase 1 chat live only inside the desktop app, or should the web demo remain visible as a developer tool?
- Should the desktop app be named `MiVA Desktop`, `MiVA App`, or `MiVA Local`?
- Which model should be the default recommended model after real performance testing?
- Should Phase 2 web login use email/password, Google login, or both?
- How much usage telemetry should be collected, and what should remain purely local?
