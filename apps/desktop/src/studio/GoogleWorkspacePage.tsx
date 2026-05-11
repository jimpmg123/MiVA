import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import {
  getWorkspaceCliStatus,
  installGcloudCli,
  installGwsCli,
  startGcloudAuth,
  startGwsAuth,
} from "../features/workspace/workspaceCli";
import type { PromptSettings, WorkspaceCliStatus, WorkspaceServiceId, WorkspaceToolPolicy } from "../types";

type GoogleWorkspacePanelProps = {
  settings: PromptSettings;
  tauriRuntime: boolean;
  workspacePolicyCopy: Record<WorkspaceToolPolicy, string>;
  onPromptSettingsChange: (updater: (current: PromptSettings) => PromptSettings) => void;
};

type WorkspaceServiceOption = {
  id: WorkspaceServiceId;
  title: string;
  body: string;
  icon: string;
  policyKey: keyof PromptSettings["workspaceRules"];
};

const workspaceServices: WorkspaceServiceOption[] = [
  {
    id: "drive",
    title: "Google Drive",
    body: "Read file metadata and prepare document/file actions.",
    icon: "folder",
    policyKey: "drive",
  },
  {
    id: "gmail",
    title: "Gmail",
    body: "Prepare email search, summaries, and drafts after consent.",
    icon: "mail",
    policyKey: "gmail",
  },
  {
    id: "calendar",
    title: "Google Calendar",
    body: "Prepare schedule reads and event drafts with confirmation.",
    icon: "calendar_month",
    policyKey: "calendar",
  },
  {
    id: "docs",
    title: "Google Docs",
    body: "Prepare document reads, outlines, and edits later.",
    icon: "description",
    policyKey: "googleWorkspace",
  },
  {
    id: "sheets",
    title: "Google Sheets",
    body: "Prepare spreadsheet reads and structured updates later.",
    icon: "table",
    policyKey: "googleWorkspace",
  },
];

