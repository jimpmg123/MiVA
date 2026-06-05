import type { ChatMessage, LocalAssistantProfile } from "../../types";

const calendarKeywords = ["calendar", "schedule", "event", "meeting", "일정", "캘린더", "회의", "예약"];
const docsKeywords = ["docs", "doc", "document", "google docs", "구글 문서", "문서", "독스"];
const gmailKeywords = ["gmail", "email", "mail", "inbox", "메일", "이메일", "지메일"];
const driveKeywords = ["drive", "file", "folder", "드라이브", "파일", "폴더"];
const sheetsKeywords = ["sheets", "spreadsheet", "sheet", "스프레드시트", "시트", "표"];

const confirmationMarkers = [
  "yes",
  "ok",
  "confirm",
  "proceed",
  "go ahead",
  "네",
  "예",
  "응",
  "그렇게",
  "해줘",
  "확인",
  "추가해",
  "등록해",
];

function includesKeyword(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function looksLikeWorkspaceConfirmation(input: string) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return confirmationMarkers.some((marker) => normalized.includes(marker)) && normalized.length <= 32;
}

export function resolveWorkspaceBusyLabel(
  input: string,
  messages: ChatMessage[],
  profile: LocalAssistantProfile,
  locale: string,
) {
  const settings = profile.prompt?.settings?.toolConnections;
  if (!settings?.googleWorkspace || !looksLikeWorkspaceConfirmation(input)) {
    return null;
  }

  const combined = [
    ...messages.slice(-4).map((message) => message.content),
    input,
  ].join("\n");

  if (includesKeyword(combined, calendarKeywords)) {
    return locale === "en"
      ? "Adding event to Google Calendar..."
      : "Google Calendar에 일정을 추가하는 중...";
  }

  if (includesKeyword(combined, docsKeywords)) {
    return locale === "en"
      ? "Updating Google Docs..."
      : "Google Docs를 업데이트하는 중...";
  }

  if (includesKeyword(combined, gmailKeywords)) {
    return locale === "en"
      ? "Checking Gmail..."
      : "Gmail을 확인하는 중...";
  }

  if (includesKeyword(combined, driveKeywords)) {
    return locale === "en"
      ? "Checking Google Drive..."
      : "Google Drive를 확인하는 중...";
  }

  if (includesKeyword(combined, sheetsKeywords)) {
    return locale === "en"
      ? "Checking Google Sheets..."
      : "Google Sheets를 확인하는 중...";
  }

  return locale === "en"
    ? "Running Google app action..."
    : "Google 앱 작업을 실행하는 중...";
}
