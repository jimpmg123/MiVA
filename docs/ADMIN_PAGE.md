# MiVA Admin Page Plan

Last updated: 2026-04-29

## Purpose

The admin area should not reuse the normal user dashboard. Normal users need assistant setup and management. Admin users need product, safety, and operation visibility.

Admin should answer:

- What are users trying to build?
- Which models and providers are most used?
- Which setup steps fail or cause drop-off?
- Which prompts, roles, and features are popular?
- Are local bridges, desktop apps, and cloud APIs healthy?

## Admin User States

MiVA web should have three high-level states:

```txt
guest      -> public Home / sign in only
user       -> normal MiVA console
admin      -> admin console
```

Admin login should open the admin console by default, not the normal user dashboard.

## Admin Navigation

Initial admin navigation:

```txt
Overview
Users
Assistant Profiles
Prompts
Models & Providers
Devices
Setup Funnel
Integrations
System Health
```

## 1. Overview

Show product-level summary cards:

- Total users
- Active users
- Connected devices
- Assistant profiles created
- Finalized assistant profiles
- Local-only / cloud-only / hybrid ratio
- Most selected provider
- Most selected model
- Latest sync time

This page should be dense and operational, not a marketing-style dashboard.

## 2. Users

Track account and usage state:

- User id
- Email
- Role: user/admin
- Locale
- Created date
- Last active date
- Devices count
- Assistant profiles count
- Default assistant profile
- Current provider/model preference

Phase 1 can use placeholder data. Later this maps to real `users`, `devices`, and `assistant_profiles` tables.

## 3. Assistant Profiles

This is the most important admin page for product learning.

Show:

- Profile name
- Source: desktop setup, web console, API
- Status: draft/finalized
- Use case: daily, work, study, fast, character
- Answer style
- Priority: speed, quality, balanced
- Language mode
- Local mode: localOnly, cloudOnly, hybrid
- Provider
- Model
- Future features selected
- Created/updated/finalized timestamps

Useful analytics:

- Top use cases
- Top selected future features
- Draft vs finalized ratio
- Average profiles per user
- Profiles synced from desktop

## 4. Prompts

Admin should not expose private chat history by default.

What can be shown safely:

- Prompt template id
- Profile role/persona category
- Prompt length
- Enabled capabilities summary
- Prompt version
- Created source
- Whether user customized it

Sensitive prompt visibility policy:

- Do not show full user-written prompts by default.
- If prompt text is collected later, label it clearly and require user consent.
- Prefer structured prompt fields over raw prompt text.
- Admin view can show redacted previews, categories, and aggregate stats.

Useful analytics:

- Most common role/persona categories
- Most customized prompt sections
- Average prompt length
- Prompt presets used
- Prompt versions with high failure/drop-off

## 5. Models & Providers

Track model preference and availability:

- Provider: Ollama, OpenAI, Gemini
- Model id/name
- Local/cloud classification
- Selection count
- Download count
- Installed count if reported by desktop
- Failed download count
- Average setup path: recommended vs manually chosen

Useful breakdowns:

- Most selected local models
- Most selected cloud models
- Provider share
- Local-only vs cloud-only vs hybrid share
- Model chosen after recommendation
- Model changed after first recommendation

## 6. Devices

Track device and bridge status:

- Device id
- OS
- App version
- Last seen
- Local helper status
- Ollama installed/running summary
- Installed model count
- Hardware summary only if user opts in

Rules:

- Do not store detailed hardware by default.
- Store coarse capability labels if needed: low, standard, high.
- Local actions still require desktop approval.

## 7. Setup Funnel

Track where normal users get stuck:

```txt
Home visited
Desktop downloaded
Desktop opened
Survey completed
Hardware scan completed
Recommendation viewed
Ollama installed/started
Model selected
Model downloaded
Test chat completed
Profile finalized
Profile synced to web
```

Metrics:

- Step completion count
- Drop-off rate per step
- Error count per step
- Average time to complete setup
- Most common setup error

## 8. Integrations

Track planned and connected features:

- Google Workspace interest
- Google Workspace connected accounts
- Claw Code installed/enabled
- MCP enabled
- TTS selected
- STT/microphone enabled
- 2D character enabled
- External APIs enabled

Early phase can show interest signals from survey `futureFeatures`.

## 9. Safety Boundaries

Never store:

- Plaintext API keys
- Private chat content by default
- Local file contents
- Full hardware details without opt-in

## 10. System Health

Show developer/operator health:

- Cloud API status
- Database status, later
- Queue/Redis status, later
- OAuth provider status
- Error rate
- Recent server errors
- Desktop bridge compatibility version
- Current app release/version distribution

## Initial API Needs

Temporary API endpoints can stay simple:

```txt
GET /admin/stats
GET /admin/users
GET /admin/assistant-profiles
GET /admin/prompts
GET /admin/models
GET /admin/setup-funnel
GET /admin/system-health
```

For MVP, `GET /admin/stats` is served by the NestJS API and Prisma. It should remain aggregate-only for presentation, with deeper reports added as separate admin endpoints later.

## Initial UI Direction

Admin UI should be:

- Dense
- Table-first
- Filterable
- Clear about privacy boundaries
- Separate from the user dashboard
- No marketing hero layout

Recommended first implementation:

1. Replace `Admin Analytics` with an admin-only shell.
2. Add admin sidebar sections: Overview, Users, Profiles, Prompts, Models, Funnel, Health.
3. Keep the first version read-only.
4. Use existing memory API stats until DB is added.
