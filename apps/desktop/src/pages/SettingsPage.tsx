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
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import { ActivityLogPanel } from "../features/logs/ActivityLogPanel";

type ProviderMeta = Record<ProviderId, { label: string; mode: ProviderMode; icon: string }>;

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
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.language}</span>
            <select
              className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
              value={locale}
              disabled
            >
              <option value="en">English</option>
            </select>
          </label>

          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.modelStorage}</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">{t.defaultStorage}</p>
          </div>

          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.currentModel}</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">
              {activeProviderLabel} / {activeModelLabel}
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Assistant Profile</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">
              {activeLocalProfile?.name ?? "MiVA Assistant"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#72787e]">
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
        {assistantProfileError && <p className="mt-3 text-xs leading-5 text-[#93000a]">{assistantProfileError}</p>}
      </Panel>
    </>
  );

  const aiModelsPanel = (
    <Panel>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="font-heading text-xl font-bold text-[#191c1d]">{t.providerKeysTitle}</h3>
          <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#42474d]">{t.providerKeysBody}</p>
        </div>
        {providerKeysSaved && <Badge tone="success">{t.keysSaved}</Badge>}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {(["ollama", "openai", "gemini"] as ProviderId[]).map((providerId) => {
          const meta = providerMeta[providerId];
          const isActive = selectedProvider === providerId;
          const statusLabel =
            providerId === "ollama"
              ? status?.running
                ? t.running
                : status?.installed
                  ? t.stopped
                  : t.missing
              : providerKeys[providerId]
                ? providerText.hasOverride
                : providerText.defaultKey;

          return (
            <button
              className={`rounded-2xl border bg-white p-4 text-left transition ${
                isActive ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
              }`}
              key={providerId}
              onClick={() => {
                onSelectedProviderChange(providerId);
                if (providerId !== "ollama") {
                  onSelectedCloudModelChange(cloudModelCatalog.find((model) => model.provider === providerId)?.id ?? selectedCloudModel);
                }
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                  <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                </span>
                <Badge tone={meta.mode === "local" ? "success" : "action"}>
                  {meta.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
                </Badge>
              </div>
              <h4 className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{meta.label}</h4>
              <p className="mt-1 text-sm font-semibold text-[#72787e]">{statusLabel}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.openaiApiKey}</span>
            <Badge tone={providerKeys.openai ? "action" : "neutral"}>{providerKeys.openai ? t.userOverrideKey : t.defaultEnvKey}</Badge>
          </div>
          <input
            autoComplete="off"
            className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
            placeholder="sk-..."
            type="password"
            value={providerKeys.openai}
            onChange={(event) => onProviderKeysChange((current) => ({ ...current, openai: event.target.value }))}
          />
        </label>

        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.geminiApiKey}</span>
            <Badge tone={providerKeys.gemini ? "action" : "neutral"}>{providerKeys.gemini ? t.userOverrideKey : t.defaultEnvKey}</Badge>
          </div>
          <input
            autoComplete="off"
            className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
            placeholder="AIza..."
            type="password"
            value={providerKeys.gemini}
            onChange={(event) => onProviderKeysChange((current) => ({ ...current, gemini: event.target.value }))}
          />
        </label>

        <div className="rounded-xl bg-[#fff8e1] p-4 text-sm leading-6 text-[#5c4300]">
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
      <h3 className="font-heading text-xl font-bold text-[#191c1d]">Security</h3>
      <p className="mt-2 text-sm leading-6 text-[#42474d]">
        Phase 1 keeps assistant profiles and runtime chat history on this device. Cloud sync and account security will be added later.
      </p>
      <div className="mt-6 grid gap-3">
        <div className="rounded-xl bg-[#f3f4f5] p-4">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">API key policy</span>
          <p className="mt-2 text-sm font-semibold text-[#191c1d]">Local override keys stay in this app storage for development testing.</p>
        </div>
        <div className="rounded-xl bg-[#f3f4f5] p-4">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Runtime chat</span>
          <p className="mt-2 text-sm font-semibold text-[#191c1d]">Saved locally. Server sync is disabled until account features exist.</p>
        </div>
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
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Settings</p>
          <h2 className="mt-2 font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">
            {activeSettingsSection.label}
          </h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">{activeSettingsSection.detail}</p>
        </div>
        <SecondaryButton className="shrink-0" onClick={onExitSettings}>
          Exit settings
        </SecondaryButton>
      </header>

      {settingsSection === "general" && generalPanel}
      {settingsSection === "aiModels" && aiModelsPanel}
      {settingsSection === "security" && securityPanel}
      {settingsSection === "logs" && logsPanel}
    </div>
  );
}
