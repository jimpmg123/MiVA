import type { Dispatch, SetStateAction } from "react";
import type {
  CloudModelInfo,
  LocalAssistantProfile,
  OllamaStatus,
  ProviderId,
  ProviderKeyState,
  SettingsSection,
} from "../types";
import { Badge, Button, IconTile, InfoTile, Input, Panel, PrimaryButton, SecondaryButton, SectionHeader, Select } from "../components/ui";
import { ThemeSelector } from "../components/ThemeSelector";
import { ActivityLogPanel } from "../features/logs/ActivityLogPanel";
import type { UiThemeId } from "../features/theme/themes";
import { cloudProviderManifests, providerManifestList } from "../features/extensions/registry";

type SettingsPageProps = {
  activeLocalProfile: LocalAssistantProfile | null;
  activeModelLabel: string;
  activeProviderLabel: string;
  assistantProfileError: string | null;
  assistantProfileLoaded: boolean;
  assistantProfileSaveState: "idle" | "saving" | "saved" | "error";
  cloudModelCatalog: CloudModelInfo[];
  locale: string;
  logs: string[];
  providerKeys: ProviderKeyState;
  providerKeysSaved: boolean;
  providerText: Record<string, string>;
  selectedCloudModel: string;
  selectedProvider: ProviderId;
  settingsSection: SettingsSection;
  settingsSections: Array<{ id: SettingsSection; label: string; detail: string; icon: string }>;
  status: OllamaStatus | null;
  t: Record<string, string>;
  onClearProviderKeys: () => void;
  onExitSettings: () => void;
  onOpenInitialSetup: () => void;
  onSaveProviderKeys: () => void;
  onSelectedCloudModelChange: (modelId: string) => void;
  onSelectedProviderChange: (providerId: ProviderId) => void;
  onProviderKeysChange: Dispatch<SetStateAction<ProviderKeyState>>;
  themeId: UiThemeId;
  onThemeChange: (themeId: UiThemeId) => void;
};

