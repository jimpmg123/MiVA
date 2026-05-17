import { Badge, Panel, PrimaryButton } from "../components/ui";
import { codingAccessModeCopy, codingCapabilityCopy, codingProviderPolicyCopy, defaultPromptSettings, normalizePromptSettings, scheduleModeCopy, workspacePolicyCopy } from "../features/assistants/profile";
import { providerMeta } from "../features/models/catalog";
import type { AppMode, AssistantProfileSyncState, LocalAssistantProfile, ProfileDetailsDraft, PromptEditorMode, PromptSettings, ProviderId, StudioSection } from "../types";
import { ModelsPanel } from "../studio/ModelsPage";
import { MyAssistantsPanel } from "../studio/MyAssistantsPage";
import { GoogleWorkspacePanel } from "../studio/GoogleWorkspacePage";
import { PromptStudioPanel } from "../studio/PromptsPage";
import { StudioOverviewPanel } from "../studio/OverviewPage";
import { StudioToolsPanel } from "../studio/ToolsPage";
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
  tools: [
    ["MCP servers", "Register local and remote model context protocol servers.", "hub"],
    ["Agent skills", "Enable specialized abilities such as code help or file workflows.", "extension"],
    ["External APIs", "Attach custom APIs after provider security is finalized.", "api"],
  ],
};

