# MiVA Server-Side Service Scope

Last updated: 2026-06-01

## Purpose

The MiVA cloud server is the service layer for accounts, devices, preferences, integrations, and synchronization. It should not replace the desktop app or local helper. The server manages user-owned data and coordination; the desktop/local-helper executes local actions with user permission.

## Core Principle

```txt
Cloud server = identity, persistence, sync, OAuth, billing, coordination
Desktop/local-helper = local setup, local models, hardware, microphone, files, tools
```

The server must never assume it can directly access a user's computer. Local actions should happen through the desktop app/local-helper after pairing and explicit permission.

## Server Responsibilities

### 1. Authentication and Accounts

The server should provide:

- Email/password or OAuth login.
- Session/JWT management.
- Account deletion and data export later.
- User locale preference: Korean/English.
- Basic profile settings.

Suggested endpoints:

```txt
POST /auth/signup
POST /auth/login
POST /auth/logout
GET  /auth/me
PATCH /users/me
DELETE /users/me
```

### 2. Device Pairing and Status

The server should track which desktop apps belong to a user.

The desktop app should be pairable with the web account using a short pairing code or browser-based login callback.

Suggested endpoints:

```txt
POST /devices/pairing/start
POST /devices/pairing/confirm
GET  /devices
GET  /devices/:deviceId
PATCH /devices/:deviceId
DELETE /devices/:deviceId
POST /devices/:deviceId/heartbeat
```

Stored data:

- Device name.
- OS.
- App version.
- Last seen time.
- Local helper availability.
- Ollama status summary.
- Installed model summary.

Do not store detailed hardware information unless the user opts in.

### 3. Assistant Profiles

The server should store user-facing assistant configuration that can sync across web and desktop.

Examples:

- Assistant name.
- Language preference.
- Answer style.
- Use case: daily, work, study, character, fast chat.
- Local/cloud/hybrid mode.
- Prompt profile.
- Selected provider and model preference.

Suggested endpoints:

```txt
GET  /assistant-profiles
POST /assistant-profiles
GET  /assistant-profiles/:profileId
PATCH /assistant-profiles/:profileId
DELETE /assistant-profiles/:profileId
POST /assistant-profiles/:profileId/set-default
```

Important rule:

- Store structured preferences, not huge hardcoded prompts.
- Generate the final runtime system prompt in the local-helper or API layer from structured profile data.

### 4. Model and Provider Preferences

The server should track what the user prefers, but not necessarily hold all provider secrets in early phases.

Store:

- Preferred local model.
- Preferred cloud provider.
- Preferred cloud model.
- Local/cloud/hybrid mode.
- Fallback policy.
- Whether cloud calls are allowed.

Suggested endpoints:

```txt
GET  /model-preferences
PATCH /model-preferences
GET  /providers
PATCH /providers/:providerId/preferences
```

Security note:

- For MVP, provider API keys should stay in the desktop app/local-helper.
- If the web service later stores provider keys, they must be encrypted, rotatable, and deletable.
- Never store plaintext OpenAI/Gemini/Groq keys.

### 5. Local Bridge Coordination

The server may coordinate communication between web and desktop when the user is not on the same machine.

Same-PC flow:

```txt
Web browser -> localhost local-helper
```

Remote flow:

```txt
Desktop app -> persistent connection -> Cloud API
Web app -> Cloud API -> device status/action request
```

Suggested endpoints:

```txt
POST /bridge/sessions
GET  /bridge/sessions/:sessionId
POST /bridge/sessions/:sessionId/actions
GET  /bridge/sessions/:sessionId/events
```

Initial actions:

- Refresh device status.
- Refresh Ollama status.
- List installed models.
- Request opening desktop app.

Do not support arbitrary shell commands.

### 6. Google Workspace Integration

The server should handle OAuth because web-based OAuth is easier for normal users than CLI setup.

The server can support:

- Google OAuth connection.
- Token refresh.
- Calendar read/write permissions.
- Gmail metadata or draft permissions later.
- Drive file listing or selected file access later.

Current implemented endpoints:

```txt
GET  /workspace/google/status
GET  /workspace/google/auth-url
GET  /workspace/google/callback
POST /workspace/google/token
POST /workspace/context
POST /workspace/actions
```

Rules:

- Request minimum scopes.
- Explain every permission clearly.
- Let users disconnect and delete tokens.
- Prefer server-side OAuth for normal users.
- Use local Google Workspace CLI only for advanced local workflows if needed later.

### 7. Tool and Skill Permissions

Future tools such as Claw Code, MCP servers, local file search, and agent skills need permission management.

The server should store:

- Which tools are enabled.
- Which devices can run each tool.
- Workspace/folder permission summary.
- User approval history.

Suggested endpoints:

```txt
GET  /tools
PATCH /tools/:toolId/preferences
GET  /tool-permissions
POST /tool-permissions
DELETE /tool-permissions/:permissionId
GET  /audit-logs/tools
```

Rules:

- Tool execution happens locally.
- The server stores policy and audit metadata.
- The user must approve risky actions in the desktop app.

### 8. Chat Sessions and History

For phase 1, chat can stay local only.

