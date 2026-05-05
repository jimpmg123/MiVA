import { Badge, Panel } from "../components/ui";
import type { LocalAssistantProfile, ProviderMode } from "../types";

type ProfileStepProps = {
  activeModelLabel: string;
  activeProviderLabel: string;
  activeProviderMode: ProviderMode;
  assistantProfileError: string | null;
  profile: LocalAssistantProfile;
  enterGeneralSettings: () => void;
  finalizeProfile: () => void;
};

export function ProfileStep({
  activeModelLabel,
  activeProviderLabel,
  activeProviderMode,
  assistantProfileError,
  profile,
  enterGeneralSettings,
  finalizeProfile,
}: ProfileStepProps) {
  const profileRows = [
    ["Status", profile.status],
    ["Provider", `${activeProviderLabel} / ${activeProviderMode}`],
    ["Model", activeModelLabel],
    ["Use case", profile.useCase ?? "-"],
    ["Answer style", profile.answerStyle ?? "-"],
    ["Language", profile.languageUse ?? "-"],
    ["Local mode", profile.localMode ?? "-"],
  ];
  const capabilityRows = [
    ["Voice", profile.capabilities.voice.enabled],
    ["Character", profile.capabilities.character.enabled],
    ["Google Workspace", profile.capabilities.googleWorkspace.enabled],
    ["Files", profile.capabilities.files.enabled],
    ["Tools", profile.capabilities.tools.enabled],
    ["MCP", profile.capabilities.mcp.enabled],
    ["Skills", profile.capabilities.skills.enabled],
    ["External APIs", profile.capabilities.externalApis.enabled],
  ];

  return (
    <div className="mx-auto max-w-[920px]">
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Account</p>
          <h2 className="mt-3 font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">
            Sign in to sync profiles
          </h2>
          <p className="mt-2 max-w-[680px] text-base leading-7 text-[#42474d]">
            Local profiles work without an account. Sign-in will later sync assistants, settings, and chat history across devices.
          </p>
        </div>
        <button
          className="rounded-xl bg-[#35607f] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#4f7999]"
          type="button"
        >
          Sign in
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-bold text-[#191c1d]">Assistant Setup</h3>
              <p className="mt-2 text-sm leading-6 text-[#42474d]">
                Survey choices, provider selection, and model recommendation are saved locally first.
              </p>
            </div>
            <button
              className="rounded-xl bg-[#35607f] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#4f7999]"
              type="button"
              onClick={finalizeProfile}
            >
              Finalize
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            {profileRows.map(([label, value]) => (
              <div className="flex items-center justify-between rounded-xl bg-[#f3f4f5] px-4 py-3 text-sm" key={label}>
                <span className="font-semibold text-[#72787e]">{label}</span>
                <span className="font-bold text-[#191c1d]">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-[#f8f9fa] p-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Future interests</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">
              {profile.futureFeatures.length ? profile.futureFeatures.join(", ") : "None selected"}
            </p>
          </div>
        </Panel>

        <Panel>
          <h3 className="font-heading text-xl font-bold text-[#191c1d]">Extension Slots</h3>
          <p className="mt-2 text-sm leading-6 text-[#42474d]">
            These fields are placeholders for later role details, voice, character, Google Workspace, MCP, and skills.
          </p>

          <div className="mt-6 grid gap-3">
            {capabilityRows.map(([label, enabled]) => (
              <div className="flex items-center justify-between rounded-xl bg-[#f3f4f5] px-4 py-3 text-sm" key={String(label)}>
                <span className="font-semibold text-[#42474d]">{label}</span>
                <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Later"}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">Prompt Preview</h3>
            <p className="mt-1 text-sm text-[#72787e]">This preview is what the local helper can use to shape answers.</p>
          </div>
          <button
            className="rounded-xl border border-[#c2c7ce] px-4 py-2 text-sm font-bold text-[#42474d] transition hover:border-[#35607f] hover:text-[#35607f]"
            type="button"
            onClick={enterGeneralSettings}
          >
            Open settings
          </button>
        </div>
        <pre className="mt-5 max-h-56 overflow-auto rounded-2xl bg-[#2e3132] p-5 text-xs leading-6 text-[#f0f1f2]">
          {profile.prompt.systemPrompt}
        </pre>
      </Panel>

      {assistantProfileError && (
        <p className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{assistantProfileError}</p>
      )}
    </div>
  );
}
