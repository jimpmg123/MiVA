import type { Locale } from "../../i18n";
import type { ChatUiAction } from "../../types";

export const CLAW_PICK_WORKSPACE_ACTION: ChatUiAction = "claw-pick-workspace";

export function clawWorkspacePromptCopy(locale: Locale) {
  return locale === "en"
    ? "To edit files on this computer, choose a workspace folder below."
    : "파일 수정을 원하시면 작업 폴더를 선택해 주세요.";
}

export function clawCodeInstallRequiredCopy(locale: Locale) {
  return locale === "en"
    ? "Claw Code installation is required. Install it from Settings > Claw Code, then run /code again."
    : "Claw Code 설치가 필요합니다. 설정 > Claw Code에서 설치한 뒤 /code를 다시 사용해 주세요.";
}

export function clawCodeSlashHelpCopy(locale: Locale) {
  return locale === "en"
    ? "Add your coding request after /code. Example: /code fix the login bug in App.tsx"
    : "/code 뒤에 코딩 요청을 입력해 주세요. 예: /code App.tsx 로그인 버그 고쳐줘";
}

export function clawWorkspaceSuccessCopy(locale: Locale, workspaceRoot: string) {
  return locale === "en"
    ? `Claw Code workspace is ready:\n${workspaceRoot}\nYou can retry your code request now.`
    : `Claw Code 작업 폴더가 설정되었습니다:\n${workspaceRoot}\n이제 코드 요청을 다시 보내 주세요.`;
}
