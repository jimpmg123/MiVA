import type { ReactNode } from "react";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import type { RuntimeRequirements } from "../types";

type ClawCodeStepProps = {
  busyAction: string | null;
  pythonInstallPath: string;
  runtimeRequirements: RuntimeRequirements | null;
  runtimeRequirementsError: string | null;
  tauriRuntime: boolean;
  choosePythonInstallPath: () => void;
  goToNextStep: () => void;
  installPython: () => void;
  refreshRuntimeRequirements: () => void;
  renderFooter: (primaryLabel?: string, primaryAction?: () => void, primaryDisabled?: boolean) => ReactNode;
};

export function ClawCodeStep({
  busyAction,
  pythonInstallPath,
  runtimeRequirements,
  runtimeRequirementsError,
  tauriRuntime,
  choosePythonInstallPath,
  goToNextStep,
  installPython,
  refreshRuntimeRequirements,
  renderFooter,
}: ClawCodeStepProps) {
  const pythonRequirement = runtimeRequirements?.python;
  const pythonReady = Boolean(pythonRequirement?.meetsMinimum);
  const pythonBusy = busyAction === "install-python";

  return (
    <div className="mx-auto max-w-[880px]">
      <header className="mb-8">
        <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">Claw Code setup</h2>
        <p className="mt-2 text-base leading-7 text-[#42474d]">
          Claw Code is optional. Install it only if this assistant will help inspect or modify code on this computer.
        </p>
      </header>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Optional developer tool</span>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[#191c1d]">Install later or skip</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
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
          <h3 className="font-heading text-lg font-bold text-[#191c1d]">When should users install it?</h3>
          <div className="mt-4 grid gap-3">
            {[
              ["Code modification", "Needed when the assistant should edit files or help with local projects."],
              ["Plain assistant usage", "Not needed for chat, prompts, TTS, 2D characters, or Google Workspace setup."],
              ["Future skills", "Will be connected to agent skills and MCP-style tools later."],
            ].map(([title, body]) => (
              <div className="rounded-xl bg-[#f3f4f5] p-4" key={title}>
                <p className="text-sm font-bold text-[#191c1d]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[#42474d]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Developer runtime checks</span>
            <h3 className="mt-3 font-heading text-xl font-bold text-[#191c1d]">Python for optional tools</h3>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              Claw Code itself is not the same as Ollama. Python is checked here for optional developer workflows, local scripts, TTS/STT helpers, and future model utilities.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void refreshRuntimeRequirements()}>
              Recheck
            </SecondaryButton>
            <PrimaryButton disabled={!tauriRuntime || pythonReady || busyAction !== null} onClick={() => void installPython()}>
              {pythonBusy ? "Installing Python..." : pythonRequirement?.installed ? "Update Python" : "Install Python"}
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-[#e1e3e4] bg-[#f8f9fa] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-base font-bold text-[#191c1d]">{pythonRequirement?.label ?? "Python 3.8+"}</p>
                <p className="mt-1 text-sm leading-6 text-[#42474d]">
                  {pythonRequirement?.version ?? "Checking Python availability..."}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#72787e]">
                  {pythonRequirement?.note ?? "Not required for Ollama. Some developer tools may need it later."}
                </p>
                {pythonRequirement?.command && (
                  <p className="mt-2 font-mono text-[11px] text-[#72787e]">{pythonRequirement.command}</p>
                )}
              </div>
              <Badge tone={pythonRequirement?.meetsMinimum ? "success" : "neutral"}>
                {pythonRequirement?.meetsMinimum ? "Ready" : pythonRequirement?.installed ? "Old version" : "Optional"}
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e1e3e4] bg-[#f8f9fa] p-4">
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="font-heading text-base font-bold text-[#191c1d]">Install location</p>
                <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs leading-5 text-[#42474d]">
                  {pythonInstallPath || "Loading default C-drive user location..."}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#72787e]">
                  MiVA passes this path to winget. Some installers may still keep shared components in the standard Windows location.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton disabled={!tauriRuntime || pythonBusy} onClick={() => void choosePythonInstallPath()}>
                  Change
                </SecondaryButton>
                <PrimaryButton disabled={!tauriRuntime || pythonReady || busyAction !== null} onClick={() => void installPython()}>
                  {pythonBusy ? "Installing..." : "Install here"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>

        {runtimeRequirementsError && (
          <p className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{runtimeRequirementsError}</p>
        )}
      </Panel>

      {renderFooter("Continue", goToNextStep)}
    </div>
  );
}
