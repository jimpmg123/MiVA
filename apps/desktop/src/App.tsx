import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import type { Locale } from "./i18n";
import { AppShell } from "./app/AppShell";
import { RuntimeNavigation, SetupNavigation, StudioNavigation } from "./app/AppNavigation";
import type { RuntimeConversationNavItem } from "./app/AppNavigation";
import { AppTopBar } from "./app/AppTopBar";
import { isTauriRuntime } from "./app/tauri";
import { PrimaryButton, SecondaryButton } from "./components/ui";
import { AuthPage } from "./pages/AuthPage";
import { RuntimePage } from "./pages/RuntimePage";
import { SetupPage } from "./pages/SetupPage";
import { ClawCodeStep } from "./setup/ClawCodeStep";
import { DownloadStep } from "./setup/DownloadStep";
import { HardwareStep } from "./setup/HardwareStep";
import { OllamaStep } from "./setup/OllamaStep";
import { ProfileStep } from "./setup/ProfileStep";
import { RecommendationStep } from "./setup/RecommendationStep";
import { SurveyStep } from "./setup/SurveyStep";
import { WelcomeStep } from "./setup/WelcomeStep";
import { SettingsPage } from "./pages/SettingsPage";
import { StudioPage } from "./pages/StudioPage";
import { formatLogTime, recommendCloudModel, recommendModel } from "./utils";
import { cloudModelCatalog, getCloudModelById, getModelByName, modelCatalog, providerMeta } from "./features/models/catalog";
import { DownloadProgressModal } from "./features/models/DownloadProgressModal";
import {
  runChatOnce,
} from "./features/models/ollamaRuntime";
import { useOllamaRuntime } from "./features/models/useOllamaRuntime";
import { clearProviderKeysStorage, emptyProviderKeys, loadProviderKeys, saveProviderKeysToStorage } from "./features/auth/storage";
import { loadRuntimeChatMessages, saveRuntimeChatMessages } from "./features/chat/storage";
import { defaultProfileDetails, defaultPromptSettings } from "./features/assistants/profile";
import {
  recordLocalUsageEvent,
  registerDesktopDevice,
} from "./features/cloud/client";
import { useAuthFlow } from "./features/auth/useAuthFlow";
import { useAssistantProfiles } from "./features/assistants/useAssistantProfiles";
import { copy, providerUiCopy, settingsSections, steps, studioSections, surveyQuestions } from "./setup/content";
import type {
  AppMode,
  ChatMessage,
  ChatMetrics,
  CloudDeviceRecord,
  LocalAssistantProfile,
  ProfileDetailsDraft,
  PromptEditorMode,
  PromptSettings,
  ProviderId,
  ProviderKeyState,
  SettingsSection,
  StepId,
  StudioSection,
  SurveyState,
} from "./types";


