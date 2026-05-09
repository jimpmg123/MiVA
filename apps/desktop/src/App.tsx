import { useCallback, useState } from "react";
import "./App.css";
import type { Locale } from "./i18n";
import { AppShell } from "./app/AppShell";
import { RuntimeNavigation, SetupNavigation, StudioNavigation } from "./app/AppNavigation";
import { AppTopBar } from "./app/AppTopBar";
import { isTauriRuntime } from "./app/tauri";
import { useAppNavigation } from "./app/useAppNavigation";
import { SetupFlow } from "./setup/SetupFlow";
import { useSetupWizard } from "./setup/useSetupWizard";
import { formatLogTime } from "./utils";
import { cloudModelCatalog, getCloudModelById, getModelByName, modelCatalog, providerMeta } from "./features/models/catalog";
import { DownloadProgressModal } from "./features/models/DownloadProgressModal";
import { useOllamaRuntime } from "./features/models/useOllamaRuntime";
import { useModelRecommendation } from "./features/models/useModelRecommendation";
import { defaultProfileDetails, defaultPromptSettings } from "./features/assistants/profile";
import { useAuthFlow } from "./features/auth/useAuthFlow";
import { useProviderKeys } from "./features/auth/useProviderKeys";
import { AuthHost } from "./hosts/AuthHost";
import { useAssistantProfiles } from "./features/assistants/useAssistantProfiles";
import { useRuntimeChat } from "./features/chat/useRuntimeChat";
import { useCloudDevice } from "./features/cloud/useCloudDevice";
import { RuntimeHost } from "./hosts/RuntimeHost";
import { SettingsHost } from "./hosts/SettingsHost";
import { StudioHost } from "./hosts/StudioHost";
import { copy, providerUiCopy, settingsSections, steps, studioSections, surveyQuestions } from "./setup/content";
import type {
  AppMode,
  ProfileDetailsDraft,
  PromptEditorMode,
  PromptSettings,
  ProviderId,
  StudioSection,
  SurveyState,
} from "./types";


