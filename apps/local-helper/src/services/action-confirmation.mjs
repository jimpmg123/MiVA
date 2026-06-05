export function hasExplicitActionConfirmation(prompt) {
  const normalized = String(prompt || "").toLowerCase();
  return [
    "confirm",
    "confirmed",
    "approve",
    "approved",
    "yes, do it",
    "go ahead",
    "proceed",
    "확인",
    "승인",
    "진행해",
    "응",
    "그래",
  ].some((marker) => normalized.includes(marker));
}

export function latestUserInstruction(prompt) {
  return String(prompt || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1) || String(prompt || "").trim();
}

export function summarizeActionRequest(prompt, locale) {
  const instruction = latestUserInstruction(prompt)
    .replace(/\s+/g, " ")
    .trim();
  const maxLength = locale === "en" ? 140 : 90;
  if (!instruction) {
    return locale === "en" ? "Run the requested action" : "요청한 작업 실행";
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
  const resourceLabel = actionPlan.affectedResources.join(actionPlan.locale === "en" ? ", " : ", ");

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
    `${actionPlan.toolLabel}를 변경하기 전에 확인이 필요합니다.`,
    "",
    `요청 요약: ${actionPlan.requestSummary}`,
    `사용할 ${actionPlan.toolLabel}: ${resourceLabel}`,
    "",
    "실행할까요?",
  ].join("\n");
}

export function isActionConfirmationMessage(value) {
  const text = String(value || "");
  return text.includes("Should I run this?") || text.includes("실행할까요?");
}
