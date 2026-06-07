import type { LocalAssistantProfile } from "../../types";

const codeKeywords = [
  "code",
  "function",
  "class",
  "bug",
  "fix",
  "implement",
  "refactor",
  "typescript",
  "javascript",
  "python",
  "react",
  "error",
  "compile",
  "debug",
  "snippet",
  "repository",
  "repo",
  "file",
  "코드",
  "함수",
  "클래스",
  "버그",
  "수정",
  "구현",
  "리팩",
  "에러",
  "오류",
  "파일",
  "생성",
  "작성",
  "컴포넌트",
  "스크립트",
];

function isCodeRelatedPrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("```")) {
    return true;
  }

  return codeKeywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function resolveClawCodeBusyLabel(
  input: string,
  profile: LocalAssistantProfile,
  locale: string,
  forceClawCode = false,
) {
  if (forceClawCode) {
    return locale === "en" ? "Running Claw Code with OpenAI..." : "OpenAI로 Claw Code 실행 중...";
  }

  const coding = profile.prompt?.settings?.coding;
  if (!coding) {
    return null;
  }

  const capability = coding.capability;
  if (capability !== "clawCode" && capability !== "codeEdit" && capability !== "codeExplain") {
    return null;
  }

  if (!isCodeRelatedPrompt(input)) {
    return null;
  }

  if (capability === "clawCode") {
    return locale === "en" ? "Running Claw Code with OpenAI..." : "OpenAI로 Claw Code 실행 중...";
  }

  return locale === "en" ? "Generating code response..." : "코드 응답 생성 중...";
}
