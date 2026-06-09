# Milestone 1-4 Schedule Update

Milestone period: May 12, 2026 to June 5, 2026  
Document update date: June 9, 2026

## Summary

The original schedule was based on a smaller product: a local-first helper that installs/starts Ollama, supports model setup, and prepares Claw Code installation. During the milestone period, the scope expanded into a personalized assistant workspace with desktop setup, Studio prompt generation, runtime chat, cloud sync, web sharing, voice, character, memory, and Workspace integration.

Progress started later than planned and was mostly completed by one developer, so the schedule below reflects both the original plan and the expanded implementation reality.

## Completed / Adjusted Schedule

| Period | Planned Work | Actual Work Completed | Status |
| --- | --- | --- | --- |
| May 12-May 16 | Local helper architecture, initial runtime setup, chat memory exploration | Confirmed local-helper boundary, updated Workspace/chat memory direction, prepared first assistant runtime changes | Completed |
| May 17-May 23 | Ollama setup, local helper install/start flow, README and web checks | Preserved assistant model selection, added voice settings/worker scaffold, replaced Workspace CLI with direct Google API direction, updated README/web checks | Completed |
| May 24-May 30 | Local model runtime polish, optional voice path | Added local Kokoro TTS runtime path and planned voice worker integration | Completed |
| May 31-June 2 | Database/API schema, web console profile review, bug tracking docs | Updated API schema, Workspace services, local helper voice/runtime paths, web console assistant review, deployment/API/bug tracking docs, setup chat bug fix | Completed |
| June 3-June 5 | Integration and beta release | Added Claw Code agent service and install UI, character overlay, Live2D runtime, Studio/runtime pages, streaming chat, vision, documents, Workspace APIs, Daiso bridge, dev services, desktop shell, web redesign/i18n, and release packaging docs | Completed |

## Updated Feature Status

| Feature / Work Item | Original Plan Status | Milestone 4 Status | Notes |
| --- | --- | --- | --- |
| Ollama install/start support | Core scope | Completed | Desktop/local-helper can detect, start, and guide Ollama/model setup. |
| Model catalog and model download | Core scope | Completed | Local helper supports allowed catalog, status, pull, cancel, and delete flows. |
| Claw Code install helper | Core scope | Completed | Added setup/settings/studio UI and local-helper service path. Runtime routing is functional but still needs deeper test coverage. |
| Initial profile setup UI | Added scope | Completed | Survey/profile setup flow was redesigned into a clearer one-question-at-a-time flow. |
| Survey-based personalization | Added scope | Completed | Survey answers drive assistant profile defaults and Studio context. |
| User/assistant profile database schema | Added scope | Completed | Cloud API and Prisma-backed profile sync path exist. |
| Studio prompt generation flow | Added scope | In Progress | Implemented question/preview/refine/finalize endpoint structure and desktop UI. Needs final QA, stronger validation, and documentation polish. |
| Runtime chat | Added scope | Completed | Supports local/cloud routing, streaming, Workspace context, images/vision path, tool context, and memory summary. |
| Rolling conversation memory | Added scope | Partially completed | Runtime can pass rolling memory into model context. Needs user-facing controls and long-run verification. |
| Web Persona Hub / assistant sharing area | Added scope | Partially completed | Web has Persona Hub/share surface and persona presets. Import/export/community workflow is still placeholder-like. |
| 2D character / Live2D | Added scope | Partially completed | Character page/overlay/runtime path exists. Needs final asset polish and interaction testing. |
| Voice / Kokoro TTS | Added scope | Partially completed | Optional voice worker and TTS endpoint exist. STT remains planned. |
| Google Workspace context/actions | Added scope | Partially completed | OAuth/status/context/action routes exist. Needs stricter production permission and verification passes. |
| Beta deployment link | Milestone 4 requirement | Completed | Web beta: https://mi-va.vercel.app. API health: https://miva-production.up.railway.app/health. |
| Completed-feature peer verification | Milestone task | Not completed | Skipped per project constraint and current solo workflow. Bug verification plan is documented instead. |

## Remaining Schedule After Milestone 4

| Target Date | Work Item | Owner | Priority |
| --- | --- | --- | --- |
| June 6-June 9 | Milestone documentation, README, API update, bug tracking, beta link verification | Jinu Hong | High |
| June 10-June 13 | Run focused QA on setup, model download, runtime chat, profile sync, Persona Hub, voice, character overlay | Jinu Hong | High |
| June 14-June 17 | Fix serious bugs from QA and GitHub Issues; verify Workspace and Claw Code edge cases | Jinu Hong | High |
| June 18-June 20 | Production packaging, desktop installer refresh, Vercel/Railway smoke test | Jinu Hong | High |
| Final release window | Final polish, test evidence, presentation/demo script, final report/API docs | Jinu Hong | High |

## Schedule Adjustments

- The schedule changed from a narrow local-helper deliverable to a broader assistant platform beta.
- The broadened scope increased feature surface area but left less time for peer verification and test coverage.
- Serious bugs will be handled through GitHub Issues and must be assigned to Jinu Hong with a verification plan.
- Voice, character, Persona Hub sharing, and Workspace actions should be presented as beta/partial features unless final QA verifies them before release.

