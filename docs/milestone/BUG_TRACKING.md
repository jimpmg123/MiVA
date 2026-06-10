# Milestone 4 Bug Tracking

Milestone period: May 12, 2026 to June 5, 2026  
Document update date: June 10, 2026

## GitHub Issues

- Issue list: https://github.com/jimpmg123/MiVA/issues
- New issue form: https://github.com/jimpmg123/MiVA/issues/new

GitHub Issues is the bug tracking system for MiVA. This document lists the current bugs and regression checks mirrored into GitHub Issues for Milestone 4 and final release work.

## Reporting Instructions

When reporting a bug, include:

- Clear title.
- Environment: desktop/web/API/local-helper/voice-worker, OS, browser, model provider, and whether the app was local or deployed.
- Steps to reproduce.
- Expected result.
- Actual result.
- Screenshots, logs, API responses, or console errors if available.
- Severity: Critical, Major, Minor, Low.
- Verification plan.

## Bug List / GitHub Issue Candidates

| Issue ID | Title | Status | Severity | GitHub Issue | Verification Plan |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Initial setup test chat intro card blocked chat content | Fixed, needs regression check | Minor | [#1](https://github.com/jimpmg123/MiVA/issues/1) | Open setup chat and confirm intro card does not cover messages or composer. |
| BUG-002 | Runtime sidebar showed misleading conversation grouping | Fixed, needs regression check | Minor | [#2](https://github.com/jimpmg123/MiVA/issues/2) | Open runtime sidebar and verify assistant/conversation grouping is understandable. |
| BUG-003 | Deleted local assistant can remain visible in web console after sync | Needs verification | Major | [#3](https://github.com/jimpmg123/MiVA/issues/3) | Delete a local assistant, sync, refresh web console, and confirm removal. |
| BUG-004 | Google Workspace context is not consistently trusted by every model | In progress | Major | [#4](https://github.com/jimpmg123/MiVA/issues/4) | Ask Gmail/Docs/Calendar questions with Gemini/OpenAI and verify injected context is used correctly. |
| BUG-005 | Ollama can initially use CPU instead of GPU | Fixed, needs environment verification | Major | [#5](https://github.com/jimpmg123/MiVA/issues/5) | Run a local model and check `ollama ps` plus GPU utilization. |
| BUG-006 | Local Helper unavailable errors need clearer runtime recovery UI | Open | Major | [#6](https://github.com/jimpmg123/MiVA/issues/6) | Stop Local Helper, send a runtime message, and confirm the UI tells the user how to recover. |
| BUG-007 | Model download failure/cancel may leave stale progress state | Open | Major | [#7](https://github.com/jimpmg123/MiVA/issues/7) | Cancel and fail a model pull; verify the progress UI resets and offers retry. |
| BUG-008 | Cloud/local assistant sync conflict behavior is not fully defined | Open | Major | [#8](https://github.com/jimpmg123/MiVA/issues/8) | Edit same assistant locally and remotely; verify conflict behavior and user-facing status. |
| BUG-009 | Admin-only API access needs normal-user denial verification | Open | Critical | [#9](https://github.com/jimpmg123/MiVA/issues/9) | Call admin endpoints with a normal user token and confirm access is denied. |
| BUG-010 | Persona Hub sharing/import workflow is still beta placeholder | Open | Minor | [#10](https://github.com/jimpmg123/MiVA/issues/10) | Verify web users understand presets are beta and cannot assume full community import/export. |
| BUG-011 | Voice worker/Kokoro install may fail silently on missing Python packages | Open | Major | [#11](https://github.com/jimpmg123/MiVA/issues/11) | Run install/start on a clean Windows machine and verify actionable errors. |
| BUG-012 | Live2D/2D character overlay needs viewport and asset loading regression test | Open | Minor | [#12](https://github.com/jimpmg123/MiVA/issues/12) | Open character page/overlay at desktop viewport and confirm assets render without overlap. |
| BUG-013 | Billing route deployment needs verification | Open | Minor | [#13](https://github.com/jimpmg123/MiVA/issues/13) | Deploy web, open `https://mi-va.vercel.app/?page=billing`, and verify Billing page is active. |
| BUG-014 | Studio question generation can fall back after OpenAI timeout | Fixed, needs release regression check | Major | [#14](https://github.com/jimpmg123/MiVA/issues/14) | Use the packaged app against Railway, generate Studio questions for study/coding/companion assistants, and confirm no blocking `Failed to fetch` error appears. |

## Serious Bug Policy

A bug is serious if it is Critical severity or Major severity with user-facing impact. Serious bugs must have:

- GitHub Issue created.
- Expected fix or investigation date.
- Verification plan.
- Schedule slot in `SCHEDULE_UPDATE.md`.

MiVA is currently a solo project, so all bug candidates are owned by Jinu Hong. Serious bug fixing time is reserved in the remaining schedule.

## GitHub Issue Template

```md
## Summary

## Environment
- App area:
- OS/browser:
- Local or deployed:
- Provider/model:

## Steps to Reproduce
1.
2.
3.

## Expected Result

## Actual Result

## Evidence

## Severity
Critical / Major / Minor / Low

## Verification Plan
```

## Peer Verification Note

The milestone instruction recommends having another teammate verify completed features. MiVA is currently being implemented as a solo workflow, so the peer verification step was not completed. Instead, this bug list provides the verification plan that should be used for final-release QA.
