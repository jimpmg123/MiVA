# MiVA Database Design

Last updated: 2026-05-07

## 1. Database Decision

MiVA uses one primary relational database:

```text
Database: Supabase PostgreSQL
ORM: Prisma
Backend: Railway-hosted NestJS API
Frontend: Vercel-hosted web dashboard
```

MongoDB is not used in the initial architecture. PostgreSQL covers the required relational data, and JSON fields are used only for semi-structured assistant settings, capabilities, OAuth scopes, permissions, and metadata.

## 2. Product Boundary

MiVA is local-first. The cloud database stores account, configuration, integration, and analytics data. It does not store local model files or local chat messages by default.

```text
Stored in cloud DB:
- users
- sessions
- devices
- assistant profiles
- assistant memory summaries, planned opt-in
- model preferences
- provider credential metadata/encrypted keys
- Google Workspace connection metadata/tokens
- tool permissions
- usage summaries/events

Stored locally:
- Ollama model files
- local runtime state
- local chat history
- raw conversation transcripts
- local logs
- microphone/audio runtime data
```

Web chat is not part of the default product boundary. The web app is the setup/admin/sync console. Local model conversations should happen in MiVA Desktop through the local helper and Ollama.

Memory policy is also local-first. Raw chat transcripts stay on the device by default. If the user enables summary memory sync, MiVA may sync assistant-specific summaries, not full chat text.

Initial setup is device-local. It is considered complete when the current device has at least one finalized local assistant profile. Login is not required for local setup or test chat.

Cross-device sync starts after login. Another device can download synced assistant profiles and optional summary memories, then download any missing local model separately.

Local storage policy is documented separately in [LOCAL_DATA_STORE.md](./LOCAL_DATA_STORE.md). The desktop local store is treated as part of MiVA's data design, but it intentionally stays small:

```text
Persist locally:
- assistant profiles
- setup completed flag
- stable local device id
- optional local conversations
- optional summary memory snapshots
- temporary offline usage queue

Detect on demand instead of storing:
- Ollama status
- installed model list
- gcloud/gws status
- CLI setup progress
- model download progress
- routine logs
```

## 3. User-Facing Tables

These tables support normal users.

### users

Stores MiVA account identity. Product login should use Google OAuth as the primary path. Email/password login exists only as a local development fallback until OAuth is fully configured.

```text
id
email
display_name
password_hash nullable
role
locale
created_at
updated_at
```

Role policy:

```text
- New OAuth users are created with role USER.
- Existing users keep their current role during OAuth login.
- Admin access is granted by setting users.role = ADMIN for a trusted Google account.
- OAuth login should not downgrade an existing ADMIN user to USER.
```

Relationships:

```text
users 1:N auth_sessions
users 1:N devices
users 1:N assistant_profiles
users 1:N provider_credentials
users 1:N workspace_connections
users 1:N usage_events
```

### auth_sessions

Stores active login sessions for web/API access. Session tokens are returned to the client once and only token hashes are stored in the database.

```text
id
user_id
token_hash
expires_at
created_at
updated_at
```

Session policy:

```text
- Store token_hash, not raw tokens.
- Sessions may expire.
- /me should resolve the current user from the bearer token.
```

### devices

Stores registered desktop app summaries after app login. Device pairing tables are not used. The desktop app registers or updates its device record with `POST /devices` after login.

It should not store detailed hardware data unless the user opts in.

```text
id
user_id
name
os
app_version
last_seen_at
local_status JSON
created_at
updated_at
```

Device sync policy:

```text
- No device_pairings table.
- No pairing code flow in the database.
- The desktop app keeps a stable local device id.
- The API upserts devices by id.
```

### assistant_profiles

Stores structured assistant configuration synced from Desktop. Assistant profile sync is separate from chat history sync. The web console currently reviews synced profiles as read-only data.

```text
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
future_features JSON
is_default
source
prompt JSON
capabilities JSON
created_at
updated_at
```

Important policy:

```text
assistant_profiles stores settings, not chat history.
Runtime prompts are generated from structured profile data.
Memory sync mode should be stored in capabilities.memory.
```

Recommended memory capability shape:

```json
{
  "memory": {
    "syncMode": "profileOnly",
    "snapshotPolicy": {
      "firstConversations": 3,
      "recentConversations": 3,
      "highEffortConversations": 1
    }
  }
}
```

Supported user-facing memory modes:

```text
profileOnly
summaryMemory
```

