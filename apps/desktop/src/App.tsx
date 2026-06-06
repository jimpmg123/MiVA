import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "./i18n";
import { BootScreen } from "./app/BootScreen";
import { AppShell } from "./app/AppShell";
import { useAppBoot } from "./app/useAppBoot";
import { RuntimeNavigation, SetupNavigation, StudioNavigation, HistoryNavigation } from "./app/AppNavigation";
import { AppTopBar } from "./app/AppTopBar";
import { isTauriRuntime } from "./app/tauri";
import { useAppNavigation } from "./app/useAppNavigation";
import { SetupFlow } from "./setup/SetupFlow";
import { useSetupWizard } from "./setup/useSetupWizard";
import { formatLogTime } from "./utils";
import { cloudModelCatalog, getCloudModelById, getModelByName, modelCatalog, providerMeta } from "./features/models/catalog";
import { ModelDownloadOverlay } from "./features/models/ModelDownloadOverlay";
import { useOllamaRuntime } from "./features/models/useOllamaRuntime";
import { useModelRecommendation } from "./features/models/useModelRecommendation";
import { defaultProfileDetails, defaultPromptSettings, normalizePromptSettings } from "./features/assistants/profile";
import { useAuthFlow } from "./features/auth/useAuthFlow";
import { mergeProviderKeys } from "./features/auth/providerKeyMerge";
import { useProviderKeySync } from "./features/auth/useProviderKeySync";
import { useProviderKeys } from "./features/auth/useProviderKeys";
import { AuthHost } from "./hosts/AuthHost";
import { useAssistantProfiles } from "./features/assistants/useAssistantProfiles";
import { useRuntimeChat } from "./features/chat/useRuntimeChat";
import { useCloudDevice } from "./features/cloud/useCloudDevice";
import { getGoogleWorkspaceStatus } from "./features/cloud/client";
import { HistoryHost } from "./hosts/HistoryHost";
import { RuntimeHost } from "./hosts/RuntimeHost";
import { SettingsHost } from "./hosts/SettingsHost";
import { StudioHost } from "./hosts/StudioHost";
import { Button, IconTile, ModalBackdrop, ModalPanel, SecondaryButton } from "./components/ui";
import { updateLastAppMode } from "./features/app/storage";
import { useClawCodeRuntime } from "./features/claw/useClawCodeRuntime";
import { useUiTheme } from "./features/theme/useUiTheme";
import { copy, providerUiCopy, settingsSections, steps, studioSections, surveyQuestions } from "./setup/content";
import type {
  AppMode,
  ProfileDetailsDraft,
  PromptEditorMode,
  PromptSettings,
  ProviderId,
  RuntimeStoredConversation,
  StudioSection,
  SurveyState,
  GoogleWorkspaceStatus,
} from "./types";


