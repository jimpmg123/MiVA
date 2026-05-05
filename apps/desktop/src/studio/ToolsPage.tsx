import type {
  CodingAccessMode,
  CodingCapability,
  CodingProviderPolicy,
  LocalAssistantProfile,
  PromptSettings,
  ProviderId,
  ProviderMode,
} from "../types";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";

type ProviderMeta = Record<ProviderId, { label: string; mode: ProviderMode; icon: string }>;

type CodingOption = {
  id: CodingCapability;
  title: string;
  body: string;
  icon: string;
  providerPolicy: CodingProviderPolicy;
  accessMode: CodingAccessMode;
  workspaceAllowlistRequired: boolean;
};

type StudioToolsPanelProps = {
  activeModelLabel: string;
  codingAccessModeCopy: Record<CodingAccessMode, string>;
  codingCapabilityCopy: Record<CodingCapability, string>;
  codingProviderPolicyCopy: Record<CodingProviderPolicy, string>;
  profile: LocalAssistantProfile;
  providerMeta: ProviderMeta;
  selectedProvider: ProviderId;
  onEnterAiModelSettings: () => void;
  onPromptSettingsChange: (updater: (current: PromptSettings) => PromptSettings) => void;
  onSaveLocal: () => void;
  onSelectGeminiFlash: () => void;
  onSyncAll: () => void;
};

const codingOptions: CodingOption[] = [
  {
    id: "chatOnly",
    title: "General assistant",
    body: "No repository actions. Use this for normal personal assistant chat.",
    icon: "chat_bubble",
    providerPolicy: "localAllowed",
    accessMode: "readOnly",
    workspaceAllowlistRequired: false,
  },
  {
    id: "codeExplain",
    title: "Code explanation",
    body: "Read-only code help. Local models are allowed for small snippets and simple explanations.",
    icon: "terminal",
    providerPolicy: "localAllowed",
    accessMode: "readOnly",
    workspaceAllowlistRequired: false,
  },
  {
    id: "codeEdit",
    title: "Code editing",
    body: "Multi-file edits and repository changes. Requires a cloud coding model by default.",
    icon: "edit_square",
    providerPolicy: "cloudRequired",
    accessMode: "fileEdits",
    workspaceAllowlistRequired: true,
  },
  {
    id: "clawCode",
    title: "Claw Code",
    body: "Agentic coding loop with file reads, edits, and shell commands. Cloud API is required by default.",
    icon: "precision_manufacturing",
    providerPolicy: "cloudRequired",
    accessMode: "shellCommands",
    workspaceAllowlistRequired: true,
  },
];

