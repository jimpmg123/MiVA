# Bug List and GitHub Issues

## 1. Purpose

This document is the central place for tracking MiVA bugs and related GitHub Issue planning. It records outstanding bugs, observed bugs, plausible bugs, status, severity, assigned owner, planned fix, and verification plan.

The README will later link to this document so users and contributors know where to check known issues and how to report new bugs.

## 2. Bug Tracking System Overview

Outstanding bugs are tracked in the **Bug List / GitHub Issues Table** below. GitHub Issues may also be created for individual bugs, but this document keeps the bug list and GitHub Issue planning connected.

Bug sources are labeled as:

- **Observed:** A bug or failure that was actually seen during development or testing.
- **Plausible:** A realistic bug that could happen based on the current project structure, but has not been confirmed.

Bug fixes should be verified before the status is changed to `Verified`.

## 3. Bug List / GitHub Issues Table

| Issue ID | Source | Title | Status | Severity | Priority | Assigned To | Related GitHub Issue | Verification Plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OBS-001 | Observed | Initial setup test chat intro card blocked chat content | Fixed | Minor | Medium | TBD | TBD | Reopen initial setup chat and confirm the intro card no longer covers the chat area. |
| OBS-002 | Observed | Runtime sidebar showed Recent Conversations even though only one chat is stored per assistant | Fixed | Minor | Medium | TBD | TBD | Confirm Runtime sidebar only shows assistant-based chat navigation. |
| OBS-003 | Observed | Deleted local assistant could remain visible in the web console after sync | Fixed - needs verification | Major | High | TBD | TBD | Delete an assistant locally, run Sync all, refresh web console, and confirm the assistant is removed. |
| OBS-004 | Observed | Google Workspace context was not consistently trusted by every model | In Progress | Major | High | TBD | TBD | Ask Gmail/Docs questions with Gemini and GPT after Workspace context injection is updated. |
| OBS-005 | Observed | Ollama initially loaded local models on CPU instead of GPU | Fixed - needs verification | Major | Medium | TBD | TBD | Run `ollama ps` and `nvidia-smi` after launching a local model and confirm GPU usage. |
| PLA-001 | Plausible | Google OAuth login succeeds but frontend session state does not update | Open | Major | High | TBD | TBD | Test login/logout refresh behavior in web and desktop flows. |
| PLA-002 | Plausible | Local Helper is not running but Runtime chat does not show a clear error | Open | Major | High | TBD | TBD | Stop Local Helper, send a chat message, and verify the UI shows a clear recovery message. |
| PLA-003 | Plausible | Ollama model download fails but the UI remains in a loading state | Open | Major | Medium | TBD | TBD | Simulate a failed download and confirm progress state stops with an error. |
| PLA-004 | Plausible | Cloud sync overwrites newer local assistant changes | Open | Major | Medium | TBD | TBD | Edit the same assistant locally and remotely, then verify conflict behavior. |
| PLA-005 | Plausible | Admin-only API routes can be called by a normal user | Open | Critical | High | TBD | TBD | Call admin endpoints with a normal user token and confirm access is denied. |

## 4. Bug Report Template

```md
### Issue ID

### Source
Observed or Plausible

### Title

### Status
Open / Confirmed / In Progress / Fixed / Verified / Needs More Information / Won't Fix

### Severity
Critical / Major / Minor / Low

### Priority
High / Medium / Low

### Environment
Desktop, web, API, database, OS, browser, model provider, or local runtime details.

### Assigned To

### Related GitHub Issue

### Summary

### Steps to Reproduce

### Expected Result

### Actual Result

### Evidence
Screenshots, logs, API response, database state, or console output.

### Root Cause / Debugging Notes

### Proposed Fix

### Verification Plan
```

## 5. Serious Bug Assignment Policy

A serious bug is any bug with `Critical` severity or `High` priority. Serious bugs must have:

- An assigned owner.
- A planned fix or investigation step.
- A verification plan.
- A related GitHub Issue if the fix requires more than a small code change.

Serious bugs should not stay unassigned once they are confirmed.

## 6. How to Report a Bug

Users and contributors should report bugs by creating a GitHub Issue or by adding a row to this document during development.

A useful bug report should include:

- A clear title.
- The environment where the bug happened.
- Steps to reproduce the issue.
- Expected result and actual result.
- Screenshot, log, API response, or other evidence if available.
- Severity and priority if known.

After a fix is made, the issue should stay marked as `Fixed` until the verification plan has been completed. It should only be marked `Verified` after the expected behavior is confirmed.
