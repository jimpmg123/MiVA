import type {
  CalendarActionMode,
  LocalAssistantProfile,
  PromptEditorMode,
  PromptSettings,
  SummaryModelPolicy,
  WorkspaceToolPolicy,
} from "../types";
import { useState } from "react";
import { Badge, Button, IconButton, IconTile, InfoTile, Input, ModalBackdrop, ModalPanel, Panel, PrimaryButton, SecondaryButton, Select, Switch, Textarea } from "../components/ui";
import { defaultPromptSettings } from "../features/assistants/profile";
import { toolManifestList } from "../features/extensions/registry";
import type { ToolConnectionKey } from "../features/extensions/registry";

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
  const [focusedSimplePromptKey, setFocusedSimplePromptKey] = useState<keyof PromptSettings["simple"] | null>(null);
  const [focusedDeveloperPromptKey, setFocusedDeveloperPromptKey] = useState<string | null>(null);
  const updateSimplePrompt = (key: keyof PromptSettings["simple"], value: string) => {
    onPromptSettingsChange((current) => ({
      ...current,
      simple: {
        ...current.simple,
        [key]: value,
      },
    }));
  };
  const simplePromptInputClass = (key: keyof PromptSettings["simple"], className: string) => (
    `${className} ${settings.simple[key] === defaultPromptSettings.simple[key] ? "text-[var(--miva-text-soft)]" : "text-[var(--miva-text)]"}`
  );
  const getSimplePromptInputValue = (key: keyof PromptSettings["simple"]) => {
    if (focusedSimplePromptKey === key && settings.simple[key] === defaultPromptSettings.simple[key]) {
      return "";
    }

    return settings.simple[key];
  };
  const focusSimplePromptInput = (key: keyof PromptSettings["simple"]) => {
    setFocusedSimplePromptKey(key);
  };
  const changeSimplePromptInput = (key: keyof PromptSettings["simple"], value: string) => {
    const defaultValue = defaultPromptSettings.simple[key];
    if (settings.simple[key] === defaultValue && value.startsWith(defaultValue)) {
      updateSimplePrompt(key, value.slice(defaultValue.length));
      return;
    }

    updateSimplePrompt(key, value);
  };
  const blurSimplePromptInput = (key: keyof PromptSettings["simple"], value: string) => {
    setFocusedSimplePromptKey(null);
    if (!value.trim()) {
      updateSimplePrompt(key, defaultPromptSettings.simple[key]);
    }
  };
  const defaultAwareInputClass = (currentValue: string, defaultValue: string, className: string) => (
    `${className} ${currentValue === defaultValue ? "text-[var(--miva-text-soft)]" : "text-[var(--miva-text)]"}`
  );
  const getDefaultAwareInputValue = (focusKey: string, currentValue: string, defaultValue: string) => {
    if (focusedDeveloperPromptKey === focusKey && currentValue === defaultValue) {
      return "";
    }

    return currentValue;
  };
  const changeDefaultAwareInput = (
    currentValue: string,
    defaultValue: string,
    nextValue: string,
    updateValue: (value: string) => void,
  ) => {
    if (currentValue === defaultValue && nextValue.startsWith(defaultValue)) {
      updateValue(nextValue.slice(defaultValue.length));
      return;
    }

    updateValue(nextValue);
  };
  const blurDefaultAwareInput = (defaultValue: string, value: string, updateValue: (nextValue: string) => void) => {
    setFocusedDeveloperPromptKey(null);
    if (!value.trim()) {
      updateValue(defaultValue);
    }
  };
  const updateToolConnection = (key: ToolConnectionKey, enabled: boolean) => {
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
  const toolOptions = toolManifestList;

  const renderPromptPreview = () => (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">System prompt preview</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
            This is the assembled prompt sent to the local helper with each chat request.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton onClick={onResetDefaults}>Reset defaults</SecondaryButton>
          <PrimaryButton onClick={onSaveLocal}>Save locally</PrimaryButton>
        </div>
      </div>
      <pre className="mt-5 max-h-[360px] w-full max-w-full overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--miva-text)] p-5 text-xs leading-6 text-[var(--miva-surface-muted)]">
        {profile.prompt.systemPrompt}
      </pre>
    </Panel>
  );

  const renderSimplePrompt = () => (
    <Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <IconTile className="h-12 w-12">
            <span className="material-symbols-outlined text-[24px]">edit_note</span>
          </IconTile>
          <h3 className="mt-5 font-heading text-xl font-bold text-[var(--miva-text)]">Simple prompt builder</h3>
          <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--miva-text-muted)]">
            Write what normal users actually want this assistant to do. MiVA turns these fields into structured prompt instructions.
          </p>
          <div className="mt-5 grid gap-3">
            {[
              ["Purpose", "What this assistant is for."],
              ["Tasks", "The work the user wants to ask for often."],
              ["Tone", "How the assistant should sound."],
              ["Limits", "What the assistant should avoid."],
            ].map(([title, body]) => (
              <InfoTile key={title} label={title} value={body} />
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Assistant purpose</span>
            <Textarea
              className={simplePromptInputClass("assistantPurpose", "min-h-[96px] resize-none")}
              value={getSimplePromptInputValue("assistantPurpose")}
              onFocus={() => focusSimplePromptInput("assistantPurpose")}
              onBlur={(event) => blurSimplePromptInput("assistantPurpose", event.target.value)}
              onChange={(event) => changeSimplePromptInput("assistantPurpose", event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">What should this assistant do?</span>
            <Textarea
              className={simplePromptInputClass("desiredTasks", "min-h-[140px] resize-none")}
              value={getSimplePromptInputValue("desiredTasks")}
              onFocus={() => focusSimplePromptInput("desiredTasks")}
              onBlur={(event) => blurSimplePromptInput("desiredTasks", event.target.value)}
              onChange={(event) => changeSimplePromptInput("desiredTasks", event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Preferred tone</span>
            <Input
              className={simplePromptInputClass("preferredTone", "")}
              value={getSimplePromptInputValue("preferredTone")}
              onFocus={() => focusSimplePromptInput("preferredTone")}
              onBlur={(event) => blurSimplePromptInput("preferredTone", event.target.value)}
              onChange={(event) => changeSimplePromptInput("preferredTone", event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Things to avoid</span>
            <Textarea
              className={simplePromptInputClass("avoidances", "min-h-[92px] resize-none")}
              value={getSimplePromptInputValue("avoidances")}
              onFocus={() => focusSimplePromptInput("avoidances")}
              onBlur={(event) => blurSimplePromptInput("avoidances", event.target.value)}
              onChange={(event) => changeSimplePromptInput("avoidances", event.target.value)}
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
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Tools for AI</p>
          <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">Connected tool permissions</h3>
          <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--miva-text-muted)]">
            Choose which external tools this assistant is allowed to prepare for. These toggles shape the prompt; real actions still require a connected tool and confirmation.
          </p>
        </div>
        <SecondaryButton onClick={() => onToolsForAiOpenChange(true)}>Manage tools</SecondaryButton>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {toolOptions.map((tool) => {
          const enabled = settings.toolConnections[tool.id];

          return (
            <div className="rounded-lg bg-[var(--miva-bg-soft)] p-4" key={tool.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <IconTile className="h-10 w-10">
                    <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                  </IconTile>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--miva-text)]">{tool.title}</p>
                    <p className="mt-1 text-xs text-[var(--miva-text-muted)]">{tool.label}</p>
                  </div>
                </div>
                <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "On" : "Off"}</Badge>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--miva-text-muted)]">{tool.description}</p>
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
      <ModalBackdrop className="z-[90]">
        <ModalPanel className="max-h-[86vh] max-w-[720px] overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Tools for AI</p>
              <h3 className="mt-2 font-heading text-2xl font-bold text-[var(--miva-text)]">Tool access settings</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
                Turn tools on when this assistant should prepare actions for that integration. Turning a tool on does not mean the action is already connected or completed.
              </p>
            </div>
            <IconButton
              aria-label="Close tools settings"
              className="shrink-0 rounded-full text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)]"
              onClick={() => onToolsForAiOpenChange(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </IconButton>
          </div>

          <div className="mt-6 grid gap-4">
            {toolOptions.map((tool) => {
              const enabled = settings.toolConnections[tool.id];

              return (
                <article className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-5" key={tool.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <IconTile className="h-12 w-12">
                        <span className="material-symbols-outlined text-[24px]">{tool.icon}</span>
                      </IconTile>
                      <div className="min-w-0">
                        <h4 className="font-heading text-lg font-bold text-[var(--miva-text)]">{tool.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">{tool.description}</p>
                      </div>
                    </div>
                    <Switch
                      aria-label={`${enabled ? "Disable" : "Enable"} ${tool.title}`}
                      checked={enabled}
                      className="h-9 w-[76px] shrink-0"
                      onCheckedChange={(checked) => updateToolConnection(tool.id, checked)}
                    />
                  </div>

                  <div className="mt-4 rounded-lg bg-[var(--miva-surface)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">What this gives the assistant</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">{tool.role}</p>
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
        </ModalPanel>
      </ModalBackdrop>
    );
  };

  const renderDeveloperPrompt = () => (
    <>
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Developer prompt controls</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Edit detailed prompt pieces used by local and cloud providers. These settings are stored in the active assistant profile.
            </p>
          </div>
          <Badge tone="action">Advanced</Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Persona</span>
            <Textarea
              className={defaultAwareInputClass(settings.persona, defaultPromptSettings.persona, "min-h-[128px] resize-none")}
              value={getDefaultAwareInputValue("persona", settings.persona, defaultPromptSettings.persona)}
              onFocus={() => setFocusedDeveloperPromptKey("persona")}
              onBlur={(event) => blurDefaultAwareInput(defaultPromptSettings.persona, event.target.value, (persona) => onPromptSettingsChange((current) => ({ ...current, persona })))}
              onChange={(event) => changeDefaultAwareInput(settings.persona, defaultPromptSettings.persona, event.target.value, (persona) => onPromptSettingsChange((current) => ({ ...current, persona })))}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Role goal</span>
            <Textarea
              className={defaultAwareInputClass(settings.roleGoal, defaultPromptSettings.roleGoal, "min-h-[128px] resize-none")}
              value={getDefaultAwareInputValue("roleGoal", settings.roleGoal, defaultPromptSettings.roleGoal)}
              onFocus={() => setFocusedDeveloperPromptKey("roleGoal")}
              onBlur={(event) => blurDefaultAwareInput(defaultPromptSettings.roleGoal, event.target.value, (roleGoal) => onPromptSettingsChange((current) => ({ ...current, roleGoal })))}
              onChange={(event) => changeDefaultAwareInput(settings.roleGoal, defaultPromptSettings.roleGoal, event.target.value, (roleGoal) => onPromptSettingsChange((current) => ({ ...current, roleGoal })))}
            />
          </label>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Response rules</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">General behavior rules that apply to every provider.</p>
            </div>
            <SecondaryButton className="px-3 py-2 text-xs" onClick={() => addListItem("responseRules", "Add a clear response rule.")}>
              Add rule
            </SecondaryButton>
          </div>
          <div className="mt-5 grid gap-3">
            {settings.responseRules.map((rule, index) => (
              <div className="flex gap-2" key={`response-${index}`}>
                <Input
                  className={defaultAwareInputClass(rule, defaultPromptSettings.responseRules[index] ?? "", "min-w-0 flex-1")}
                  value={getDefaultAwareInputValue(`responseRules:${index}`, rule, defaultPromptSettings.responseRules[index] ?? "")}
                  onFocus={() => setFocusedDeveloperPromptKey(`responseRules:${index}`)}
                  onBlur={(event) => blurDefaultAwareInput(defaultPromptSettings.responseRules[index] ?? "", event.target.value, (value) => updateListItem("responseRules", index, value))}
                  onChange={(event) => changeDefaultAwareInput(rule, defaultPromptSettings.responseRules[index] ?? "", event.target.value, (value) => updateListItem("responseRules", index, value))}
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
              <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Safety rules</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">Boundaries for tools, private data, and actions.</p>
            </div>
            <SecondaryButton className="px-3 py-2 text-xs" onClick={() => addListItem("safetyRules", "Add a clear safety rule.")}>
              Add rule
            </SecondaryButton>
          </div>
          <div className="mt-5 grid gap-3">
            {settings.safetyRules.map((rule, index) => (
              <div className="flex gap-2" key={`safety-${index}`}>
                <Input
                  className={defaultAwareInputClass(rule, defaultPromptSettings.safetyRules[index] ?? "", "min-w-0 flex-1")}
                  value={getDefaultAwareInputValue(`safetyRules:${index}`, rule, defaultPromptSettings.safetyRules[index] ?? "")}
                  onFocus={() => setFocusedDeveloperPromptKey(`safetyRules:${index}`)}
                  onBlur={(event) => blurDefaultAwareInput(defaultPromptSettings.safetyRules[index] ?? "", event.target.value, (value) => updateListItem("safetyRules", index, value))}
                  onChange={(event) => changeDefaultAwareInput(rule, defaultPromptSettings.safetyRules[index] ?? "", event.target.value, (value) => updateListItem("safetyRules", index, value))}
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
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Memory compaction</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--miva-text-muted)]">
              By default, MiVA stores only details the user explicitly asks it to remember. If memory grows past the budget, it is compacted into a shorter summary.
            </p>
          </div>
          <Badge tone={settings.summaryMemory.rollingSummary ? "action" : "neutral"}>
            {settings.summaryMemory.rollingSummary ? "Enabled" : "Off"}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          <label className="grid gap-2 rounded-lg bg-[var(--miva-bg-soft)] p-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Memory updates</span>
            <Switch
              checked={settings.summaryMemory.rollingSummary}
              className="h-11 w-24"
              onCheckedChange={() => onPromptSettingsChange((current) => ({
                ...current,
                summaryMemory: {
                  ...current.summaryMemory,
                  rollingSummary: !current.summaryMemory.rollingSummary,
                },
              }))}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Summary model</span>
            <Select
              value={settings.summaryMemory.modelPolicy}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                summaryMemory: {
                  ...current.summaryMemory,
                  modelPolicy: event.target.value as SummaryModelPolicy,
                },
              }))}
            >
              <option value="sameModel">Same as assistant model</option>
              <option value="localModel">Specific local model</option>
              <option value="cloudModel">Specific cloud model</option>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Provider</span>
            <Select
              className="disabled:opacity-55"
              disabled={settings.summaryMemory.modelPolicy !== "cloudModel"}
              value={settings.summaryMemory.provider}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                summaryMemory: {
                  ...current.summaryMemory,
                  provider: event.target.value as PromptSettings["summaryMemory"]["provider"],
                },
              }))}
            >
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama</option>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Compaction budget</span>
            <Input
              min={1000}
              step={500}
              type="number"
              value={settings.summaryMemory.triggerTokenBudget}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                summaryMemory: {
                  ...current.summaryMemory,
                  triggerTokenBudget: Number(event.target.value),
                },
              }))}
            />
          </label>
        </div>

        {settings.summaryMemory.modelPolicy !== "sameModel" ? (
          <label className="mt-4 grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Summary model name</span>
            <Input
              placeholder={settings.summaryMemory.modelPolicy === "localModel" ? "Example: qwen3:4b" : "Example: gemini-2.5-flash"}
              value={settings.summaryMemory.model}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                summaryMemory: {
                  ...current.summaryMemory,
                  model: event.target.value,
                },
              }))}
            />
          </label>
        ) : null}
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Schedule and Workspace policy</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Schedule drafting works with prompt rules only. Creating, editing, or deleting real calendar events requires a connected Google Workspace tool later.
            </p>
          </div>
          <Badge tone={settings.workspaceRules.googleWorkspace === "disabled" ? "neutral" : "action"}>
            Google Workspace {workspacePolicyCopy[settings.workspaceRules.googleWorkspace]}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <label className="grid gap-2 xl:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Schedule mode</span>
            <Select
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
            </Select>
            <span className="text-xs leading-5 text-[var(--miva-text-muted)]">{scheduleModeCopy[settings.scheduleRules.mode]}</span>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Timezone</span>
            <Input
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
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Reminder preference</span>
            <Input
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
            <label className="grid gap-2 rounded-lg bg-[var(--miva-bg-soft)] p-3" key={key}>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{key}</span>
              <Select
                className="px-3 py-2"
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
              </Select>
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
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Prompt profile</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Simple mode is for normal users. Developer mode exposes detailed prompt policy and tool behavior.
            </p>
          </div>
          <Badge tone="action">Local profile</Badge>
        </div>

        <div className="mt-6 inline-flex rounded-full border border-[var(--miva-border)] bg-[var(--miva-surface-muted)] p-1">
          {([
            ["simple", "Simple"],
            ["developer", "Developer"],
          ] as Array<[PromptEditorMode, string]>).map(([mode, label]) => (
            <Button
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                promptEditorMode === mode
                  ? "bg-[var(--miva-control-active-bg)] text-[var(--miva-control-active-text)] shadow-sm"
                  : "text-[var(--miva-text-muted)] hover:text-[var(--miva-text)]"
              }`}
              key={mode}
              onClick={() => onPromptEditorModeChange(mode)}
              size="sm"
              variant="ghost"
            >
              {label}
            </Button>
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
