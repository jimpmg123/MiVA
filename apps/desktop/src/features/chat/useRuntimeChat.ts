import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../../i18n";
import { chooseImagePaths, createImageAttachment, readImageAttachment } from "../images/imageRuntime";
import {
  getDefaultImagePrompt,
  IMAGE_VISION_MODEL,
  IMAGE_VISION_PROVIDER,
} from "./imageVision";
import { analyzeDocument, chooseDocumentPaths, openDocument } from "../documents/documentRuntime";
import { runDaisoRequest } from "../daiso/daisoRuntime";
import { runChatOnce } from "../models/ollamaRuntime";
import { streamChatOnce } from "./chatStream";
import { synthesizeVoice } from "../voice/voiceRuntime";
import {
  applySlashCommandProfile,
  formatSlashUserMessage,
  parseSlashCommand,
} from "./slashCommands";
import {
  createRuntimeConversationId,
  emptyRuntimeChatStore,
  loadRuntimeChatStore,
  saveRuntimeChatMessages,
  saveRuntimeMemorySummary,
} from "./storage";
import {
  cleanSpeechText,
  estimateChatTokens,
  estimateTokensFromText,
  buildImageAnalysisMemoryPrompt,
  getRuntimeSummaryModel,
  hasExplicitMemoryRequest,
  MEMORY_COMPACTION_FALLBACK_BUDGET,
  RECENT_CONTEXT_MESSAGE_LIMIT,
} from "./runtimeMemory";
import type { RuntimeConversationNavItem } from "../../app/AppNavigation";
import type {
  AppMode,
  AuthSession,
  ChatMessage,
  ChatMetrics,
  DocumentAttachment,
  ImageAttachment,
  LocalAssistantProfile,
  PromptSettings,
  ProviderId,
  RuntimeMemorySummary,
  GoogleWorkspaceStatus,
} from "../../types";

