import {
  Badge,
  InfoTile,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  StatusAlert,
} from "./ui";
import type { ClawCodeRuntimeInfo } from "../types";

type ClawCodeInstallPanelProps = {
  busyAction: string | null;
  status: ClawCodeRuntimeInfo | null;
  statusError: string | null;
  tauriRuntime: boolean;
  onChooseWorkspace: () => Promise<string | null> | string | null;
  onInstall: (workspaceRoot: string | null) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onSetWorkspace: (workspaceRoot: string) => Promise<void> | void;
};

export function ClawCodeInstallPanel({
  busyAction,
  status,
  statusError,
  tauriRuntime,
  onChooseWorkspace,
  onInstall,
  onRefresh,
  onSetWorkspace,
}: ClawCodeInstallPanelProps) {
  const installBusy = busyAction === "install-claw-code";
  const workspaceBusy = busyAction === "claw-workspace" || busyAction === "claw-status";
  const installed = Boolean(status?.installed);

  return (
    <div className="grid gap-6">
      <Panel>
        <SectionHeader
          body="Claw Code uses your OpenAI API key to inspect and edit files inside one approved workspace folder. Local chat can stay on Ollama, but coding requests route through OpenAI automatically."
          eyebrow="Developer runtime"
          title="Claw Code"
          actions={(
            <Badge tone={installed ? "success" : "neutral"}>
              {installed ? "Installed" : "Not installed"}
            </Badge>
          )}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <InfoTile
            className="p-4"
            label="OpenAI API"
            value={status?.openAiConfigured ? `${status.openAiModel} ready` : "Add an OpenAI key in AI models"}
          />
          <InfoTile
            className="p-4"
            label="Workspace"
            value={status?.workspaceRoot || "No folder selected yet"}
          />
          <InfoTile
            className="p-4"
            label="Node.js"
            value={status?.node.installed ? status.node.version || "Detected" : "Missing"}
          />
          <InfoTile
            className="p-4"
            label="Git"
            value={status?.git.installed ? status.git.version || "Detected" : "Optional but recommended"}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton
            disabled={!tauriRuntime || installBusy || installed}
            onClick={() => void onInstall(status?.workspaceRoot ?? null)}
          >
            {installBusy ? "Installing Claw Code..." : installed ? "Claw Code installed" : "Install Claw Code"}
          </PrimaryButton>
          <SecondaryButton disabled={!tauriRuntime || workspaceBusy} onClick={() => void onRefresh()}>
            Recheck status
          </SecondaryButton>
          <SecondaryButton
            disabled={!tauriRuntime || !installed || workspaceBusy}
            onClick={() => {
              void (async () => {
                const selected = await onChooseWorkspace();
                if (selected) {
                  await onSetWorkspace(selected);
                }
              })();
            }}
          >
            Choose workspace folder
          </SecondaryButton>
        </div>

        {statusError && (
          <StatusAlert className="mt-4" tone="danger">
            {statusError}
          </StatusAlert>
        )}

        {installed && !status?.workspaceRoot && (
          <StatusAlert className="mt-4" tone="warning">
            Choose a workspace folder before asking Claw Code to create or edit files.
          </StatusAlert>
        )}
      </Panel>

      <Panel className="bg-[var(--miva-bg-soft)] shadow-none">
        <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">How coding requests work</h3>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--miva-text-muted)]">
          <p>1. Enable Claw Code or Code editing in Studio &gt; Code for the assistant.</p>
          <p>2. Install Claw Code here and choose the project folder that the agent may read or edit.</p>
          <p>3. Ask a code-related question in Runtime. MiVA routes it through OpenAI + Claw Code tools instead of the local model.</p>
        </div>
      </Panel>
    </div>
  );
}