export function SettingsPage({
  activeLocalProfile,
  activeModelLabel,
  activeProviderLabel,
  assistantProfileError,
  assistantProfileLoaded,
  assistantProfileSaveState,
  cloudModelCatalog,
  locale,
  logs,
  providerKeys,
  providerKeysSaved,
  providerText,
  selectedCloudModel,
  selectedProvider,
  settingsSection,
  settingsSections,
  status,
  t,
  onClearProviderKeys,
  onExitSettings,
  onOpenInitialSetup,
  onSaveProviderKeys,
  onSelectedCloudModelChange,
  onSelectedProviderChange,
  onProviderKeysChange,
  themeId,
  onThemeChange,
}: SettingsPageProps) {
  const activeSettingsSection = settingsSections.find((section) => section.id === settingsSection) ?? settingsSections[0];

  const generalPanel = (
    <>
      <Panel className="mb-6">
        <div className="grid gap-6">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{t.language}</span>
            <Select
              value={locale}
              disabled
            >
              <option value="en">English</option>
            </Select>
          </label>

          <InfoTile label={t.modelStorage} value={t.defaultStorage} className="p-4" />
          <InfoTile label={t.currentModel} value={`${activeProviderLabel} / ${activeModelLabel}`} className="p-4" />
        </div>
      </Panel>

      <Panel className="mb-6">
        <div className="grid gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Appearance</span>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Switch the app color palette. Text and surfaces adjust automatically for readability.
            </p>
          </div>
          <ThemeSelector onThemeChange={onThemeChange} themeId={themeId} />
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Assistant Profile</span>
            <p className="mt-2 text-sm font-semibold text-[var(--miva-text)]">
              {activeLocalProfile?.name ?? "MiVA Assistant"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">
              Saved locally first. Cloud sync can attach to this profile later.
            </p>
          </div>
          <Badge tone={assistantProfileSaveState === "error" ? "neutral" : assistantProfileSaveState === "saving" ? "action" : "success"}>
            {assistantProfileSaveState === "saving"
              ? "Saving"
              : assistantProfileSaveState === "error"
                ? "Save error"
                : assistantProfileSaveState === "saved"
                  ? "Saved"
                  : assistantProfileLoaded
                    ? "Local"
                    : "Loading"}
          </Badge>
        </div>
        {assistantProfileError && <p className="mt-3 text-xs leading-5 text-[var(--miva-danger-hover)]">{assistantProfileError}</p>}
      </Panel>
    </>
  );

  const aiModelsPanel = (
    <Panel>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">{t.providerKeysTitle}</h3>
          <p className="mt-2 max-w-[620px] text-sm leading-6 text-[var(--miva-text-muted)]">{t.providerKeysBody}</p>
        </div>
        {providerKeysSaved && <Badge tone="success">{t.keysSaved}</Badge>}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {providerManifestList.map((providerManifest) => {
          const providerId = providerManifest.id;
          const isActive = selectedProvider === providerId;
          const providerKey = providerId === "ollama" ? "" : providerKeys[providerId];
          const statusLabel =
            providerId === "ollama"
              ? status?.running
                ? t.running
                : status?.installed
                  ? t.stopped
                  : t.missing
              : providerKey
                ? providerText.hasOverride
                : providerText.defaultKey;

          return (
            <Button
              className={`flex h-auto min-h-0 w-full flex-col items-stretch justify-start whitespace-normal rounded-lg border bg-[var(--miva-surface)] p-4 text-left transition ${
                isActive ? "border-[var(--miva-primary)] ring-4 ring-[var(--miva-primary-soft)]" : "border-[var(--miva-border)] hover:border-[var(--miva-primary)]"
              }`}
              key={providerId}
              onClick={() => {
                onSelectedProviderChange(providerId);
                if (providerId !== "ollama") {
                  onSelectedCloudModelChange(cloudModelCatalog.find((model) => model.provider === providerId)?.id ?? selectedCloudModel);
                }
              }}
              variant="ghost"
            >
              <div className="flex items-start justify-between gap-3">
                <IconTile className="h-10 w-10">
                  <span className="material-symbols-outlined text-[20px]">{providerManifest.icon}</span>
                </IconTile>
                <Badge tone={providerManifest.mode === "local" ? "success" : "action"}>
                  {providerManifest.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
                </Badge>
              </div>
              <h4 className="mt-4 font-heading text-lg font-bold text-[var(--miva-text)]">{providerManifest.label}</h4>
              <p className="mt-1 text-sm font-semibold text-[var(--miva-text-muted)]">{statusLabel}</p>
            </Button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5">
        {cloudProviderManifests.map((providerManifest) => {
          const providerId = providerManifest.id;
          const providerKey = providerKeys[providerId];
          return (
            <label className="grid gap-2" key={providerId}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{providerManifest.auth.label}</span>
                <div className="flex items-center gap-2">
                  <a
                    className="rounded-full border border-[var(--miva-border)] px-3 py-2 text-xs font-bold text-[var(--miva-primary)] transition hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
                    href={providerManifest.auth.helpUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Get API key
                  </a>
                  <Badge tone={providerKey ? "action" : "neutral"}>{providerKey ? t.userOverrideKey : t.defaultEnvKey}</Badge>
                </div>
              </div>
              <Input
                autoComplete="off"
                placeholder={providerManifest.auth.placeholder}
                type="password"
                value={providerKey}
                onChange={(event) => onProviderKeysChange((current) => ({ ...current, [providerId]: event.target.value }))}
              />
            </label>
          );
        })}

        <div className="rounded-lg bg-[var(--miva-warning-soft)] p-4 text-sm leading-6 text-[var(--miva-warning)]">
          {t.keyStorageNotice}
        </div>

        <div className="flex items-center justify-end gap-3">
          <SecondaryButton onClick={onClearProviderKeys}>{t.clearKeys}</SecondaryButton>
          <PrimaryButton onClick={onSaveProviderKeys}>{t.saveKeys}</PrimaryButton>
        </div>
      </div>
    </Panel>
  );

  const securityPanel = (
    <Panel>
      <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Security</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
        Phase 1 keeps assistant profiles and runtime chat history on this device. Cloud sync and account security will be added later.
      </p>
      <div className="mt-6 grid gap-3">
        <InfoTile label="API key policy" value="Local override keys stay in this app storage for development testing." className="p-4" />
        <InfoTile label="Runtime chat" value="Saved locally. Server sync is disabled until account features exist." className="p-4" />
      </div>
    </Panel>
  );

  const logsPanel = (
    <ActivityLogPanel
      logs={logs}
      noLogsLabel={t.noLogs}
      onOpenInitialSetup={onOpenInitialSetup}
      showDeveloperAccess
    />
  );

  return (
    <div className="mx-auto max-w-[860px]">
      <SectionHeader
        className="mb-8"
        eyebrow="Settings"
        title={activeSettingsSection.label}
        body={activeSettingsSection.detail}
        actions={<SecondaryButton className="shrink-0" onClick={onExitSettings}>Exit settings</SecondaryButton>}
      />

      {settingsSection === "general" && generalPanel}
      {settingsSection === "aiModels" && aiModelsPanel}
      {settingsSection === "security" && securityPanel}
      {settingsSection === "logs" && logsPanel}
    </div>
  );
}
