import assert from "node:assert/strict";
import {
  hasExplicitActionConfirmation,
  isShortActionConfirmation,
  resolveWorkspaceActionPrompt,
} from "./action-confirmation.mjs";

assert.equal(isShortActionConfirmation("ㅇ"), true);
assert.equal(isShortActionConfirmation("ㅇㅇ"), true);
assert.equal(hasExplicitActionConfirmation("응"), true);

const messages = [
  { role: "user", content: "너가 방금 예약한 치과 예약 취소해달라고" },
  {
    role: "assistant",
    content: "Before I change Google apps, please confirm.\n\nShould I run this?",
  },
  { role: "user", content: "ㅇ" },
];

assert.equal(
  resolveWorkspaceActionPrompt({
    messages,
    latestUserPrompt: "ㅇ",
    fallbackPrompt: "",
  }).includes("치과 예약 취소"),
  true,
);

console.log("action-confirmation.test.mjs passed");
