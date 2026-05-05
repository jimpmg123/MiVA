import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./App.css";
import type { Locale } from "./i18n";
import { AppShell } from "./app/AppShell";
import { RuntimeNavigation, SetupNavigation, StudioNavigation } from "./app/AppNavigation";
import type { RuntimeConversationNavItem } from "./app/AppNavigation";
import { AppTopBar } from "./app/AppTopBar";
import { invokeCommand, isTauriRuntime } from "./app/tauri";
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
import { emptyAssistantProfileStore, loadLocalAssistantProfileStore, LOCAL_PROFILE_SCHEMA_VERSION, saveLocalAssistantProfileStore } from "./features/assistants/storage";
import { clearAuthSessionStorage, clearProviderKeysStorage, emptyProviderKeys, loadAuthSession, loadOrCreateDeviceId, loadProviderKeys, saveAuthSessionToStorage, saveProviderKeysToStorage } from "./features/auth/storage";
import { loadRuntimeChatMessages, saveRuntimeChatMessages } from "./features/chat/storage";
import { defaultProfileDetails, defaultPromptSettings, normalizeProfileCapabilities, normalizePromptSettings } from "./features/assistants/profile";
import { buildCloudAssistantProfilePayload } from "./features/assistants/cloudPayload";
import {
  createLocalProfileId,
  getAssistantProfileFingerprint,
  getCurrentNewAssistantDraftFingerprint as getNewAssistantDraftFingerprint,
  getNewAssistantDraftBaseline as getDefaultNewAssistantDraftFingerprint,
  hasDuplicateAssistantProfileName,
} from "./features/assistants/profileIdentity";
import { buildSystemPromptPreview } from "./features/assistants/promptPreview";
import { copy, providerUiCopy, settingsSections, steps, studioSections, surveyQuestions } from "./setup/content";
import type {
  AppMode,
  AssistantProfileSyncState,
  AuthFlowState,
  AuthSession,
  ChatMessage,
  ChatMetrics,
  CloudDeviceRecord,
  DeviceAuthStart,
  DeviceAuthStatus,
  HardwareInfo,
  LocalAssistantProfile,
  LocalAssistantProfileStatus,
  LocalAssistantProfileStore,
  ModelDownloadProgress,
  OllamaStatus,
  ProfileDetailsDraft,
  PromptEditorMode,
  PromptSettings,
  ProviderId,
  ProviderKeyState,
  RuntimeRequirements,
  SettingsSection,
  StepId,
  StudioSection,
  SurveyState,
} from "./types";