type TtsPlaybackState = "idle" | "starting" | "speaking" | "error";

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
  providerKeys: { openai: string; gemini: string; groq: string };
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
  refreshGoogleWorkspaceStatus: () => Promise<GoogleWorkspaceStatus | null>;
  onWorkspaceAuthRequired: () => Promise<void>;
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
  refreshGoogleWorkspaceStatus,
  onWorkspaceAuthRequired,
  onLog,
}: UseRuntimeChatOptions) {
  const [chatInput, setChatInput] = useState("");
  const [testChatMessages, setTestChatMessages] = useState<ChatMessage[]>([]);
  const [runtimeChatStore, setRuntimeChatStore] = useState(emptyRuntimeChatStore);
  const [runtimeChatMessages, setRuntimeChatMessages] = useState<ChatMessage[]>([]);
  const [activeRuntimeConversationId, setActiveRuntimeConversationId] = useState<string | null>(null);
  const [chatMetrics, setChatMetrics] = useState<ChatMetrics | null>(null);
  const [documentAttachments, setDocumentAttachments] = useState<DocumentAttachment[]>([]);
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
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
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  const activeChatMessages = appMode === "runtime" ? runtimeChatMessages : testChatMessages;
  const currentConversationId = activeRuntimeConversationId ?? runtimeChatStore.activeConversationIds[promptProfileId] ?? createRuntimeConversationId(promptProfileId);
  const visibleAssistantIds = useMemo(
    () => new Set(visibleAssistantProfiles.map((profile) => profile.id)),
    [visibleAssistantProfiles],
  );
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
    const storedConversations = Object.values(runtimeChatStore.conversations)
      .filter((conversation) => conversation.assistantId === profile.id && visibleAssistantIds.has(conversation.assistantId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const activeMessages = profile.id === promptProfileId ? runtimeChatMessages : [];
    const activeStoredConversation = currentConversationId ? runtimeChatStore.conversations[currentConversationId] : null;
    const activeUnsavedConversation = profile.id === promptProfileId && activeMessages.length && !activeStoredConversation
      ? [{
          id: currentConversationId,
          assistantId: profile.id,
          assistantName: profile.name,
          title: activeMessages.find((message) => message.role === "user")?.content.trim().slice(0, 48) || chatTitle,
          messages: activeMessages,
          createdAt: activeMessages[0]?.createdAt ?? new Date().toISOString(),
          updatedAt: activeMessages[activeMessages.length - 1]?.createdAt ?? new Date().toISOString(),
          modelLabel: profile.modelLabel || profile.model,
        }]
      : [];
    const conversations = [...activeUnsavedConversation, ...storedConversations]
      .filter((conversation, index, list) => list.findIndex((item) => item.id === conversation.id) === index)
      .map((conversation) => {
        const messages = conversation.id === currentConversationId && profile.id === promptProfileId
          ? runtimeChatMessages
          : conversation.messages;
        const lastMessage = messages[messages.length - 1];

        return {
          id: conversation.id,
          assistantId: profile.id,
          assistantName: profile.name,
          title: conversation.title || chatTitle,
          preview: lastMessage?.content,
          modelLabel: conversation.modelLabel || profile.modelLabel || profile.model,
          messageCount: messages.length,
          updatedAtLabel: lastMessage?.createdAt ? justNowLabel : "Ready",
        };
      });

    return {
      assistantId: profile.id,
      assistantName: profile.name,
      conversations,
    };
  });

  useEffect(() => {
    if (!runtimeChatStoreLoadedRef.current) {
      return;
    }

    const nextConversations = Object.fromEntries(
      Object.entries(runtimeChatStoreRef.current.conversations).filter(([, conversation]) => visibleAssistantIds.has(conversation.assistantId)),
    );
    const nextActiveConversationIds = Object.fromEntries(
      Object.entries(runtimeChatStoreRef.current.activeConversationIds).filter(([assistantId]) => visibleAssistantIds.has(assistantId)),
    );
    const nextSummaries = Object.fromEntries(
      Object.entries(runtimeChatStoreRef.current.summaries).filter(([assistantId]) => visibleAssistantIds.has(assistantId)),
    );
    const changed =
      Object.keys(nextConversations).length !== Object.keys(runtimeChatStoreRef.current.conversations).length ||
      Object.keys(nextActiveConversationIds).length !== Object.keys(runtimeChatStoreRef.current.activeConversationIds).length ||
      Object.keys(nextSummaries).length !== Object.keys(runtimeChatStoreRef.current.summaries).length;

    if (!changed) {
      return;
    }

    const nextStore = {
      ...runtimeChatStoreRef.current,
      conversations: nextConversations,
      activeConversationIds: nextActiveConversationIds,
      summaries: nextSummaries,
      updatedAt: new Date().toISOString(),
    };
    runtimeChatStoreRef.current = nextStore;
    setRuntimeChatStore(nextStore);
  }, [visibleAssistantProfiles, visibleAssistantIds]);

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
    setDocumentAttachments([]);
    setImageAttachments([]);
    if (appMode === "runtime") {
      setActiveRuntimeConversationId(createRuntimeConversationId(promptProfileId));
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
    setChatInput("");
    setDocumentAttachments([]);
    setImageAttachments([]);
    setActiveRuntimeConversationId(createRuntimeConversationId(assistantId));
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
    setRuntimeChatMessages(runtimeChatStore.conversations[conversation.id]?.messages ?? []);
    setDocumentAttachments([]);
    setImageAttachments([]);
    setActiveRuntimeConversationId(conversation.id);
    setAppMode("runtime");
  }

  function scrollChatToLatest(behavior: ScrollBehavior = "smooth") {
    const element = chatScrollRef.current;
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior, block: "nearest" });
    }
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

  function stopChat() {
    chatAbortControllerRef.current?.abort();
    stopRuntimeTts();
    setBusyAction(null);
  }

  async function chooseAndAttachImages() {
    try {
      const selectedPaths = await chooseImagePaths();
      const existingPaths = new Set(imageAttachments.map((attachment) => attachment.path.toLowerCase()));
      const availableSlots = Math.max(0, 4 - imageAttachments.length - documentAttachments.length);
      const paths = selectedPaths
        .filter((path) => !existingPaths.has(path.toLowerCase()))
        .slice(0, availableSlots);

      if (paths.length === 0) {
        return;
      }

      const loaded = await Promise.all(paths.map(async (path) => {
        const payload = await readImageAttachment(path);
        return createImageAttachment(path, payload);
      }));

      setImageAttachments((current) => [...current, ...loaded]);
    } catch (error) {
      onLog(`Image attach failed: ${String(error)}`);
    }
  }

  function removeImageAttachment(id: string) {
    setImageAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function chooseAndAttachDocuments() {
    try {
      const selectedPaths = await chooseDocumentPaths();
      const existingPaths = new Set(documentAttachments.map((attachment) => attachment.path.toLowerCase()));
      const availableSlots = Math.max(0, 4 - documentAttachments.length - imageAttachments.length);
      const paths = selectedPaths
        .filter((path) => !existingPaths.has(path.toLowerCase()))
        .slice(0, availableSlots);

      if (paths.length === 0) {
        return;
      }

      const pendingAttachments = paths.map<DocumentAttachment>((path) => {
        const name = path.split(/[\\/]/).pop() || "Document";
        const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() || "" : "";
        return {
          id: globalThis.crypto?.randomUUID?.() ?? `document-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          path,
          name,
          extension,
          status: "analyzing",
          context: "",
          sizeBytes: null,
          metadata: null,
          truncated: false,
          error: null,
        };
      });

      setDocumentAttachments((current) => [...current, ...pendingAttachments]);

      await Promise.all(pendingAttachments.map(async (attachment) => {
        try {
          const result = await analyzeDocument(attachment.path);
          setDocumentAttachments((current) => current.map((item) => (
            item.id === attachment.id
              ? {
                  ...item,
                  name: result.name,
                  extension: result.extension,
                  status: "ready",
                  context: result.context,
                  sizeBytes: result.sizeBytes,
                  metadata: result.metadata,
                  truncated: result.truncated,
                  error: null,
                }
              : item
          )));
          onLog(`Document ready: ${result.name}.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setDocumentAttachments((current) => current.map((item) => (
            item.id === attachment.id
              ? { ...item, status: "error", error: message }
              : item
          )));
          onLog(`Document analysis failed for ${attachment.name}: ${message}`);
        }
      }));
    } catch (error) {
      onLog(`Document selection failed: ${String(error)}`);
    }
  }

  function removeDocumentAttachment(id: string) {
    setDocumentAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function openDocumentAttachment(id: string) {
    const attachment = documentAttachments.find((item) => item.id === id);
    if (!attachment) {
      return;
    }

    try {
      await openDocument(attachment.path);
    } catch (error) {
      onLog(`Could not open ${attachment.name}: ${String(error)}`);
    }
  }

  function getApiKeyForProvider(provider: ProviderId) {
    if (provider === "openai") {
      return providerKeys.openai.trim();
    }

    if (provider === "gemini") {
      return providerKeys.gemini.trim();
    }

    if (provider === "groq") {
      return providerKeys.groq.trim();
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
      utterance.volume = settings.volume;
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
      audio.volume = settings.volume;
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
    const summaryModel = getRuntimeSummaryModel({
      profile: input.assistantProfile,
      fallbackProvider: input.provider,
      fallbackModel: input.model,
      selectedModel,
      selectedCloudModel,
    });
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

  async function updateMemoryFromImageAnalysis(input: {
    assistantProfile: LocalAssistantProfile;
    userMessage: string;
    imageNames: string[];
    visionAnswer: string;
    messageCount: number;
  }) {
    const settings = input.assistantProfile.prompt?.settings.summaryMemory;
    if (appMode !== "runtime" || !settings?.rollingSummary) {
      return;
    }

    const currentSummary = runtimeChatStoreRef.current.summaries[promptProfileId]?.content ?? "";
    const mivaProvider = selectedProvider;
    const mivaModel = selectedProvider === "ollama" ? selectedModel : selectedCloudModel;
    const summaryModel = getRuntimeSummaryModel({
      profile: input.assistantProfile,
      fallbackProvider: mivaProvider,
      fallbackModel: mivaModel,
      selectedModel,
      selectedCloudModel,
    });
    const summaryPrompt = buildImageAnalysisMemoryPrompt({
      currentSummary,
      userMessage: input.userMessage,
      imageNames: input.imageNames,
      visionAnswer: input.visionAnswer,
    });

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
      sourceMessageCount: input.messageCount,
      estimatedTokens: estimateTokensFromText(summary) + estimateTokensFromText(input.visionAnswer),
    };
    const savedStore = await saveRuntimeMemorySummary(runtimeChatStoreRef.current, promptProfileId, nextSummary);
    runtimeChatStoreRef.current = savedStore;
    setRuntimeChatStore(savedStore);
    await updateAssistantProfileRollingSummary(promptProfileId, nextSummary);
    onLog(`Stored image analysis in assistant memory for ${input.assistantProfile.name}.`);
  }

  async function sendMessage() {
    const rawInput = chatInput.trim();
    const readyAttachments = documentAttachments.filter((attachment) => attachment.status === "ready");
    const readyImageAttachments = imageAttachments;
    const attachmentsAnalyzing = documentAttachments.some((attachment) => attachment.status === "analyzing");
    const usesImageVision = readyImageAttachments.length > 0;
    const parsed = rawInput ? parseSlashCommand(rawInput) : null;
    const prompt = parsed?.prompt ?? (rawInput || (usesImageVision
      ? getDefaultImagePrompt()
      : readyAttachments.length > 0
        ? "Analyze the attached document data and summarize the information relevant to me."
        : ""));
    const isDaisoSlashCommand = parsed?.command.id === "daiso";
    const imageLabel = readyImageAttachments.length > 0
      ? `\n\nAttached images: ${readyImageAttachments.map((attachment) => attachment.name).join(", ")}`
      : "";
    const baseDisplayContent = parsed ? formatSlashUserMessage(parsed.command, parsed.prompt) : rawInput || (usesImageVision ? "Analyze the attached image(s)." : "Analyze the attached document data.");
    const attachmentLabel = readyAttachments.length > 0
      ? `\n\nAttached: ${readyAttachments.map((attachment) => attachment.name).join(", ")}`
      : "";
    const displayContent = `${baseDisplayContent}${attachmentLabel}${imageLabel}`;
    let assistantProfile = buildCurrentLocalAssistantProfile();
    if (parsed) {
      assistantProfile = applySlashCommandProfile(assistantProfile, parsed.command.id);
    }
    const chatMode = appMode;
    const activeProvider = usesImageVision ? IMAGE_VISION_PROVIDER : selectedProvider;
    const activeModel = usesImageVision ? IMAGE_VISION_MODEL : (selectedProvider === "ollama" ? selectedModel : selectedCloudModel);
    const providerModel = activeModel;
    const apiKey = getApiKeyForProvider(activeProvider);
    const localUnavailable = !usesImageVision && selectedProvider === "ollama" && !statusInstalled;
    const currentMessages = chatMode === "runtime" ? runtimeChatMessages : testChatMessages;
    const recentContextMessages = currentMessages
      .slice(-RECENT_CONTEXT_MESSAGE_LIMIT)
      .map((message) => ({ role: message.role, content: message.content }));
    const memorySummary = chatMode === "runtime"
      ? runtimeChatStoreRef.current.summaries[promptProfileId]?.content ?? null
      : null;

    if (
      attachmentsAnalyzing ||
      (!prompt && !isDaisoSlashCommand) ||
      localUnavailable ||
      busyAction === "chat"
    ) {
      return;
    }

    if (usesImageVision && !providerKeys.gemini.trim()) {
      const requestedAt = new Date().toISOString();
      setChatInput("");
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
      updateChatMessages(chatMode, (current) => [
        ...current,
        { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
        {
          role: "assistant",
          content: "Image analysis requires a Gemini API key. Add it in Settings > AI models, then try again.",
          createdAt: new Date().toISOString(),
          provider: activeProvider,
          model: providerModel,
        },
      ]);
      onLog("Image analysis blocked because no Gemini API key is configured.");
      return;
    }

    const latestUserMessage = displayContent;

    const workspaceEnabled = assistantProfile.prompt.settings.toolConnections.googleWorkspace;
    const workspaceServices = assistantProfile.prompt.settings.toolConnections.googleWorkspaceServices;
    if (!isDaisoSlashCommand && chatMode === "runtime" && workspaceEnabled && workspaceServices.length > 0) {
      const workspaceStatus = await refreshGoogleWorkspaceStatus();
      if (!workspaceStatus?.connected) {
        await onWorkspaceAuthRequired();
        const requestedAt = new Date().toISOString();
        setChatInput("");
        shouldAutoScrollChatRef.current = true;
        setShowJumpToLatest(false);
        updateChatMessages(chatMode, (current) => [
          ...current,
          { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
          {
            role: "assistant",
            content: "Google Workspace permission is required. Complete Google consent in the browser, then try again.",
            createdAt: new Date().toISOString(),
            provider: activeProvider,
            model: providerModel,
          },
        ]);
        return;
      }
    }

    if (!usesImageVision && selectedProvider !== "ollama" && !authSession) {
      const requestedAt = new Date().toISOString();
      setChatInput("");
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
      updateChatMessages(chatMode, (current) => [
        ...current,
        { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
        {
          role: "assistant",
          content: "Sign in to use cloud models. Continue without signing in only supports local Ollama assistants.",
          createdAt: new Date().toISOString(),
          provider: activeProvider,
          model: providerModel,
        },
      ]);
      onLog("Cloud chat blocked because no account is signed in.");
      return;
    }

    setBusyAction("chat");
    if (!usesImageVision) {
      const runtimeReady = await ensureOllamaReadyForChat(providerModel);
      if (!runtimeReady) {
        setBusyAction(null);
        return;
      }
    }

    setChatInput("");
    setDocumentAttachments([]);
    setImageAttachments([]);
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
    const startedAt = performance.now();
    const requestedAt = new Date().toISOString();
    updateChatMessages(chatMode, (current) => [
      ...current,
      { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
    ]);

    try {
      const toolContexts: string[] = [];
      if (readyAttachments.length > 0) {
        toolContexts.push([
          "The user attached local documents. MiVA parsed these files locally before this model request.",
          "Use only the extracted content below. Do not claim access to other parts of the user's computer.",
          ...readyAttachments.map((attachment) => [
            `===== ${attachment.name} =====`,
            attachment.context,
            attachment.truncated ? "[MiVA truncated this document context because it was large.]" : "",
          ].filter(Boolean).join("\n")),
        ].join("\n\n"));
      }

      if (isDaisoSlashCommand) {
        const daisoResult = await runDaisoRequest(prompt);
        if (!daisoResult.ok || daisoResult.needsUserInput) {
          const message = daisoResult.needsUserInput
            ? daisoResult.message
            : `Daiso CLI failed: ${daisoResult.message}`;
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
          return;
        }
        toolContexts.push(daisoResult.context || [
          "Daiso CLI result was retrieved by MiVA.",
          `CLI command: ${daisoResult.commandLine || "unknown"}`,
          daisoResult.stdout || JSON.stringify(daisoResult.data ?? null, null, 2),
        ].join("\n"));
        onLog(`Daiso CLI completed: ${daisoResult.commandLine || "unknown command"}`);
      }
      const toolContext = toolContexts.length > 0 ? toolContexts.join("\n\n") : null;

      chatAbortControllerRef.current?.abort();
      chatAbortControllerRef.current = new AbortController();
      const streamSignal = chatAbortControllerRef.current.signal;
      const assistantCreatedAt = new Date().toISOString();

      updateChatMessages(chatMode, (current) => [
        ...current,
        {
          role: "assistant",
          content: "",
          createdAt: assistantCreatedAt,
          provider: activeProvider,
          model: providerModel,
        },
      ]);

      const appendAssistantDelta = (delta: string) => {
        updateChatMessages(chatMode, (current) => current.map((message) => (
          message.role === "assistant" && message.createdAt === assistantCreatedAt
            ? { ...message, content: `${message.content}${delta}` }
            : message
        )));
        if (shouldAutoScrollChatRef.current) {
          window.requestAnimationFrame(() => scrollChatToLatest("auto"));
        }
      };

      let answer = "";
      const chatPayload = {
        provider: activeProvider,
        model: providerModel,
        prompt,
        locale: activeLocale,
        apiKey: apiKey || null,
        authToken: authSession?.token ?? null,
        profile: assistantProfile,
        messages: recentContextMessages,
        memorySummary,
        toolContext,
        imageAttachments: readyImageAttachments.map((attachment) => ({
          name: attachment.name,
          mimeType: attachment.mimeType,
          data: attachment.dataBase64,
        })),
      };

      try {
        answer = await streamChatOnce(chatPayload, {
          onDelta: appendAssistantDelta,
        }, streamSignal);
      } catch (streamError) {
        const streamMessage = streamError instanceof Error ? streamError.message : String(streamError);
        const fetchBlocked = streamError instanceof TypeError || /failed to fetch/i.test(streamMessage);
        if (!fetchBlocked) {
          throw streamError;
        }

        onLog("Streaming chat unavailable. Falling back to standard chat response.");
        answer = await runChatOnce(chatPayload);
        updateChatMessages(chatMode, (current) => current.map((message) => (
          message.role === "assistant" && message.createdAt === assistantCreatedAt
            ? { ...message, content: answer }
            : message
        )));
      }
      const latencyMs = Math.round(performance.now() - startedAt);
      setChatMetrics({
        provider: activeProvider,
        model: providerModel,
        latencyMs,
        measuredAt: new Date().toISOString(),
      });
      updateChatMessages(chatMode, (current) => current.map((message) => (
        message.role === "assistant" && message.createdAt === assistantCreatedAt
          ? {
              ...message,
              content: answer || message.content,
              latencyMs,
            }
          : message
      )));
      if (usesImageVision) {
        void updateMemoryFromImageAnalysis({
          assistantProfile,
          userMessage: displayContent,
          imageNames: readyImageAttachments.map((attachment) => attachment.name),
          visionAnswer: answer,
          messageCount: currentMessages.length + 2,
        }).catch((summaryError) => {
          onLog(`Image memory update failed: ${String(summaryError)}`);
        });
      } else {
        void updateRollingSummaryIfNeeded({
          assistantProfile,
          messages: [
            ...currentMessages,
            { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
            {
              role: "assistant",
              content: answer,
              createdAt: new Date().toISOString(),
              provider: activeProvider,
              model: providerModel,
              latencyMs,
            },
          ],
          latestUserMessage,
          provider: activeProvider,
          model: providerModel,
        }).catch((summaryError) => {
          onLog(`Rolling summary update failed: ${String(summaryError)}`);
        });
      }
      onLog(usesImageVision ? "Image analysis response received." : "Chat response received.");
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
      if (error instanceof DOMException && error.name === "AbortError") {
        onLog("Chat generation stopped.");
        return;
      }

      const message = `Chat failed: ${String(error)}`;
      const latencyMs = Math.round(performance.now() - startedAt);
      updateChatMessages(chatMode, (current) => {
        const lastMessage = current[current.length - 1];
        if (lastMessage?.role === "assistant" && !lastMessage.content.trim()) {
          return current.map((entry, index) => (
            index === current.length - 1
              ? { ...entry, content: message, latencyMs }
              : entry
          ));
        }

        if (lastMessage?.role === "assistant" && lastMessage.content.trim()) {
          return current;
        }

        return [
          ...current,
          {
            role: "assistant",
            content: message,
            createdAt: new Date().toISOString(),
            provider: activeProvider,
            model: providerModel,
            latencyMs,
          },
        ];
      });
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

    const activeProfile = runtimeAssistantProfiles.find((profile) => profile.id === promptProfileId);
    void saveRuntimeChatMessages(runtimeChatStoreRef.current, promptProfileId, runtimeChatMessages, {
      conversationId: currentConversationId,
      assistantName: activeProfile?.name,
      modelLabel: activeProfile?.modelLabel || activeProfile?.model,
    })
      .then((store) => {
        runtimeChatStoreRef.current = store;
        setRuntimeChatStore(store);
      })
      .catch((error) => {
        onLog(`Runtime chat save failed: ${String(error)}`);
      });
  }, [currentConversationId, onLog, promptProfileId, runtimeChatMessages]);

  useEffect(() => {
    if (appMode !== "runtime" && appMode !== "history") {
      return;
    }

    let cancelled = false;
    void loadRuntimeChatStore(appMode === "runtime" ? promptProfileId : undefined).then((store) => {
      if (cancelled) {
        return;
      }

      runtimeChatStoreLoadedRef.current = true;
      runtimeChatStoreRef.current = store;
      setRuntimeChatStore(store);

      if (appMode !== "runtime") {
        return;
      }

      loadedRuntimeProfileIdRef.current = promptProfileId;
      const conversationId = store.activeConversationIds[promptProfileId] ?? createRuntimeConversationId(promptProfileId);
      setActiveRuntimeConversationId(conversationId);
      setRuntimeChatMessages(store.conversations[conversationId]?.messages ?? []);
    }).catch((error) => {
      onLog(`Runtime chat load failed: ${String(error)}`);
    });

    if (appMode === "runtime") {
      setActiveRuntimeConversationId((current) => (
        current?.startsWith(`runtime_${promptProfileId}_`) ? current : createRuntimeConversationId(promptProfileId)
      ));
      setChatInput("");
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
    }

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
    chooseAndAttachDocuments,
    chooseAndAttachImages,
    documentAttachments,
    imageAttachments,
    handleChatScroll,
    runtimeChatStore,
    scrollChatToLatest,
    sendMessage,
    setChatInput,
    setDismissedChatIntroKeys: onDismissedChatIntroKeysChange,
    showJumpToLatest,
    openDocumentAttachment,
    removeDocumentAttachment,
    removeImageAttachment,
    stopRuntimeTts,
    stopChat,
    startRuntimeChatForAssistant,
    selectRuntimeConversation,
    clearCurrentChat,
    ttsError,
    ttsPlaybackState,
  };
}
