import assert from "node:assert/strict";
import {
  isWorkspaceSlashSession,
  userMessageUsesWorkspaceSlash,
  workspaceServicesFromSlash,
} from "./workspace.mjs";

assert.equal(userMessageUsesWorkspaceSlash("/drive find proposal"), true);
assert.equal(userMessageUsesWorkspaceSlash("[Google Drive] find proposal"), true);
assert.equal(userMessageUsesWorkspaceSlash("/calendar add meeting"), true);
assert.equal(userMessageUsesWorkspaceSlash("[Google Calendar] add meeting"), true);
assert.equal(userMessageUsesWorkspaceSlash("calendar add meeting"), false);

// Services activate ONLY from an explicit slash command or [Google X] label.
assert.deepEqual(workspaceServicesFromSlash("/drive find proposal"), ["drive"]);
assert.deepEqual(workspaceServicesFromSlash("/gmail summarize inbox"), ["gmail"]);
assert.deepEqual(workspaceServicesFromSlash("[Google Calendar] 내일 3시 회의"), ["calendar"]);
assert.deepEqual(workspaceServicesFromSlash("/spreadsheet weekly sales"), ["sheets"]);
// Plain text that merely contains a service word must NOT activate anything.
assert.deepEqual(workspaceServicesFromSlash("summarize this file"), []);
assert.deepEqual(workspaceServicesFromSlash("너 표정 뭐가지고 잇어"), []);
assert.deepEqual(workspaceServicesFromSlash("please delete this line and remove the import"), []);
assert.deepEqual(workspaceServicesFromSlash("드라이브에서 제안서 찾아줘"), []);

assert.equal(
  isWorkspaceSlashSession({
    workspaceSlashForced: false,
    messages: [
      { role: "user", content: "[Google Calendar] 내일 3시 회의" },
      { role: "assistant", content: "Should I run this?" },
    ],
    latestUserPrompt: "응",
  }),
  true,
);

assert.equal(
  isWorkspaceSlashSession({
    workspaceSlashForced: false,
    messages: [
      { role: "user", content: "캘린더에 회의 추가해줘" },
      { role: "assistant", content: "Should I run this?" },
    ],
    latestUserPrompt: "응",
  }),
  false,
);

console.log("workspace.test.mjs passed");
