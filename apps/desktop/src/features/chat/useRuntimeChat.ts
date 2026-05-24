import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../../i18n";
import { runChatOnce } from "../models/ollamaRuntime";
import { synthesizeVoice } from "../voice/voiceRuntime";
import {
  emptyRuntimeChatStore,
  loadRuntimeChatStore,
  saveRuntimeChatMessages,
  saveRuntimeMemorySummary,
} from "./storage";
import type { RuntimeConversationNavItem } from "../../app/AppNavigation";
import type {
  AppMode,
  AuthSession,
  ChatMessage,
  ChatMetrics,
  LocalAssistantProfile,
  PromptSettings,
  ProviderId,
  RuntimeMemorySummary,
} from "../../types";

const RECENT_CONTEXT_MESSAGE_LIMIT = 8;
const MEMORY_COMPACTION_FALLBACK_BUDGET = 2000;
type TtsPlaybackState = "idle" | "starting" | "speaking" | "error";

function estimateTokensFromText(value: string) {
  return Math.ceil(value.length / 3);
}

function estimateChatTokens(messages: Pick<ChatMessage, "content">[]) {
  return messages.reduce((total, message) => total + estimateTokensFromText(message.content), 0);
}

function hasExplicitMemoryRequest(value: string) {
  const normalized = value.toLowerCase();
  return [
    "remember",
    "keep this in mind",
    "save this",
    "memorize",
    "기억",
    "기억해",
    "기억해줘",
    "저장해",
    "저장해줘",
    "다음에도 참고",
    "앞으로 참고",
  ].some((marker) => normalized.includes(marker));
}

function cleanSpeechText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_#>]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

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
  updateAssistantProfileRollingSummary: (profileId: string, summary: RuntimeMemorySummary) => Promise<void>;
  setActiveLocalProfileId: (id: string) => void;
  setAppMode: Dispatch<SetStateAction<AppMode>>;
  setBusyAction: Dispatch<SetStateAction<string | null>>;
  ensureOllamaReadyForChat: (model: string) => Promise<boolean>;
  recordRuntimeUsageEvent: (event: RuntimeUsageEventInput) => Promise<void>;
  runtimeTtsEnabled: boolean;
  runtimeTtsSettings: PromptSettings["voice"]["tts"] | null;
  onLog: (message: string) => void;
};