UI labels:

```text
Settings only
Summary memory sync
```
Policy:

```text
- Each assistant profile owns its own memory.
- Memories are not global user memories by default.
- Raw conversation text is not uploaded by default.
- Summary memory sync stores compact summaries only.
```

### assistant_memory_snapshots (planned)

Stores assistant-specific summary memories for cross-device continuity. This table is planned and should be added when summary memory sync is implemented.

```text
id
user_id
assistant_profile_id
source_type
summary
extracted_preferences JSON
token_estimate
compute_estimate
created_at
updated_at
archived_at nullable
```

Source types:

```text
first_conversation
recent_conversation
high_effort_conversation
manual_summary
```

Important policy:

```text
- Store summaries, not full transcripts.
- Associate memories with assistant_profile_id.
- Exclude passwords, API keys, raw files, private document text, and sensitive local paths.
- Other devices may download snapshots with the assistant profile.
```

### model_preferences

Stores preferred model/provider choices per user or assistant profile.

```text
id
user_id
assistant_profile_id
provider
local_model
cloud_model
fallback_policy
created_at
updated_at
```

### provider_credentials

Stores provider credential records. For MVP, provider keys should preferably stay local. If server-managed keys are used, they must be encrypted.

```text
id
user_id
provider
label
encrypted_key
masked_key
status
last_validated_at
created_at
updated_at
```

### workspace_connections

Stores Google Workspace connection state and encrypted OAuth token data.

```text
id
user_id
provider
account_email
encrypted_access_token
encrypted_refresh_token
scopes JSON
status
connected_at
created_at
updated_at
```

### tool_permissions

Stores enabled tool policies for MCP, local CLI tools, coding tools, and workspace actions.

```text
id
user_id
device_id
tool_id
permission_scope JSON
risk_level
enabled
created_at
updated_at
```

## 4. Admin-Facing Tables

These tables support product monitoring and admin dashboards.

### usage_events

Stores non-sensitive usage events and aggregate-friendly metadata. It should not store private chat content.

```text
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
metadata JSON
created_at
```

Runtime chat usage from the desktop app may be stored here as metadata and aggregate counters. This does not mean the chat transcript is stored.

Admin dashboard examples:

```text
- total users
- active devices
- assistant profile count
- top providers
- top models
- local/cloud usage ratio
- average latency
- coding capability distribution
```

## 5. ERD Summary

```text
users
  1:N auth_sessions
  1:N devices
  1:N assistant_profiles
  1:N assistant_memory_snapshots (planned)
  1:N model_preferences
  1:N provider_credentials
  1:N workspace_connections
  1:N tool_permissions
  1:N usage_events

devices
  1:N tool_permissions
  1:N usage_events

assistant_profiles
  1:N assistant_memory_snapshots (planned)
  1:N model_preferences
  1:N usage_events
```

## 6. Not In Cloud DB By Default

```text
chat_sessions
chat_messages
raw local files
raw microphone audio
Ollama model files
full hardware snapshots
local tool command output
```

These may be added later only as opt-in sync features with clear privacy controls.

## 7. Implementation Order

```text
1. Create Supabase project.
2. Put Supabase PostgreSQL DATABASE_URL in apps/api/.env.
3. Run Prisma migration.
4. Convert assistant profile APIs from memory to Prisma.
5. Convert usage/admin APIs from memory to Prisma.
6. Remove device_pairings and use direct device registration.
7. Store auth sessions in PostgreSQL by token hash.
8. Add Google login user upsert.
9. Add profile memory sync mode to assistant profile capabilities.
10. Add assistant_memory_snapshots when summary memory sync is implemented.
11. Add Google Workspace connection table usage.
12. Deploy NestJS API to Railway.
```

## 8. Current Implementation Status

```text
Implemented:
- Supabase PostgreSQL connection
- Prisma schema and migrations
- users
- auth_sessions
- devices
- assistant_profiles
- provider_credentials
- usage_events
- device registration without pairing table
- DB-backed dev login sessions
- Google OAuth user upsert endpoint shape
- desktop device registration
- desktop runtime usage metadata sync
- profileOnly / summaryMemory setup choice stored in assistant profile capabilities
- assistant profile draft/finalized status removed for simpler save semantics

Planned:
- OAuth-only production login UI
- admin role assignment by trusted Google account email
- assistant profile download/import on new devices
- assistant_memory_snapshots table
- Google Workspace OAuth token usage
- Railway deployment
```
