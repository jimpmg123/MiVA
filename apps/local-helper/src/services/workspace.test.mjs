import assert from "node:assert/strict";
import {
  buildUnsolicitedWorkspaceGuidance,
  isWorkspaceSlashSession,
  userMessageUsesWorkspaceSlash,
} from "./workspace.mjs";

assert.equal(userMessageUsesWorkspaceSlash("/drive find proposal"), true);
assert.equal(userMessageUsesWorkspaceSlash("[Google Drive] find proposal"), true);
assert.equal(userMessageUsesWorkspaceSlash("/calendar add meeting"), true);
assert.equal(userMessageUsesWorkspaceSlash("[Google Calendar] add meeting"), true);
assert.equal(userMessageUsesWorkspaceSlash("calendar add meeting"), false);

assert.equal(
  buildUnsolicitedWorkspaceGuidance({ prompt: "드라이브에서 제안서 찾아줘", locale: "ko" })?.includes("/drive"),
  true,
);
assert.equal(
  buildUnsolicitedWorkspaceGuidance({ prompt: "캘린더에 내일 회의 추가해줘", locale: "ko" })?.includes("/calendar"),
  true,
);
assert.equal(
  buildUnsolicitedWorkspaceGuidance({ prompt: "구구단 계산하는 코드 만들어줘", locale: "ko" }),
  null,
);

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
