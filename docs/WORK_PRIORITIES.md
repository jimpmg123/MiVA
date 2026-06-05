# MiVA Work Priorities

This document tracks the next extension-focused engineering priorities for MiVA.

## 1. Build the Tool/Provider Manifest Structure

Status: initial internal implementation complete.

Create a shared registry shape for providers and tools so MiVA can add new capabilities without scattering metadata across many files.

Initial scope:

- Define provider metadata for OpenAI, Gemini, Groq, and Ollama.
- Define tool metadata for Google Workspace and Daiso CLI.
- Track common fields such as id, label, icon, auth type, env key, help URL, models, capabilities, and confirmation policy.
- Keep the first version internal to the app; do not build a full external plugin system yet.

Expected result:

- Provider/tool identity and configuration are defined in one place.
- Future features like image generation, STT, TTS, MCP, and custom CLI tools can follow the same registration pattern.

## 2. Generate Settings UI From Manifests

Status: initial implementation complete for provider cards, API key fields, and prompt tool toggles.

Use the manifest data to render repeated settings UI instead of manually duplicating provider/tool cards and API key sections.

Initial scope:

- Render provider cards from provider manifests.
- Render API key labels, placeholders, and key creation/help links from provider auth metadata.
- Render tool cards from tool manifests.
- Preserve existing behavior and stored settings.

Expected result:

- Adding a cloud provider or tool requires less UI-specific code.
- Settings, Studio, and model/provider displays stay consistent.

## 3. Centralize Runtime Capability Prompt Injection

Status: initial implementation complete for provider capabilities and enabled tool capability instructions.

Make runtime prompts describe enabled providers, tools, and capabilities from the registry instead of ad hoc per-feature text.

Initial scope:

- Build a common capability summary from enabled manifests.
- Include enabled Google Workspace, Daiso CLI, TTS, and provider capabilities in a consistent system/developer prompt section.
- Avoid telling the model that a capability exists if the runtime cannot actually execute it.
- Keep local-model prompt length controlled.

Expected result:

- Models receive accurate capability context.
- Cloud and local models get consistent tool-awareness behavior.
- Prompt bugs such as "enabled in settings but not described to the model" become easier to prevent.

## 4. Standardize Action Confirmation

Status: initial implementation complete for Google Workspace write confirmation prompts.

Create one confirmation flow for write actions instead of handling confirmation rules separately for each tool.

Initial scope:

- Add a common action plan object for write operations.
- Require confirmation for Google Workspace writes such as Calendar and Docs changes.
- Include a one-line user request summary and the affected workspace/tool.
- Reply in the user's language when asking for confirmation.
- Keep read-only context retrieval separate from write confirmation.

Expected result:

- Calendar, Docs, Gmail, Drive, Sheets, and future tools can share the same confirmation pattern.
- MiVA avoids silently modifying external services.
- The runtime can expand to more tools without duplicating permission logic.
