# MiVA Coding Guidelines

## 1. General Principles

- Keep the implementation simple and phase-aligned.
- Prefer clear, explicit code over clever abstractions.
- Do not add Phase 2+ features while working on Phase 1 unless the PRD is updated first.
- Do not hide important OS actions from the user.
- Keep user-facing behavior predictable and reversible where possible.

## 2. Project Structure

Planned structure:

```text
apps/
  desktop/
    src/
      components/
      hooks/
      lib/
      locales/
      types/
    src-tauri/
  web/
  api/
packages/
  shared/
docs/
```

Rules:

- Desktop app code belongs in `apps/desktop`.
- Shared constants/types belong in `packages/shared`.
- Product decisions belong in `docs/PRD.md`.
- Implementation boundaries belong in `docs/RULES.md`.
- Visual/design rules belong in `docs/DESIGN.md`.
- Execution order belongs in `docs/TODO.md`.

## 3. Naming

Use English for all code identifiers.

Conventions:

```text
React components: PascalCase
Types/interfaces: PascalCase
Functions: camelCase
Variables: camelCase
Constants: SCREAMING_SNAKE_CASE only for true constants
Files for components: PascalCase.tsx
Files for hooks/utilities: camelCase.ts
Locale keys: dot-style or nested JSON, English identifiers
```

Examples:

```text
SetupDashboard.tsx
SetupSurvey.tsx
HardwareSummary.tsx
ModelRecommendation.tsx
ModelCard.tsx
useOllamaStatus.ts
useHardwareInfo.ts
ollamaClient.ts
recommendModel.ts
AssistantProfile
downloadModel
isModelInstalled
```

## 4. React Guidelines

- Use functional components.
- Keep UI components focused on rendering.
- Move side effects and external calls into hooks or library modules.
- Avoid large components. Split when a component has multiple distinct responsibilities.
- Avoid putting business logic directly into JSX.
- Minimize `useEffect`; prefer explicit user-triggered actions when appropriate.

## 5. State Management

Phase 1 default:

- React `useState`
- React `useReducer` for multi-step setup state
- custom hooks for data loading/actions

Do not add global state libraries until there is a real need.

Possible later option:

```text
Zustand
```

Avoid Redux unless the app becomes complex enough to justify it.

## 6. Styling

Styling stack for `apps/desktop` is React + local Tailwind CSS.

Rules:

- Follow `docs/DESIGN.md`.
- Use Stitch exports as references, not direct production code.
- Do not use Tailwind CDN in production.
- Do not hardcode random colors if a design token exists.
- Avoid inline styles except for dynamic values that cannot reasonably be expressed otherwise.
- Keep layout responsive to smaller desktop windows.

Tailwind is selected for the desktop app:

- use local Tailwind build tooling
- keep shared tokens in local Tailwind/CSS config until a shared design package exists
- use utility classes consistently
- avoid one-off arbitrary values unless needed to match design

## 7. Localization

MiVA supports Korean and English UI.

Rules:

- Do not hardcode user-facing strings in components.
- Put app strings in locale files.
- Code variables and functions must be English.
- Test important screens in both Korean and English.

Preferred structure:

```text
apps/desktop/src/locales/ko.json
apps/desktop/src/locales/en.json
```

## 8. Local Command Execution

Only execute OS commands through explicit allowlisted functions.

Allowed Phase 1 command categories:

```text
winget install Ollama.Ollama
ollama --version
ollama serve
Ollama HTTP API calls
local hardware inspection
```

Rules:

- Never accept arbitrary shell commands from UI or local HTTP requests.
- Validate all model names against the allowlist.
- Require an explicit button click before installation.
- Show clear status while commands run.
- Capture errors and show user-friendly messages.
- Keep hardware inspection read-only.

## 9. Error Handling

Every setup step needs:

- loading state
- success state
- recoverable error state
- user-facing message
- developer log detail where useful

Examples:

```text
Ollama not installed
Ollama installed but not running
winget unavailable
hardware detection unavailable
model not installed
model download failed
chat request failed
```

Do not expose raw stack traces to normal users.

## 10. Security And Privacy

- Keep local conversations local by default.
- Do not send local chat contents to the server in Phase 1.
- Do not collect telemetry without an explicit product decision.
- Before hosted web integration, add pairing/token protection for local APIs.
- Logs should avoid sensitive content by default.

## 11. Verification

Before committing code:

```text
npm run check
```

When Tauri is added:

```text
cargo check
npm run tauri:dev
npm run tauri:build
```

Exact script names may change after the Tauri app is created.

## 12. Git

- Keep commits focused.
- Do not commit raw local runtime files.
- Do not commit raw Stitch samples unless explicitly approved.
- Commit package lock files.
- Early project work may push directly to `main`, but larger features should use branches once the project stabilizes.
