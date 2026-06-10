const exactConfirmations = new Set([
  "yes",
  "yes ok",
  "yes okay",
  "yes please",
  "y",
  "o",
  "ok",
  "ok yes",
  "ok please",
  "okay",
  "okay yes",
  "okay please",
  "\u3147",
  "\u3147\u3147",
  "\u3147\u3147\u3147",
  "\u3147\u314b",
  "\u3147\u314c",
  "\ub124",
  "\uc608",
  "\uc751",
  "\uadf8\ub798",
  "\uc88b\uc544",
  "\ud655\uc778",
  "\ucd94\uac00\ud574\uc918",
  "\ucd94\uac00\ud574",
  "\ucd94\uac00\ud574\uc8fc\uc138\uc694",
  "\ucd94\uac00\ud574 \uc8fc\uc138\uc694",
  "\ub124 \ucd94\uac00\ud574\uc918",
  "\uc751 \ucd94\uac00\ud574\uc918",
  "\uc608 \ucd94\uac00\ud574\uc918",
  "\ud574\uc918",
  "\ud574\uc8fc\uc138\uc694",
  "\uadf8\ub807\uac8c \ud574\uc918",
  "\uc751 \uadf8\ub807\uac8c \ud574\uc918",
  "\ub124 \uadf8\ub807\uac8c \ud574\uc918",
  "\uc608 \uadf8\ub807\uac8c \ud574\uc918",
]);

const includesConfirmations = [
  "confirm",
  "confirmed",
  "approve",
  "approved",
  "yes, do it",
  "go ahead",
  "proceed",
  "\ud655\uc778\ud588\uc5b4",
  "\uc2b9\uc778",
  "\uc9c4\ud589\ud574",
  "\uc2e4\ud589\ud574",
];

const shortAffirmativeMarkers = [
  "\ucd94\uac00\ud574",
  "\ub4f1\ub85d\ud574",
  "\uc124\uc815\ud574",
  "\ub123\uc5b4\uc918",
  "\ud574\uc918",
  "do it",
  "go ahead",
];

function normalizedConfirmationText(prompt) {
  return latestUserInstruction(prompt)
    .trim()
    .toLowerCase()
    .replace(/[.!?,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isShortActionConfirmation(prompt) {
  const normalized = normalizedConfirmationText(prompt);
  return exactConfirmations.has(normalized)
    || /^(ㅇ|ㅇㅇ|ㅇㅇㅇ|ㅇㅋ|ㅇㅈ|ok|o|y)$/.test(normalized);
}

export function hasExplicitActionConfirmation(prompt) {
  const normalized = normalizedConfirmationText(prompt);
  if (isShortActionConfirmation(prompt)) {
    return true;
  }

  if (exactConfirmations.has(normalized)) {
    return true;
  }

  if (includesConfirmations.some((marker) => normalized.includes(marker))) {
    return true;
  }

  if (normalized.length <= 24) {
    return shortAffirmativeMarkers.some((marker) => normalized.includes(marker));
  }

  return false;
}

export function latestUserInstruction(prompt) {
  return String(prompt || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) || String(prompt || "").trim();
}

export function summarizeActionRequest(prompt, locale) {
  const parts = String(prompt || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const instructionSource = [...parts].reverse().find((part) => !hasExplicitActionConfirmation(part))
    || latestUserInstruction(prompt);
  const instruction = instructionSource
    .replace(/\s+/g, " ")
    .trim();
  const maxLength = locale === "en" ? 140 : 90;
  if (!instruction) {
    return locale === "en" ? "Run the requested action" : "\uc694\uccad\ud55c \uc791\uc5c5 \uc2e4\ud589";
  }
  return instruction.length > maxLength ? `${instruction.slice(0, maxLength - 1)}...` : instruction;
}

export function createActionPlan({ toolId, toolLabel, requestSummary, affectedResources, locale }) {
  return {
    toolId,
    toolLabel,
    requestSummary,
    affectedResources: affectedResources?.length ? affectedResources : [toolLabel],
    locale: locale === "en" ? "en" : "ko",
    requiresConfirmation: true,
  };
}

export function buildActionConfirmationMessage(actionPlan) {
  const resourceLabel = actionPlan.affectedResources.join(", ");

  if (actionPlan.locale === "en") {
    return [
      `Before I change ${actionPlan.toolLabel}, please confirm.`,
      "",
      `Request summary: ${actionPlan.requestSummary}`,
      `${actionPlan.toolLabel} used: ${resourceLabel}`,
      "",
      "Should I run this?",
    ].join("\n");
  }

  return [
    `${actionPlan.toolLabel}\uc744(\ub97c) \ubcc0\uacbd\ud558\uae30 \uc804\uc5d0 \ud655\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.`,
    "",
    `\uc694\uccad \uc694\uc57d: ${actionPlan.requestSummary}`,
    `\uc0ac\uc6a9\ud560 ${actionPlan.toolLabel}: ${resourceLabel}`,
    "",
    "\uc774 \uc791\uc5c5\uc744 \uc2e4\ud589\ud560\uae4c\uc694?",
  ].join("\n");
}

export function isActionConfirmationMessage(value) {
  const text = String(value || "");
  return text.includes("Should I run this?") || text.includes("\uc774 \uc791\uc5c5\uc744 \uc2e4\ud589\ud560\uae4c\uc694?");
}

export function resolveWorkspaceActionPrompt({ messages, latestUserPrompt, fallbackPrompt = "" }) {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => String(message.content || "").trim())
    .filter(Boolean);
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const awaitingConfirmation = isActionConfirmationMessage(lastAssistant?.content);
  const confirmed = hasExplicitActionConfirmation(latestUserPrompt)
    || (awaitingConfirmation && isShortActionConfirmation(latestUserPrompt));

  if (confirmed) {
    return [
      userMessages.slice(-3).join("\n\n"),
      fallbackPrompt,
    ].filter(Boolean).join("\n\n");
  }

  return latestUserPrompt;
}
