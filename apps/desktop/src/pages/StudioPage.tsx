import { PrimaryButton, SectionHeader } from "../components/ui";
import { codingAccessModeCopy, codingCapabilityCopy, codingProviderPolicyCopy, defaultPromptSettings, normalizePromptSettings, scheduleModeCopy, workspacePolicyCopy } from "../features/assistants/profile";
import { providerMeta } from "../features/models/catalog";
import type { AppMode, AssistantProfileSyncState, ClawCodeRuntimeInfo, GoogleWorkspaceStatus, ImportedSkill, LocalAssistantProfile, ProfileDetailsDraft, PromptEditorMode, PromptSettings, ProviderId, StudioSection } from "../types";
import { ModelsPanel } from "../studio/ModelsPage";
import { MyAssistantsPanel } from "../studio/MyAssistantsPage";
import { CharacterStudioPanel } from "../studio/CharacterPage";
import { GoogleWorkspacePanel } from "../studio/GoogleWorkspacePage";
import { PromptStudioPanel } from "../studio/PromptsPage";
import { StudioOverviewPanel } from "../studio/OverviewPage";
import { StudioCodePanel } from "../studio/CodePage";
import { SkillsStudioPanel } from "../studio/SkillsPage";
import { VoiceStudioPanel } from "../studio/VoicePage";

const placeholderCards: Record<StudioSection, Array<[string, string, string]>> = {
  myAssistants: [
    ["Assistant library", "Saved assistants from Setup and Studio are shown here.", "supervisor_account"],
    ["Cloud sync", "Local assistants can be pushed to the web console manually.", "cloud_sync"],
    ["Runtime launch", "Choose one assistant before entering Runtime.", "rocket_launch"],
  ],
  overview: [
    ["Assistant profile", "Current setup choices and selected model will be edited here.", "account_circle"],
    ["Prompt stack", "Persona, rules, and tool instructions will be assembled here.", "edit_note"],
    ["Runtime preview", "Studio changes will be tested before they affect runtime chat.", "play_circle"],
  ],
  models: [
    ["Local model library", "Browse Ollama models and download them onto this computer.", "deployed_code_update"],
    ["Cloud model routing", "Choose OpenAI or Gemini models without local downloads.", "cloud"],
    ["Model policy", "Set fallback and quality preferences after provider rules are finalized.", "rule"],
  ],
  prompts: [
    ["Persona", "Define assistant role, tone, and boundaries.", "badge"],
    ["System prompt", "Compose model instructions from survey answers and user edits.", "subject"],
    ["Prompt presets", "Save multiple prompt configurations per assistant.", "bookmark"],
  ],
  character: [
    ["2D avatar", "Attach Live2D or image-based assistant characters later.", "face"],
    ["Expression states", "Map listening, thinking, speaking, and idle states.", "mood"],
    ["Scene layout", "Control where the assistant appears in runtime mode.", "dashboard_customize"],
  ],
  tts: [
    ["Text to speech", "Choose voice providers and speaking style.", "record_voice_over"],
    ["Speech to text", "Microphone input and wake controls will be configured here.", "mic"],
    ["Voice test", "Preview latency and quality before enabling runtime voice.", "graphic_eq"],
  ],
  googleWorkspace: [
    ["Google Workspace", "Calendar, Gmail, Drive, Docs, and Sheets context settings live here.", "workspaces"],
    ["OAuth connection", "Account connection and granted scopes are handled through MiVA Google login.", "verified_user"],
    ["Tool permissions", "Users will decide what the assistant can read or change.", "rule"],
  ],
  code: [
    ["Code explanation", "Use local models for bounded read-only code help.", "terminal"],
    ["Repository editing", "Use cloud coding models for larger multi-file changes.", "edit_square"],
    ["Shell access", "Keep command execution behind explicit workspace controls.", "security"],
  ],
  skills: [
    ["Rules", "Apply lightweight behavioral guidance to this assistant.", "rule"],
    ["Agent skills", "Load specialized instructions only when they are relevant.", "menu_book"],
    ["Local model fit", "Prefer short, bounded skills for lightweight models.", "memory"],
  ],
};

