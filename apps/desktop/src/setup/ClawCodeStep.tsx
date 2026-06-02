import {
  Badge,
  InfoTile,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SetupStepActionCard,
  SetupStepShell,
  StatusAlert,
} from "../components/ui";
import type { RuntimeRequirements } from "../types";

type ClawCodeStepProps = {
  busyAction: string | null;
  pythonInstallPath: string;
  runtimeRequirements: RuntimeRequirements | null;
  runtimeRequirementsError: string | null;
  tauriRuntime: boolean;
  t: Record<string, string>;
  choosePythonInstallPath: () => void;
  goToNextStep: () => void;
  installPython: () => void;
  refreshRuntimeRequirements: () => void;
};

export function ClawCodeStep({
  busyAction,
  pythonInstallPath,
  runtimeRequirements,
  runtimeRequirementsError,
  tauriRuntime,
  t,
  choosePythonInstallPath,
  goToNextStep,
  installPython,
  refreshRuntimeRequirements,
}: ClawCodeStepProps) {
  const pythonRequirement = runtimeRequirements?.python;
  const pythonReady = Boolean(pythonRequirement?.meetsMinimum);
  const pythonBusy = busyAction === "install-python";

  return (
    <SetupStepShell variant="narrow">
      <SectionHeader
        body="Claw Code is optional. Install it only if this assistant will help inspect or modify code on this computer."
        title="Claw Code setup"
      />

      <div className="mt-8 grid grid-cols-[1.1fr_0.9fr] gap-6">
        <Panel className="transition hover:shadow-[var(--miva-shadow-md)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Optional developer tool</span>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[var(--miva-text)]">Install later or skip</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
                Phase 1 keeps this as a guided placeholder. The installer flow will later verify Git, Node, and the Claw Code package before enabling code-editing skills.
              </p>
            </div>
            <Badge>Optional</Badge>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton disabled title="Installer command will be wired later">
              Install Claw Code
            </PrimaryButton>
            <SecondaryButton onClick={goToNextStep}>Skip for now</SecondaryButton>
          </div>
        </Panel>

        <Panel>
          <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">When should users install it?</h3>
          <div className="mt-4 grid gap-3">
            {[
              ["Code modification", "Needed when the assistant should edit files or help with local projects."],
              ["Plain assistant usage", "Not needed for chat, prompts, TTS, 2D characters, or Google Workspace setup."],
              ["Future skills", "Will be connected to agent skills and MCP-style tools later."],
            ].map(([title, body], index) => (
              <div className={`miva-stagger-item miva-stagger-${index} rounded-lg bg-[var(--miva-bg-soft)] p-4`} key={title}>
                <p className="text-sm font-bold text-[var(--miva-text)]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--miva-text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <SectionHeader
          body="Claw Code itself is not the same as Ollama. Python is checked here for optional developer workflows, local scripts, TTS/STT helpers, and future model utilities."
          eyebrow="Developer runtime checks"
          title="Python for optional tools"
          actions={(
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void refreshRuntimeRequirements()}>
                Recheck
              </SecondaryButton>
              <PrimaryButton className="miva-setup-primary" disabled={!tauriRuntime || pythonReady || busyAction !== null} onClick={() => void installPython()}>
                {pythonBusy ? "Installing Python..." : pythonRequirement?.installed ? "Update Python" : "Install Python"}
              </PrimaryButton>
            </div>
          )}
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <Panel className="bg-[var(--miva-bg-soft)] shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-base font-bold text-[var(--miva-text)]">{pythonRequirement?.label ?? "Python 3.8+"}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--miva-text-muted)]">
                  {pythonRequirement?.version ?? "Checking Python availability..."}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--miva-text-soft)]">
                  {pythonRequirement?.note ?? "Not required for Ollama. Some developer tools may need it later."}
                </p>
                {pythonRequirement?.command && (
                  <p className="mt-2 font-mono text-[11px] text-[var(--miva-text-soft)]">{pythonRequirement.command}</p>
                )}
              </div>
              <Badge glow={pythonRequirement?.meetsMinimum} tone={pythonRequirement?.meetsMinimum ? "success" : "neutral"}>
                {pythonRequirement?.meetsMinimum ? "Ready" : pythonRequirement?.installed ? "Old version" : "Optional"}
              </Badge>
            </div>
          </Panel>

          <Panel className="bg-[var(--miva-bg-soft)] shadow-none">
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="font-heading text-base font-bold text-[var(--miva-text)]">Install location</p>
                <InfoTile
                  className="mt-2 break-all p-3 font-mono text-xs leading-5"
                  label="Path"
                  value={pythonInstallPath || "Loading default C-drive user location..."}
                />
                <p className="mt-2 text-xs leading-5 text-[var(--miva-text-soft)]">
                  MiVA passes this path to winget. Some installers may still keep shared components in the standard Windows location.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void choosePythonInstallPath()}>
                  Change
                </SecondaryButton>
                <PrimaryButton className="miva-setup-primary" disabled={!tauriRuntime || pythonReady || busyAction !== null} onClick={() => void installPython()}>
                  {pythonBusy ? "Installing..." : "Install here"}
                </PrimaryButton>
              </div>
            </div>
          </Panel>
        </div>

        {runtimeRequirementsError && (
          <StatusAlert className="mt-4" tone="danger">
            {runtimeRequirementsError}
          </StatusAlert>
        )}
      </Panel>

      <SetupStepActionCard
        body={t.clawCodeReadyBody}
        continueLabel={t.continue}
        onContinue={goToNextStep}
        statusIcon="skip_next"
        statusTone="action"
        title={t.clawCodeReadyTitle}
      />
    </SetupStepShell>
  );
}
