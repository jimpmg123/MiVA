import type {
  CalendarActionMode,
  LocalAssistantProfile,
  PromptEditorMode,
  PromptSettings,
  WorkspaceToolPolicy,
} from "../types";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";

type PromptStudioPanelProps = {
  profile: LocalAssistantProfile;
  promptEditorMode: PromptEditorMode;
  scheduleModeCopy: Record<CalendarActionMode, string>;
  settings: PromptSettings;
  toolsForAiOpen: boolean;
  workspacePolicyCopy: Record<WorkspaceToolPolicy, string>;
  onPromptEditorModeChange: (mode: PromptEditorMode) => void;
  onPromptSettingsChange: (updater: (current: PromptSettings) => PromptSettings) => void;
  onResetDefaults: () => void;
  onSaveLocal: () => void;
  onToolsForAiOpenChange: (open: boolean) => void;
};

export function PromptStudioPanel({
  profile,
  promptEditorMode,
  scheduleModeCopy,
  settings,
  toolsForAiOpen,
  workspacePolicyCopy,
  onPromptEditorModeChange,
  onPromptSettingsChange,
  onResetDefaults,
  onSaveLocal,
  onToolsForAiOpenChange,
}: PromptStudioPanelProps) {
  const updateSimplePrompt = (key: keyof PromptSettings["simple"], value: string) => {
    onPromptSettingsChange((current) => ({
      ...current,
      simple: {
        ...current.simple,
        [key]: value,
      },
    }));
  };
  type BooleanToolConnectionKey = "googleWorkspaceCli" | "daisoCli";

  const updateToolConnection = (key: BooleanToolConnectionKey, enabled: boolean) => {
    onPromptSettingsChange((current) => ({
      ...current,
      toolConnections: {
        ...current.toolConnections,
        [key]: enabled,
      },
    }));
  };
  const updateListItem = (key: "responseRules" | "safetyRules", index: number, value: string) => {
    onPromptSettingsChange((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  };
  const addListItem = (key: "responseRules" | "safetyRules", value: string) => {
    onPromptSettingsChange((current) => ({
      ...current,
      [key]: [...current[key], value],
    }));
  };
  const removeListItem = (key: "responseRules" | "safetyRules", index: number) => {
    onPromptSettingsChange((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
    }));
  };
  const toolOptions: Array<{
    id: BooleanToolConnectionKey;
    title: string;
    label: string;
    icon: string;
    description: string;
    role: string;
    features: string[];
  }> = [
    {
      id: "googleWorkspaceCli",
      title: "Google Workspace CLI",
      label: "Google apps",
      icon: "workspaces",
      description: "Connects Google Calendar, Gmail, Drive, and Workspace tasks after OAuth and CLI setup are added.",
      role: "Lets the assistant prepare schedules, emails, document actions, and workspace automation. Until the tool confirms completion, MiVA should explain the draft action instead of saying it is done.",
      features: ["Calendar planning", "Gmail draft support", "Drive and Workspace actions"],
    },
    {
      id: "daisoCli",
      title: "Daiso CLI",
      label: "Daiso",
      icon: "terminal",
      description: "Reserved for Daiso CLI workflows that can run approved local or external commands later.",
      role: "Lets the assistant understand that Daiso actions may become available. MiVA must still ask before tool use and only report completion after the connected CLI confirms it.",
      features: ["Approved CLI workflows", "Local automation hooks", "Future tool actions"],
    },
  ];

  const renderPromptPreview = () => (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-heading text-xl font-bold text-[#191c1d]">System prompt preview</h3>
          <p className="mt-2 text-sm leading-6 text-[#42474d]">
            This is the assembled prompt sent to the local helper with each chat request.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton onClick={onResetDefaults}>Reset defaults</SecondaryButton>
          <PrimaryButton onClick={onSaveLocal}>Save locally</PrimaryButton>
        </div>
      </div>
      <pre className="mt-5 max-h-[360px] w-full max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[#191c1d] p-5 text-xs leading-6 text-[#e1e3e4]">
        {profile.prompt.systemPrompt}
      </pre>
    </Panel>
  );

  const renderSimplePrompt = () => (
    <Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
            <span className="material-symbols-outlined text-[24px]">edit_note</span>
          </span>
          <h3 className="mt-5 font-heading text-xl font-bold text-[#191c1d]">Simple prompt builder</h3>
          <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
            Write what normal users actually want this assistant to do. MiVA turns these fields into structured prompt instructions.
          </p>
          <div className="mt-5 grid gap-3">
            {[
              ["Purpose", "What this assistant is for."],
              ["Tasks", "The work the user wants to ask for often."],
              ["Tone", "How the assistant should sound."],
              ["Limits", "What the assistant should avoid."],
            ].map(([title, body]) => (
              <div className="rounded-xl bg-[#f3f4f5] p-3" key={title}>
                <p className="text-sm font-bold text-[#191c1d]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#72787e]">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Assistant purpose</span>
            <textarea
              className="min-h-[96px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.simple.assistantPurpose}
              onChange={(event) => updateSimplePrompt("assistantPurpose", event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">What should this assistant do?</span>
            <textarea
              className="min-h-[140px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
              placeholder="Example: manage my schedule, remind me of deadlines, summarize study notes, help with emails."
              value={settings.simple.desiredTasks}
              onChange={(event) => updateSimplePrompt("desiredTasks", event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Preferred tone</span>
            <input
              className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.simple.preferredTone}
              onChange={(event) => updateSimplePrompt("preferredTone", event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Things to avoid</span>
            <textarea
              className="min-h-[92px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.simple.avoidances}
              onChange={(event) => updateSimplePrompt("avoidances", event.target.value)}
            />
          </label>
        </div>
      </div>
    </Panel>
  );

  const renderToolsForAiCard = () => (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Tools for AI</p>
          <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Connected tool permissions</h3>
          <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
            Choose which external tools this assistant is allowed to prepare for. These toggles shape the prompt; real actions still require a connected tool and confirmation.
          </p>
        </div>
        <SecondaryButton onClick={() => onToolsForAiOpenChange(true)}>Manage tools</SecondaryButton>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {toolOptions.map((tool) => {
          const enabled = settings.toolConnections[tool.id];

          return (
            <div className="rounded-xl bg-[#f3f4f5] p-4" key={tool.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                    <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#191c1d]">{tool.title}</p>
                    <p className="mt-1 text-xs text-[#72787e]">{tool.label}</p>
                  </div>
                </div>
                <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "On" : "Off"}</Badge>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#42474d]">{tool.description}</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );

  const renderToolsForAiModal = () => {
    if (!toolsForAiOpen) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-[#191c1d]/35 px-6 backdrop-blur-sm">
        <section className="max-h-[86vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_24px_80px_rgba(25,28,29,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Tools for AI</p>
              <h3 className="mt-2 font-heading text-2xl font-bold text-[#191c1d]">Tool access settings</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Turn tools on when this assistant should prepare actions for that integration. Turning a tool on does not mean the action is already connected or completed.
              </p>
            </div>
            <button
              aria-label="Close tools settings"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#72787e] transition hover:bg-[#f3f4f5]"
              onClick={() => onToolsForAiOpenChange(false)}
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {toolOptions.map((tool) => {
              const enabled = settings.toolConnections[tool.id];

              return (
                <article className="rounded-2xl border border-[#c2c7ce]/70 bg-[#f8f9fa] p-5" key={tool.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                        <span className="material-symbols-outlined text-[24px]">{tool.icon}</span>
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-heading text-lg font-bold text-[#191c1d]">{tool.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-[#42474d]">{tool.description}</p>
                      </div>
                    </div>
                    <button
                      aria-pressed={enabled}
                      className={`flex h-9 w-[76px] shrink-0 items-center rounded-full p-1 transition ${
                        enabled ? "justify-end bg-[#35607f]" : "justify-start bg-[#dfe3e6]"
                      }`}
                      onClick={() => updateToolConnection(tool.id, !enabled)}
                      type="button"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[11px] font-bold text-[#35607f] shadow-sm">
                        {enabled ? "On" : "Off"}
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">What this gives the assistant</p>
                    <p className="mt-2 text-sm leading-6 text-[#42474d]">{tool.role}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tool.features.map((feature) => (
                      <Badge key={feature}>{feature}</Badge>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <PrimaryButton onClick={() => onToolsForAiOpenChange(false)}>Done</PrimaryButton>
          </div>
        </section>
      </div>
    );
  };

  const renderDeveloperPrompt = () => (
    <>
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">Developer prompt controls</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
              Edit detailed prompt pieces used by local and cloud providers. These settings are stored in the active assistant profile.
            </p>
          </div>
          <Badge tone="action">Advanced</Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Persona</span>
            <textarea
              className="min-h-[128px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.persona}
              onChange={(event) => onPromptSettingsChange((current) => ({ ...current, persona: event.target.value }))}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Role goal</span>
            <textarea
              className="min-h-[128px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.roleGoal}
              onChange={(event) => onPromptSettingsChange((current) => ({ ...current, roleGoal: event.target.value }))}
            />
          </label>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">Response rules</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">General behavior rules that apply to every provider.</p>
            </div>
            <SecondaryButton className="px-3 py-2 text-xs" onClick={() => addListItem("responseRules", "Add a clear response rule.")}>
              Add rule
            </SecondaryButton>
          </div>
          <div className="mt-5 grid gap-3">
            {settings.responseRules.map((rule, index) => (
              <div className="flex gap-2" key={`response-${index}`}>
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={rule}
                  onChange={(event) => updateListItem("responseRules", index, event.target.value)}
                />
                <SecondaryButton className="px-3 py-2" onClick={() => removeListItem("responseRules", index)}>
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </SecondaryButton>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">Safety rules</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">Boundaries for tools, private data, and actions.</p>
            </div>
            <SecondaryButton className="px-3 py-2 text-xs" onClick={() => addListItem("safetyRules", "Add a clear safety rule.")}>
              Add rule
            </SecondaryButton>
          </div>
          <div className="mt-5 grid gap-3">
            {settings.safetyRules.map((rule, index) => (
              <div className="flex gap-2" key={`safety-${index}`}>
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                  value={rule}
                  onChange={(event) => updateListItem("safetyRules", index, event.target.value)}
                />
                <SecondaryButton className="px-3 py-2" onClick={() => removeListItem("safetyRules", index)}>
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </SecondaryButton>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">Schedule and Workspace policy</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
              Schedule drafting works with prompt rules only. Creating, editing, or deleting real calendar events requires a connected Google Workspace tool later.
            </p>
          </div>
          <Badge tone={settings.workspaceRules.googleWorkspace === "disabled" ? "neutral" : "action"}>
            Google Workspace {workspacePolicyCopy[settings.workspaceRules.googleWorkspace]}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <label className="grid gap-2 xl:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Schedule mode</span>
            <select
              className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.scheduleRules.mode}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                scheduleRules: {
                  ...current.scheduleRules,
                  mode: event.target.value as CalendarActionMode,
                },
              }))}
            >
              <option value="draftOnly">Draft only</option>
              <option value="confirmBeforeAction">Confirm before action</option>
              <option value="connectedActions">Connected actions after OAuth</option>
            </select>
            <span className="text-xs leading-5 text-[#72787e]">{scheduleModeCopy[settings.scheduleRules.mode]}</span>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Timezone</span>
            <input
              className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.scheduleRules.timezone}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                scheduleRules: {
                  ...current.scheduleRules,
                  timezone: event.target.value,
                },
              }))}
            />
          </label>
          <label className="grid gap-2 xl:col-span-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Reminder preference</span>
            <input
              className="rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
              value={settings.scheduleRules.reminderPreference}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                scheduleRules: {
                  ...current.scheduleRules,
                  reminderPreference: event.target.value,
                },
              }))}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(["googleWorkspace", "calendar", "gmail", "drive"] as Array<keyof PromptSettings["workspaceRules"]>).map((key) => (
            <label className="grid gap-2 rounded-xl bg-[#f3f4f5] p-3" key={key}>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{key}</span>
              <select
                className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-2 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                value={settings.workspaceRules[key]}
                onChange={(event) => onPromptSettingsChange((current) => ({
                  ...current,
                  workspaceRules: {
                    ...current.workspaceRules,
                    [key]: event.target.value as WorkspaceToolPolicy,
                  },
                }))}
              >
                <option value="disabled">Disabled</option>
                <option value="askFirst">Ask first</option>
                <option value="connectedOnly">Connected only</option>
              </select>
            </label>
          ))}
        </div>
      </Panel>
    </>
  );

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">Prompt profile</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
              Simple mode is for normal users. Developer mode exposes detailed prompt policy and tool behavior.
            </p>
          </div>
          <Badge tone="action">Local profile</Badge>
        </div>

        <div className="mt-6 inline-flex rounded-2xl border border-[#c2c7ce] bg-[#f3f4f5] p-1">
          {([
            ["simple", "Simple"],
            ["developer", "Developer"],
          ] as Array<[PromptEditorMode, string]>).map(([mode, label]) => (
            <button
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                promptEditorMode === mode
                  ? "bg-white text-[#35607f] shadow-sm"
                  : "text-[#72787e] hover:text-[#191c1d]"
              }`}
              key={mode}
              onClick={() => onPromptEditorModeChange(mode)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {promptEditorMode === "simple" ? (
        <>
          {renderSimplePrompt()}
          {renderToolsForAiCard()}
        </>
      ) : renderDeveloperPrompt()}
      {renderPromptPreview()}
      {renderToolsForAiModal()}
    </div>
  );
}