export function GoogleWorkspacePanel({
  settings,
  tauriRuntime,
  workspacePolicyCopy,
  onPromptSettingsChange,
}: GoogleWorkspacePanelProps) {
  const [status, setStatus] = useState<WorkspaceCliStatus | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedServices = settings.toolConnections.googleWorkspaceServices;

  const refreshStatus = useCallback(async () => {
    if (!tauriRuntime) {
      setError("Workspace CLI setup requires the Tauri desktop runtime.");
      return;
    }

    setIsRefreshing(true);
    try {
      setError(null);
      setStatus(await getWorkspaceCliStatus());
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : String(statusError));
    } finally {
      setIsRefreshing(false);
    }
  }, [tauriRuntime]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const goalSteps = useMemo(() => {
    const gcloudInstalled = Boolean(status?.gcloud.installed);
    const gwsInstalled = Boolean(status?.gws.installed);
    const gcloudAuthed = Boolean(status?.auth.gcloudAccount);
    const gwsAuthed = Boolean(status?.auth.gwsAuthenticated);

    return [
      { id: "gcloud", label: "Install Google Cloud CLI", ready: gcloudInstalled },
      { id: "gws", label: "Install Google Workspace CLI", ready: gwsInstalled },
      { id: "gcloudAuth", label: "Authenticate Google Cloud CLI", ready: gcloudAuthed },
      { id: "services", label: "Select Google Workspace products", ready: selectedServices.length > 0 },
      { id: "gwsAuth", label: "Authenticate Workspace scopes", ready: gwsAuthed },
    ];
  }, [selectedServices.length, status]);

  const actionLabels: Record<string, string> = {
    "install-gcloud": "Opening Google Cloud CLI installer",
    "install-gws": "Installing Google Workspace CLI",
    "auth-gcloud": "Opening Google sign-in",
    "auth-gws": "Opening Workspace consent",
  };

  const nextGoalStep = goalSteps.find((step) => !step.ready);
  const setupReady = !nextGoalStep;
  const completedStepCount = goalSteps.filter((step) => step.ready).length;
  const setupProgressPercent = Math.round((completedStepCount / goalSteps.length) * 100);
  const activeStepLabel = busyAction
    ? actionLabels[busyAction] ?? "Working"
    : isRefreshing
      ? "Refreshing Workspace status"
    : nextGoalStep?.label ?? "Workspace setup complete";

  const actionMessages: Record<string, string> = {
    "install-gcloud": "Google Cloud CLI installer was started. Complete any installer prompts, then refresh status.",
    "install-gws": "Google Workspace CLI setup was started. Refresh status before continuing.",
    "auth-gcloud": "Google sign-in opened in your browser. Complete the login, then refresh status.",
    "auth-gws": "Workspace consent opened in your browser. Complete the consent flow, then refresh status.",
  };

  const runAction = async (action: string, task: () => Promise<string>) => {
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      await task();
      setMessage(actionMessages[action] ?? "Action finished. Refresh status before continuing.");
      await refreshStatus();
    } catch (actionError) {
      const rawMessage = actionError instanceof Error ? actionError.message : String(actionError);
      setError(rawMessage.length > 220 ? "Setup failed. Check that the required CLI can be installed on this computer, then try again." : rawMessage);
    } finally {
      setBusyAction(null);
    }
  };

  const runNextGoalStep = () => {
    if (!nextGoalStep) {
      setMessage("Google Workspace CLI setup is ready.");
      return;
    }

    if (nextGoalStep.id === "gcloud") {
      void runAction("install-gcloud", installGcloudCli);
      return;
    }
    if (nextGoalStep.id === "gws") {
      void runAction("install-gws", installGwsCli);
      return;
    }
    if (nextGoalStep.id === "gcloudAuth") {
      void runAction("auth-gcloud", startGcloudAuth);
      return;
    }
    if (nextGoalStep.id === "gwsAuth") {
      void runAction("auth-gws", () => startGwsAuth(selectedServices));
      return;
    }

    setMessage("Select at least one Google product before continuing.");
  };

  const toggleService = (service: WorkspaceServiceId) => {
    onPromptSettingsChange((current) => {
      const selected = current.toolConnections.googleWorkspaceServices.includes(service)
        ? current.toolConnections.googleWorkspaceServices.filter((item) => item !== service)
        : [...current.toolConnections.googleWorkspaceServices, service];
      const enabled = selected.length > 0;

      return {
        ...current,
        toolConnections: {
          ...current.toolConnections,
          googleWorkspaceCli: enabled,
          googleWorkspaceServices: selected,
        },
        workspaceRules: {
          ...current.workspaceRules,
          googleWorkspace: enabled ? "askFirst" : "disabled",
          calendar: selected.includes("calendar") ? "askFirst" : "disabled",
          gmail: selected.includes("gmail") ? "askFirst" : "disabled",
          drive: selected.includes("drive") ? "askFirst" : "disabled",
        },
      };
    });
  };

  const updateWorkspaceRule = (key: keyof PromptSettings["workspaceRules"], value: WorkspaceToolPolicy) => {
    onPromptSettingsChange((current) => ({
      ...current,
      workspaceRules: {
        ...current.workspaceRules,
        [key]: value,
      },
    }));
  };

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Workspace setup goal</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Connect Google Workspace CLI</h3>
            <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#42474d]">
              Choose which Google products this assistant can prepare actions for, then let MiVA handle the required local CLI setup without manual terminal commands.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={busyAction !== null || isRefreshing} onClick={() => void refreshStatus()}>
              <span className="inline-flex items-center gap-2">
                {isRefreshing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#35607f]/25 border-t-[#35607f]" />}
                <span>{isRefreshing ? "Refreshing" : "Refresh"}</span>
              </span>
            </SecondaryButton>
            <PrimaryButton disabled={busyAction !== null || isRefreshing || !tauriRuntime} onClick={runNextGoalStep}>
              {busyAction ? "Working..." : nextGoalStep ? `Run: ${nextGoalStep.label}` : "Setup ready"}
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#c2c7ce]/70 bg-[#f8f9fa] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">Setup progress</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-[#191c1d]">
                {isRefreshing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#35607f]/25 border-t-[#35607f]" />}
                <span>{activeStepLabel}</span>
              </p>
            </div>
            <Badge tone={setupReady ? "success" : busyAction || isRefreshing ? "action" : "neutral"}>{setupProgressPercent}%</Badge>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#dfe3e6]">
            <div
              className="h-full rounded-full bg-[#35607f] transition-[width] duration-500"
              style={{ width: `${setupProgressPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {goalSteps.map((step, index) => (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                  step.ready
                    ? "bg-[#c9e8cb] text-[#334d38]"
                    : step.id === nextGoalStep?.id
                      ? "bg-[#cae6ff] text-[#1c4b69]"
                      : "bg-[#e1e3e4] text-[#72787e]"
                }`}
                key={step.id}
              >
                <span>{index + 1}</span>
                <span>{step.ready ? "Done" : step.id === nextGoalStep?.id ? "Current" : "Waiting"}</span>
              </span>
            ))}
          </div>
        </div>

        {busyAction && (
          <div className="mt-6 rounded-2xl border border-[#cae6ff] bg-[#f5fbff] p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-bold text-[#191c1d]">{actionLabels[busyAction] ?? "Working"}</p>
              <Badge tone="action">In progress</Badge>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#dfe3e6]">
              <div className="h-full w-1/3 animate-[workspaceProgress_1.2s_ease-in-out_infinite] rounded-full bg-[#35607f]" />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#72787e]">
              Browser login or installer prompts may appear separately. Return here and refresh after finishing them.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {goalSteps.map((step, index) => (
            <div
              className={`rounded-xl border p-4 ${
                step.ready ? "border-[#7ab683] bg-[#c9e8cb]/45" : "border-[#c2c7ce]/70 bg-white"
              }`}
              key={step.id}
            >
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#72787e]">Step {index + 1}</p>
              <p className="mt-2 text-sm font-bold leading-5 text-[#191c1d]">{step.label}</p>
              <p className="mt-3 text-xs font-semibold text-[#35607f]">{step.ready ? "Complete" : "Pending"}</p>
            </div>
          ))}
        </div>

        {setupReady && <p className="mt-5 rounded-xl bg-[#c9e8cb]/65 p-4 text-sm font-semibold text-[#334d38]">Workspace CLI setup is ready for the selected products.</p>}
        {message && !setupReady && <p className="mt-5 rounded-xl bg-[#cae6ff]/55 p-4 text-sm font-semibold text-[#1c4b69]">{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-[#ffdad6] p-4 text-sm font-semibold text-[#93000a]">{error}</p>}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">Product access</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Select the Google products this assistant may prepare actions for. Save changes to store this in the assistant profile.
              </p>
            </div>
            <Badge tone={settings.toolConnections.googleWorkspaceCli ? "success" : "neutral"}>
              {settings.toolConnections.googleWorkspaceCli ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3">
            {workspaceServices.map((service) => {
              const selected = selectedServices.includes(service.id);
              return (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected ? "border-[#35607f] bg-[#cae6ff]/35 ring-2 ring-[#cae6ff]" : "border-[#c2c7ce]/70 bg-white hover:border-[#35607f]"
                  }`}
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                      <span className="material-symbols-outlined text-[20px]">{service.icon}</span>
                    </span>
                    {selected && <Badge tone="action">Selected</Badge>}
                  </div>
                  <p className="mt-4 font-heading text-base font-bold text-[#191c1d]">{service.title}</p>
                  <p className="mt-2 text-sm leading-5 text-[#42474d]">{service.body}</p>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h3 className="font-heading text-lg font-bold text-[#191c1d]">Permission level</h3>
          <p className="mt-2 text-sm leading-6 text-[#42474d]">
            Set how much control this assistant gets. Real Google actions still require Workspace authentication.
          </p>
          <div className="mt-5 grid gap-4">
            {([
              ["googleWorkspace", "General Workspace"],
              ["calendar", "Calendar"],
              ["gmail", "Gmail"],
              ["drive", "Drive"],
            ] as Array<[keyof PromptSettings["workspaceRules"], string]>).map(([key, label]) => (
              <div className="rounded-2xl border border-[#c2c7ce]/70 bg-[#f8f9fa] p-4" key={key}>
                <p className="text-sm font-bold text-[#191c1d]">{label}</p>
                <div className="mt-3 grid gap-2">
                  {(["disabled", "askFirst"] as WorkspaceToolPolicy[]).map((policy) => (
                    <button
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                        settings.workspaceRules[key] === policy
                          ? "border-[#35607f] bg-[#cae6ff]/45 text-[#1c4b69]"
                          : "border-[#c2c7ce]/70 bg-white text-[#42474d] hover:border-[#35607f]"
                      }`}
                      key={policy}
                      onClick={() => updateWorkspaceRule(key, policy)}
                      type="button"
                    >
                      {workspacePolicyCopy[policy]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
