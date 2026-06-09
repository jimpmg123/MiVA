# MiVA Design System

## 1. Source Of Truth

MiVA UI design is driven by Stitch-generated design references and this file.

Stitch exports are used as design references, not as direct production code.

Production implementation should convert Stitch output into the MiVA app/web architecture:

```text
Stitch DESIGN.md -> MiVA design tokens and rules
Stitch code.html -> layout and interaction reference
Stitch screen.png -> visual QA reference
MiVA codebase -> Tauri + React + Vite implementation
```

## 2. Stitch Export Handling

When testing a Stitch design, export:

```text
.zip
Project summary
Prompt text
```

Expected Stitch `.zip` contents may include:

```text
code.html
screen.png
DESIGN.md
```

Rules:

- Do not copy Stitch `code.html` directly into production.
- Do not use Tailwind CDN in production code.
- Extract useful tokens, layout patterns, and component behavior.
- Store stable design decisions in this `docs/DESIGN.md`.
- Keep raw Stitch export samples out of Git unless explicitly approved.

Current local sample path:

```text
stitch-samples/
```

This folder is ignored by Git.

## 3. Styling Decision

Final styling stack is not fully locked yet.

Current decision:

- Tailwind CSS is adopted for the desktop app.
- Stitch output may use Tailwind, but production code must use the local Vite/Tailwind build.
- Product code must use a real build setup, not CDN scripts.
- If Stitch output uses plain CSS, CSS Modules or app-level CSS can be considered.

Current MiVA desktop implementation converts the Stitch "Serene Utility" reference into React/Tauri screens instead of copying `code.html`.

## 3.1 Reference Filtering Policy

External design references may only influence MiVA when they match the product direction in this file.

Absorb:

- calm local-management surfaces
- light glass-card treatment for shell, sidebars, modals, and status panels
- subtle ambient shadows
- readable dashboard-like status tiles
- clear running/ready/error state treatment
- rounded but functional cards and controls
- status glow only for live/running indicators

Discard:

- cinematic dark themes as a global app direction
- neon/pink gradients for normal productivity actions
- poster/feed/mobile entertainment layouts
- borderless "no-line" section rules that reduce utility clarity
- dense admin-console information architecture
- developer jargon where setup guidance should be user-facing
- copied Stitch code, Tailwind CDN output, or sample app structure

Implementation rule:

```text
External reference -> compatible MiVA principle -> MiVA tokens / common UI classes -> existing React screens
```

Current accepted reference influence is limited to subtle local-management polish: softer background, slightly stronger calm blue, light glass surfaces, and clearer status cards.

## 4. App Design Direction

Phase 1 UI should feel like a setup assistant, not a developer console.

Core experience:

```text
Welcome -> Survey -> Hardware check -> Recommendation -> Ollama setup -> Model setup -> Local chat -> Settings
```

The UI should be:

- calm
- direct
- status-focused
- readable for non-technical users
- explicit about local execution
- recommendation-first instead of model-name-first
- explicit before installing external software

Avoid:

- terminal-like flows for normal users
- dense developer logs as the primary UI
- unexplained model names
- hidden background installation
- overwhelming technical choices

## 5. Required Phase 1 Screens

### Welcome

Purpose:

- explain what MiVA does
- explain that the assistant runs locally
- explain that Ollama is required

Primary action:

```text
Start setup
```

### Survey

Purpose:

- ask what kind of assistant the user wants
- ask preferred answer style
- ask whether speed, Korean quality, low resource use, or balance matters most

The survey should avoid technical model names.

### Hardware Check

Purpose:

- explain that MiVA checks local PC capability to recommend a suitable model
- show only understandable information
- allow continuation if detection fails

Example fields:

```text
Memory
Processor
Disk space
GPU, if available
```

### Recommendation

Purpose:

- recommend one model
- explain the reason in plain language
- allow manual override

The recommendation screen should not require the user to understand model benchmarks.

### Setup Status

Purpose:

- show setup progress
- show Ollama install state
- show Ollama runtime state
- show model install state

States:

```text
Missing
Installed
Running
Ready
Error
```

### Ollama Install

Purpose:

- explain why Ollama is needed
- allow user-approved install through winget
- provide official download fallback

### Model Selection

Purpose:

- show the Phase 1 model allowlist
- explain each model in normal language
- show installed/not installed state
- download selected model

### Local Chat

Purpose:

- verify the local model works
- provide first usable assistant experience

### Settings

Purpose:

- change language
- view local runtime information
- view app version
- later: privacy, telemetry, model storage, integrations

## 6. Language And Localization

MiVA must support Korean and English UI.

Rules:

- UI text must not be hardcoded inside components.
- Use locale files for app and web UI.
- Code identifiers must be English.
- User-facing text should support both Korean and English.

Preferred structure:

```text
locales/
  ko.json
  en.json
```

Language setting should exist in both app and web eventually.

Phase 1 may default to Korean, but the structure must allow English.

## 7. Visual QA

For Stitch-based screens, keep these references during implementation:

- Stitch screenshot
- exported design notes
- exported prompt/summary

Before considering a screen complete:

- compare layout against the Stitch screenshot
- verify text does not overflow
- verify Korean and English strings fit
- verify loading/error states
- verify small window behavior

## 8. Open Design Questions

- Should the Tailwind design tokens move from app CSS into a shared package later?
- Should the Phase 1 desktop app add dark/system theme support after the light theme stabilizes?
- What visual style should the future virtual character mode use?

## 9. Developer Tool Shell Direction

MiVA's desktop shell and Runtime chat use a calm developer-tool interface inspired by modern coding assistants. The UI should be structural, quiet, and content-first rather than card-heavy.

Design dials:

- Design variance: 5
- Motion intensity: 3
- Visual density: 5

### Shell

- The left navigation and top bar use a pale blue-gray surface.
- The application canvas stays neutral and nearly white.
- Navigation width is stable across Setup, Studio, Runtime, History, and Settings.
- Dividers and selected-row fills communicate hierarchy.
- Window controls remain in the top bar.
- Mode switching stays visible but uses a compact segmented control.

### Runtime Chat

- The conversation column is anchored toward the upper-right of the content canvas.
- The conversation must not resize or move when the Live2D character opens.
- Assistant responses render as plain document content with a small author label.
- Only user messages render inside a filled bubble.
- Introductory information uses spacing and dividers instead of a large card.
- The composer stays aligned with the conversation column.
- Metrics are secondary and visually quiet.

### Live2D

- The in-app character stage is a transparent overlay positioned above the Runtime canvas.
- It must not reserve grid or flex width.
- Opening or minimizing the character must not change chat line length or horizontal position.
- The separate Tauri transparent character window remains available.
- Controls may receive pointer input; the character canvas should not block chat interaction.

### Shape And Content

- Containers use a 10-12px radius.
- The message composer uses a 16px radius.
- User chat bubbles use a 16px radius with a tighter bottom-right corner.
- Icon-only controls may be circular.
- Prefer headings, dividers, and whitespace over cards.
- Cards are reserved for user-owned objects, explicit selection, modal surfaces, or warnings.
- Loading, empty, and error states stay inline with the surface they affect.

### Rollout

1. Runtime chat
2. Shared shell, navigation, and top bar
3. Studio
4. Settings and Setup
5. History

Every later screen should reuse these tokens and layout rules rather than introducing a separate visual language.
