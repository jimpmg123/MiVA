import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../../i18n";
import { runChatOnce } from "../models/ollamaRuntime";
import { loadRuntimeChatMessages, saveRuntimeChatMessages } from "./storage";
import type { RuntimeConversationNavItem } from "../../app/AppNavigation";
import type {
  AppMode,
  AuthSession,
  ChatMessage,
  ChatMetrics,
  LocalAssistantProfile,
  ProviderId,
} from "../../types";

type RuntimeUsageEventInput = {
  assistantProfileId: string | null;
  provider: ProviderId;
  model: string;
  inputChars: number;
  outputChars: number;
  durationMs: number;
  success: boolean;
};

type UseRuntimeChatOptions = {
  activeLocale: Locale;
  appMode: AppMode;
  activeStep: string;
  authSession: AuthSession | null;
  activeLocalProfile: LocalAssistantProfile | null;
  promptProfileId: string;
  activeModelLabel: string;
  activeAssistantName: string;
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
  providerKeys: { openai: string; gemini: string };
  statusInstalled: boolean;
  busyAction: string | null;
  visibleAssistantProfiles: LocalAssistantProfile[];
  chatIntroKey: string;
  chatTitle: string;
  justNowLabel: string;
  showChatIntroCard: boolean;
  onDismissedChatIntroKeysChange: Dispatch<SetStateAction<string[]>>;
  buildCurrentLocalAssistantProfile: () => LocalAssistantProfile;
  applyLocalAssistantProfile: (profile: LocalAssistantProfile) => void;
  setActiveLocalProfileId: (id: string) => void;
  setAppMode: Dispatch<SetStateAction<AppMode>>;
  setBusyAction: Dispatch<SetStateAction<string | null>>;
  ensureOllamaReadyForChat: (model: string) => Promise<boolean>;
  recordRuntimeUsageEvent: (event: RuntimeUsageEventInput) => Promise<void>;
  onLog: (message: string) => void;
};