const studioSectionDescription: Partial<Record<StudioSection, string>> = {
  character: "Configure this assistant's visual persona, user address style, and future Live2D behavior. Runtime rendering is prepared here and connected later.",
  tts: "Prepare voice input and spoken output for this assistant. STT, TTS, and runtime voice behavior can be configured here.",
  googleWorkspace: "Connect Google Workspace tools for this assistant. Choose products and set permission levels for direct Google API context.",
  code: "Set code explanation, repository editing, and shell-access boundaries for this assistant.",
  skills: "Preview assistant rules and progressively loaded Agent Skills without adding every instruction to each prompt.",
};

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
  addCurrentLocalAssistantProfile: () => Promise<unknown>;
  buildCurrentLocalAssistantProfile: () => LocalAssistantProfile;
  downloadModel: (modelName: string) => Promise<void>;
  enterAiModelSettings: () => void;
  enterClawCodeSettings: () => void;
  saveCurrentLocalAssistantProfile: () => Promise<unknown>;
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
  profileDetailsDraft,
  promptEditorMode,
  promptSettingsDraft,
  providerText,
  selectedCloudModel,
  selectedModel,
  selectedProvider,
  signedIn,
  status,
  studioSection,
  studioSections,
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
  setPromptEditorMode,
  setPromptSettingsDraft,
  setProfileDetailsDraft,
  setSelectedCloudModel,
  setSelectedModel,
  setSelectedProvider,
  setToolsForAiOpen,
  onOpenWorkspaceConsent,
  onOpenPythonSetup,
  onRefreshGoogleWorkspaceStatus,
  onAddAssistantStart,
  onConfirmDiscardStudioChanges,
  t,
  tauriRuntime,
  toolsForAiOpen,
}: StudioPageProps) {
    const activeStudioSection = studioSections.find((section) => section.id === studioSection) ?? studioSections[0];
    const isAssistantEditorSection = studioSection !== "myAssistants";
    const currentEditorProfile = buildCurrentLocalAssistantProfile();
    const editingExistingAssistant = !isNewAssistantDraft
      && assistantProfileStore.profiles.some((profile) => profile.id === activeLocalProfileId);
    const saveActionLabel = editingExistingAssistant ? "Save changes" : "Add assistant";
    const normalizedEditorName = currentEditorProfile.name.trim().toLocaleLowerCase();
    const duplicateNameMessage = normalizedEditorName && assistantProfileStore.profiles.some((profile) => (
      profile.id !== currentEditorProfile.id && profile.name.trim().toLocaleLowerCase() === normalizedEditorName
    ))
      ? "An assistant with this name already exists."
      : null;
    const runEditorSave = () => {
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
          syncState={assistantProfileSyncState}
        />
      );
    };

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
          assistantProfileError={assistantProfileError}
          duplicateNameMessage={duplicateNameMessage}
          onProfileDetailsChange={setProfileDetailsDraft}
          placeholderCards={placeholderCards.overview.slice(1)}
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

      return (
        <PromptStudioPanel
          profile={profile}
          promptEditorMode={promptEditorMode}
          scheduleModeCopy={scheduleModeCopy}
          settings={promptSettingsDraft}
          toolsForAiOpen={toolsForAiOpen}
          workspacePolicyCopy={workspacePolicyCopy}
          onPromptEditorModeChange={setPromptEditorMode}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
          onResetDefaults={() => setPromptSettingsDraft(defaultPromptSettings)}
          onSaveLocal={() => void (editingExistingAssistant ? saveCurrentLocalAssistantProfile() : addCurrentLocalAssistantProfile())}
          onToolsForAiOpenChange={setToolsForAiOpen}
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
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
          onSaveLocal={() => void (editingExistingAssistant ? saveCurrentLocalAssistantProfile() : addCurrentLocalAssistantProfile())}
          onSelectGeminiFlash={() => {
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
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
          onOpenPythonSetup={onOpenPythonSetup}
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
        installedModels={installedModels}
        modelCatalog={modelCatalog}
        providerMeta={providerMeta}
        providerText={providerText}
        selectedCloudModel={selectedCloudModel}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        signedIn={signedIn}
        status={status}
        t={t}
        tauriRuntime={tauriRuntime}
        onDownloadModel={(modelName) => void downloadModel(modelName)}
        onSelectCloudModel={(provider, modelId) => {
          if (!signedIn) {
            return;
          }
          setSelectedProvider(provider);
          setSelectedCloudModel(modelId);
        }}
        onSelectLocalModel={(modelName) => {
          setSelectedProvider("ollama");
          setSelectedModel(modelName);
        }}
      />
    );

    return (
      <div className={`mx-auto w-full min-w-0 max-w-[980px] ${isAssistantEditorSection ? "pb-28" : ""}`}>
        <SectionHeader
          className="mb-8"
          eyebrow="Studio"
          title={activeStudioSection.label}
          body={studioSectionDescription[studioSection] ?? "Studio is the free-editing workspace after initial Setup. Prompts, 2D character, TTS, Google Workspace, and tools will be configured here."}
        />

        {studioSection === "myAssistants" ? (
          renderMyAssistants()
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
