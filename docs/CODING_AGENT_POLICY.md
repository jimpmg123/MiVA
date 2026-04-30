# MiVA Coding Agent Policy

## Decision

MiVA should require a cloud API model by default when the user selects code editing, repository automation, or Claw Code.

Local models can still be used for lightweight code help, but full coding-agent work is not a Phase 1 local-default path.

## Why

Coding agents send much more context than a normal chat request. A single turn can include:

- System instructions.
- Tool definitions.
- Conversation history.
- Git status.
- Files that were read earlier.
- Tool results and repository notes.

Real coding-agent sessions can reach tens of thousands of tokens per request. Small local models may connect successfully, but they are likely to become slow, run out of memory, lose context, or make unsafe tool decisions.

## Product Rules

### General Assistant

- Local models are allowed.
- Cloud models are allowed.
- Hybrid mode is allowed.
- This is the default MiVA personal assistant path.

### Code Explanation

- Local models are allowed for read-only code explanation.
- Cloud models should be recommended for larger repositories or multi-file reasoning.
- No file edits or shell actions should run from this mode.

### Code Editing / Claw Code

- Cloud API model is required by default.
- Local coding mode should be hidden under Advanced / Experimental.
- Local coding mode must start as read-only.
- File edit and shell execution require explicit user approval.
- Workspace folder allowlist is required before any repository action.

### Large Repository Analysis

- Cloud API model should be strongly recommended.
- Local models may be offered only as experimental read-only mode.
- The UI should explain that local context limits may make the assistant forget files or earlier decisions.

## Recommended UI Copy

Use this copy when a user selects coding features:

```text
Code editing requires a cloud coding model.
Local models can explain code, but full code editing needs a stronger API model for reliability and safety.
```

For Advanced local coding mode:

```text
Experimental local coding mode may be slow, forget context, or fail on larger repositories. Start with read-only analysis.
```

## Model Policy

### Default For Coding Agent Work

- Gemini 2.5 Pro or equivalent cloud coding model.
- Gemini 2.5 Flash for lighter code tasks and lower-cost testing.
- OpenAI-compatible cloud endpoints can be added later.

### Local Coding Candidates

These are candidates only for Advanced / Experimental local coding:

- `qwen3-coder:30b`
- `devstral:24b`
- `gpt-oss:20b`
- `qwen2.5-coder:32b`
- `qwen2.5-coder:14b`

Small local models such as `qwen3:4b`, `llama3.2:3b`, and `exaone3.5:2.4b` are better suited for general chat or simple code explanation, not full coding-agent loops.

## Safety And Storage Notes

Trying a weak local model for coding does not usually consume large storage by itself. The larger storage risks come from:

- Downloaded local model files.
- Session logs such as `.claw/sessions`.
- Build outputs, dependency installs, caches, and generated files from shell commands.

The bigger product risk is not storage. The bigger risk is that a weak local model may choose poor tool actions or edit the wrong files. This is why MiVA should keep local coding read-only unless the user deliberately enables an advanced mode.

## Phase 1 Implementation Direction

- If the user selects Claw Code, show cloud API as required.
- If the user selects code editing, route setup to API key/provider configuration.
- Keep local coding as an Advanced placeholder.
- Keep local code explanation available without Claw Code.
- Save the selected policy in the assistant profile so the web profile page can show whether the assistant is chat-only, code-explain, or code-edit capable.