const ACTIVE_LOCALE: Locale = "en";
function App() {
  const [appMode, setAppMode] = useState<AppMode>("setup");
  const [activeStep, setActiveStep] = useState<StepId>("welcome");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [studioSection, setStudioSection] = useState<StudioSection>("myAssistants");
  const [settingsReturnTarget, setSettingsReturnTarget] = useState<{ appMode: AppMode; activeStep: StepId }>({
    appMode: "studio",
    activeStep: "welcome",
  });
  const [authReturnTarget, setAuthReturnTarget] = useState<{ appMode: AppMode; activeStep: StepId }>({
    appMode: "studio",
    activeStep: "welcome",
  });
  const [survey, setSurvey] = useState<SurveyState>({
    useCase: null,
    answerStyle: null,
    priority: null,
    languageUse: null,
    localMode: null,
    futureFeatures: [],
    memorySyncMode: "profileOnly",
  });
  const [surveyQuestionIndex, setSurveyQuestionIndex] = useState(0);
  const [surveyTipExpanded, setSurveyTipExpanded] = useState(false);
  const [surveyTipContentVisible, setSurveyTipContentVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState("qwen3:4b");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("ollama");
  const [selectedCloudModel, setSelectedCloudModel] = useState("gemini-2.5-flash");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [cloudDevice, setCloudDevice] = useState<CloudDeviceRecord | null>(null);
  const [testChatMessages, setTestChatMessages] = useState<ChatMessage[]>([]);
  const [runtimeChatMessages, setRuntimeChatMessages] = useState<ChatMessage[]>(() => loadRuntimeChatMessages());
  const [activeRuntimeConversationId, setActiveRuntimeConversationId] = useState<string | null>(null);
  const [chatMetrics, setChatMetrics] = useState<ChatMetrics | null>(null);
  const [assistantPanelMinimized, setAssistantPanelMinimized] = useState(false);
  const [dismissedChatIntroKeys, setDismissedChatIntroKeys] = useState<string[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyState>(() => loadProviderKeys());
  const [providerKeysSaved, setProviderKeysSaved] = useState(false);
  const [profileDetailsDraft, setProfileDetailsDraft] = useState<ProfileDetailsDraft>(() => defaultProfileDetails);
  const [promptSettingsDraft, setPromptSettingsDraft] = useState<PromptSettings>(() => defaultPromptSettings);
  const [promptEditorMode, setPromptEditorMode] = useState<PromptEditorMode>("simple");
  const [toolsForAiOpen, setToolsForAiOpen] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [tauriRuntime] = useState(isTauriRuntime);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollChatRef = useRef(true);

  const log = useCallback((message: string) => {
    setLogs((current) => [`${formatLogTime()} ${message}`, ...current].slice(0, 40));
  }, []);

  const t = copy.en;
  const providerText = providerUiCopy.en;
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
  const recommendedModel = useMemo(() => recommendModel(survey, hardware), [survey, hardware]);
  const recommendedCloudModel = useMemo(() => recommendCloudModel(survey), [survey]);
  const recommendedModelInfo = getModelByName(recommendedModel);
  const recommendedCloudModelInfo = getCloudModelById(recommendedCloudModel);
  const selectedModelInfo = getModelByName(selectedModel);
  const selectedCloudModelInfo = getCloudModelById(selectedCloudModel);
  const activeProviderMeta = providerMeta[selectedProvider];
  const activeProviderMode = activeProviderMeta.mode;
  const activeModelLabel = selectedProvider === "ollama" ? selectedModelInfo.label : selectedCloudModelInfo.label;
  const activeProviderLabel = activeProviderMeta.label;
  const cloudRecommended =
    survey.localMode === "cloudOnly" ||
    (survey.localMode === "hybrid" && (survey.priority === "quality" || survey.useCase === "work"));
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const installedModels = status?.installedModels ?? [];
  const selectedModelInstalled = installedModels.includes(selectedModel);
  const recommendedModelInstalled = installedModels.includes(recommendedModel);
  const serviceLabel = !status ? t.checking : status.running ? t.running : status.installed ? t.stopped : t.missing;
  const {
    authSession,
    authFlowState,
    authFlowError,
    deviceAuthRequest,
    clearAuthSession,
    continueLocalOnly,
    startBrowserSignIn,
  } = useAuthFlow({
    tauriRuntime,
    onLog: log,
    onClearCloudDevice: () => setCloudDevice(null),
    onContinueLocalOnly: closeAuth,
  });
  const signedIn = Boolean(authSession);
  const {
    assistantProfileStore,
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
    finalizeCurrentLocalAssistantProfile,
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
  const chatIntroKey = `${selectedProvider}:${selectedProvider === "ollama" ? selectedModel : selectedCloudModel}:${promptProfileId}`;
  const showChatIntroCard = (selectedProvider !== "ollama" || selectedModelInstalled) && !dismissedChatIntroKeys.includes(chatIntroKey);
  const activeChatMessages = appMode === "runtime" ? runtimeChatMessages : testChatMessages;
  const activeAssistantName = activeLocalProfile?.name || profileDetailsDraft.name || "MiVA Assistant";
  const currentConversationId = activeRuntimeConversationId ?? `runtime_${promptProfileId}_current`;
  const firstUserMessage = runtimeChatMessages.find((message) => message.role === "user")?.content.trim();
  const lastRuntimeMessage = runtimeChatMessages[runtimeChatMessages.length - 1];
  const currentRuntimeConversation: RuntimeConversationNavItem = {
    id: currentConversationId,
    assistantId: promptProfileId,
    assistantName: activeAssistantName,
    title: firstUserMessage ? firstUserMessage.slice(0, 48) : t.chatTitle,
    preview: lastRuntimeMessage?.content,
    modelLabel: activeModelLabel,
    messageCount: runtimeChatMessages.length,
    updatedAtLabel: lastRuntimeMessage?.createdAt ? t.justNow : "Ready",
  };
  const currentAssistantConversations = [currentRuntimeConversation];
  const runtimeAssistantProfiles = (() => {
    const profiles = new Map<string, LocalAssistantProfile>();
    visibleAssistantProfileStore.profiles.forEach((profile) => profiles.set(profile.id, profile));
    if (!profiles.has(promptProfileId)) {
      const currentDraft = activeLocalProfile ?? buildCurrentLocalAssistantProfile("draft");
      if (signedIn || currentDraft.provider === "ollama") {
        profiles.set(promptProfileId, currentDraft);
      }
    }
    return Array.from(profiles.values());
  })();
  const assistantConversationGroups = runtimeAssistantProfiles.map((profile) => ({
    assistantId: profile.id,
    assistantName: profile.name,
    conversations: profile.id === promptProfileId ? currentAssistantConversations : [],
  }));

  function updateChatMessages(mode: AppMode, updater: (current: ChatMessage[]) => ChatMessage[]) {
    if (mode === "runtime") {
      setRuntimeChatMessages(updater);
      return;
    }

    setTestChatMessages(updater);
  }

  function clearCurrentChat() {
    updateChatMessages(appMode, () => []);
    setChatInput("");
    if (appMode === "runtime") {
      setActiveRuntimeConversationId(`runtime_${promptProfileId}_${Date.now()}`);
    }
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }

  function startRuntimeChatForAssistant(assistantId: string) {
    const profile = assistantProfileStore.profiles.find((item) => item.id === assistantId);
    if (profile) {
      setActiveLocalProfileId(profile.id);
      applyLocalAssistantProfile(profile);
    }

    setRuntimeChatMessages([]);
    setChatInput("");
    setActiveRuntimeConversationId(`runtime_${assistantId}_${Date.now()}`);
    setAppMode("runtime");
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }

  function selectRuntimeConversation(conversation: RuntimeConversationNavItem) {
    const profile = assistantProfileStore.profiles.find((item) => item.id === conversation.assistantId);
    if (profile) {
      setActiveLocalProfileId(profile.id);
      applyLocalAssistantProfile(profile);
    }
    setActiveRuntimeConversationId(conversation.id);
    setAppMode("runtime");
  }

  function saveProviderKeys() {
    saveProviderKeysToStorage(providerKeys);
    setProviderKeysSaved(true);
    window.setTimeout(() => setProviderKeysSaved(false), 2000);
  }

  function clearProviderKeys() {
    setProviderKeys(emptyProviderKeys);
    clearProviderKeysStorage();
    setProviderKeysSaved(false);
  }

  async function registerDeviceWithCloud() {
    const device = await registerDesktopDevice({
      authSession,
      hardware,
      selectedProvider,
      selectedModel,
      selectedCloudModel,
      status,
    });
    setCloudDevice(device);
    return device;
  }

  async function recordRuntimeUsageEvent(event: {
    assistantProfileId: string | null;
    provider: ProviderId;
    model: string;
    inputChars: number;
    outputChars: number;
    durationMs: number;
    success: boolean;
  }) {
    await recordLocalUsageEvent({
      authSession,
      cloudDeviceId: cloudDevice?.id ?? null,
      ...event,
    });
  }

  function enterSettings(section: SettingsSection = "general") {
    if (activeStep !== "settings") {
      setSettingsReturnTarget({ appMode, activeStep });
    }

    setAppMode("setup");
    setActiveStep("settings");
    setSettingsSection(section);
  }

  function exitSettings() {
    setAppMode(settingsReturnTarget.appMode);
    setActiveStep(settingsReturnTarget.activeStep === "settings" ? "welcome" : settingsReturnTarget.activeStep);
  }

  function openAuth() {
    if (appMode !== "auth") {
      setAuthReturnTarget({ appMode, activeStep });
    }

    setAppMode("auth");
  }

  function closeAuth() {
    setAppMode(authReturnTarget.appMode === "auth" ? "studio" : authReturnTarget.appMode);
    setActiveStep(authReturnTarget.activeStep === "settings" ? "welcome" : authReturnTarget.activeStep);
  }

  function goToNextStep() {
    const next = steps[Math.min(activeIndex + 1, steps.length - 1)];
    if (next.id === "chat") {
      void finalizeCurrentLocalAssistantProfile();
    }
    setActiveStep(next.id);
  }

  function goToPreviousStep() {
    const previous = steps[Math.max(activeIndex - 1, 0)];
    setActiveStep(previous.id);
  }

  function scrollChatToLatest(behavior: ScrollBehavior = "smooth") {
    chatEndRef.current?.scrollIntoView({ behavior, block: "end" });
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }

  function handleChatScroll() {
    const element = chatScrollRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    shouldAutoScrollChatRef.current = nearBottom;
    setShowJumpToLatest((current) => (current === !nearBottom ? current : !nearBottom));
  }

  async function sendMessage() {
    const prompt = chatInput.trim();
    const chatMode = appMode;
    const providerModel = selectedProvider === "ollama" ? selectedModel : selectedCloudModel;
    const assistantProfile = buildCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
    const apiKey = selectedProvider === "openai"
      ? providerKeys.openai.trim()
      : selectedProvider === "gemini"
        ? providerKeys.gemini.trim()
        : "";
    const localUnavailable = selectedProvider === "ollama" && !status?.installed;

    if (!prompt || localUnavailable || busyAction === "chat") {
      return;
    }

    if (selectedProvider !== "ollama" && !authSession) {
      const requestedAt = new Date().toISOString();
      setChatInput("");
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
      updateChatMessages(chatMode, (current) => [
        ...current,
        { role: "user", content: prompt, createdAt: requestedAt, provider: selectedProvider, model: providerModel },
        {
          role: "assistant",
          content: "Sign in to use cloud models. Continue without signing in only supports local Ollama assistants.",
          createdAt: new Date().toISOString(),
          provider: selectedProvider,
          model: providerModel,
        },
      ]);
      log("Cloud chat blocked because no account is signed in.");
      return;
    }

    setBusyAction("chat");
    const runtimeReady = await ensureOllamaReadyForChat(providerModel);
    if (!runtimeReady) {
      setBusyAction(null);
      return;
    }

    setChatInput("");
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
    const startedAt = performance.now();
    const requestedAt = new Date().toISOString();
    updateChatMessages(chatMode, (current) => [
      ...current,
      { role: "user", content: prompt, createdAt: requestedAt, provider: selectedProvider, model: providerModel },
    ]);

    try {
      const answer = await runChatOnce({
        provider: selectedProvider,
        model: providerModel,
        prompt,
        locale: ACTIVE_LOCALE,
        apiKey: apiKey || null,
        profile: assistantProfile,
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      setChatMetrics({
        provider: selectedProvider,
        model: providerModel,
        latencyMs,
        measuredAt: new Date().toISOString(),
      });
      updateChatMessages(chatMode, (current) => [
        ...current,
        {
          role: "assistant",
          content: answer,
          createdAt: new Date().toISOString(),
          provider: selectedProvider,
          model: providerModel,
          latencyMs,
        },
      ]);
      log("Chat response received.");
      if (chatMode === "runtime" && authSession) {
        void recordRuntimeUsageEvent({
          assistantProfileId: assistantProfile.sync.cloudProfileId ?? assistantProfile.id,
          provider: selectedProvider,
          model: providerModel,
          inputChars: prompt.length,
          outputChars: answer.length,
          durationMs: latencyMs,
          success: true,
        }).catch((usageError) => {
          log(`Runtime usage sync failed: ${String(usageError)}`);
        });
      }
    } catch (error) {
      const message = `Chat failed: ${String(error)}`;
      const latencyMs = Math.round(performance.now() - startedAt);
      updateChatMessages(chatMode, (current) => [
        ...current,
        {
          role: "assistant",
          content: message,
          createdAt: new Date().toISOString(),
          provider: selectedProvider,
          model: providerModel,
        },
      ]);
      log(message);
      if (chatMode === "runtime" && authSession) {
        void recordRuntimeUsageEvent({
          assistantProfileId: assistantProfile.sync.cloudProfileId ?? assistantProfile.id,
          provider: selectedProvider,
          model: providerModel,
          inputChars: prompt.length,
          outputChars: message.length,
          durationMs: latencyMs,
          success: false,
        }).catch((usageError) => {
          log(`Runtime usage sync failed: ${String(usageError)}`);
        });
      }
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (!authSession) {
      return;
    }

    void registerDeviceWithCloud().catch((error) => {
      log(`Device registration failed: ${String(error)}`);
    });
  }, [authSession, hardware?.osName, selectedProvider, selectedModel, selectedCloudModel, status?.running]);

  useEffect(() => {
    saveRuntimeChatMessages(runtimeChatMessages);
  }, [runtimeChatMessages]);

  useEffect(() => {
    if (appMode !== "runtime" && !(appMode === "setup" && activeStep === "chat")) {
      return;
    }

    if (!shouldAutoScrollChatRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollChatToLatest(activeChatMessages.length === 0 ? "auto" : "smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [appMode, activeStep, activeChatMessages.length, busyAction, showChatIntroCard, selectedProvider, selectedModel, selectedCloudModel]);

  useEffect(() => {
    setSelectedModel(recommendedModel);
  }, [recommendedModel]);

  useEffect(() => {
    if (cloudRecommended) {
      const cloudModel = getCloudModelById(recommendedCloudModel);
      setSelectedCloudModel(cloudModel.id);
      setSelectedProvider(cloudModel.provider);
      return;
    }

    setSelectedProvider("ollama");
  }, [cloudRecommended, recommendedCloudModel]);

  useEffect(() => {
    if (!surveyTipExpanded) {
      setSurveyTipContentVisible(false);
      return;
    }

    setSurveyTipContentVisible(false);
    const timer = window.setTimeout(() => {
      setSurveyTipContentVisible(true);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [surveyTipExpanded]);

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
      activeConversationId={currentConversationId}
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
  const renderFooter = (primaryLabel = t.continue, primaryAction = goToNextStep, primaryDisabled = false) => (
    <div className="mt-8 flex items-center justify-between">
      <SecondaryButton disabled={activeStep === "welcome"} onClick={goToPreviousStep}>
        {t.back}
      </SecondaryButton>
      <PrimaryButton disabled={primaryDisabled} onClick={primaryAction}>
        {primaryLabel}
      </PrimaryButton>
    </div>
  );

  const renderWelcome = () => <WelcomeStep t={t} onStart={goToNextStep} />;

  const renderSurvey = () => (
    <SurveyStep
      activeLocale={ACTIVE_LOCALE}
      enterSettings={enterSettings}
      goToNextStep={goToNextStep}
      goToPreviousStep={goToPreviousStep}
      setSurvey={setSurvey}
      setSurveyQuestionIndex={setSurveyQuestionIndex}
      setSurveyTipExpanded={setSurveyTipExpanded}
      survey={survey}
      surveyQuestionIndex={surveyQuestionIndex}
      surveyQuestions={surveyQuestions}
      surveyTipContentVisible={surveyTipContentVisible}
      surveyTipExpanded={surveyTipExpanded}
      t={t}
    />
  );

  const renderHardware = () => (
    <HardwareStep
      busyAction={busyAction}
      hardware={hardware}
      hardwareError={hardwareError}
      goToNextStep={goToNextStep}
      refreshHardware={refreshHardware}
      tauriRuntime={tauriRuntime}
      t={t}
    />
  );
  const renderRecommendation = () => (
    <RecommendationStep
      activeLocale={ACTIVE_LOCALE}
      cloudModelCatalog={cloudModelCatalog}
      cloudRecommended={cloudRecommended}
      goToPreviousStep={goToPreviousStep}
      hardware={hardware}
      installedModels={installedModels}
      modelCatalog={modelCatalog}
      onContinue={() => setActiveStep("ollama")}
      providerMeta={providerMeta}
      providerText={providerText}
      recommendedCloudModelInfo={recommendedCloudModelInfo}
      recommendedModel={recommendedModel}
      recommendedModelInfo={recommendedModelInfo}
      recommendedModelInstalled={recommendedModelInstalled}
      selectedCloudModel={selectedCloudModel}
      selectedModel={selectedModel}
      selectedProvider={selectedProvider}
      setSelectedCloudModel={setSelectedCloudModel}
      setSelectedModel={setSelectedModel}
      setSelectedProvider={setSelectedProvider}
      survey={survey}
      t={t}
    />
  );
  const renderOllamaSetup = () => (
    <OllamaStep
      busyAction={busyAction}
      enterLogs={() => enterSettings("logs")}
      goToNextStep={goToNextStep}
      installOllama={installOllama}
      logs={logs}
      refreshStatus={refreshStatus}
      renderFooter={renderFooter}
      serviceLabel={serviceLabel}
      startOllama={startOllama}
      status={status}
      tauriRuntime={tauriRuntime}
      t={t}
    />
  );
  const renderClawCodeSetup = () => (
    <ClawCodeStep
      busyAction={busyAction}
      choosePythonInstallPath={choosePythonInstallPath}
      goToNextStep={goToNextStep}
      installPython={installPython}
      pythonInstallPath={pythonInstallPath}
      refreshRuntimeRequirements={refreshRuntimeRequirements}
      renderFooter={renderFooter}
      runtimeRequirements={runtimeRequirements}
      runtimeRequirementsError={runtimeRequirementsError}
      tauriRuntime={tauriRuntime}
    />
  );
  const renderDownload = () => (
    <DownloadStep
      activeLocale={ACTIVE_LOCALE}
      busyAction={busyAction}
      downloadModel={downloadModel}
      downloadProgress={downloadProgress}
      goToNextStep={goToNextStep}
      installedModels={installedModels}
      modelCatalog={modelCatalog}
      renderFooter={renderFooter}
      selectedModel={selectedModel}
      selectedModelInfo={selectedModelInfo}
      selectedModelInstalled={selectedModelInstalled}
      setSelectedModel={setSelectedModel}
      status={status}
      tauriRuntime={tauriRuntime}
      t={t}
    />
  );

  const renderChat = () => (
    <RuntimePage
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
      finalizeCurrentLocalAssistantProfile={finalizeCurrentLocalAssistantProfile}
      handleChatScroll={handleChatScroll}
      scrollChatToLatest={scrollChatToLatest}
      sendMessage={sendMessage}
      setAppMode={setAppMode}
      setAssistantPanelMinimized={setAssistantPanelMinimized}
      setChatInput={setChatInput}
      setDismissedChatIntroKeys={setDismissedChatIntroKeys}
    />
  );
  const renderProfile = () => (
    <ProfileStep
      activeModelLabel={activeModelLabel}
      activeProviderLabel={activeProviderLabel}
      activeProviderMode={activeProviderMode}
      assistantProfileError={assistantProfileError}
      enterGeneralSettings={() => enterSettings("general")}
      finalizeProfile={() => void finalizeCurrentLocalAssistantProfile()}
      profile={activeLocalProfile ?? buildCurrentLocalAssistantProfile("draft")}
    />
  );
  const renderAuth = () => (
    <AuthPage
      authFlowError={authFlowError}
      authFlowState={authFlowState}
      authSession={authSession}
      deviceAuthRequest={deviceAuthRequest}
      onClearAuthSession={clearAuthSession}
      onCloseAuth={closeAuth}
      onContinueLocalOnly={continueLocalOnly}
      onStartBrowserSignIn={() => void startBrowserSignIn()}
    />
  );
  const renderStudio = () => (
    <StudioPage
      activeLocale={ACTIVE_LOCALE}
      activeLocalProfile={activeLocalProfile}
      activeLocalProfileId={activeLocalProfileId}
      addCurrentLocalAssistantProfile={addCurrentLocalAssistantProfile}
      activeModelLabel={activeModelLabel}
      applyLocalAssistantProfile={applyLocalAssistantProfile}
      assistantProfileStore={visibleAssistantProfileStore}
      assistantProfileError={assistantProfileError}
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
    <SettingsPage
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
      onOpenInitialSetup={() => {
        setAppMode("setup");
        setActiveStep("welcome");
      }}
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
  const renderCurrentStep = () => {
    return (
      <SetupPage
        activeStep={activeStep}
        chatStep={renderChat()}
        clawCodeStep={renderClawCodeSetup()}
        downloadStep={renderDownload()}
        hardwareStep={renderHardware()}
        ollamaStep={renderOllamaSetup()}
        profileStep={renderProfile()}
        recommendationStep={renderRecommendation()}
        settingsStep={renderSettings()}
        surveyStep={renderSurvey()}
        welcomeStep={renderWelcome()}
      />
    );
  };

  return (
    <AppShell
      appMode={appMode}
      authView={renderAuth()}
      content={appMode === "setup" ? renderCurrentStep() : appMode === "studio" ? renderStudio() : renderChat()}
      downloadModal={renderDownloadProgressModal()}
      navigation={appMode === "setup" ? renderNavigation() : appMode === "studio" ? renderStudioNavigation() : renderRuntimeNavigation()}
      topBar={renderTopBar()}
    />
  );
}

export default App;
