import { useState } from "react";
import { PrimaryButton } from "../components/ui";
import { codingAccessModeCopy, codingCapabilityCopy, codingProviderPolicyCopy, normalizePromptSettings } from "../features/assistants/profile";
import { providerMeta } from "../features/models/catalog";
import type { AppMode, AssistantProfileSyncState, ClawCodeRuntimeInfo, GoogleWorkspaceStatus, ImportedSkill, LocalAssistantProfile, ModelDownloadProgress, ProfileDetailsDraft, PromptEditorMode, PromptSettings, ProviderId, ProviderKeyState, StudioSection } from "../types";
import { ModelsPanel } from "../studio/ModelsPage";
import { MyAssistantsPanel } from "../studio/MyAssistantsPage";
import { CharacterStudioPanel } from "../studio/CharacterPage";
import { GoogleWorkspacePanel } from "../studio/GoogleWorkspacePage";
import { PromptStudioPanel } from "../studio/PromptsPage";
import { StudioOverviewPanel } from "../studio/OverviewPage";
import { StudioCodePanel } from "../studio/CodePage";
import { SkillsStudioPanel } from "../studio/SkillsPage";
import { VoiceStudioPanel } from "../studio/VoicePage";

type StudioPageProps = {
  activeLocale: "en" | "ko";
  activeLocalProfile: LocalAssistantProfile | null;
  activeLocalProfileId: string;
  activeModelLabel: string;
  assistantProfileStore: { profiles: LocalAssistantProfile[] };
  assistantProfileError: string | null;
  assistantProfileSaveState: "idle" | "saving" | "saved" | "error";
  assistantProfileSyncMessage: string | null;
  assistantProfileSyncState: AssistantProfileSyncState;
  busyAction: string | null;
  clawCodeStatus: ClawCodeRuntimeInfo | null;
  googleWorkspaceStatus: GoogleWorkspaceStatus | null;
  importedSkillsDraft: ImportedSkill[];
  setImportedSkillsDraft: (skills: ImportedSkill[]) => void;
  cloudModelCatalog: any[];
  installedModels: string[];
  isNewAssistantDraft: boolean;
  modelCatalog: any[];
  newAssistantConfiguredSections: Partial<Record<StudioSection, boolean>>;
  profileDetailsDraft: ProfileDetailsDraft;
  promptEditorMode: PromptEditorMode;
  promptSettingsDraft: PromptSettings;
  providerText: Record<string, string>;
  selectedCloudModel: string;
  selectedModel: string;
  selectedProvider: ProviderId;
  signedIn: boolean;
  status: any;
  studioSection: StudioSection;
  studioSections: Array<{ id: StudioSection; label: string; detail: string; icon: string }>;
  syncAllAssistantProfilesToCloud: () => Promise<void>;
  syncAllAssistantProfilesFromCloud: () => Promise<void>;
  syncAssistantProfileToCloud: (profile: LocalAssistantProfile) => Promise<void>;
  deleteLocalAssistantProfile: (profileId: string) => Promise<void>;
  renameLocalAssistantProfile: (profileId: string, name: string) => Promise<void>;
  applyLocalAssistantProfile: (profile: LocalAssistantProfile) => void;
  editLocalAssistantProfile: (profile: LocalAssistantProfile) => void;
  addCurrentLocalAssistantProfile: (options?: { promptVariables?: Record<string, unknown> }) => Promise<unknown>;
  buildCurrentLocalAssistantProfile: () => LocalAssistantProfile;
  downloadModel: (modelName: string) => Promise<void>;
  downloadProgress: ModelDownloadProgress | null;
  onCancelModelDownload: (modelName: string) => void;
  onDeleteModel: (modelName: string) => void;
  providerKeys: ProviderKeyState;
  enterAiModelSettings: () => void;
  enterClawCodeSettings: () => void;
  saveCurrentLocalAssistantProfile: (options?: { promptVariables?: Record<string, unknown> }) => Promise<unknown>;
  setActiveLocalProfileId: (id: string) => void;
  setAppMode: (mode: AppMode) => void;
  setPromptEditorMode: (mode: PromptEditorMode) => void;
  setPromptSettingsDraft: (updater: PromptSettings | ((current: PromptSettings) => PromptSettings)) => void;
  setProfileDetailsDraft: (draft: ProfileDetailsDraft | ((current: ProfileDetailsDraft) => ProfileDetailsDraft)) => void;
  setSelectedCloudModel: (modelId: string) => void;
  setSelectedModel: (modelName: string) => void;
  setSelectedProvider: (providerId: ProviderId) => void;
  setToolsForAiOpen: (open: boolean) => void;
  onOpenWorkspaceConsent: () => void;
  onOpenPythonSetup: () => void;
  onRefreshGoogleWorkspaceStatus: () => void;
  onAddAssistantStart: () => void;
  onConfirmDiscardStudioChanges: (action: () => void) => void;
  onNewAssistantSectionConfigured: (section: StudioSection) => void;
  onPromptSurveyRequired: () => void;
  promptSurveyAlertVisible: boolean;
  promptSurveyComplete: boolean;
  t: Record<string, string>;
  tauriRuntime: boolean;
  toolsForAiOpen: boolean;
};