export function useRuntimeChat({
  activeLocale,
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
  statusInstalled,
  busyAction,
  visibleAssistantProfiles,
  chatIntroKey,
  chatTitle,
  justNowLabel,
  showChatIntroCard,
  onDismissedChatIntroKeysChange,
  buildCurrentLocalAssistantProfile,
  applyLocalAssistantProfile,
  setActiveLocalProfileId,
  setAppMode,
  setBusyAction,
  ensureOllamaReadyForChat,
  recordRuntimeUsageEvent,
  onLog,
}: UseRuntimeChatOptions) {
  const [chatInput, setChatInput] = useState("");
  const [testChatMessages, setTestChatMessages] = useState<ChatMessage[]>([]);
  const [runtimeChatMessages, setRuntimeChatMessages] = useState<ChatMessage[]>(() => loadRuntimeChatMessages(promptProfileId));
  const [activeRuntimeConversationId, setActiveRuntimeConversationId] = useState<string | null>(null);
  const [chatMetrics, setChatMetrics] = useState<ChatMetrics | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollChatRef = useRef(true);

  const activeChatMessages = appMode === "runtime" ? runtimeChatMessages : testChatMessages;
  const currentConversationId = activeRuntimeConversationId ?? `runtime_${promptProfileId}_current`;
  const firstUserMessage = runtimeChatMessages.find((message) => message.role === "user")?.content.trim();
  const lastRuntimeMessage = runtimeChatMessages[runtimeChatMessages.length - 1];
  const currentRuntimeConversation: RuntimeConversationNavItem = {
    id: currentConversationId,
    assistantId: promptProfileId,
    assistantName: activeAssistantName,
    title: firstUserMessage ? firstUserMessage.slice(0, 48) : chatTitle,
    preview: lastRuntimeMessage?.content,
    modelLabel: activeModelLabel,
    messageCount: runtimeChatMessages.length,
    updatedAtLabel: lastRuntimeMessage?.createdAt ? justNowLabel : "Ready",
  };
  const currentAssistantConversations = runtimeChatMessages.length ? [currentRuntimeConversation] : [];
  const runtimeAssistantProfiles = (() => {
    const profiles = new Map<string, LocalAssistantProfile>();
    visibleAssistantProfiles.forEach((profile) => profiles.set(profile.id, profile));
    if (!profiles.has(promptProfileId)) {
      const currentDraft = activeLocalProfile ?? buildCurrentLocalAssistantProfile();
      if (authSession || currentDraft.provider === "ollama") {
        profiles.set(promptProfileId, currentDraft);
      }
    }
    return Array.from(profiles.values());
  })();
  const assistantConversationGroups = runtimeAssistantProfiles.map((profile) => {
    const messages = profile.id === promptProfileId ? runtimeChatMessages : loadRuntimeChatMessages(profile.id);
    const firstMessage = messages.find((message) => message.role === "user")?.content.trim();
    const lastMessage = messages[messages.length - 1];
    const conversations = messages.length
      ? [{
          id: `runtime_${profile.id}_current`,
          assistantId: profile.id,
          assistantName: profile.name,
          title: firstMessage ? firstMessage.slice(0, 48) : chatTitle,
          preview: lastMessage?.content,
          modelLabel: profile.modelLabel || profile.model,
          messageCount: messages.length,
          updatedAtLabel: lastMessage?.createdAt ? justNowLabel : "Ready",
        }]
      : [];

    return {
      assistantId: profile.id,
      assistantName: profile.name,
      conversations,
    };
  });

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
    const profile = visibleAssistantProfiles.find((item) => item.id === assistantId);
    if (profile) {
      setActiveLocalProfileId(profile.id);
      applyLocalAssistantProfile(profile);
    }

    setRuntimeChatMessages([]);
    saveRuntimeChatMessages(assistantId, []);
    setChatInput("");
    setActiveRuntimeConversationId(`runtime_${assistantId}_${Date.now()}`);
    setAppMode("runtime");
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }

  function selectRuntimeConversation(conversation: RuntimeConversationNavItem) {
    const profile = visibleAssistantProfiles.find((item) => item.id === conversation.assistantId);
    if (profile) {
      setActiveLocalProfileId(profile.id);
      applyLocalAssistantProfile(profile);
    }
    setRuntimeChatMessages(loadRuntimeChatMessages(conversation.assistantId));
    setActiveRuntimeConversationId(conversation.id);
    setAppMode("runtime");
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
    const assistantProfile = buildCurrentLocalAssistantProfile();
    const apiKey = selectedProvider === "openai"
      ? providerKeys.openai.trim()
      : selectedProvider === "gemini"
        ? providerKeys.gemini.trim()
        : "";
    const localUnavailable = selectedProvider === "ollama" && !statusInstalled;

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
      onLog("Cloud chat blocked because no account is signed in.");
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
        locale: activeLocale,
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
      onLog("Chat response received.");
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
          onLog(`Runtime usage sync failed: ${String(usageError)}`);
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
      onLog(message);
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
          onLog(`Runtime usage sync failed: ${String(usageError)}`);
        });
      }
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    saveRuntimeChatMessages(promptProfileId, runtimeChatMessages);
  }, [promptProfileId, runtimeChatMessages]);

  useEffect(() => {
    if (appMode !== "runtime") {
      return;
    }

    setRuntimeChatMessages(loadRuntimeChatMessages(promptProfileId));
    setActiveRuntimeConversationId((current) => (
      current?.startsWith(`runtime_${promptProfileId}_`) ? current : `runtime_${promptProfileId}_current`
    ));
    setChatInput("");
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }, [appMode, promptProfileId]);

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

  return {
    activeChatMessages,
    activeConversationId: currentConversationId,
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
    setDismissedChatIntroKeys: onDismissedChatIntroKeysChange,
    showJumpToLatest,
    startRuntimeChatForAssistant,
    selectRuntimeConversation,
    clearCurrentChat,
  };
}
