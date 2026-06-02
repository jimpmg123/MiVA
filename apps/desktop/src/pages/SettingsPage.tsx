import type { Dispatch, SetStateAction } from "react";
import type {
  CloudModelInfo,
  LocalAssistantProfile,
  OllamaStatus,
  ProviderId,
  ProviderKeyState,
  ProviderMode,
  SettingsSection,
} from "../types";
import { Badge, Button, IconTile, InfoTile, Input, Panel, PrimaryButton, SecondaryButton, SectionHeader, Select } from "../components/ui";
import { ActivityLogPanel } from "../features/logs/ActivityLogPanel";

type ProviderMeta = Record<ProviderId, { label: string; mode: ProviderMode; icon: string }>;

const providerKeyLinks = {
  openai: "https://platform.openai.com/api-keys",
  gemini: "https://aistudio.google.com/app/apikey",
  groq: "https://console.groq.com/keys",
};

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
  providerMeta: ProviderMeta;
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
  providerMeta,
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
        {(["ollama", "openai", "gemini", "groq"] as ProviderId[]).map((providerId) => {
          const meta = providerMeta[providerId];
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
                  <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                </IconTile>
                <Badge tone={meta.mode === "local" ? "success" : "action"}>
                  {meta.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
                </Badge>
              </div>
              <h4 className="mt-4 font-heading text-lg font-bold text-[var(--miva-text)]">{meta.label}</h4>
              <p className="mt-1 text-sm font-semibold text-[var(--miva-text-muted)]">{statusLabel}</p>
            </Button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{t.openaiApiKey}</span>
            <div className="flex items-center gap-2">
              <a
                className="rounded-full border border-[var(--miva-border)] px-3 py-2 text-xs font-bold text-[var(--miva-primary)] transition hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
                href={providerKeyLinks.openai}
                rel="noreferrer"
                target="_blank"
              >
                Get API key
              </a>
              <Badge tone={providerKeys.openai ? "action" : "neutral"}>{providerKeys.openai ? t.userOverrideKey : t.defaultEnvKey}</Badge>
            </div>
          </div>
          <Input
            autoComplete="off"
            placeholder="sk-..."
            type="password"
            value={providerKeys.openai}
            onChange={(event) => onProviderKeysChange((current) => ({ ...current, openai: event.target.value }))}
          />
        </label>

        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{t.geminiApiKey}</span>
            <div className="flex items-center gap-2">
              <a
                className="rounded-full border border-[var(--miva-border)] px-3 py-2 text-xs font-bold text-[var(--miva-primary)] transition hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
                href={providerKeyLinks.gemini}
                rel="noreferrer"
                target="_blank"
              >
                Get API key
              </a>
              <Badge tone={providerKeys.gemini ? "action" : "neutral"}>{providerKeys.gemini ? t.userOverrideKey : t.defaultEnvKey}</Badge>
            </div>
          </div>
          <Input
            autoComplete="off"
            placeholder="AIza..."
            type="password"
            value={providerKeys.gemini}
            onChange={(event) => onProviderKeysChange((current) => ({ ...current, gemini: event.target.value }))}
          />
        </label>

        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{t.groqApiKey}</span>
            <div className="flex items-center gap-2">
              <a
                className="rounded-full border border-[var(--miva-border)] px-3 py-2 text-xs font-bold text-[var(--miva-primary)] transition hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
                href={providerKeyLinks.groq}
                rel="noreferrer"
                target="_blank"
              >
                Get API key
              </a>
              <Badge tone={providerKeys.groq ? "action" : "neutral"}>{providerKeys.groq ? t.userOverrideKey : t.defaultEnvKey}</Badge>
            </div>
          </div>
          <Input
            autoComplete="off"
            placeholder="gsk_..."
            type="password"
            value={providerKeys.groq}
            onChange={(event) => onProviderKeysChange((current) => ({ ...current, groq: event.target.value }))}
          />
        </label>

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