export function StudioPage({
  activeLocale,
  activeLocalProfile,
  activeLocalProfileId,
  activeModelLabel,
  assistantProfileStore,
  assistantProfileError,
  assistantProfileSaveState,
  assistantProfileSyncMessage,
  assistantProfileSyncState,
  busyAction,
  clawCodeStatus,
  googleWorkspaceStatus,
  importedSkillsDraft,
  setImportedSkillsDraft,
  cloudModelCatalog,
  installedModels,
  isNewAssistantDraft,
  modelCatalog,
  downloadProgress,
  onCancelModelDownload,
  onDeleteModel,
  providerKeys,
  newAssistantConfiguredSections,
  profileDetailsDraft,
  promptSettingsDraft,
  providerText,
  selectedCloudModel,
  selectedModel,
  selectedProvider,
  signedIn,
  status,
  studioSection,
  syncAllAssistantProfilesToCloud,
  syncAllAssistantProfilesFromCloud,
  syncAssistantProfileToCloud,
  deleteLocalAssistantProfile,
  renameLocalAssistantProfile,
  applyLocalAssistantProfile,
  editLocalAssistantProfile,
  addCurrentLocalAssistantProfile,
  buildCurrentLocalAssistantProfile,
  downloadModel,
  enterAiModelSettings,
  enterClawCodeSettings,
  saveCurrentLocalAssistantProfile,
  setActiveLocalProfileId,
  setAppMode,
  setPromptSettingsDraft,
  setProfileDetailsDraft,
  setSelectedCloudModel,
  setSelectedModel,
  setSelectedProvider,
  onOpenWorkspaceConsent,
  onOpenPythonSetup,
  onRefreshGoogleWorkspaceStatus,
  onAddAssistantStart,
  onConfirmDiscardStudioChanges,
  onNewAssistantSectionConfigured,
  onPromptSurveyRequired,
  promptSurveyAlertVisible,
  promptSurveyComplete,
  t,
  tauriRuntime,
}: StudioPageProps) {
    const [promptDevModeOpen, setPromptDevModeOpen] = useState(false);
    const isAssistantEditorSection = studioSection !== "myAssistants" && studioSection !== "assistantStore";
    const currentEditorProfile = buildCurrentLocalAssistantProfile();
    const editingExistingAssistant = !isNewAssistantDraft
      && assistantProfileStore.profiles.some((profile) => profile.id === activeLocalProfileId);
    const promptSurveyRequired = isNewAssistantDraft && !promptSurveyComplete;
    const saveActionLabel = editingExistingAssistant ? "Save changes" : "Add assistant";
    const normalizedEditorName = currentEditorProfile.name.trim().toLocaleLowerCase();
    const duplicateNameMessage = normalizedEditorName && assistantProfileStore.profiles.some((profile) => (
      profile.id !== currentEditorProfile.id && profile.name.trim().toLocaleLowerCase() === normalizedEditorName
    ))
      ? "An assistant with this name already exists."
      : null;
    const runEditorSave = () => {
      if (promptSurveyRequired) {
        onPromptSurveyRequired();
        return;
      }

      if (duplicateNameMessage) {
        return;
      }

      if (editingExistingAssistant) {
        void saveCurrentLocalAssistantProfile().catch(() => undefined);
      } else {
        void addCurrentLocalAssistantProfile().catch(() => undefined);
      }
    };

    const renderMyAssistants = () => {
      const profiles = assistantProfileStore.profiles;

      return (
        <MyAssistantsPanel
          activeProfileId={activeLocalProfileId}
          onDelete={(profile) => void deleteLocalAssistantProfile(profile.id)}
          onRename={(profile, name) => void renameLocalAssistantProfile(profile.id, name)}
          onEdit={(profile) => onConfirmDiscardStudioChanges(() => editLocalAssistantProfile(profile))}
          onRun={(profile) => onConfirmDiscardStudioChanges(() => {
            setActiveLocalProfileId(profile.id);
            applyLocalAssistantProfile(profile);
            setAppMode("runtime");
          })}
          onSync={(profile) => void syncAssistantProfileToCloud(profile)}
          onSyncAll={() => void syncAllAssistantProfilesToCloud()}
          onSyncAllFromWeb={() => void syncAllAssistantProfilesFromCloud()}
          onAddAssistant={onAddAssistantStart}
          profiles={profiles}
          syncMessage={assistantProfileSyncMessage}
          syncState={assistantProfileSyncState}
        />
      );
    };

    const renderAssistantStore = () => (
      <div className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] px-6 py-8 text-center shadow-sm">
        <span className="material-symbols-outlined mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[var(--miva-primary-soft)] text-[24px] text-[var(--miva-primary)]">storefront</span>
        <h3 className="mt-4 font-heading text-lg font-bold text-[var(--miva-text)]">Assistant Store is not connected yet.</h3>
        <p className="mx-auto mt-2 max-w-[560px] text-sm leading-6 text-[var(--miva-text-muted)]">
          This section is prepared for shared assistants, but no store models or template cards are added in the desktop UI yet.
        </p>
      </div>
    );

    const renderStudioOverview = () => {
      const profile = buildCurrentLocalAssistantProfile();
      const localChangesPending = Boolean(
        activeLocalProfile &&
        (
          activeLocalProfile.name !== profile.name ||
          activeLocalProfile.description !== profile.description ||
          activeLocalProfile.provider !== profile.provider ||
          activeLocalProfile.model !== profile.model ||
          activeLocalProfile.useCase !== profile.useCase ||
          activeLocalProfile.answerStyle !== profile.answerStyle ||
          activeLocalProfile.priority !== profile.priority ||
          activeLocalProfile.localMode !== profile.localMode ||
          JSON.stringify(normalizePromptSettings(activeLocalProfile.prompt?.settings)) !== JSON.stringify(profile.prompt.settings)
        )
      );
      const syncErrorVisible = assistantProfileSyncState === "error"
        && Boolean(assistantProfileSyncMessage)
        && !assistantProfileSyncMessage?.includes("An assistant with this name already exists.");
      const syncBadgeTone = syncErrorVisible
        ? "neutral"
        : assistantProfileSyncState === "syncing"
          ? "action"
          : localChangesPending
            ? "action"
            : profile.sync.cloudEnabled
            ? "success"
            : "neutral";
      const syncLabel = assistantProfileSyncState === "syncing"
        ? "Syncing"
        : syncErrorVisible
          ? "Sync failed"
          : localChangesPending
            ? "Unsaved changes"
            : profile.sync.cloudEnabled
            ? "Synced"
            : "Not synced";

      return (
        <StudioOverviewPanel
          codingLabel={codingCapabilityCopy[profile.prompt.settings.coding.capability]}
          configuredNewAssistantSections={newAssistantConfiguredSections}
          assistantProfileError={assistantProfileError}
          duplicateNameMessage={duplicateNameMessage}
          isNewAssistantDraft={isNewAssistantDraft}
          onProfileDetailsChange={setProfileDetailsDraft}
          profile={profile}
          profileDetailsDraft={profileDetailsDraft}
          providerLabel={providerMeta[profile.provider]?.label ?? profile.provider}
          syncBadgeTone={syncBadgeTone}
          syncLabel={syncLabel}
          syncMessage={assistantProfileSyncMessage}
          syncState={assistantProfileSyncState}
        />
      );
    };

    const renderPromptStudio = () => {
      const profile = buildCurrentLocalAssistantProfile();
      const hasSavedPrompt = Boolean((promptSettingsDraft.generatedFinalSystemPrompt || activeLocalProfile?.prompt?.systemPrompt || "").trim());

      return (
        <PromptStudioPanel
          key={profile.id}
          profile={profile}
          profileDetailsDraft={profileDetailsDraft}
          hasSavedPrompt={hasSavedPrompt}
          mivaDevModeOpen={promptDevModeOpen}
          mivaPromptLayers={promptSettingsDraft.mivaPromptLayers}
          settings={promptSettingsDraft}
          onMivaDevModeOpenChange={setPromptDevModeOpen}
          onMivaPromptLayersChange={(mivaPromptLayers) => setPromptSettingsDraft((current) => ({
            ...current,
            mivaPromptLayers,
          }))}
          onProfileDetailsChange={setProfileDetailsDraft}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
          onSaveLocal={(options) => editingExistingAssistant ? saveCurrentLocalAssistantProfile(options) : addCurrentLocalAssistantProfile(options)}
        />
      );
    };
    const renderStudioCode = () => {
      const profile = buildCurrentLocalAssistantProfile();

      return (
        <StudioCodePanel
          activeModelLabel={activeModelLabel}
          clawCodeStatus={clawCodeStatus}
          codingAccessModeCopy={codingAccessModeCopy}
          codingCapabilityCopy={codingCapabilityCopy}
          codingProviderPolicyCopy={codingProviderPolicyCopy}
          profile={profile}
          providerMeta={providerMeta}
          selectedProvider={selectedProvider}
          onEnterAiModelSettings={enterAiModelSettings}
          onEnterClawCodeSettings={enterClawCodeSettings}
          onPromptSettingsChange={(updater) => {
            onNewAssistantSectionConfigured("code");
            setPromptSettingsDraft((current) => updater(current));
          }}
          onSaveLocal={() => {
            if (promptSurveyRequired) {
              onPromptSurveyRequired();
              return;
            }

            void (editingExistingAssistant ? saveCurrentLocalAssistantProfile() : addCurrentLocalAssistantProfile());
          }}
          onSelectGeminiFlash={() => {
            onNewAssistantSectionConfigured("models");
            setSelectedProvider("gemini");
            setSelectedCloudModel("gemini-2.5-flash");
          }}
          onSyncAll={() => void syncAllAssistantProfilesToCloud()}
        />
      );
    };

    const renderGoogleWorkspaceStudio = () => {
      const profile = buildCurrentLocalAssistantProfile();

      return (
        <GoogleWorkspacePanel
          authConnected={signedIn}
          googleWorkspaceStatus={googleWorkspaceStatus}
          settings={profile.prompt.settings}
          onOpenWorkspaceConsent={onOpenWorkspaceConsent}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
          onRefreshGoogleWorkspaceStatus={onRefreshGoogleWorkspaceStatus}
        />
      );
    };

    const renderVoiceStudio = () => {
      const profile = buildCurrentLocalAssistantProfile();

      return (
        <VoiceStudioPanel
          settings={profile.prompt.settings}
          onOpenPythonSetup={onOpenPythonSetup}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
        />
      );
    };

    const renderCharacterStudio = () => {
      const profile = buildCurrentLocalAssistantProfile();

      return (
        <CharacterStudioPanel
          settings={profile.prompt.settings}
          tauriRuntime={tauriRuntime}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
        />
      );
    };

    const renderModelStudio = () => (
      <ModelsPanel
        activeLocale={activeLocale}
        busyAction={busyAction}
        cloudModelCatalog={cloudModelCatalog}
        downloadProgress={downloadProgress}
        installedModels={installedModels}
        modelCatalog={modelCatalog}
        providerKeys={providerKeys}
        providerMeta={providerMeta}
        providerText={providerText}
        selectedCloudModel={selectedCloudModel}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        signedIn={signedIn}
        status={status}
        t={t}
        tauriRuntime={tauriRuntime}
        onCancelModelDownload={onCancelModelDownload}
        onDeleteModel={onDeleteModel}
        onOpenApiKeySettings={enterAiModelSettings}
        onDownloadModel={(modelName) => void downloadModel(modelName)}
        onSelectCloudModel={(provider, modelId) => {
          if (!signedIn) {
            return;
          }
          onNewAssistantSectionConfigured("models");
          setSelectedProvider(provider);
          setSelectedCloudModel(modelId);
        }}
        onSelectLocalModel={(modelName) => {
          onNewAssistantSectionConfigured("models");
          setSelectedProvider("ollama");
          setSelectedModel(modelName);
        }}
      />
    );

    return (
      <div className={`min-w-0 ${studioSection === "myAssistants" ? "-m-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] max-w-none" : "h-full w-full max-w-none overflow-auto pr-8"} ${isAssistantEditorSection ? "pb-28" : ""}`}>
        {studioSection === "prompts" && promptSurveyComplete ? (
          <div className="mb-5 flex justify-start">
            <button
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-black transition ${
                promptDevModeOpen
                  ? "border-[var(--miva-primary)] bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]"
                  : "border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-text)] hover:border-[var(--miva-primary)] hover:text-[var(--miva-primary)]"
              }`}
              type="button"
              onClick={() => setPromptDevModeOpen(true)}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              MiVA dev mode
            </button>
          </div>
        ) : null}

        {studioSection === "myAssistants" ? (
          renderMyAssistants()
        ) : studioSection === "assistantStore" ? (
          renderAssistantStore()
        ) : studioSection === "overview" ? (
          renderStudioOverview()
        ) : studioSection === "models" ? (
          renderModelStudio()
        ) : studioSection === "prompts" ? (
          renderPromptStudio()
        ) : studioSection === "character" ? (
          renderCharacterStudio()
        ) : studioSection === "tts" ? (
          renderVoiceStudio()
        ) : studioSection === "googleWorkspace" ? (
          renderGoogleWorkspaceStudio()
        ) : studioSection === "code" ? (
          renderStudioCode()
        ) : studioSection === "skills" ? (
          <SkillsStudioPanel
            locale={activeLocale}
            onSkillsChange={setImportedSkillsDraft}
            skills={importedSkillsDraft}
          />
        ) : (
          null
        )}

        {(assistantProfileSaveState === "saving" || assistantProfileSaveState === "saved") && (
          <div className="pointer-events-none fixed left-[calc(var(--miva-content-inset-left)+(100vw-var(--miva-content-inset-left)-2.5rem)/2)] top-6 z-[80] w-[min(520px,calc(100vw-var(--miva-content-inset-left)-5rem))] rounded-lg border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] px-5 py-4 text-center shadow-[var(--miva-shadow-md)] backdrop-blur-md save-toast-enter">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">
              {assistantProfileSaveState === "saving" ? "Saving assistant" : "Saved"}
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-[var(--miva-text)]">
              {assistantProfileSaveState === "saving" ? "Saving changes..." : "Changes saved."}
            </p>
          </div>
        )}

        {isAssistantEditorSection && (
          <div className="fixed bottom-5 left-[var(--miva-content-inset-left)] right-10 z-40 mx-auto max-w-[980px] rounded-lg border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] px-5 py-4 shadow-[var(--miva-shadow-md)] backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">
                  {editingExistingAssistant ? "Editing assistant" : "New assistant"}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--miva-text)]">{currentEditorProfile.name}</p>
                {assistantProfileError && (
                  <p className="mt-1 text-xs font-semibold text-[var(--miva-danger-hover)]">{assistantProfileError}</p>
                )}
                {promptSurveyAlertVisible && promptSurveyRequired && (
                  <p className="mt-1 text-xs font-semibold text-[var(--miva-danger-hover)]">
                    Complete Prompts before saving this assistant.
                  </p>
                )}
              </div>
              <PrimaryButton className="shrink-0" disabled={Boolean(duplicateNameMessage)} onClick={runEditorSave}>
                {saveActionLabel}
              </PrimaryButton>
            </div>
          </div>
        )}

      </div>
    );
  
}