const studioSectionDescription: Partial<Record<StudioSection, string>> = {
  tts: "Prepare voice input and spoken output for this assistant. STT, TTS, and runtime voice behavior can be configured here.",
  googleWorkspace: "Connect Google Workspace tools for this assistant. Choose products and set permission levels for direct Google API context.",
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
  cloudModelCatalog: any[];
  installedModels: string[];
  modelCatalog: any[];
  profileDetailsDraft: ProfileDetailsDraft;
  promptEditorMode: PromptEditorMode;
  providerText: Record<string, string>;
  selectedCloudModel: string;
  selectedModel: string;
  selectedProvider: ProviderId;
  signedIn: boolean;
  status: any;
  studioSection: StudioSection;
  studioSections: Array<{ id: StudioSection; label: string; detail: string; icon: string }>;
  syncAllAssistantProfilesToCloud: () => Promise<void>;
  syncAssistantProfileToCloud: (profile: LocalAssistantProfile) => Promise<void>;
  deleteLocalAssistantProfile: (profileId: string) => Promise<void>;
  renameLocalAssistantProfile: (profileId: string, name: string) => Promise<void>;
  applyLocalAssistantProfile: (profile: LocalAssistantProfile) => void;
  addCurrentLocalAssistantProfile: () => Promise<unknown>;
  buildCurrentLocalAssistantProfile: () => LocalAssistantProfile;
  downloadModel: (modelName: string) => Promise<void>;
  enterAiModelSettings: () => void;
  saveCurrentLocalAssistantProfile: () => Promise<unknown>;
  setActiveLocalProfileId: (id: string) => void;
  setAppMode: (mode: AppMode) => void;
  setPromptEditorMode: (mode: PromptEditorMode) => void;
  setPromptSettingsDraft: (updater: PromptSettings | ((current: PromptSettings) => PromptSettings)) => void;
  setProfileDetailsDraft: (draft: ProfileDetailsDraft | ((current: ProfileDetailsDraft) => ProfileDetailsDraft)) => void;
  setSelectedCloudModel: (modelId: string) => void;
  setSelectedModel: (modelName: string) => void;
  setSelectedProvider: (providerId: ProviderId) => void;
  setStudioSection: (section: StudioSection) => void;
  setToolsForAiOpen: (open: boolean) => void;
  onAddAssistantStart: () => void;
  onConfirmDiscardStudioChanges: () => boolean;
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
  cloudModelCatalog,
  installedModels,
  modelCatalog,
  profileDetailsDraft,
  promptEditorMode,
  providerText,
  selectedCloudModel,
  selectedModel,
  selectedProvider,
  signedIn,
  status,
  studioSection,
  studioSections,
  syncAllAssistantProfilesToCloud,
  syncAssistantProfileToCloud,
  deleteLocalAssistantProfile,
  renameLocalAssistantProfile,
  applyLocalAssistantProfile,
  addCurrentLocalAssistantProfile,
  buildCurrentLocalAssistantProfile,
  downloadModel,
  enterAiModelSettings,
  saveCurrentLocalAssistantProfile,
  setActiveLocalProfileId,
  setAppMode,
  setPromptEditorMode,
  setPromptSettingsDraft,
  setProfileDetailsDraft,
  setSelectedCloudModel,
  setSelectedModel,
  setSelectedProvider,
  setStudioSection,
  setToolsForAiOpen,
  onAddAssistantStart,
  onConfirmDiscardStudioChanges,
  t,
  tauriRuntime,
  toolsForAiOpen,
}: StudioPageProps) {
    const activeStudioSection = studioSections.find((section) => section.id === studioSection) ?? studioSections[0];
    const isAssistantEditorSection = studioSection !== "myAssistants";
    const currentEditorProfile = buildCurrentLocalAssistantProfile();
    const saveActionLabel = activeLocalProfile ? "Save changes" : "Add assistant";
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

      if (activeLocalProfile) {
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
          onEdit={(profile) => {
            if (!onConfirmDiscardStudioChanges()) {
              return;
            }

            setActiveLocalProfileId(profile.id);
            applyLocalAssistantProfile(profile);
            setStudioSection("overview");
          }}
          onRun={(profile) => {
            if (!onConfirmDiscardStudioChanges()) {
              return;
            }

            setActiveLocalProfileId(profile.id);
            applyLocalAssistantProfile(profile);
            setAppMode("runtime");
          }}
          onSync={(profile) => void syncAssistantProfileToCloud(profile)}
          onSyncAll={() => void syncAllAssistantProfilesToCloud()}
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
          settings={profile.prompt.settings}
          toolsForAiOpen={toolsForAiOpen}
          workspacePolicyCopy={workspacePolicyCopy}
          onPromptEditorModeChange={setPromptEditorMode}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
          onResetDefaults={() => setPromptSettingsDraft(defaultPromptSettings)}
          onSaveLocal={() => void (activeLocalProfile ? saveCurrentLocalAssistantProfile() : addCurrentLocalAssistantProfile())}
          onToolsForAiOpenChange={setToolsForAiOpen}
        />
      );
    };
    const renderStudioTools = () => {
      const profile = buildCurrentLocalAssistantProfile();

      return (
        <StudioToolsPanel
          activeModelLabel={activeModelLabel}
          codingAccessModeCopy={codingAccessModeCopy}
          codingCapabilityCopy={codingCapabilityCopy}
          codingProviderPolicyCopy={codingProviderPolicyCopy}
          profile={profile}
          providerMeta={providerMeta}
          selectedProvider={selectedProvider}
          onEnterAiModelSettings={enterAiModelSettings}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
          onSaveLocal={() => void (activeLocalProfile ? saveCurrentLocalAssistantProfile() : addCurrentLocalAssistantProfile())}
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
          settings={profile.prompt.settings}
          tauriRuntime={tauriRuntime}
          workspacePolicyCopy={workspacePolicyCopy}
          onPromptSettingsChange={(updater) => setPromptSettingsDraft((current) => updater(current))}
        />
      );
    };

    const renderVoiceStudio = () => {
      const profile = buildCurrentLocalAssistantProfile();

      return (
        <VoiceStudioPanel
          settings={profile.prompt.settings}
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
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Studio</p>
          <h2 className="mt-2 font-heading text-[30px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">
            {activeStudioSection.label}
          </h2>
          <p className="mt-2 max-w-[720px] text-base leading-7 text-[#42474d]">
            {studioSectionDescription[studioSection] ?? "Studio is the free-editing workspace after initial Setup. Prompts, 2D character, TTS, Google Workspace, and tools will be configured here."}
          </p>
        </header>

        {studioSection === "myAssistants" ? (
          renderMyAssistants()
        ) : studioSection === "overview" ? (
          renderStudioOverview()
        ) : studioSection === "models" ? (
          renderModelStudio()
        ) : studioSection === "prompts" ? (
          renderPromptStudio()
        ) : studioSection === "tts" ? (
          renderVoiceStudio()
        ) : studioSection === "googleWorkspace" ? (
          renderGoogleWorkspaceStudio()
        ) : studioSection === "tools" ? (
          renderStudioTools()
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {placeholderCards[studioSection].map(([title, body, icon]) => (
              <Panel className="min-h-[210px]" key={title}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                  <span className="material-symbols-outlined text-[22px]">{icon}</span>
                </span>
                <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#42474d]">{body}</p>
                <Badge>Placeholder</Badge>
              </Panel>
            ))}
          </div>
        )}

        {(assistantProfileSaveState === "saving" || assistantProfileSaveState === "saved") && (
          <div className="pointer-events-none fixed left-[calc(290px+(100vw-290px)/2)] top-6 z-[80] w-[min(520px,calc(100vw-338px))] rounded-2xl border border-[#c2c7ce]/70 bg-white/82 px-5 py-4 text-center shadow-[0_18px_48px_rgba(53,96,127,0.22)] backdrop-blur-md save-toast-enter">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#72787e]">
              {assistantProfileSaveState === "saving" ? "Saving assistant" : "Saved"}
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-[#191c1d]">
              {assistantProfileSaveState === "saving" ? "Saving changes..." : "Changes saved."}
            </p>
          </div>
        )}

        {isAssistantEditorSection && (
          <div className="fixed bottom-5 left-[290px] right-10 z-40 mx-auto max-w-[980px] rounded-2xl border border-[#c2c7ce]/70 bg-white/92 px-5 py-4 shadow-[0_18px_48px_rgba(53,96,127,0.22)] backdrop-blur-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">
                  {activeLocalProfile ? "Editing assistant" : "New assistant"}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{currentEditorProfile.name}</p>
                {assistantProfileError && (
                  <p className="mt-1 text-xs font-semibold text-[#93000a]">{assistantProfileError}</p>
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
