import { Badge, Panel, PrimaryButton, SecondaryButton, SectionHeader, SetupStepActionCard, SetupStepShell } from "../components/ui";
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
  startOllama,
}: OllamaStepProps) {
  const running = Boolean(status?.running);

  return (
    <SetupStepShell variant="narrow">
      <SectionHeader body={t.ollamaBody} title={t.ollamaTitle} />

      <div className="mt-8 grid grid-cols-[1.1fr_0.9fr] gap-6">
        <Panel className="transition hover:shadow-[var(--miva-shadow-md)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{t.serviceStatus}</span>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[var(--miva-text)]">{serviceLabel}</h3>
              <p className="mt-2 text-sm text-[var(--miva-text-muted)]">{status?.version ?? status?.baseUrl ?? "http://localhost:11434"}</p>
            </div>
            <Badge glow={running} tone={running ? "success" : "action"}>
              {running ? t.running : t.missing}
            </Badge>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!status?.installed && (
              <PrimaryButton className="miva-setup-primary" disabled={!tauriRuntime || busyAction !== null} onClick={installOllama}>
                {busyAction === "install" ? "Installing..." : t.installOllama}
              </PrimaryButton>
            )}
            {status?.installed && !status.running && (
              <PrimaryButton className="miva-setup-primary" disabled={!tauriRuntime || busyAction !== null} onClick={startOllama}>
                {busyAction === "start" ? "Starting..." : t.startOllama}
              </PrimaryButton>
            )}
            <SecondaryButton disabled={!tauriRuntime || busyAction !== null} onClick={refreshStatus}>
              {t.refresh}
            </SecondaryButton>
          </div>
        </Panel>

        <Panel className="transition hover:shadow-[var(--miva-shadow-md)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">{t.activity}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--miva-text-muted)]">
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

      <SetupStepActionCard
        body={running ? t.ollamaReadyBody : t.ollamaPendingBody}
        continueDisabled={!running}
        continueLabel={t.continue}
        onContinue={goToNextStep}
        statusIcon={running ? "check_circle" : "hourglass_top"}
        statusTone={running ? "success" : "warning"}
        title={running ? t.ollamaReadyTitle : t.ollamaPendingTitle}
      />
    </SetupStepShell>
  );
}