Later options:

- Local-only history.
- Cloud-synced history.
- No history.

The server should support this as a user preference.

Suggested endpoints if cloud history is enabled:

```txt
GET  /chat-sessions
POST /chat-sessions
GET  /chat-sessions/:sessionId/messages
POST /chat-sessions/:sessionId/messages
DELETE /chat-sessions/:sessionId
```

Rules:

- Default should be privacy-friendly.
- Clearly label whether a conversation is local-only or cloud-synced.
- Do not upload local-model chats by default without user consent.

### 9. Billing and Plans

Not needed for the first local MVP, but the server should be designed so billing can be added cleanly.

Possible paid features later:

- Managed cloud model proxy.
- Multi-device sync.
- Google Workspace automation.
- More hosted storage.
- Team/workspace features.

Suggested endpoints later:

```txt
GET  /billing/plan
POST /billing/checkout
POST /billing/portal
POST /billing/webhook
```

### 10. Updates and Releases

The server can eventually provide app release metadata.

Suggested endpoints:

```txt
GET /releases/latest
GET /releases/:version
```

Stored data:

- Latest desktop version.
- Required local-helper version.
- Release notes.
- Download URL.
- Minimum supported version.

## What the Server Should Not Do

The cloud server should not directly:

- Install Ollama on the user's PC.
- Download local models to the user's disk.
- Read local files.
- Access microphone input.
- Render the assistant character.
- Run Claw Code or arbitrary shell commands.
- Store plaintext API keys.
- Force cloud sync of private local chats.

These belong in the desktop app/local-helper layer.

## Recommended Backend Stack

Use:

- NestJS
- TypeScript
- PostgreSQL
- Prisma
- Redis/BullMQ later
- WebSocket or SSE later

Why:

- NestJS is structured enough for auth, devices, integrations, providers, and billing.
- Prisma fits the TypeScript stack and keeps migrations explicit.
- PostgreSQL is the safest default for user, device, preference, OAuth, and usage data.
- Redis/BullMQ should be added only when background jobs become real.

## Current Database Sketch

```txt
users
  id
  email
  display_name
  google_subject
  password_hash
  role
  locale
  last_login_at
  created_at
  updated_at

auth_sessions
  id
  user_id
  token_hash
  expires_at
  created_at
  updated_at

devices
  id
  user_id
  name
  os
  app_version
  last_seen_at
  local_status
  created_at
  updated_at

assistant_profiles
  id
  user_id
  name
  description
  use_case
  answer_style
  priority
  language_use
  local_mode
  provider
  model
  future_features
  is_default
  source
  prompt
  capabilities
  created_at
  updated_at

model_preferences
  id
  user_id
  assistant_profile_id
  provider
  local_model
  cloud_model
  fallback_policy

provider_credentials
  id
  user_id
  provider
  label
  encrypted_key
  masked_key
  status
  last_validated_at

workspace_connections
  id
  user_id
  provider
  account_email
  encrypted_access_token
  encrypted_refresh_token
  access_token_expires_at
  scopes
  status
  connected_at

tool_permissions
  id
  user_id
  device_id
  tool_id
  permission_scope
  risk_level
  enabled
  created_at

usage_events
  id
  user_id
  device_id
  assistant_profile_id
  mode
  provider
  model
  event_type
  input_chars
  output_chars
  duration_ms
  success
  metadata
  created_at
```

## MVP Server Scope

Current implemented core:

```txt
GET  /health
GET  /me
POST /auth/login
POST /auth/google
POST /auth/device/start
GET  /auth/device/:deviceCode
POST /auth/device/complete
GET  /catalog/models
GET  /devices
POST /devices
GET  /assistant-profiles
POST /assistant-profiles
GET  /assistant-profiles/:profileId
PATCH /assistant-profiles/:profileId
DELETE /assistant-profiles/:profileId
GET  /api-keys
POST /api-keys
POST /api-keys/:keyId/test
POST /usage-events
GET  /usage/summary
POST /usage/local-events
GET  /admin/stats
GET  /workspace/google/status
GET  /workspace/google/auth-url
GET  /workspace/google/callback
POST /workspace/google/token
POST /workspace/context
POST /workspace/actions
```

Do not do yet:

- Full Google Workspace automation.
- Cloud chat history.
- Billing.
- Remote command relay.
- Hosted model proxy.

## Development Order

1. Keep local-helper and desktop flow working.
2. Split local-helper provider/prompt code before more integrations.
3. NestJS API service is in place.
4. PostgreSQL and Prisma are in place.
5. Auth, Google login, and user profile resolution are in place.
6. Device auth and device records are in place.
7. Web dashboard is connected to server account/device/profile/admin data.
8. Assistant profile persistence, provider credentials, usage events, and model catalog are in place.
9. Google Workspace OAuth, context, and action endpoints are in place.

## Open Questions

- Will MiVA accounts be required from first launch, or optional after local setup?
- Should chat history be local-only by default?
- Should provider keys live only on the desktop, or can the web service store encrypted keys later?
- Should remote web control be read-only first?
- Which Google Workspace scopes are acceptable for the first public version?
