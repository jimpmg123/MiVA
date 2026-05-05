import type { ReactNode } from "react";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import type { OllamaStatus } from "../types";

type OllamaStepProps = {
  busyAction: string | null;
  logs: string[];
  serviceLabel: string;
  status: OllamaStatus | null;
  tauriRuntime: boolean;
  t: Record<string, string>;
  enterLogs: () => void;
  goToNextStep: () => void;
  installOllama: () => void;
  refreshStatus: () => void;
  renderFooter: (primaryLabel?: string, primaryAction?: () => void, primaryDisabled?: boolean) => ReactNode;
  startOllama: () => void;
};

export function OllamaStep({
  busyAction,
  logs,
  serviceLabel,
  status,
  tauriRuntime,
  t,
  enterLogs,
  goToNextStep,
  installOllama,
  refreshStatus,
  renderFooter,
  startOllama,
}: OllamaStepProps) {
  return (
    <div className="mx-auto max-w-[880px]">
      <header className="mb-8">
        <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.ollamaTitle}</h2>
        <p className="mt-2 text-base leading-7 text-[#42474d]">{t.ollamaBody}</p>
      </header>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.serviceStatus}</span>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[#191c1d]">{serviceLabel}</h3>
              <p className="mt-2 text-sm text-[#42474d]">{status?.version ?? status?.baseUrl ?? "http://localhost:11434"}</p>
            </div>
            <Badge tone={status?.running ? "success" : "action"}>{status?.running ? t.running : t.missing}</Badge>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!status?.installed && (
              <PrimaryButton disabled={!tauriRuntime || busyAction !== null} onClick={installOllama}>
                {busyAction === "install" ? "Installing..." : t.installOllama}
              </PrimaryButton>
            )}
            {status?.installed && !status.running && (
              <PrimaryButton disabled={!tauriRuntime || busyAction !== null} onClick={startOllama}>
                {busyAction === "start" ? "Starting..." : t.startOllama}
              </PrimaryButton>
            )}
            <SecondaryButton disabled={!tauriRuntime || busyAction !== null} onClick={refreshStatus}>
              {t.refresh}
            </SecondaryButton>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">{t.activity}</h3>
              <p className="mt-1 text-sm leading-6 text-[#42474d]">
                Detailed install and runtime logs are collected in Settings.
              </p>
            </div>
            <Badge>{logs.length}</Badge>
          </div>
          <SecondaryButton className="mt-5" onClick={enterLogs}>
            View logs
          </SecondaryButton>
        </Panel>
      </div>

      {renderFooter(t.continue, goToNextStep, !status?.running)}
    </div>
  );
}