const CLOUD_API_URL = "http://127.0.0.1:4000";
const DEFAULT_LOCAL_PROFILE_ID = "local_default";
const NEW_LOCAL_PROFILE_DRAFT_ID = "local_new_draft";
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
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [runtimeRequirements, setRuntimeRequirements] = useState<RuntimeRequirements | null>(null);
  const [runtimeRequirementsError, setRuntimeRequirementsError] = useState<string | null>(null);
  const [pythonInstallPath, setPythonInstallPath] = useState("");
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState("qwen3:4b");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("ollama");
  const [selectedCloudModel, setSelectedCloudModel] = useState("gemini-2.5-flash");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [authFlowState, setAuthFlowState] = useState<AuthFlowState>("idle");
  const [authFlowError, setAuthFlowError] = useState<string | null>(null);
  const [deviceAuthRequest, setDeviceAuthRequest] = useState<DeviceAuthStart | null>(null);
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
  const [assistantProfileStore, setAssistantProfileStore] = useState<LocalAssistantProfileStore>(emptyAssistantProfileStore);
  const [activeLocalProfileId, setActiveLocalProfileId] = useState(DEFAULT_LOCAL_PROFILE_ID);
  const [assistantProfileLoaded, setAssistantProfileLoaded] = useState(false);
  const [assistantProfileSaveState, setAssistantProfileSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [assistantProfileError, setAssistantProfileError] = useState<string | null>(null);
  const [assistantProfileSyncState, setAssistantProfileSyncState] = useState<AssistantProfileSyncState>("idle");
  const [assistantProfileSyncMessage, setAssistantProfileSyncMessage] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [tauriRuntime] = useState(isTauriRuntime);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollChatRef = useRef(true);
  const assistantProfileHydratedRef = useRef(false);
  const autoStartOllamaAttemptedRef = useRef(false);
  const newAssistantDraftBaselineRef = useRef<string | null>(null);

  const t = copy.en;
  const providerText = providerUiCopy.en;
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
  const signedIn = Boolean(authSession);
  const visibleAssistantProfiles = assistantProfileStore.profiles.filter((profile) => signedIn || profile.provider === "ollama");
  const visibleAssistantProfileStore = {
    ...assistantProfileStore,
    profiles: visibleAssistantProfiles,
  };
  const savedActiveLocalProfile = assistantProfileStore.profiles.find((profile) => profile.id === activeLocalProfileId) ?? null;
  const activeLocalProfile = savedActiveLocalProfile && visibleAssistantProfiles.some((profile) => profile.id === savedActiveLocalProfile.id)
    ? savedActiveLocalProfile
    : visibleAssistantProfiles[0] ?? null;
  const promptProfileId = activeLocalProfile?.id ?? (signedIn ? activeLocalProfileId : DEFAULT_LOCAL_PROFILE_ID);
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
    visibleAssistantProfiles.forEach((profile) => profiles.set(profile.id, profile));
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

  function log(message: string) {
    setLogs((current) => [`${formatLogTime()} ${message}`, ...current].slice(0, 40));
  }

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

  async function fetchCloudJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${CLOUD_API_URL}${path}`, init);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }

    return response.json() as Promise<T>;
  }

  function getCloudHeaders(extraHeaders?: Record<string, string>) {
    return {
      ...(extraHeaders ?? {}),
      ...(authSession ? { authorization: `Bearer ${authSession.token}` } : {}),
    };
  }

  function saveAuthSession(session: AuthSession) {
    saveAuthSessionToStorage(session);
    setAuthSession(session);
  }

  function clearAuthSession() {
    clearAuthSessionStorage();
    setAuthSession(null);
    setCloudDevice(null);
    setDeviceAuthRequest(null);
    setAuthFlowState("idle");
    setAuthFlowError(null);
  }

  function continueLocalOnly() {
    setAuthFlowState("idle");
    setAuthFlowError(null);
    setDeviceAuthRequest(null);
    closeAuth();
  }

  async function registerDeviceWithCloud() {
    const deviceId = loadOrCreateDeviceId();
    const deviceName = hardware?.osName
      ? `MiVA Desktop - ${hardware.osName}`
      : "MiVA Desktop";
    const response = await fetchCloudJson<{ device: CloudDeviceRecord }>("/devices", {
      method: "POST",
      headers: getCloudHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        id: deviceId,
        name: deviceName,
        os: hardware?.osName ?? navigator.platform ?? null,
        appVersion: "0.1.0",
        status: "connected",
        modelRuntime: {
          provider: selectedProvider,
          model: selectedProvider === "ollama" ? selectedModel : selectedCloudModel,
          ollamaRunning: Boolean(status?.running),
        },
      }),
    });
    setCloudDevice(response.device);
    return response.device;
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
    await fetchCloudJson<{ ok: boolean; accepted: number }>("/usage/local-events", {
      method: "POST",
      headers: getCloudHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        events: [{
          deviceId: cloudDevice?.id ?? loadOrCreateDeviceId(),
          assistantProfileId: event.assistantProfileId,
          mode: providerMeta[event.provider].mode,
          provider: event.provider,
          model: event.model,
          inputChars: event.inputChars,
          outputChars: event.outputChars,
          durationMs: event.durationMs,
          success: event.success,
        }],
      }),
    });
  }

  async function startBrowserSignIn() {
    setAuthFlowState("opening");
    setAuthFlowError(null);

    try {
      const request = await fetchCloudJson<DeviceAuthStart>("/auth/device/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "miva-desktop" }),
      });

      setDeviceAuthRequest(request);
      setAuthFlowState("waiting");

      try {
        if (tauriRuntime) {
          await openUrl(request.verificationUrl);
        } else {
          window.open(request.verificationUrl, "_blank", "noopener,noreferrer");
        }
      } catch (openError) {
        setAuthFlowError(`Browser did not open automatically. Open this URL manually: ${request.verificationUrl}`);
        log(`Browser open failed: ${String(openError)}`);
      }

      log("Opened MiVA web sign-in in the system browser.");
    } catch (error) {
      const message = `Could not start browser sign-in: ${String(error)}`;
      setAuthFlowState("error");
      setAuthFlowError(message);
      log(message);
    }
  }

  function buildCurrentLocalAssistantProfile(
    status: LocalAssistantProfileStatus,
    options?: { forceNew?: boolean; profileId?: string },
  ): LocalAssistantProfile {
    const providerModel = selectedProvider === "ollama" ? selectedModel : selectedCloudModel;
    const existing = options?.forceNew
      ? undefined
      : assistantProfileStore.profiles.find((profile) => profile.id === activeLocalProfileId);
    const profileId = options?.profileId ?? existing?.id ?? activeLocalProfileId;
    const now = new Date().toISOString();
    const safeSurvey: SurveyState = {
      useCase: survey.useCase,
      answerStyle: survey.answerStyle,
      priority: survey.priority,
      languageUse: survey.languageUse,
      localMode: survey.localMode,
      futureFeatures: [...survey.futureFeatures],
      memorySyncMode: survey.memorySyncMode,
    };
    const promptSettings = normalizePromptSettings(promptSettingsDraft);
    const profileBase = {
      useCase: safeSurvey.useCase,
      answerStyle: safeSurvey.answerStyle,
      priority: safeSurvey.priority,
      languageUse: safeSurvey.languageUse,
      localMode: safeSurvey.localMode,
      futureFeatures: safeSurvey.futureFeatures,
      provider: selectedProvider,
      model: providerModel,
    };

    return {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      id: profileId,
      name: profileDetailsDraft.name.trim() || existing?.name || defaultProfileDetails.name,
      description: profileDetailsDraft.description.trim() || existing?.description || defaultProfileDetails.description,
      status,
      source: appMode === "runtime" ? "runtime" : "desktop-setup",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: status === "finalized" ? existing?.completedAt ?? now : null,
      locale: ACTIVE_LOCALE,
      ...profileBase,
      providerMode: activeProviderMode,
      modelLabel: activeModelLabel,
      survey: safeSurvey,
      recommendation: {
        localModel: recommendedModel,
        cloudModel: recommendedCloudModel,
        selectedProvider,
        selectedModel,
        selectedCloudModel,
        hardwareMemoryGb: hardware?.totalMemoryGb ?? null,
      },
      prompt: {
        profileId,
        systemPrompt: buildSystemPromptPreview(profileBase, promptSettings),
        settings: promptSettings,
        variables: {
          useCase: safeSurvey.useCase,
          answerStyle: safeSurvey.answerStyle,
          priority: safeSurvey.priority,
          languageUse: safeSurvey.languageUse,
          localMode: safeSurvey.localMode,
          futureFeatures: safeSurvey.futureFeatures,
          provider: selectedProvider,
          model: providerModel,
        },
        overrides: existing?.prompt?.overrides ?? {
          persona: null,
          instructions: [],
          guardrails: [],
        },
      },
      capabilities: normalizeProfileCapabilities(existing?.capabilities, promptSettings, safeSurvey.memorySyncMode),
      sync: existing?.sync ?? {
        cloudEnabled: false,
        cloudProfileId: null,
        lastSyncedAt: null,
      },
      metadata: {
        setupStep: activeStep,
        appMode,
        appVersion: "0.1.0",
        hardwareSnapshot: hardware,
      },
    };
  }

  function findDuplicateAssistantProfileName(profile: LocalAssistantProfile) {
    return hasDuplicateAssistantProfileName(profile, assistantProfileStore.profiles);
  }

  function getNewAssistantDraftBaseline() {
    return getDefaultNewAssistantDraftFingerprint({
      selectedProvider,
      selectedModel,
      selectedCloudModel,
    });
  }

  function getCurrentNewAssistantDraftFingerprint() {
    return getNewAssistantDraftFingerprint({
      profileDetailsDraft,
      promptSettingsDraft,
      selectedProvider,
      selectedModel,
      selectedCloudModel,
    });
  }

  function hasUnsavedStudioDraftChanges() {
    if (appMode !== "studio" || studioSection === "myAssistants") {
      return false;
    }

    if (activeLocalProfile) {
      const currentProfile = buildCurrentLocalAssistantProfile(activeLocalProfile.status);
      return getAssistantProfileFingerprint(activeLocalProfile) !== getAssistantProfileFingerprint(currentProfile);
    }

    if (activeLocalProfileId === NEW_LOCAL_PROFILE_DRAFT_ID) {
      return (newAssistantDraftBaselineRef.current ?? getNewAssistantDraftBaseline()) !== getCurrentNewAssistantDraftFingerprint();
    }

    return false;
  }

  function confirmDiscardStudioChanges() {
    if (!hasUnsavedStudioDraftChanges()) {
      return true;
    }

    return window.confirm("You have unsaved changes. Leave without saving?");
  }

  function clearAssistantProfileSyncStatus() {
    setAssistantProfileSyncState("idle");
    setAssistantProfileSyncMessage(null);
  }

  async function saveCurrentLocalAssistantProfile(status: LocalAssistantProfileStatus) {
    clearAssistantProfileSyncStatus();
    const profile = buildCurrentLocalAssistantProfile(status);
    if (findDuplicateAssistantProfileName(profile)) {
      const message = "An assistant with this name already exists.";
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile save blocked: ${message}`);
      throw new Error(message);
    }

    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: profile.id,
      profiles: [
        profile,
        ...assistantProfileStore.profiles.filter((item) => item.id !== profile.id),
      ],
      updatedAt: profile.updatedAt,
    };

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      newAssistantDraftBaselineRef.current = null;
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
      return profile;
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile save failed: ${message}`);
      throw error;
    }
  }

  async function addCurrentLocalAssistantProfile(status: LocalAssistantProfileStatus) {
    clearAssistantProfileSyncStatus();
    const profile = buildCurrentLocalAssistantProfile(status, {
      forceNew: true,
      profileId: createLocalProfileId(),
    });
    if (findDuplicateAssistantProfileName(profile)) {
      const message = "An assistant with this name already exists.";
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile add blocked: ${message}`);
      throw new Error(message);
    }

    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: profile.id,
      profiles: [
        profile,
        ...assistantProfileStore.profiles,
      ],
      updatedAt: profile.updatedAt,
    };

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      newAssistantDraftBaselineRef.current = null;
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
      log(`Added assistant profile: ${profile.name}.`);
      return profile;
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile add failed: ${message}`);
      throw error;
    }
  }

  async function persistLocalAssistantProfile(profile: LocalAssistantProfile) {
    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: profile.id,
      profiles: [
        profile,
        ...assistantProfileStore.profiles.filter((item) => item.id !== profile.id),
      ],
      updatedAt: profile.updatedAt,
    };

    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);
    const savedStore = await saveLocalAssistantProfileStore(nextStore);
    setAssistantProfileStore(savedStore);
    return savedStore;
  }

  async function deleteLocalAssistantProfile(profileId: string) {
    const profile = assistantProfileStore.profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    if (!window.confirm(`Delete "${profile.name}" from this computer?`)) {
      return;
    }

    const remainingProfiles = assistantProfileStore.profiles.filter((item) => item.id !== profileId);
    const nextActiveProfile = remainingProfiles[0] ?? null;
    const nextStore: LocalAssistantProfileStore = {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: nextActiveProfile?.id ?? null,
      profiles: remainingProfiles,
      updatedAt: new Date().toISOString(),
    };

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);

    if (nextActiveProfile) {
      setActiveLocalProfileId(nextActiveProfile.id);
      applyLocalAssistantProfile(nextActiveProfile);
    } else {
      setActiveLocalProfileId(DEFAULT_LOCAL_PROFILE_ID);
      setProfileDetailsDraft(defaultProfileDetails);
      setPromptSettingsDraft(defaultPromptSettings);
      setSurvey({
        useCase: null,
        answerStyle: null,
        priority: null,
        languageUse: null,
        localMode: null,
        futureFeatures: [],
        memorySyncMode: "profileOnly",
      });
      setSelectedProvider("ollama");
      setSelectedModel("qwen3:4b");
      setSelectedCloudModel("gemini-2.5-flash");
    }

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      log(`Deleted assistant profile: ${profile.name}.`);
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      log(`Assistant profile delete failed: ${message}`);
    }
  }

  async function sendProfileToCloud(profile: LocalAssistantProfile) {
    const cloudProfileId = profile.sync.cloudProfileId;
    const payload = buildCloudAssistantProfilePayload(profile);
    const request = async (method: "POST" | "PATCH", url: string) => {
      const response = await fetch(url, {
        method,
        headers: getCloudHeaders({ "content-type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
      }

      return response.json() as Promise<{ profile?: { id?: string } }>;
    };

    if (!cloudProfileId) {
      return request("POST", `${CLOUD_API_URL}/assistant-profiles`);
    }

    try {
      return await request("PATCH", `${CLOUD_API_URL}/assistant-profiles/${encodeURIComponent(cloudProfileId)}`);
    } catch (error) {
      if (String(error).includes("404")) {
        return request("POST", `${CLOUD_API_URL}/assistant-profiles`);
      }

      throw error;
    }
  }

  async function syncLocalAssistantProfileToCloud(profile: LocalAssistantProfile) {
    const response = await sendProfileToCloud(profile);
    const cloudProfileId = response.profile?.id ?? profile.sync.cloudProfileId ?? profile.id;
    const syncedAt = new Date().toISOString();
    return {
      ...profile,
      updatedAt: syncedAt,
      sync: {
        cloudEnabled: true,
        cloudProfileId,
        lastSyncedAt: syncedAt,
      },
    } satisfies LocalAssistantProfile;
  }

  async function syncAllAssistantProfilesToCloud() {
    if (!authSession) {
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage("Sign in before syncing assistant profiles.");
      return;
    }

    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage("Saving current assistant before syncing all profiles...");

    try {
      const currentProfile = await saveCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
      const profileMap = new Map<string, LocalAssistantProfile>();
      assistantProfileStore.profiles.forEach((profile) => profileMap.set(profile.id, profile));
      profileMap.set(currentProfile.id, currentProfile);
      const profiles = [...profileMap.values()];

      setAssistantProfileSyncMessage(`Syncing ${profiles.length} assistant profile${profiles.length === 1 ? "" : "s"}...`);
      const syncedProfiles: LocalAssistantProfile[] = [];
      for (const profile of profiles) {
        syncedProfiles.push(await syncLocalAssistantProfileToCloud(profile));
      }

      const activeProfileId = syncedProfiles.some((profile) => profile.id === activeLocalProfileId)
        ? activeLocalProfileId
        : syncedProfiles[0]?.id ?? null;
      const syncedAt = new Date().toISOString();
      const nextStore: LocalAssistantProfileStore = {
        schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
        activeProfileId,
        profiles: syncedProfiles,
        updatedAt: syncedAt,
      };
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      if (activeProfileId) {
        setActiveLocalProfileId(activeProfileId);
        const activeProfile = savedStore.profiles.find((profile) => profile.id === activeProfileId);
        if (activeProfile) {
          applyLocalAssistantProfile(activeProfile);
        }
      }
      setAssistantProfileSyncState("synced");
      setAssistantProfileSyncMessage(`Synced ${syncedProfiles.length} assistant profile${syncedProfiles.length === 1 ? "" : "s"} to the web console.`);
    } catch (error) {
      const rawMessage = String(error);
      if (rawMessage.includes("An assistant with this name already exists.")) {
        setAssistantProfileSyncState("idle");
        setAssistantProfileSyncMessage(null);
        log(`Sync all blocked by local save validation: ${rawMessage}`);
        return;
      }

      const message = `Cloud API offline or sync failed: ${rawMessage}`;
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(message);
      log(message);
    }
  }

  async function syncAssistantProfileToCloud(profile: LocalAssistantProfile) {
    if (!authSession) {
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage("Sign in before syncing assistant profiles.");
      return;
    }

    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage(`Syncing ${profile.name || "assistant profile"}...`);

    try {
      const profileToSync = profile.id === activeLocalProfileId
        ? await saveCurrentLocalAssistantProfile(activeLocalProfile?.status ?? profile.status)
        : profile;
      const syncedProfile = await syncLocalAssistantProfileToCloud(profileToSync);
      await persistLocalAssistantProfile(syncedProfile);
      setAssistantProfileSyncState("synced");
      setAssistantProfileSyncMessage(`Synced ${syncedProfile.name || "assistant profile"} to the web console.`);
    } catch (error) {
      const rawMessage = String(error);
      if (rawMessage.includes("An assistant with this name already exists.")) {
        setAssistantProfileSyncState("idle");
        setAssistantProfileSyncMessage(null);
        log(`Sync blocked by local save validation: ${rawMessage}`);
        return;
      }

      const message = `Cloud API offline or sync failed: ${rawMessage}`;
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(message);
      log(message);
    }
  }

  function applyLocalAssistantProfile(profile: LocalAssistantProfile) {
    newAssistantDraftBaselineRef.current = null;
    setProfileDetailsDraft({
      name: profile.name || defaultProfileDetails.name,
      description: profile.description || defaultProfileDetails.description,
    });
    setSurvey({
      useCase: profile.survey?.useCase ?? profile.useCase ?? null,
      answerStyle: profile.survey?.answerStyle ?? profile.answerStyle ?? null,
      priority: profile.survey?.priority ?? profile.priority ?? null,
      languageUse: profile.survey?.languageUse ?? profile.languageUse ?? null,
      localMode: profile.survey?.localMode ?? profile.localMode ?? null,
      futureFeatures: Array.isArray(profile.survey?.futureFeatures) ? profile.survey.futureFeatures : profile.futureFeatures ?? [],
      memorySyncMode: profile.survey?.memorySyncMode ?? profile.capabilities?.memory?.syncMode ?? "profileOnly",
    });
    setSelectedProvider(profile.provider ?? "ollama");
    setSelectedModel(profile.recommendation?.selectedModel ?? (profile.provider === "ollama" ? profile.model : selectedModel));
    setSelectedCloudModel(profile.recommendation?.selectedCloudModel ?? (profile.provider !== "ollama" ? profile.model : selectedCloudModel));
    setPromptSettingsDraft(normalizePromptSettings(profile.prompt?.settings));
  }

  async function finalizeCurrentLocalAssistantProfile() {
    try {
      const finalizedProfile = await saveCurrentLocalAssistantProfile("finalized");
      log("Assistant profile finalized locally.");
      if (authSession && !finalizedProfile.sync.cloudEnabled) {
        setAssistantProfileSyncState("syncing");
        setAssistantProfileSyncMessage("Uploading finalized assistant profile...");
        const syncedProfile = await syncLocalAssistantProfileToCloud(finalizedProfile);
        await persistLocalAssistantProfile(syncedProfile);
        setAssistantProfileSyncState("synced");
        setAssistantProfileSyncMessage("Initial assistant profile uploaded to the web console.");
      }
    } catch {
      // The save function already records the visible error state.
    }
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

  async function refreshStatus() {
    setBusyAction("refreshStatus");
    try {
      const nextStatus = await invokeCommand<OllamaStatus>("get_ollama_status");
      setStatus(nextStatus);
    } catch (error) {
      log(`Status failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshHardware() {
    setBusyAction("hardware");
    setHardwareError(null);
    try {
      const nextHardware = await invokeCommand<HardwareInfo>("get_hardware_info");
      setHardware(nextHardware);
    } catch (error) {
      setHardwareError(String(error));
      log(`Hardware check failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshRuntimeRequirements() {
    setRuntimeRequirementsError(null);
    try {
      const nextRequirements = await invokeCommand<RuntimeRequirements>("get_runtime_requirements");
      setRuntimeRequirements(nextRequirements);
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      log(`Runtime requirement check failed: ${String(error)}`);
    }
  }

  async function refreshDefaultPythonInstallPath() {
    try {
      const nextPath = await invokeCommand<string>("get_default_python_install_dir");
      setPythonInstallPath((current) => current || nextPath);
    } catch (error) {
      log(`Python install path check failed: ${String(error)}`);
    }
  }

  async function choosePythonInstallPath() {
    if (!tauriRuntime) {
      return;
    }

    try {
      const selected = await openDialog({
        title: "Choose Python install location",
        directory: true,
        multiple: false,
        defaultPath: pythonInstallPath || undefined,
      });

      if (typeof selected === "string") {
        setPythonInstallPath(selected);
      }
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      log(`Python install location selection failed: ${String(error)}`);
    }
  }

  async function installPython() {
    setBusyAction("install-python");
    setRuntimeRequirementsError(null);
    try {
      const installPath = pythonInstallPath.trim();
      log(`Starting Python install through winget at ${installPath || "default location"}.`);
      const output = await invokeCommand<string>("install_python", { targetDir: installPath || null });
      log(output);
      await refreshRuntimeRequirements();
    } catch (error) {
      setRuntimeRequirementsError(String(error));
      log(`Python install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function installOllama() {
    setBusyAction("install");
    try {
      log("Starting Ollama install through winget.");
      const output = await invokeCommand<string>("install_ollama");
      log(output);
      await refreshStatus();
    } catch (error) {
      log(`Install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function startOllama() {
    setBusyAction("start");
    try {
      const output = await invokeCommand<string>("start_ollama");
      log(output);
      await refreshStatus();
    } catch (error) {
      log(`Start failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function ensureOllamaReadyForChat(model: string) {
    if (selectedProvider !== "ollama") {
      return true;
    }

    if (!status?.installed) {
      log("Ollama is not installed. Install Ollama before using a local model.");
      return false;
    }

    let nextStatus = status;
    if (!nextStatus.running) {
      log("Ollama is not running. Starting Ollama automatically before local chat.");
      const output = await invokeCommand<string>("start_ollama");
      log(output);
      nextStatus = await invokeCommand<OllamaStatus>("get_ollama_status");
      setStatus(nextStatus);
    }

    if (!nextStatus.running) {
      log("Ollama start was attempted, but the local runtime is still offline.");
      return false;
    }

    if (!nextStatus.installedModels.includes(model)) {
      log(`${model} is not installed. Download the model before starting local chat.`);
      return false;
    }

    return true;
  }

  async function downloadModel(model: string) {
    setBusyAction(`download:${model}`);
    setDownloadProgress({
      model,
      status: t.preparingDownload,
      completed: null,
      total: null,
      percent: 0,
      done: false,
      error: null,
    });
    try {
      log(`Downloading ${model}.`);
      const output = await invokeCommand<string>("pull_model", { model });
      log(output);
      setDismissedChatIntroKeys((current) => current.filter((key) => key !== `ollama:${model}:${promptProfileId}`));
      await refreshStatus();
    } catch (error) {
      const message = String(error);
      setDownloadProgress((current) => ({
        model,
        status: t.downloadFailed,
        completed: current?.completed ?? null,
        total: current?.total ?? null,
        percent: current?.percent ?? null,
        done: true,
        error: message,
      }));
      log(`Download failed: ${message}`);
    } finally {
      setBusyAction(null);
    }
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
      const answer = await invokeCommand<string>("chat_once", {
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
    if (tauriRuntime) {
      void (async () => {
        await refreshStatus();
        await refreshHardware();
        await refreshRuntimeRequirements();
        await refreshDefaultPythonInstallPath();
      })();
    }
  }, [tauriRuntime]);

  useEffect(() => {
    if (!tauriRuntime || !status || autoStartOllamaAttemptedRef.current) {
      return;
    }

    if (!status.installed || status.running) {
      return;
    }

    autoStartOllamaAttemptedRef.current = true;
    void (async () => {
      try {
        log("Ollama is installed but offline. Starting automatically on app launch.");
        const output = await invokeCommand<string>("start_ollama");
        log(output);
        const nextStatus = await invokeCommand<OllamaStatus>("get_ollama_status");
        setStatus(nextStatus);
      } catch (error) {
        log(`Automatic Ollama start failed: ${String(error)}`);
      }
    })();
  }, [tauriRuntime, status]);

  useEffect(() => {
    if (!authSession) {
      return;
    }

    void registerDeviceWithCloud().catch((error) => {
      log(`Device registration failed: ${String(error)}`);
    });
  }, [authSession, hardware?.osName, selectedProvider, selectedModel, selectedCloudModel, status?.running]);

  useEffect(() => {
    if (!deviceAuthRequest || authFlowState !== "waiting") {
      return;
    }

    let cancelled = false;
    const pollInterval = Math.max(1000, deviceAuthRequest.intervalMs || 1500);

    const pollDeviceAuth = async () => {
      try {
        const statusResponse = await fetchCloudJson<DeviceAuthStatus>(
          `/auth/device/${encodeURIComponent(deviceAuthRequest.deviceCode)}`,
        );

        if (cancelled) {
          return;
        }

        if (statusResponse.status === "authorized" && statusResponse.session) {
          saveAuthSession(statusResponse.session);
          setAuthFlowState("connected");
          setAuthFlowError(null);
          setDeviceAuthRequest(null);
          log(`Desktop session connected for ${statusResponse.session.user.email}.`);
          return;
        }

        if (statusResponse.status === "expired") {
          setAuthFlowState("error");
          setAuthFlowError("This desktop login request expired. Start sign-in again.");
          setDeviceAuthRequest(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthFlowState("error");
          setAuthFlowError(`Could not check sign-in status: ${String(error)}`);
        }
      }
    };

    void pollDeviceAuth();
    const intervalId = window.setInterval(() => void pollDeviceAuth(), pollInterval);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authFlowState, deviceAuthRequest]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const store = await loadLocalAssistantProfileStore();
        if (cancelled) {
          return;
        }

        setAssistantProfileStore(store);
        const activeProfile = store.profiles.find((profile) => profile.id === store.activeProfileId) ?? store.profiles[0] ?? null;
        if (activeProfile) {
          setActiveLocalProfileId(activeProfile.id);
          applyLocalAssistantProfile(activeProfile);
        }

        assistantProfileHydratedRef.current = true;
        setAssistantProfileLoaded(true);
        log(activeProfile ? "Assistant profile loaded from local storage." : "No local assistant profile found yet.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        assistantProfileHydratedRef.current = true;
        setAssistantProfileLoaded(true);
        setAssistantProfileError(String(error));
        setAssistantProfileSaveState("error");
        log(`Assistant profile load failed: ${String(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authSession || !assistantProfileLoaded) {
      return;
    }

    const activeProfile = assistantProfileStore.profiles.find((profile) => profile.id === activeLocalProfileId);
    if (!activeProfile || activeProfile.provider === "ollama") {
      return;
    }

    const nextLocalProfile = assistantProfileStore.profiles.find((profile) => profile.provider === "ollama") ?? null;
    if (nextLocalProfile) {
      setActiveLocalProfileId(nextLocalProfile.id);
      applyLocalAssistantProfile(nextLocalProfile);
      return;
    }

    setActiveLocalProfileId(DEFAULT_LOCAL_PROFILE_ID);
    setSelectedProvider("ollama");
    setSelectedModel("qwen3:4b");
    setSelectedCloudModel("gemini-2.5-flash");
    setProfileDetailsDraft(defaultProfileDetails);
    setPromptSettingsDraft(defaultPromptSettings);
  }, [authSession, assistantProfileLoaded, assistantProfileStore.profiles, activeLocalProfileId]);

  useEffect(() => {
    if (!tauriRuntime) {
      return;
    }

    let unlisten: (() => void) | undefined;
    void listen<ModelDownloadProgress>("model-download-progress", (event) => {
      setDownloadProgress(event.payload);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      unlisten?.();
    };
  }, [tauriRuntime]);

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

  const saveStudioDraft = () => {
    void saveCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft").catch(() => undefined);
  };

  const startNewAssistantDraft = () => {
    if (!confirmDiscardStudioChanges()) {
      return;
    }

    newAssistantDraftBaselineRef.current = getNewAssistantDraftBaseline();
    setActiveLocalProfileId(NEW_LOCAL_PROFILE_DRAFT_ID);
    setProfileDetailsDraft(defaultProfileDetails);
    setPromptSettingsDraft(defaultPromptSettings);
    setAssistantProfileError(null);
    setAssistantProfileSaveState("idle");
    setStudioSection("overview");
  };

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
