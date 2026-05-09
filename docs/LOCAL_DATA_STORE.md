# MiVA Local Data Store

Last updated: 2026-05-09

## 1. Purpose

MiVA Desktop is local-first. The desktop app needs a small local data store so it can keep working even when the cloud API, Supabase, or Google services are unavailable.

The local store is not meant to duplicate the cloud database. It should persist only user-created data and essential app state. Runtime state that can be detected again should not be stored permanently.

## 2. Storage Principles

```text
- Persist only data that the user created or explicitly chose to keep.
- Do not store local runtime status if it can be detected on demand.
- Do not store raw chat transcripts in the cloud by default.
- Keep secrets out of plain JSON files.
- Prefer app data files for normal local data.
- Prefer OS secure storage/keychain for tokens and API keys.
```

## 3. Required Local Data

These data types should be stored locally.

| Data | Why It Is Needed | Recommended Storage |
| --- | --- | --- |
| Assistant profiles | User-created assistant name, model, prompt settings, Workspace settings, memory mode | Tauri app data, JSON or SQLite |
| Setup completed flag | Decide whether the app should show initial setup on launch | App settings file |
| Stable local device id | Needed for device registration and sync after login | App settings file |
| Locale/basic preferences | Needed for basic app behavior | App settings file |
| Auth session | Keep user signed in after restart | OS secure storage/keychain preferred |
| Provider API keys | Needed for cloud model calls | OS secure storage/keychain preferred |

## 4. Optional Local Data

These should exist only when the user enables the related feature.

| Data | When Stored | Recommended Storage |
| --- | --- | --- |
| Runtime conversations | If local conversation saving is enabled | `conversations/{assistantId}.json` or SQLite |
| Conversation metadata | If recent conversation list is enabled | Same storage as conversations |
| Summary memory snapshots | If Summary Memory Sync/local memory is enabled | `memory-snapshots/{assistantId}.json` or SQLite |
| Offline usage queue | Only while cloud sync is unavailable | Temporary app data queue, delete after sync |

## 5. Data Not Stored Permanently

These should be detected or requested when needed instead of being stored.

```text
- Ollama installed/running status
- Installed Ollama model list
- gcloud installed/auth status
- gws installed/auth status
- CLI setup progress
- Model download progress
- Temporary install output
- Normal runtime logs
- Last opened UI tab
- Window position
```

Reason:

```text
These values can become stale quickly. Re-detecting them avoids showing incorrect state and keeps local storage small.
```

## 6. Current Implementation Status

Current implementation:

| Data | Current Storage |
| --- | --- |
| Assistant profiles | Tauri app data file `assistant-profiles.json` |
| Runtime conversations | WebView `localStorage`, separated by assistant id |
| Runtime status | Detected on demand |
| gcloud/gws status | Detected on demand |
| Logs | In-memory UI logs during the app session |

Planned improvement:

```text
Move runtime conversations from WebView localStorage into Tauri app data files before production packaging.
```

Recommended future local file layout:

```text
MiVA app data/
  assistant-profiles.json
  app-settings.json
  conversations/
    {assistantId}.json
  memory-snapshots/
    {assistantId}.json
  queues/
    usage-events.json
```

## 7. Relationship to Cloud Database

MiVA uses a hybrid data design.

```text
Cloud database:
- account identity
- device records
- synced assistant profiles
- usage/admin summaries
- integration metadata

Local data store:
- local assistant profiles
- local-only conversations
- setup state
- device-local preferences
- optional memory snapshots
```

The local data store functions like a small device-side database. It is part of the data design and should be discussed together with Supabase PostgreSQL during system design presentations.

## 8. Presentation Summary

Suggested wording:

```text
MiVA keeps the local data store intentionally small. The desktop app persists assistant profiles, essential setup state, device identity, and optional conversations or memory snapshots. Runtime states such as installed CLI tools, Ollama availability, model lists, and download progress are detected on demand instead of stored permanently.
```

