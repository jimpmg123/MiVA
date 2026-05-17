import { Badge, Panel } from "../components/ui";
import type { PromptSettings, WorkspaceServiceId, WorkspaceToolPolicy } from "../types";

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
    body: "Read file metadata and find relevant files after the user connects Google.",
    icon: "folder",
    policyKey: "drive",
  },
  {
    id: "gmail",
    title: "Gmail",
    body: "Read recent messages and email metadata for user-approved context.",
    icon: "mail",
    policyKey: "gmail",
  },
  {
    id: "calendar",
    title: "Google Calendar",
    body: "Read upcoming events and prepare schedule suggestions with confirmation.",
    icon: "calendar_month",
    policyKey: "calendar",
  },
  {
    id: "docs",
    title: "Google Docs",
    body: "Read recent document titles and excerpts when the assistant needs context.",
    icon: "description",
    policyKey: "googleWorkspace",
  },
  {
    id: "sheets",
    title: "Google Sheets",
    body: "Read spreadsheet metadata and structured context later.",
    icon: "table",
    policyKey: "googleWorkspace",
  },
];

export function GoogleWorkspacePanel({
  settings,
  workspacePolicyCopy,
  onPromptSettingsChange,
}: GoogleWorkspacePanelProps) {
  const selectedServices = settings.toolConnections.googleWorkspaceServices;
  const enabled = settings.toolConnections.googleWorkspace;

  const toggleService = (service: WorkspaceServiceId) => {
    onPromptSettingsChange((current) => {
      const selected = current.toolConnections.googleWorkspaceServices.includes(service)
        ? current.toolConnections.googleWorkspaceServices.filter((item) => item !== service)
        : [...current.toolConnections.googleWorkspaceServices, service];
      const nextEnabled = selected.length > 0;

      return {
        ...current,
        toolConnections: {
          ...current.toolConnections,
          googleWorkspace: nextEnabled,
          googleWorkspaceServices: selected,
        },
        workspaceRules: {
          ...current.workspaceRules,
          googleWorkspace: nextEnabled ? "askFirst" : "disabled",
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Workspace integration</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Connect Google Workspace</h3>
            <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#42474d]">
              Choose which Google products this assistant can use as read-only context. MiVA will use the connected Google account and direct Google APIs for Gmail, Drive, Docs, Calendar, and Sheets.
            </p>
          </div>
          <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#c2c7ce]/70 bg-[#f8f9fa] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">Step 1</p>
            <p className="mt-2 text-sm font-bold text-[#191c1d]">Sign in with Google</p>
            <p className="mt-2 text-xs leading-5 text-[#72787e]">The account connection is handled by MiVA OAuth.</p>
          </div>
          <div className="rounded-2xl border border-[#c2c7ce]/70 bg-[#f8f9fa] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">Step 2</p>
            <p className="mt-2 text-sm font-bold text-[#191c1d]">Select products</p>
            <p className="mt-2 text-xs leading-5 text-[#72787e]">Choose Gmail, Drive, Docs, Calendar, or Sheets per assistant.</p>
          </div>
          <div className="rounded-2xl border border-[#c2c7ce]/70 bg-[#f8f9fa] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">Step 3</p>
            <p className="mt-2 text-sm font-bold text-[#191c1d]">Use retrieved context</p>
            <p className="mt-2 text-xs leading-5 text-[#72787e]">MiVA fetches relevant read-only context before asking the model.</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">Product access</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Select which Google products this assistant may read for context. Save changes to store this in the assistant profile.
              </p>
            </div>
            <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Direct API" : "Off"}</Badge>
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
            Keep permissions narrow. The current runtime is read-first; write actions should remain disabled until explicit confirmation and tool execution are implemented.
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
