import {
  Badge,
  InfoTile,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SetupStepShell,
  StatusAlert,
} from "../components/ui";
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
    ["Skills", profile.capabilities.skills.enabled],
    ["External APIs", profile.capabilities.externalApis.enabled],
  ];

  return (
    <SetupStepShell variant="narrow">
      <SectionHeader
        actions={<PrimaryButton className="miva-setup-primary h-10 px-4 text-sm">Sign in</PrimaryButton>}
        body="Local profiles work without an account. Sign-in will later sync assistants, settings, and chat history across devices."
        eyebrow="Account"
        title="Sign in to sync profiles"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel className="miva-stagger-item miva-stagger-0">
          <SectionHeader
            actions={(
              <PrimaryButton className="miva-setup-primary h-10 px-4 text-sm" onClick={finalizeProfile}>
                Save assistant
              </PrimaryButton>
            )}
            body="Survey choices, provider selection, and model recommendation are saved locally first."
            title="Assistant Setup"
            className="mb-0"
          />

          <div className="mt-6 grid gap-3">
            {profileRows.map(([label, value], index) => (
              <InfoTile
                className={`miva-stagger-item miva-stagger-${Math.min(index + 1, 5)} p-4`}
                key={label}
                label={label}
                value={value}
              />
            ))}
          </div>

          <Panel className="mt-5 bg-[var(--miva-bg-soft)] shadow-none">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Future interests</span>
            <p className="mt-2 text-sm font-semibold text-[var(--miva-text)]">
              {profile.futureFeatures.length ? profile.futureFeatures.join(", ") : "None selected"}
            </p>
          </Panel>
        </Panel>

        <Panel className="miva-stagger-item miva-stagger-1">
          <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Extension Slots</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
            These fields are placeholders for later role details, voice, character, Google Workspace, and skills.
          </p>

          <div className="mt-6 grid gap-3">
            {capabilityRows.map(([label, enabled], index) => (
              <div
                className={`miva-stagger-item miva-stagger-${Math.min(index + 2, 5)} flex items-center justify-between rounded-lg bg-[var(--miva-bg-soft)] px-4 py-3 text-sm`}
                key={String(label)}
              >
                <span className="font-semibold text-[var(--miva-text-muted)]">{label}</span>
                <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Later"}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="miva-stagger-item miva-stagger-2 mt-6">
        <SectionHeader
          actions={(
            <SecondaryButton className="h-10 px-4 text-sm" onClick={enterGeneralSettings}>
              Open settings
            </SecondaryButton>
          )}
          body="This preview is what the local helper can use to shape answers."
          title="Prompt Preview"
          className="mb-0"
        />
        <pre className="mt-5 max-h-56 overflow-auto rounded-lg bg-[var(--miva-text)] p-5 text-xs leading-6 text-[var(--miva-bg-soft)]">
          {profile.prompt.systemPrompt}
        </pre>
      </Panel>

      {assistantProfileError && (
        <StatusAlert className="mt-4" tone="danger">
          {assistantProfileError}
        </StatusAlert>
      )}
    </SetupStepShell>
  );
}