export function StudioToolsPanel({
  activeModelLabel,
  codingAccessModeCopy,
  codingCapabilityCopy,
  codingProviderPolicyCopy,
  profile,
  providerMeta,
  selectedProvider,
  onEnterAiModelSettings,
  onPromptSettingsChange,
  onSaveLocal,
  onSelectGeminiFlash,
  onSyncAll,
}: StudioToolsPanelProps) {
  const coding = profile.prompt.settings.coding;
  const selectedOption = codingOptions.find((option) => option.id === coding.capability) ?? codingOptions[0];
  const cloudRequired = coding.providerPolicy === "cloudRequired" && !coding.localExperimental;
  const cloudRequirementUnmet = cloudRequired && selectedProvider === "ollama";

  const updateCodingPolicy = (option: CodingOption) => {
    onPromptSettingsChange((current) => ({
      ...current,
      coding: {
        capability: option.id,
        providerPolicy: option.providerPolicy,
        localExperimental: false,
        accessMode: option.accessMode,
        workspaceAllowlistRequired: option.workspaceAllowlistRequired,
      },
    }));

    if (option.providerPolicy === "cloudRequired" && selectedProvider === "ollama") {
      onSelectGeminiFlash();
    }
  };

  const setLocalExperimental = (enabled: boolean) => {
    onPromptSettingsChange((current) => ({
      ...current,
      coding: {
        ...current.coding,
        localExperimental: enabled,
      },
    }));
  };

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Coding assistant policy</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Choose what this assistant can do with code</h3>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#42474d]">
              Code editing and Claw Code require a cloud API model by default. Local models can explain code, but full repository automation is kept behind an advanced experimental path.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone={cloudRequired ? "action" : "neutral"}>{codingProviderPolicyCopy[coding.providerPolicy]}</Badge>
            <Badge>{codingAccessModeCopy[coding.accessMode]}</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {codingOptions.map((option) => {
            const active = option.id === coding.capability;
            return (
              <button
                className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                  active ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                }`}
                key={option.id}
                onClick={() => updateCodingPolicy(option)}
                type="button"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                    <span className="material-symbols-outlined text-[22px]">{option.icon}</span>
                  </span>
                  {active && <Badge tone="action">Selected</Badge>}
                </div>
                <h4 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{option.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[#42474d]">{option.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={option.providerPolicy === "cloudRequired" ? "action" : "neutral"}>
                    {codingProviderPolicyCopy[option.providerPolicy]}
                  </Badge>
                  <Badge>{codingAccessModeCopy[option.accessMode]}</Badge>
                  {option.workspaceAllowlistRequired && <Badge>Workspace allowlist</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </span>
            <Badge tone={cloudRequirementUnmet ? "action" : "success"}>
              {cloudRequirementUnmet ? "Action needed" : "Policy ready"}
            </Badge>
          </div>
          <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">Current coding guardrail</h3>
          <div className="mt-4 grid gap-3">
            {[
              ["Capability", codingCapabilityCopy[coding.capability]],
              ["Provider policy", codingProviderPolicyCopy[coding.providerPolicy]],
              ["Access mode", codingAccessModeCopy[coding.accessMode]],
              ["Selected model", `${providerMeta[selectedProvider].label} / ${activeModelLabel}`],
            ].map(([label, value]) => (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f3f4f5] p-3" key={label}>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{label}</span>
                <span className="truncate text-sm font-semibold text-[#191c1d]">{value}</span>
              </div>
            ))}
          </div>

          {cloudRequirementUnmet && (
            <div className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">
              This coding mode requires a cloud API model. Switch to Gemini/OpenAI before saving this assistant for code editing.
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <SecondaryButton onClick={onEnterAiModelSettings}>Manage API keys</SecondaryButton>
            <PrimaryButton onClick={onSelectGeminiFlash}>Use Gemini 2.5 Flash</PrimaryButton>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
              <span className="material-symbols-outlined text-[22px]">science</span>
            </span>
            <Badge>Advanced</Badge>
          </div>
          <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">Experimental local coding</h3>
          <p className="mt-3 text-sm leading-6 text-[#42474d]">
            Local coding can be slow, forget context, or fail on larger repositories. Keep it read-only unless the user deliberately accepts the risk.
          </p>
          <label className="mt-5 flex items-start gap-3 rounded-xl bg-[#f3f4f5] p-4">
            <input
              checked={coding.localExperimental}
              className="mt-1 h-4 w-4 accent-[#35607f]"
              disabled={selectedOption.providerPolicy !== "cloudRequired"}
              onChange={(event) => setLocalExperimental(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-bold text-[#191c1d]">Allow advanced local coding fallback</span>
              <span className="mt-1 block text-xs leading-5 text-[#72787e]">
                This does not install or run Claw Code yet. It only records that the assistant is allowed to try local coding later.
              </span>
            </span>
          </label>
          <div className="mt-5 rounded-xl bg-[#f3f4f5] p-4 text-xs leading-5 text-[#42474d]">
            Recommended local coding candidates: qwen3-coder:30b, devstral:24b, gpt-oss:20b, qwen2.5-coder:32b.
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">Save this coding policy</h3>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              The selected coding capability is saved into the assistant profile and appears on the web after Sync all.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SecondaryButton onClick={onSaveLocal}>Save locally</SecondaryButton>
            <PrimaryButton onClick={onSyncAll}>Sync all</PrimaryButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}
