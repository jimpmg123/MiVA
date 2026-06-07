import { useState } from "react";
import type { Locale } from "../i18n";
import { PrimaryButton, SecondaryButton } from "./ui";

type ClawCodeWorkspaceChatActionProps = {
  activeLocale: Locale;
  busy: boolean;
  onChooseFolder: () => Promise<string | null> | string | null;
  onConfirm: (workspaceRoot: string) => Promise<void> | void;
};

export function ClawCodeWorkspaceChatAction({
  activeLocale,
  busy,
  onChooseFolder,
  onConfirm,
}: ClawCodeWorkspaceChatActionProps) {
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const chooseLabel = activeLocale === "en" ? "Choose workspace folder" : "작업 폴더 선택";
  const retryLabel = activeLocale === "en" ? "Choose another folder" : "다시 선택";
  const confirmLabel = activeLocale === "en" ? "Done" : "완료";
  const pendingHint = activeLocale === "en"
    ? "Selected folder:"
    : "선택한 폴더:";

  if (!pendingPath) {
    return (
      <div className="mt-4">
        <PrimaryButton
          disabled={busy || confirming}
          onClick={() => {
            void (async () => {
              const selected = await onChooseFolder();
              if (selected) {
                setPendingPath(selected);
              }
            })();
          }}
        >
          {chooseLabel}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">
        {pendingHint}
      </p>
      <p className="mt-2 break-all font-mono text-xs leading-5 text-[var(--miva-text)]">
        {pendingPath}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <SecondaryButton disabled={busy || confirming} onClick={() => setPendingPath(null)}>
          {retryLabel}
        </SecondaryButton>
        <PrimaryButton
          disabled={busy || confirming}
          onClick={() => {
            void (async () => {
              setConfirming(true);
              try {
                await onConfirm(pendingPath);
                setPendingPath(null);
              } finally {
                setConfirming(false);
              }
            })();
          }}
        >
          {confirming ? (activeLocale === "en" ? "Saving..." : "저장 중...") : confirmLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}
