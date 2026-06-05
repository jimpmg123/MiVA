import { ClawCodeInstallPanel } from "../components/ClawCodeInstallPanel";
import {
  Panel,
  SecondaryButton,
  SetupStepActionCard,
  SetupStepShell,
  SectionHeader,
} from "../components/ui";
import type { ClawCodeRuntimeInfo, RuntimeRequirements } from "../types";

type ClawCodeStepProps = {
  busyAction: string | null;
  clawCodeStatus: ClawCodeRuntimeInfo | null;
  clawCodeStatusError: string | null;
  pythonInstallPath: string;
  runtimeRequirements: RuntimeRequirements | null;
  runtimeRequirementsError: string | null;
  tauriRuntime: boolean;
  t: Record<string, string>;
  chooseClawCodeWorkspace: () => Promise<string | null> | string | null;
  choosePythonInstallPath: () => void;
  goToNextStep: () => void;
  installClawCode: (workspaceRoot: string | null) => Promise<void> | void;
  installPython: () => void;
  refreshClawCodeStatus: () => Promise<void> | void;
  refreshRuntimeRequirements: () => void;
  setClawCodeWorkspace: (workspaceRoot: string) => Promise<void> | void;
};

export function ClawCodeStep({
  busyAction,
  clawCodeStatus,
  clawCodeStatusError,
  pythonInstallPath,
  runtimeRequirements,
  runtimeRequirementsError,
  tauriRuntime,
  t,
  chooseClawCodeWorkspace,
  choosePythonInstallPath,
  goToNextStep,
  installClawCode,
  installPython,
  refreshClawCodeStatus,
  refreshRuntimeRequirements,
  setClawCodeWorkspace,
}: ClawCodeStepProps) {
  const pythonRequirement = runtimeRequirements?.python;
  const pythonReady = Boolean(pythonRequirement?.meetsMinimum);
  const pythonBusy = busyAction === "install-python";

  return (
    <SetupStepShell variant="narrow">
      <SectionHeader
        body="Claw Code is optional. Install it only if this assistant will inspect or modify code on this computer."
        title="Claw Code setup"
      />

      <div className="mt-8">
        <ClawCodeInstallPanel
          busyAction={busyAction}
          onChooseWorkspace={chooseClawCodeWorkspace}
          onInstall={installClawCode}
          onRefresh={refreshClawCodeStatus}
          onSetWorkspace={setClawCodeWorkspace}
          status={clawCodeStatus}
          statusError={clawCodeStatusError}
          tauriRuntime={tauriRuntime}
        />
      </div>

      <Panel className="mt-6">
        <SectionHeader
          body="Python is optional for other developer tools. Claw Code itself runs through Node.js and OpenAI."
          eyebrow="Optional prerequisite"
          title="Python for other tools"
          actions={(
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void refreshRuntimeRequirements()}>
                Recheck
              </SecondaryButton>
              <SecondaryButton disabled={!tauriRuntime || pythonReady || busyAction !== null} onClick={() => void installPython()}>
                {pythonBusy ? "Installing Python..." : pythonRequirement?.installed ? "Update Python" : "Install Python"}
              </SecondaryButton>
            </div>
          )}
        />

        <p className="mt-4 text-sm leading-6 text-[var(--miva-text-muted)]">
          {pythonRequirement?.note ?? "Checking Python availability..."}
        </p>
        <p className="mt-2 font-mono text-[11px] text-[var(--miva-text-soft)]">
          {pythonInstallPath || "Default install path will load when Tauri is available."}
        </p>
        <div className="mt-4">
          <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void choosePythonInstallPath()}>
            Change Python install path
          </SecondaryButton>
        </div>

        {runtimeRequirementsError && (
          <p className="mt-4 text-sm text-[var(--miva-danger-hover)]">{runtimeRequirementsError}</p>
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