const ACTIVE_LOCALE: Locale = "en";
function App() {
  const { setThemeId, themeId } = useUiTheme();
  const {
    activeStep,
    appMode,
    closeAuth,
    enterSettings,
    exitSettings,
    openAuth,
    openInitialSetup,
    setActiveStep,
    setAppMode,
    setSettingsSection,
    settingsSection,
  } = useAppNavigation();
  const [studioSection, setStudioSection] = useState<StudioSection>("myAssistants");
  const [survey, setSurvey] = useState<SurveyState>({
    useCase: null,
    answerStyle: null,
    priority: null,
    languageUse: null,
    localMode: null,
    futureFeatures: [],
    memorySyncMode: "profileOnly",
  });
  const [selectedModel, setSelectedModel] = useState("qwen3:4b");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("ollama");
  const [selectedCloudModel, setSelectedCloudModel] = useState("gemini-2.5-flash");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [assistantPanelMinimized, setAssistantPanelMinimized] = useState(false);
  const [runtimeTtsEnabled, setRuntimeTtsEnabled] = useState(false);
  const [runtimeTtsPlaybackSettings, setRuntimeTtsPlaybackSettings] = useState(() => ({
    speakingRate: defaultPromptSettings.voice.tts.speakingRate,
    volume: defaultPromptSettings.voice.tts.volume,
  }));
  const [dismissedChatIntroKeys, setDismissedChatIntroKeys] = useState<string[]>([]);
  const [profileDetailsDraft, setProfileDetailsDraft] = useState<ProfileDetailsDraft>(() => defaultProfileDetails);
  const [promptSettingsDraft, setPromptSettingsDraft] = useState<PromptSettings>(() => defaultPromptSettings);
  const [promptEditorMode, setPromptEditorMode] = useState<PromptEditorMode>("simple");
  const [toolsForAiOpen, setToolsForAiOpen] = useState(false);
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<(() => void) | null>(null);
  const [tauriRuntime] = useState(isTauriRuntime);
  const [googleWorkspaceStatus, setGoogleWorkspaceStatus] = useState<GoogleWorkspaceStatus | null>(null);

  const log = useCallback((message: string) => {
    setLogs((current) => [`${formatLogTime()} ${message}`, ...current].slice(0, 40));
  }, []);

  const t = copy.en;
  const providerText = providerUiCopy.en;
  const {
    clearProviderKeys,
    providerKeys,
    providerKeysSaved,
    saveProviderKeys,
    setProviderKeys,
  } = useProviderKeys();
  const {
    hardware,
    hardwareError,
    runtimeRequirements,
    runtimeRequirementsError,
    pythonInstallPath,
    status,
    downloadProgress,
    downloadDockMode,
    setDownloadDockMode,
    pauseModelDownload,
    resumeModelDownload,
    cancelModelDownload,
    refreshStatus,
    refreshHardware,
    refreshRuntimeRequirements,
    choosePythonInstallPath,
    installPython,
    installOllama,
    startOllama,
    ensureOllamaReadyForChat,
    downloadModel,
    setDownloadProgress,
  } = useOllamaRuntime({
    tauriRuntime,
    selectedProvider,
    preparingDownloadLabel: t.preparingDownload,
    downloadFailedLabel: t.downloadFailed,
    onLog: log,
    setBusyAction,
    onModelDownloaded: (model) => {
      setDismissedChatIntroKeys((current) => current.filter((key) => key !== `ollama:${model}:${promptProfileId}`));
    },
  });
  const {
    authSession,
    authFlowState,
    authFlowError,
    deviceAuthRequest,
    clearAuthSession,
    continueLocalOnly,
    openWorkspaceConsent,
    openWebConsole,
    startBrowserSignIn,
  } = useAuthFlow({
    tauriRuntime,
    onLog: log,
    onClearCloudDevice: () => setCloudDevice(null),
    onContinueLocalOnly: closeAuth,
  });
  const {
    cloudProviderKeys,
    providerKeysSyncedAt,
    providerKeysSyncError,
  } = useProviderKeySync({
    authSession,
    onLog: log,
  });
  const effectiveProviderKeys = useMemo(
    () => mergeProviderKeys(providerKeys, cloudProviderKeys),
    [providerKeys, cloudProviderKeys],
  );
  const {
    applyClawCodeWorkspace,
    clawCodeStatus,
    clawCodeStatusError,
    chooseClawCodeWorkspace,
    installClawCode,
    refreshClawCodeStatus,
    setClawCodeWorkspace,
  } = useClawCodeRuntime({
    openAiApiKey: effectiveProviderKeys.openai,
    tauriRuntime,
    onLog: log,
    setBusyAction,
  });
  const signedIn = Boolean(authSession);
  const refreshGoogleWorkspaceStatus = useCallback(async () => {
    if (!authSession) {
      setGoogleWorkspaceStatus(null);
      return null;
    }

    try {
      const status = await getGoogleWorkspaceStatus({ authSession });
      setGoogleWorkspaceStatus(status);
      return status;
    } catch (error) {
      log(`Google Workspace status check failed: ${String(error)}`);
      return null;
    }
  }, [authSession, log]);

  useEffect(() => {
    void refreshGoogleWorkspaceStatus();
  }, [refreshGoogleWorkspaceStatus]);
  const {
    cloudRecommended,
    recommendedCloudModel,
    recommendedCloudModelInfo,
    recommendedModel,
    recommendedModelInfo,
  } = useModelRecommendation({
    autoApplyRecommendations: appMode === "setup",
    hardware,
    signedIn,
    survey,
    setSelectedCloudModel,
    setSelectedModel,
    setSelectedProvider,
  });
  const selectedModelInfo = getModelByName(selectedModel);
  const selectedCloudModelInfo = getCloudModelById(selectedCloudModel);
  const activeProviderMeta = providerMeta[selectedProvider];
  const activeProviderMode = activeProviderMeta.mode;
  const activeModelLabel = selectedProvider === "ollama" ? selectedModelInfo.label : selectedCloudModelInfo.label;
  const activeProviderLabel = activeProviderMeta.label;
  const installedModels = status?.installedModels ?? [];
  const selectedModelInstalled = installedModels.includes(selectedModel);
  const recommendedModelInstalled = installedModels.includes(recommendedModel);
  const serviceLabel = !status ? t.checking : status.running ? t.running : status.installed ? t.stopped : t.missing;
  const {
    visibleAssistantProfileStore,
    activeLocalProfileId,
    activeLocalProfile,
    isNewAssistantDraft,
    promptProfileId,
    assistantProfileLoaded,
    assistantProfileSaveState,
    assistantProfileError,
    assistantProfileSyncState,
    assistantProfileSyncMessage,
    importedSkillsDraft,
    setImportedSkillsDraft,
    setActiveLocalProfileId,
    buildCurrentLocalAssistantProfile,
    editLocalAssistantProfile,
    applyLocalAssistantProfile,
    saveCurrentLocalAssistantProfile,
    addCurrentLocalAssistantProfile,
    renameLocalAssistantProfile,
    deleteLocalAssistantProfile,
    syncAllAssistantProfilesToCloud,
    syncAllAssistantProfilesFromCloud,
    syncAssistantProfileToCloud,
    updateAssistantProfileRollingSummary,
    saveSetupAssistantProfile,
    hasUnsavedStudioDraftChanges,
    discardUnsavedStudioChanges,
    startNewAssistantDraft,
    saveStudioDraft,
  } = useAssistantProfiles({
    appMode,
    activeStep,
    studioSection,
    activeLocale: ACTIVE_LOCALE,
    authSession,
    activeProviderMode,
    activeModelLabel,
    profileDetailsDraft,
    promptSettingsDraft,
    selectedProvider,
    selectedModel,
    selectedCloudModel,
    recommendedModel,
    recommendedCloudModel,
    survey,
    hardware,
    setProfileDetailsDraft,
    setPromptSettingsDraft,
    setSurvey,
    setSelectedProvider,
    setSelectedModel,
    setSelectedCloudModel,
    setStudioSection,
    onLog: log,
  });
  const runtimeReady = !tauriRuntime || status !== null;
  const {
    bootProgress,
    bootReady,
    bootStatusLine,
    initialAppMode,
    showBootScreen,
  } = useAppBoot({
    assistantProfileLoaded,
    runtimeReady,
    tauriRuntime,
  });
  const bootRouteAppliedRef = useRef(false);

  useEffect(() => {
    if (!bootReady || bootRouteAppliedRef.current) {
      return;
    }

    bootRouteAppliedRef.current = true;
    setAppMode(initialAppMode);
  }, [bootReady, initialAppMode, setAppMode]);

  const {
    recordRuntimeUsageEvent,
    setCloudDevice,
  } = useCloudDevice({
    authSession,
    hardware,
    selectedProvider,
    selectedModel,
    selectedCloudModel,
    status,
    onLog: log,
  });
  const activeVoiceSettings = activeLocalProfile?.prompt.settings.voice ?? promptSettingsDraft.voice;
  const activeTtsSettings = activeVoiceSettings.tts;
  const runtimeTtsAvailable =
    activeVoiceSettings.enabled &&
    activeTtsSettings.enabled &&
    activeTtsSettings.provider !== "disabled";

  useEffect(() => {
    setRuntimeTtsEnabled(runtimeTtsAvailable && (activeTtsSettings.autoSpeak || activeTtsSettings.provider === "localVoice"));
  }, [promptProfileId, runtimeTtsAvailable, activeTtsSettings.autoSpeak, activeTtsSettings.provider]);
  useEffect(() => {
    setRuntimeTtsPlaybackSettings({
      speakingRate: activeTtsSettings.speakingRate,
      volume: activeTtsSettings.volume,
    });
  }, [promptProfileId, activeTtsSettings.speakingRate, activeTtsSettings.volume]);

  const effectiveRuntimeTtsSettings = {
    ...activeTtsSettings,
    speakingRate: runtimeTtsPlaybackSettings.speakingRate,
    volume: runtimeTtsPlaybackSettings.volume,
  };

  const runtimeChatIntroKey = `${selectedProvider}:${selectedProvider === "ollama" ? selectedModel : selectedCloudModel}:${promptProfileId}`;
  const showChatIntroCard = appMode === "setup" && !dismissedChatIntroKeys.includes(runtimeChatIntroKey);
  const {
    activeChatMessages,
    activeConversationId,
    assistantConversationGroups,
    chatBusyLabel,
    chatEndRef,
    chatInput,
    chatIntroKey,
    chatMetrics,
    chatScrollRef,
    chooseAndAttachDocuments,
    chooseAndAttachImages,
    completeClawCodeWorkspaceFromChat,
    documentAttachments,
    imageAttachments,
    handleChatScroll,
    scrollChatToLatest,
    sendMessage,
    selectedSlashCommand,
    slashCommands,
    setChatInput,
    setSelectedSlashCommand,
    showJumpToLatest,
    stopRuntimeTts,
    stopChat,
    startRuntimeChatForAssistant,
    selectRuntimeConversation,
    clearCurrentChat,
    removeDocumentAttachment,
    removeImageAttachment,
    runtimeChatStore,
    ttsError,
    ttsPlaybackState,
  } = useRuntimeChat({
    activeLocale: ACTIVE_LOCALE,
    appMode,
    activeStep,
    authSession,
    activeLocalProfile,
    promptProfileId,
    selectedProvider,
    selectedModel,
    selectedCloudModel,
    providerKeys: effectiveProviderKeys,
    statusInstalled: Boolean(status?.installed),
    busyAction,
    visibleAssistantProfiles: visibleAssistantProfileStore.profiles,
    assistantProfileLoaded,
    chatIntroKey: runtimeChatIntroKey,
    chatTitle: t.chatTitle,
    justNowLabel: t.justNow,
    showChatIntroCard,
    onDismissedChatIntroKeysChange: setDismissedChatIntroKeys,
    buildCurrentLocalAssistantProfile,
    applyLocalAssistantProfile,
    updateAssistantProfileRollingSummary,
    setActiveLocalProfileId,
    setAppMode,
    setBusyAction,
    ensureOllamaReadyForChat,
    recordRuntimeUsageEvent,
    runtimeTtsEnabled: runtimeTtsAvailable && runtimeTtsEnabled,
    runtimeTtsSettings: runtimeTtsAvailable ? effectiveRuntimeTtsSettings : null,
    refreshGoogleWorkspaceStatus,
    onWorkspaceAuthRequired: async () => {
      await openWorkspaceConsent();
      log("Google Workspace permission is required. Complete consent in the browser, then try again.");
    },
    applyClawCodeWorkspace,
    chooseClawCodeWorkspace,
    clawCodeStatus,
    onLog: log,
  });
  const {
    activeIndex,
    goToNextStep,
    goToPreviousStep,
    setSurveyQuestionIndex,
    surveyQuestionIndex,
  } = useSetupWizard({
    activeStep,
    steps,
    onStepChange: setActiveStep,
    onEnteringChatStep: () => undefined,
  });

  const historyConversations = useMemo(() => {
    const visibleAssistantIds = new Set(visibleAssistantProfileStore.profiles.map((profile) => profile.id));
    const assistantNames = new Map(visibleAssistantProfileStore.profiles.map((profile) => [profile.id, profile.name]));

    return Object.values(runtimeChatStore.conversations)
      .filter((conversation) => visibleAssistantIds.has(conversation.assistantId))
      .map((conversation): RuntimeStoredConversation => ({
        ...conversation,
        assistantName: conversation.assistantName || assistantNames.get(conversation.assistantId) || "Assistant",
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [runtimeChatStore.conversations, visibleAssistantProfileStore.profiles]);

  const renderNavigation = () => (
    <SetupNavigation
      activeIndex={activeIndex}
      activeStep={activeStep}
      authSession={authSession}
      onAppModeChange={setAppMode}
      onOpenAuth={openAuth}
      onSettingsSectionChange={setSettingsSection}
      onStepChange={setActiveStep}
      settingsSection={settingsSection}
      settingsSections={settingsSections}
      steps={steps}
      t={t}
    />
  );

  const runAfterUnsavedCheck = useCallback((action: () => void) => {
    if (!hasUnsavedStudioDraftChanges()) {
      action();
      return;
    }

    setPendingUnsavedAction(() => action);
  }, [hasUnsavedStudioDraftChanges]);

  const cancelUnsavedAction = useCallback(() => {
    setPendingUnsavedAction(null);
  }, []);

  const confirmUnsavedAction = useCallback(() => {
    const action = pendingUnsavedAction;
    setPendingUnsavedAction(null);
    discardUnsavedStudioChanges();
    action?.();
  }, [discardUnsavedStudioChanges, pendingUnsavedAction]);

  const renderUnsavedChangesModal = () => (
    pendingUnsavedAction ? (
      <ModalBackdrop className="z-[140]">
        <ModalPanel className="max-w-[460px] text-center">
          <IconTile className="mx-auto h-14 w-14" tone="warning">
            <span className="material-symbols-outlined">warning</span>
          </IconTile>
          <h3 className="mt-5 font-heading text-xl font-bold text-[var(--miva-text)]">Leave without saving?</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--miva-text-muted)]">
            Changes in Overview and its sections are not applied until you click Save changes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <SecondaryButton onClick={cancelUnsavedAction}>Stay here</SecondaryButton>
            <Button className="h-12 px-5" onClick={confirmUnsavedAction} variant="destructive">
              Leave without saving
            </Button>
          </div>
        </ModalPanel>
      </ModalBackdrop>
    ) : null
  );

  const renderStudioNavigation = () => (
    <StudioNavigation
      authSession={authSession}
      editorExpanded={studioSection !== "myAssistants"}
      onOpenAuth={openAuth}
      onStudioSectionChange={(section) => {
        if (section === studioSection) {
          return;
        }

        if (section === "myAssistants") {
          runAfterUnsavedCheck(() => setStudioSection(section));
          return;
        }

        setStudioSection(section);
      }}
      studioSection={studioSection}
      studioSections={studioSections}
    />
  );

  const renderRuntimeNavigation = () => (
    <RuntimeNavigation
      activeAssistantId={promptProfileId}
      activeConversationId={activeConversationId}
      assistantConversationGroups={assistantConversationGroups}
      authSession={authSession}
      onClearCurrentChat={clearCurrentChat}
      onConversationSelect={selectRuntimeConversation}
      onNewChatForAssistant={startRuntimeChatForAssistant}
      onOpenAuth={openAuth}
      t={t}
    />
  );

  const renderHistoryNavigation = () => (
    <HistoryNavigation
      authSession={authSession}
      onOpenAuth={openAuth}
      t={t}
    />
  );

  const continueHistoryInRuntime = (conversation: RuntimeStoredConversation) => {
    selectRuntimeConversation({
      id: conversation.id,
      assistantId: conversation.assistantId,
      assistantName: conversation.assistantName || "Assistant",
      title: conversation.title,
      preview: conversation.messages[conversation.messages.length - 1]?.content,
      modelLabel: conversation.modelLabel,
      messageCount: conversation.messages.length,
      updatedAtLabel: "Ready",
    });
  };

  const changeAppMode = (mode: AppMode) => {
    if (mode === appMode) {
      return;
    }

    runAfterUnsavedCheck(() => {
      setAppMode(mode);
      if (mode === "studio" || mode === "runtime" || mode === "history") {
        void updateLastAppMode(mode);
      }
    });
  };

  const enterGeneralSettingsFromTopBar = () => runAfterUnsavedCheck(() => enterSettings("general"));

  const renderTopBar = () => (
    <AppTopBar
      activeModelLabel={activeModelLabel}
      activeProviderIcon={activeProviderMeta.icon}
      activeProviderLabel={activeProviderLabel}
      activeProviderMode={activeProviderMode}
      appMode={appMode}
      centerHidden={appMode === "studio" || appMode === "history" || appMode === "setup"}
      onEnterSettings={enterGeneralSettingsFromTopBar}
      onModeChange={changeAppMode}
      onOpenWebConsole={() => void openWebConsole()}
      onStudioSave={saveStudioDraft}
      providerText={providerText}
      settingsOpen={appMode === "setup" && activeStep === "settings"}
      studioSaveLabel="Save changes"
      studioSaveVisible={false}
      t={t}
    />
  );
  const renderHistory = () => (
    <HistoryHost
      conversations={historyConversations}
      onContinueInRuntime={continueHistoryInRuntime}
      t={t}
    />
  );

  const renderChat = () => (
    <RuntimeHost
      activeLocale={ACTIVE_LOCALE}
      activeChatMessages={activeChatMessages}
      activeModelLabel={activeModelLabel}
      activeProviderLabel={activeProviderLabel}
      activeProviderMode={activeProviderMode}
      appMode={appMode}
      assistantPanelMinimized={assistantPanelMinimized}
      busyAction={busyAction}
      chatBusyLabel={chatBusyLabel}
      chatEndRef={chatEndRef}
      chatInput={chatInput}
      selectedSlashCommand={selectedSlashCommand}
      slashCommands={slashCommands}
      chatIntroKey={chatIntroKey}
      chatMetrics={chatMetrics}
      characterSettings={(activeLocalProfile ? normalizePromptSettings(activeLocalProfile.prompt?.settings) : promptSettingsDraft).character}
      chatScrollRef={chatScrollRef}
      providerText={providerText}
      selectedModelInstalled={selectedModelInstalled}
      selectedProvider={selectedProvider}
      showChatIntroCard={showChatIntroCard}
      showJumpToLatest={showJumpToLatest}
      status={status}
      runtimeTtsAvailable={runtimeTtsAvailable}
      runtimeTtsEnabled={runtimeTtsEnabled}
      runtimeTtsSpeakingRate={effectiveRuntimeTtsSettings.speakingRate}
      runtimeTtsVolume={effectiveRuntimeTtsSettings.volume}
      t={t}
      ttsError={ttsError}
      ttsPlaybackState={ttsPlaybackState}
      chooseAndAttachDocuments={chooseAndAttachDocuments}
      chooseAndAttachImages={chooseAndAttachImages}
      chooseClawCodeWorkspace={chooseClawCodeWorkspace}
      completeClawCodeWorkspaceFromChat={completeClawCodeWorkspaceFromChat}
      documentAttachments={documentAttachments}
      imageAttachments={imageAttachments}
      handleChatScroll={handleChatScroll}
      removeDocumentAttachment={removeDocumentAttachment}
      removeImageAttachment={removeImageAttachment}
      saveSetupAssistantProfile={saveSetupAssistantProfile}
      scrollChatToLatest={scrollChatToLatest}
      sendMessage={sendMessage}
      setAppMode={setAppMode}
      setAssistantPanelMinimized={setAssistantPanelMinimized}
      setChatInput={setChatInput}
      setSelectedSlashCommand={setSelectedSlashCommand}
      setDismissedChatIntroKeys={setDismissedChatIntroKeys}
      setRuntimeTtsEnabled={setRuntimeTtsEnabled}
      setRuntimeTtsSpeakingRate={(speakingRate) => {
        setRuntimeTtsPlaybackSettings((current) => ({
          ...current,
          speakingRate: Math.min(2, Math.max(0.5, speakingRate)),
        }));
      }}
      setRuntimeTtsVolume={(volume) => {
        setRuntimeTtsPlaybackSettings((current) => ({
          ...current,
          volume: Math.min(1, Math.max(0, volume)),
        }));
      }}
      stopRuntimeTts={stopRuntimeTts}
      stopChat={stopChat}
    />
  );
  const renderAuth = () => (
    <AuthHost
      authFlowError={authFlowError}
      authFlowState={authFlowState}
      authSession={authSession}
      deviceAuthRequest={deviceAuthRequest}
      onClearAuthSession={clearAuthSession}
      onCloseAuth={closeAuth}
      onContinueLocalOnly={continueLocalOnly}
      onOpenWebConsole={() => void openWebConsole()}
      onStartBrowserSignIn={() => void startBrowserSignIn()}
    />
  );
  const renderStudio = () => (
    <StudioHost
      activeLocale={ACTIVE_LOCALE}
      activeLocalProfile={activeLocalProfile}
      activeLocalProfileId={activeLocalProfileId}
      addCurrentLocalAssistantProfile={addCurrentLocalAssistantProfile}
      activeModelLabel={activeModelLabel}
      applyLocalAssistantProfile={applyLocalAssistantProfile}
      assistantProfileStore={visibleAssistantProfileStore}
      assistantProfileError={assistantProfileError}
      assistantProfileSaveState={assistantProfileSaveState}
      assistantProfileSyncMessage={assistantProfileSyncMessage}
      assistantProfileSyncState={assistantProfileSyncState}
      buildCurrentLocalAssistantProfile={buildCurrentLocalAssistantProfile}
      busyAction={busyAction}
      googleWorkspaceStatus={googleWorkspaceStatus}
      importedSkillsDraft={importedSkillsDraft}
      setImportedSkillsDraft={setImportedSkillsDraft}
      cloudModelCatalog={cloudModelCatalog}
      deleteLocalAssistantProfile={deleteLocalAssistantProfile}
      downloadModel={downloadModel}
      clawCodeStatus={clawCodeStatus}
      enterAiModelSettings={() => enterSettings("aiModels")}
      enterClawCodeSettings={() => enterSettings("clawCode")}
      editLocalAssistantProfile={editLocalAssistantProfile}
      installedModels={installedModels}
      isNewAssistantDraft={isNewAssistantDraft}
      modelCatalog={modelCatalog}
      profileDetailsDraft={profileDetailsDraft}
      promptEditorMode={promptEditorMode}
      promptSettingsDraft={promptSettingsDraft}
      providerText={providerText}
      saveCurrentLocalAssistantProfile={saveCurrentLocalAssistantProfile}
      renameLocalAssistantProfile={renameLocalAssistantProfile}
      selectedCloudModel={selectedCloudModel}
      selectedModel={selectedModel}
      selectedProvider={selectedProvider}
      signedIn={signedIn}
      setActiveLocalProfileId={setActiveLocalProfileId}
      setAppMode={setAppMode}
      setProfileDetailsDraft={setProfileDetailsDraft}
      setPromptEditorMode={setPromptEditorMode}
      setPromptSettingsDraft={setPromptSettingsDraft}
      setSelectedCloudModel={setSelectedCloudModel}
      setSelectedModel={setSelectedModel}
      setSelectedProvider={setSelectedProvider}
      setToolsForAiOpen={setToolsForAiOpen}
      onOpenWorkspaceConsent={() => void openWorkspaceConsent()}
      onRefreshGoogleWorkspaceStatus={() => void refreshGoogleWorkspaceStatus()}
      onAddAssistantStart={() => runAfterUnsavedCheck(startNewAssistantDraft)}
      onConfirmDiscardStudioChanges={runAfterUnsavedCheck}
      status={status}
      studioSection={studioSection}
      studioSections={studioSections}
      syncAllAssistantProfilesToCloud={syncAllAssistantProfilesToCloud}
      syncAllAssistantProfilesFromCloud={syncAllAssistantProfilesFromCloud}
      syncAssistantProfileToCloud={syncAssistantProfileToCloud}
      t={t}
      tauriRuntime={tauriRuntime}
      toolsForAiOpen={toolsForAiOpen}
    />
  );
  const renderSettings = () => (
    <SettingsHost
      activeLocalProfile={activeLocalProfile}
      activeModelLabel={activeModelLabel}
      activeProviderLabel={activeProviderLabel}
      assistantProfileError={assistantProfileError}
      assistantProfileLoaded={assistantProfileLoaded}
      assistantProfileSaveState={assistantProfileSaveState}
      busyAction={busyAction}
      clawCodeStatus={clawCodeStatus}
      clawCodeStatusError={clawCodeStatusError}
      cloudModelCatalog={cloudModelCatalog}
      locale={ACTIVE_LOCALE}
      logs={logs}
      authSession={authSession}
      cloudProviderKeys={cloudProviderKeys}
      providerKeys={providerKeys}
      providerKeysSaved={providerKeysSaved}
      providerKeysSyncError={providerKeysSyncError}
      providerKeysSyncedAt={providerKeysSyncedAt}
      providerText={providerText}
      selectedCloudModel={selectedCloudModel}
      selectedProvider={selectedProvider}
      settingsSection={settingsSection}
      settingsSections={settingsSections}
      status={status}
      t={t}
      tauriRuntime={tauriRuntime}
      onChooseClawCodeWorkspace={chooseClawCodeWorkspace}
      onClearProviderKeys={clearProviderKeys}
      onClearLogs={() => setLogs([])}
      onExitSettings={exitSettings}
      onInstallClawCode={installClawCode}
      onOpenInitialSetup={openInitialSetup}
      onProviderKeysChange={setProviderKeys}
      onRefreshClawCodeStatus={refreshClawCodeStatus}
      onSaveProviderKeys={saveProviderKeys}
      onSelectedCloudModelChange={setSelectedCloudModel}
      onSelectedProviderChange={setSelectedProvider}
      onSetClawCodeWorkspace={setClawCodeWorkspace}
      onThemeChange={setThemeId}
      themeId={themeId}
    />
  );
  const renderDownloadProgressModal = () => (
    <ModelDownloadOverlay
      dockMode={downloadDockMode}
      downloadProgress={downloadProgress}
      getModelByName={getModelByName}
      onCancel={(model) => void cancelModelDownload(model)}
      onClose={() => {
        setDownloadProgress(null);
        setDownloadDockMode("modal");
      }}
      onDockModeChange={setDownloadDockMode}
      onPause={(model) => void pauseModelDownload(model)}
      onResume={(model) => void resumeModelDownload(model)}
      t={t}
    />
  );
  const renderSetup = () => (
    <SetupFlow
      activeLocale={ACTIVE_LOCALE}
      activeModelLabel={activeModelLabel}
      activeProviderLabel={activeProviderLabel}
      activeProviderMode={activeProviderMode}
      activeStep={activeStep}
      assistantProfileError={assistantProfileError}
      busyAction={busyAction}
      chatStep={renderChat()}
      chooseClawCodeWorkspace={chooseClawCodeWorkspace}
      choosePythonInstallPath={choosePythonInstallPath}
      clawCodeStatus={clawCodeStatus}
      clawCodeStatusError={clawCodeStatusError}
      cloudRecommended={cloudRecommended}
      downloadModel={downloadModel}
      downloadProgress={downloadProgress}
      enterGeneralSettings={() => enterSettings("general")}
      enterLogs={() => enterSettings("logs")}
      finalizeProfile={() => void saveSetupAssistantProfile()}
      goToNextStep={goToNextStep}
      goToPreviousStep={goToPreviousStep}
      hardware={hardware}
      hardwareError={hardwareError}
      installClawCode={installClawCode}
      installOllama={installOllama}
      installPython={installPython}
      installedModels={installedModels}
      logs={logs}
      profile={activeLocalProfile ?? buildCurrentLocalAssistantProfile()}
      providerText={providerText}
      pythonInstallPath={pythonInstallPath}
      recommendedCloudModelInfo={recommendedCloudModelInfo}
      recommendedModel={recommendedModel}
      recommendedModelInfo={recommendedModelInfo}
      recommendedModelInstalled={recommendedModelInstalled}
      refreshClawCodeStatus={refreshClawCodeStatus}
      refreshHardware={refreshHardware}
      refreshRuntimeRequirements={refreshRuntimeRequirements}
      refreshStatus={refreshStatus}
      runtimeRequirements={runtimeRequirements}
      runtimeRequirementsError={runtimeRequirementsError}
      selectedCloudModel={selectedCloudModel}
      selectedModel={selectedModel}
      selectedModelInfo={selectedModelInfo}
      selectedModelInstalled={selectedModelInstalled}
      selectedProvider={selectedProvider}
      signedIn={signedIn}
      serviceLabel={serviceLabel}
      setActiveStep={setActiveStep}
      setSelectedCloudModel={setSelectedCloudModel}
      setSelectedModel={setSelectedModel}
      setSelectedProvider={setSelectedProvider}
      setSurvey={setSurvey}
      setClawCodeWorkspace={setClawCodeWorkspace}
      setSurveyQuestionIndex={setSurveyQuestionIndex}
      settingsStep={renderSettings()}
      startOllama={startOllama}
      status={status}
      survey={survey}
      surveyQuestionIndex={surveyQuestionIndex}
      surveyQuestions={surveyQuestions}
      tauriRuntime={tauriRuntime}
      t={t}
    />
  );

  if (showBootScreen) {
    return <BootScreen progress={bootProgress} statusLine={bootStatusLine} />;
  }

  return (
    <AppShell
      appMode={appMode}
      authView={renderAuth()}
      content={
        appMode === "setup"
          ? renderSetup()
          : appMode === "studio"
            ? renderStudio()
            : appMode === "history"
              ? renderHistory()
              : renderChat()
      }
      downloadModal={(
        <>
          {renderDownloadProgressModal()}
          {renderUnsavedChangesModal()}
        </>
      )}
      navigation={
        appMode === "setup"
          ? renderNavigation()
          : appMode === "studio"
            ? renderStudioNavigation()
            : appMode === "history"
              ? renderHistoryNavigation()
              : renderRuntimeNavigation()
      }
      topBar={renderTopBar()}
    />
  );
}

export default App;
