# MiVA

MiVA is a local-first personal AI assistant project.

The first proof of concept focuses on:

1. Running a local helper API on the user's computer.
2. Connecting that helper to Ollama.
3. Installing lightweight local models through the helper.
4. Calling the local model from a browser UI.

## Current Workspace

```text
apps/local-helper  Local API that controls Ollama
apps/web           Minimal browser UI for testing local-helper
apps/api           Placeholder backend API skeleton
packages/shared    Shared constants and model catalog
docs               Product and architecture notes
```

## Quick Start

Install dependencies from the repository root:

```bash
npm install
```

Run the local helper:

```bash
npm run dev:helper
```

Run the web demo in another terminal:

```bash
npm run dev:web
```

Open:

```text
http://localhost:5173
```

The helper runs at:

```text
http://localhost:43110
```

Ollama should be installed and running at:

```text
http://localhost:11434
```