const ACTIVE_LOCALE: Locale = "en";
function App() {
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
  const [dismissedChatIntroKeys, setDismissedChatIntroKeys] = useState<string[]>([]);
  const [profileDetailsDraft, setProfileDetailsDraft] = useState<ProfileDetailsDraft>(() => defaultProfileDetails);
  const [promptSettingsDraft, setPromptSettingsDraft] = useState<PromptSettings>(() => defaultPromptSettings);
  const [promptEditorMode, setPromptEditorMode] = useState<PromptEditorMode>("simple");
  const [toolsForAiOpen, setToolsForAiOpen] = useState(false);
  const [tauriRuntime] = useState(isTauriRuntime);

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
    openWebConsole,
    startBrowserSignIn,
  } = useAuthFlow({
    tauriRuntime,
    onLog: log,
    onClearCloudDevice: () => setCloudDevice(null),
    onContinueLocalOnly: closeAuth,
  });
  const signedIn = Boolean(authSession);
  const {
    cloudRecommended,
    recommendedCloudModel,
    recommendedCloudModelInfo,
    recommendedModel,
    recommendedModelInfo,
  } = useModelRecommendation({
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
    promptProfileId,
    assistantProfileLoaded,
    assistantProfileSaveState,
    assistantProfileError,
    assistantProfileSyncState,
    assistantProfileSyncMessage,
    setActiveLocalProfileId,
    buildCurrentLocalAssistantProfile,
    applyLocalAssistantProfile,
    saveCurrentLocalAssistantProfile,
    addCurrentLocalAssistantProfile,
    deleteLocalAssistantProfile,
    syncAllAssistantProfilesToCloud,
    syncAssistantProfileToCloud,
    saveSetupAssistantProfile,
    confirmDiscardStudioChanges,
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
  const runtimeChatIntroKey = `${selectedProvider}:${selectedProvider === "ollama" ? selectedModel : selectedCloudModel}:${promptProfileId}`;
  const showChatIntroCard = (selectedProvider !== "ollama" || selectedModelInstalled) && !dismissedChatIntroKeys.includes(runtimeChatIntroKey);
  const activeAssistantName = activeLocalProfile?.name || profileDetailsDraft.name || "MiVA Assistant";
  const {
    activeChatMessages,
    activeConversationId,
    assistantConversationGroups,
    chatEndRef,
    chatInput,
    chatIntroKey,
    chatMetrics,
    chatScrollRef,
    currentAssistantConversations,
    handleChatScroll,
    scrollChatToLatest,
    sendMessage,
    setChatInput,
    showJumpToLatest,
    startRuntimeChatForAssistant,
    selectRuntimeConversation,
    clearCurrentChat,
  } = useRuntimeChat({
    activeLocale: ACTIVE_LOCALE,
    appMode,
    activeStep,
    authSession,
    activeLocalProfile,
    promptProfileId,
    activeModelLabel,
    activeAssistantName,
    selectedProvider,
    selectedModel,
    selectedCloudModel,
    providerKeys,
    statusInstalled: Boolean(status?.installed),
    busyAction,
    visibleAssistantProfiles: visibleAssistantProfileStore.profiles,
    chatIntroKey: runtimeChatIntroKey,
    chatTitle: t.chatTitle,
    justNowLabel: t.justNow,
    showChatIntroCard,
    onDismissedChatIntroKeysChange: setDismissedChatIntroKeys,
    buildCurrentLocalAssistantProfile,
    applyLocalAssistantProfile,
    setActiveLocalProfileId,
    setAppMode,
    setBusyAction,
    ensureOllamaReadyForChat,
    recordRuntimeUsageEvent,
    onLog: log,
  });
  const {
    activeIndex,
    goToNextStep,
    goToPreviousStep,
    setSurveyQuestionIndex,
    setSurveyTipExpanded,
    surveyQuestionIndex,
    surveyTipContentVisible,
    surveyTipExpanded,
  } = useSetupWizard({
    activeStep,
    steps,
    onStepChange: setActiveStep,
    onEnteringChatStep: () => undefined,
  });

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

  const renderStudioNavigation = () => (
    <StudioNavigation
      authSession={authSession}
      onOpenAuth={openAuth}
      onStudioSectionChange={(section) => {
        if (section === studioSection) {
          return;
        }

        if (section === "myAssistants" && !confirmDiscardStudioChanges()) {
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
      currentAssistantConversations={currentAssistantConversations}
      onClearCurrentChat={clearCurrentChat}
      onConversationSelect={selectRuntimeConversation}
      onNewChatForAssistant={startRuntimeChatForAssistant}
      onOpenAuth={openAuth}
      t={t}
    />
  );

  const changeAppMode = (mode: AppMode) => {
    if (mode !== appMode && !confirmDiscardStudioChanges()) {
      return;
    }

    setAppMode(mode);
  };

  const enterGeneralSettingsFromTopBar = () => {
    if (!confirmDiscardStudioChanges()) {
      return;
    }

    enterSettings("general");
  };

  const renderTopBar = () => (
    <AppTopBar
      activeModelLabel={activeModelLabel}
      activeProviderIcon={activeProviderMeta.icon}
      activeProviderLabel={activeProviderLabel}
      activeProviderMode={activeProviderMode}
      appMode={appMode}
      centerHidden={appMode === "studio"}
      onEnterSettings={enterGeneralSettingsFromTopBar}
      onModeChange={changeAppMode}
      onStudioSave={saveStudioDraft}
      providerText={providerText}
      settingsOpen={appMode === "setup" && activeStep === "settings"}
      studioSaveLabel="Save changes"
      studioSaveVisible={false}
      t={t}
    />
  );
  const renderChat = () => (
    <RuntimeHost
      activeChatMessages={activeChatMessages}
      activeModelLabel={activeModelLabel}
      activeProviderLabel={activeProviderLabel}
      activeProviderMode={activeProviderMode}
      appMode={appMode}
      assistantPanelMinimized={assistantPanelMinimized}
      busyAction={busyAction}
      chatEndRef={chatEndRef}
      chatInput={chatInput}
      chatIntroKey={chatIntroKey}
      chatMetrics={chatMetrics}
      chatScrollRef={chatScrollRef}
      providerText={providerText}
      selectedModelInstalled={selectedModelInstalled}
      selectedProvider={selectedProvider}
      showChatIntroCard={showChatIntroCard}
      showJumpToLatest={showJumpToLatest}
      status={status}
      t={t}
      handleChatScroll={handleChatScroll}
      saveSetupAssistantProfile={saveSetupAssistantProfile}
      scrollChatToLatest={scrollChatToLatest}
      sendMessage={sendMessage}
      setAppMode={setAppMode}
      setAssistantPanelMinimized={setAssistantPanelMinimized}
      setChatInput={setChatInput}
      setDismissedChatIntroKeys={setDismissedChatIntroKeys}
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
      cloudModelCatalog={cloudModelCatalog}
      deleteLocalAssistantProfile={deleteLocalAssistantProfile}
      downloadModel={downloadModel}
      enterAiModelSettings={() => enterSettings("aiModels")}
      installedModels={installedModels}
      modelCatalog={modelCatalog}
      profileDetailsDraft={profileDetailsDraft}
      promptEditorMode={promptEditorMode}
      providerText={providerText}
      saveCurrentLocalAssistantProfile={saveCurrentLocalAssistantProfile}
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
      setStudioSection={setStudioSection}
      setToolsForAiOpen={setToolsForAiOpen}
      onAddAssistantStart={startNewAssistantDraft}
      onConfirmDiscardStudioChanges={confirmDiscardStudioChanges}
      status={status}
      studioSection={studioSection}
      studioSections={studioSections}
      syncAllAssistantProfilesToCloud={syncAllAssistantProfilesToCloud}
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
      cloudModelCatalog={cloudModelCatalog}
      locale={ACTIVE_LOCALE}
      logs={logs}
      providerKeys={providerKeys}
      providerKeysSaved={providerKeysSaved}
      providerMeta={providerMeta}
      providerText={providerText}
      selectedCloudModel={selectedCloudModel}
      selectedProvider={selectedProvider}
      settingsSection={settingsSection}
      settingsSections={settingsSections}
      status={status}
      t={t}
      onClearProviderKeys={clearProviderKeys}
      onExitSettings={exitSettings}
      onOpenInitialSetup={openInitialSetup}
      onProviderKeysChange={setProviderKeys}
      onSaveProviderKeys={saveProviderKeys}
      onSelectedCloudModelChange={setSelectedCloudModel}
      onSelectedProviderChange={setSelectedProvider}
    />
  );
  const renderDownloadProgressModal = () => (
    <DownloadProgressModal
      downloadProgress={downloadProgress}
      getModelByName={getModelByName}
      onClose={() => setDownloadProgress(null)}
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
      choosePythonInstallPath={choosePythonInstallPath}
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
      setSurveyQuestionIndex={setSurveyQuestionIndex}
      setSurveyTipExpanded={setSurveyTipExpanded}
      settingsStep={renderSettings()}
      startOllama={startOllama}
      status={status}
      survey={survey}
      surveyQuestionIndex={surveyQuestionIndex}
      surveyQuestions={surveyQuestions}
      surveyTipContentVisible={surveyTipContentVisible}
      surveyTipExpanded={surveyTipExpanded}
      tauriRuntime={tauriRuntime}
      t={t}
    />
  );

  return (
    <AppShell
      appMode={appMode}
      authView={renderAuth()}
      content={appMode === "setup" ? renderSetup() : appMode === "studio" ? renderStudio() : renderChat()}
      downloadModal={renderDownloadProgressModal()}
      navigation={appMode === "setup" ? renderNavigation() : appMode === "studio" ? renderStudioNavigation() : renderRuntimeNavigation()}
      topBar={renderTopBar()}
    />
  );
}

export default App;