export function useRuntimeChat({
  activeLocale,
  appMode,
  activeStep,
  authSession,
  activeLocalProfile,
  promptProfileId,
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
  updateAssistantProfileRollingSummary,
  setActiveLocalProfileId,
  setAppMode,
  setBusyAction,
  ensureOllamaReadyForChat,
  recordRuntimeUsageEvent,
  runtimeTtsEnabled,
  runtimeTtsSettings,
  onLog,
}: UseRuntimeChatOptions) {
  const [chatInput, setChatInput] = useState("");
  const [testChatMessages, setTestChatMessages] = useState<ChatMessage[]>([]);
  const [runtimeChatStore, setRuntimeChatStore] = useState(emptyRuntimeChatStore);
  const [runtimeChatMessages, setRuntimeChatMessages] = useState<ChatMessage[]>([]);
  const [activeRuntimeConversationId, setActiveRuntimeConversationId] = useState<string | null>(null);
  const [chatMetrics, setChatMetrics] = useState<ChatMetrics | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [ttsPlaybackState, setTtsPlaybackState] = useState<TtsPlaybackState>("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoScrollChatRef = useRef(true);
  const loadedRuntimeProfileIdRef = useRef(promptProfileId);
  const runtimeChatStoreRef = useRef(emptyRuntimeChatStore);
  const runtimeChatStoreLoadedRef = useRef(false);

  const activeChatMessages = appMode === "runtime" ? runtimeChatMessages : testChatMessages;
  const currentConversationId = activeRuntimeConversationId ?? `runtime_${promptProfileId}_current`;
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
    const messages = profile.id === promptProfileId ? runtimeChatMessages : runtimeChatStore.conversations[profile.id] ?? [];
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
    void saveRuntimeChatMessages(runtimeChatStoreRef.current, assistantId, [])
      .then((store) => {
        runtimeChatStoreRef.current = store;
        setRuntimeChatStore(store);
      })
      .catch((error) => {
        onLog(`Runtime chat save failed: ${String(error)}`);
      });
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
    setRuntimeChatMessages(runtimeChatStore.conversations[conversation.assistantId] ?? []);
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

  function getSummaryModel(profile: LocalAssistantProfile, fallbackProvider: ProviderId, fallbackModel: string) {
    const settings = profile.prompt?.settings.summaryMemory;
    if (!settings || settings.modelPolicy === "sameModel") {
      return { provider: fallbackProvider, model: fallbackModel };
    }

    if (settings.modelPolicy === "localModel") {
      return { provider: "ollama" as ProviderId, model: settings.model || selectedModel };
    }

    const cloudProvider = settings.provider === "ollama" ? "gemini" : settings.provider;
    return { provider: cloudProvider, model: settings.model || selectedCloudModel };
  }

  function getApiKeyForProvider(provider: ProviderId) {
    if (provider === "openai") {
      return providerKeys.openai.trim();
    }

    if (provider === "gemini") {
      return providerKeys.gemini.trim();
    }

    return "";
  }

  function stopRuntimeTts() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setTtsPlaybackState("idle");
  }

  async function speakWithBrowserVoice(text: string, settings: PromptSettings["voice"]["tts"]) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      throw new Error("Browser speech synthesis is not available in this runtime.");
    }

    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.speakingRate;
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error || "Browser speech failed."));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  async function speakWithLocalVoice(text: string, settings: PromptSettings["voice"]["tts"]) {
    const result = await synthesizeVoice({
      text,
      provider: "kokoro",
      voiceId: settings.voiceId || "af_heart",
      speakingRate: settings.speakingRate,
      language: activeLocale,
    });
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(`data:${result.mimeType};base64,${result.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        audioRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        audioRef.current = null;
        reject(new Error("Audio playback failed."));
      };
      void audio.play().catch((error) => {
        audioRef.current = null;
        reject(error);
      });
    });
  }

  async function speakAssistantAnswer(answer: string) {
    const settings = runtimeTtsSettings;
    if (appMode !== "runtime" || !runtimeTtsEnabled || !settings?.enabled || settings.provider === "disabled") {
      return;
    }

    const text = cleanSpeechText(answer);
    if (!text) {
      return;
    }

    stopRuntimeTts();
    setTtsError(null);
    setTtsPlaybackState("starting");

    try {
      if (settings.provider === "browser") {
        setTtsPlaybackState("speaking");
        await speakWithBrowserVoice(text, settings);
      } else if (settings.provider === "localVoice") {
        const startingMessage = settings.voiceId ? `Starting Kokoro TTS (${settings.voiceId}).` : "Starting Kokoro TTS.";
        onLog(startingMessage);
        setTtsPlaybackState("speaking");
        await speakWithLocalVoice(text, settings);
      } else {
        throw new Error("Cloud TTS is not connected yet.");
      }

      setTtsPlaybackState("idle");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTtsPlaybackState("error");
      setTtsError(message);
      onLog(`TTS failed: ${message}`);
    }
  }

  async function updateRollingSummaryIfNeeded(input: {
    assistantProfile: LocalAssistantProfile;
    messages: ChatMessage[];
    latestUserMessage: string;
    provider: ProviderId;
    model: string;
  }) {
    const settings = input.assistantProfile.prompt?.settings.summaryMemory;
    if (appMode !== "runtime" || !settings?.rollingSummary) {
      return;
    }

    const currentSummary = runtimeChatStoreRef.current.summaries[promptProfileId]?.content ?? "";
    const triggerTokenBudget = settings.triggerTokenBudget || MEMORY_COMPACTION_FALLBACK_BUDGET;
    const currentSummaryTokens = estimateTokensFromText(currentSummary);
    const memoryRequested = hasExplicitMemoryRequest(input.latestUserMessage);
    const needsCompaction = currentSummaryTokens >= triggerTokenBudget;
    if (!memoryRequested && !needsCompaction) {
      return;
    }

    const messagesForMemory = memoryRequested
      ? input.messages.slice(-RECENT_CONTEXT_MESSAGE_LIMIT)
      : [];
    const estimatedTokens = estimateChatTokens(messagesForMemory) + currentSummaryTokens;
    const summaryModel = getSummaryModel(input.assistantProfile, input.provider, input.model);
    const summaryPrompt = [
      "Update this assistant memory for MiVA.",
      "Default policy: only store information the user explicitly asked the assistant to remember.",
      "If the existing memory is getting long, compact it by merging duplicates and removing temporary details.",
      "Keep stable user preferences, active projects, important facts, and unresolved tasks.",
      "Use two short sections: Pinned memory and Working memory.",
      "Output only the updated memory summary. Do not explain the process.",
      currentSummary ? `Existing summary:\n${currentSummary}` : "Existing summary: none.",
      memoryRequested
        ? "Recent conversation with the explicit memory request:"
        : "No new memory request. Compact the existing summary only.",
      memoryRequested
        ? messagesForMemory.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n")
        : "",
    ].join("\n\n");

    const summary = await runChatOnce({
      provider: summaryModel.provider,
      model: summaryModel.model,
      prompt: summaryPrompt,
      locale: activeLocale,
      apiKey: getApiKeyForProvider(summaryModel.provider) || null,
      authToken: authSession?.token ?? null,
      profile: input.assistantProfile,
    });
    const nextSummary: RuntimeMemorySummary = {
      content: summary.trim(),
      updatedAt: new Date().toISOString(),
      provider: summaryModel.provider,
      model: summaryModel.model,
      sourceMessageCount: input.messages.length,
      estimatedTokens,
    };
    const savedStore = await saveRuntimeMemorySummary(runtimeChatStoreRef.current, promptProfileId, nextSummary);
    runtimeChatStoreRef.current = savedStore;
    setRuntimeChatStore(savedStore);
    await updateAssistantProfileRollingSummary(promptProfileId, nextSummary);
    onLog(`Updated rolling summary memory for ${input.assistantProfile.name}.`);
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
    const currentMessages = chatMode === "runtime" ? runtimeChatMessages : testChatMessages;
    const recentContextMessages = currentMessages
      .slice(-RECENT_CONTEXT_MESSAGE_LIMIT)
      .map((message) => ({ role: message.role, content: message.content }));
    const memorySummary = chatMode === "runtime"
      ? runtimeChatStoreRef.current.summaries[promptProfileId]?.content ?? null
      : null;

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
        authToken: authSession?.token ?? null,
        profile: assistantProfile,
        messages: recentContextMessages,
        memorySummary,
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
      void updateRollingSummaryIfNeeded({
        assistantProfile,
        messages: [
          ...currentMessages,
          { role: "user", content: prompt, createdAt: requestedAt, provider: selectedProvider, model: providerModel },
          {
            role: "assistant",
            content: answer,
            createdAt: new Date().toISOString(),
            provider: selectedProvider,
            model: providerModel,
            latencyMs,
          },
        ],
        latestUserMessage: prompt,
        provider: selectedProvider,
        model: providerModel,
      }).catch((summaryError) => {
        onLog(`Rolling summary update failed: ${String(summaryError)}`);
      });
      onLog("Chat response received.");
      if (chatMode === "runtime") {
        void speakAssistantAnswer(answer);
      }
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
    if (loadedRuntimeProfileIdRef.current !== promptProfileId) {
      return;
    }
    if (!runtimeChatStoreLoadedRef.current) {
      return;
    }

    void saveRuntimeChatMessages(runtimeChatStoreRef.current, promptProfileId, runtimeChatMessages)
      .then((store) => {
        runtimeChatStoreRef.current = store;
        setRuntimeChatStore(store);
      })
      .catch((error) => {
        onLog(`Runtime chat save failed: ${String(error)}`);
      });
  }, [onLog, promptProfileId, runtimeChatMessages]);

  useEffect(() => {
    if (appMode !== "runtime") {
      return;
    }

    let cancelled = false;
    void loadRuntimeChatStore(promptProfileId).then((store) => {
      if (cancelled) {
        return;
      }
      loadedRuntimeProfileIdRef.current = promptProfileId;
      runtimeChatStoreLoadedRef.current = true;
      runtimeChatStoreRef.current = store;
      setRuntimeChatStore(store);
      setRuntimeChatMessages(store.conversations[promptProfileId] ?? []);
    }).catch((error) => {
      onLog(`Runtime chat load failed: ${String(error)}`);
    });
    setActiveRuntimeConversationId((current) => (
      current?.startsWith(`runtime_${promptProfileId}_`) ? current : `runtime_${promptProfileId}_current`
    ));
    setChatInput("");
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
    return () => {
      cancelled = true;
    };
  }, [appMode, onLog, promptProfileId]);

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
    if (!runtimeTtsEnabled || appMode !== "runtime") {
      stopRuntimeTts();
    }
  }, [appMode, runtimeTtsEnabled, promptProfileId]);

  return {
    activeChatMessages,
    activeConversationId: currentConversationId,
    assistantConversationGroups,
    chatEndRef,
    chatInput,
    chatIntroKey,
    chatMetrics,
    chatScrollRef,
    handleChatScroll,
    scrollChatToLatest,
    sendMessage,
    setChatInput,
    setDismissedChatIntroKeys: onDismissedChatIntroKeysChange,
    showJumpToLatest,
    stopRuntimeTts,
    startRuntimeChatForAssistant,
    selectRuntimeConversation,
    clearCurrentChat,
    ttsError,
    ttsPlaybackState,
  };
}
