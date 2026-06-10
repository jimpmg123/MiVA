import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../../i18n";
import { chooseImagePaths, createImageAttachment, readImageAttachment } from "../images/imageRuntime";
import {
  getDefaultImagePrompt,
  IMAGE_VISION_MODEL,
  IMAGE_VISION_PROVIDER,
} from "./imageVision";
import { analyzeDocument, chooseDocumentPaths, isAttachmentImagePath, openDocument } from "../documents/documentRuntime";
import { generateImageRequest, toImageDataUrl } from "../imageGen/imageGenRuntime";
import { createLibraryItemFromDocument, createLibraryItemFromImageAttachment } from "../library/storage";
import { runChatOnce } from "../models/ollamaRuntime";
import { streamChatOnce } from "./chatStream";
import {
  applyPromptAssistantName,
  applyPromptIdentityToProfile,
  buildPromptAssistantIdentityLine,
} from "../assistants/promptIdentity";
import {
  clawCodeInstallRequiredCopy,
  clawWorkspaceSuccessCopy,
} from "../claw/clawCodeChatActions";
import { resolveClawCodeBusyLabel } from "../claw/clawCodeBusyLabel";
import { resolveWorkspaceBusyLabel } from "./workspaceBusyLabel";
import { synthesizeVoice } from "../voice/voiceRuntime";
import { loadUserProfile } from "../profile/storage";
import {
  detectLocalCharacterCommand,
  parseMoodTag,
  stripMoodTag,
  MOOD_TAG_INSTRUCTION,
} from "../characters/emotion";
import {
  applySlashCommandProfile,
  buildSlashCommandsForProfile,
  formatSlashUserMessage,
  getImportedSkillContent,
  resolveSlashInvocation,
  slashCommandHelpCopy,
  type ChatSlashCommand,
} from "./slashCommands";
import {
  createRuntimeConversationId,
  emptyRuntimeChatStore,
  loadRuntimeChatStore,
  saveRuntimeChatMessages,
  saveRuntimeMemorySummary,
} from "./storage";
import {
  buildProfileMemory,
  buildRuntimeMemoryContent,
  cleanSpeechText,
  estimateChatTokens,
  estimateTokensFromText,
  buildImageAnalysisMemoryPrompt,
  getCompactedSessionMemory,
  getPinnedRuntimeMemory,
  getRuntimeSummaryModel,
  hasExplicitMemoryRequest,
  MEMORY_COMPACTION_FALLBACK_BUDGET,
  OPENAI_COMPACTION_MODEL,
  RECENT_CONTEXT_MESSAGE_LIMIT,
} from "./runtimeMemory";
import type { RuntimeConversationNavItem } from "../../app/AppNavigation";
import type {
  AppMode,
  AuthSession,
  CharacterEmotion,
  ChatMessage,
  ChatMetrics,
  ChatGeneratedFile,
  ChatUiAction,
  DocumentAttachment,
  ImageAttachment,
  LibraryItem,
  LocalAssistantProfile,
  PersonalizationSettings,
  PromptSettings,
  ProviderId,
  ProviderKeyState,
  RuntimeMemorySummary,
  ClawCodeRuntimeInfo,
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
  personalizationSettings: PersonalizationSettings;
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
  providerKeys: ProviderKeyState;
  statusInstalled: boolean;
  busyAction: string | null;
  visibleAssistantProfiles: LocalAssistantProfile[];
  assistantProfileLoaded: boolean;
  chatIntroKey: string;
  chatTitle: string;
  justNowLabel: string;
  showChatIntroCard: boolean;
  onDismissedChatIntroKeysChange: Dispatch<SetStateAction<string[]>>;
  buildCurrentLocalAssistantProfile: () => LocalAssistantProfile;
  applyLocalAssistantProfile: (profile: LocalAssistantProfile) => void;
  updateAssistantProfileRollingSummary: (profileId: string, summary: RuntimeMemorySummary) => Promise<void>;
  updateAssistantPromptSettings: (
    profileId: string,
    updateSettings: (settings: PromptSettings) => PromptSettings,
  ) => Promise<LocalAssistantProfile | null>;
  setActiveLocalProfileId: (id: string) => void;
  setAppMode: Dispatch<SetStateAction<AppMode>>;
  setBusyAction: Dispatch<SetStateAction<string | null>>;
  ensureOllamaReadyForChat: (model: string) => Promise<boolean>;
  recordRuntimeUsageEvent: (event: RuntimeUsageEventInput) => Promise<void>;
  runtimeTtsEnabled: boolean;
  runtimeTtsSettings: PromptSettings["voice"]["tts"] | null;
  refreshGoogleWorkspaceStatus: () => Promise<GoogleWorkspaceStatus | null>;
  onWorkspaceAuthRequired: () => Promise<void>;
  applyClawCodeWorkspace: (workspaceRoot: string) => Promise<void> | void;
  chooseClawCodeWorkspace: () => Promise<string | null> | string | null;
  clawCodeStatus: ClawCodeRuntimeInfo | null;
  onLibraryItemsAdd: (items: LibraryItem[]) => Promise<void> | void;
  onLog: (message: string) => void;
};

export function useRuntimeChat({
  activeLocale,
  appMode,
  activeStep,
  authSession,
  activeLocalProfile,
  promptProfileId,
  personalizationSettings,
  selectedProvider,
  selectedModel,
  selectedCloudModel,
  providerKeys,
  statusInstalled,
  busyAction,
  visibleAssistantProfiles,
  assistantProfileLoaded,
  chatIntroKey,
  chatTitle,
  justNowLabel,
  showChatIntroCard,
  onDismissedChatIntroKeysChange,
  buildCurrentLocalAssistantProfile,
  applyLocalAssistantProfile,
  updateAssistantProfileRollingSummary,
  updateAssistantPromptSettings,
  setActiveLocalProfileId,
  setAppMode,
  setBusyAction,
  ensureOllamaReadyForChat,
  recordRuntimeUsageEvent,
  runtimeTtsEnabled,
  runtimeTtsSettings,
  refreshGoogleWorkspaceStatus,
  onWorkspaceAuthRequired,
  applyClawCodeWorkspace,
  chooseClawCodeWorkspace,
  clawCodeStatus,
  onLibraryItemsAdd,
  onLog,
}: UseRuntimeChatOptions) {
  const [chatInput, setChatInput] = useState("");
  const [selectedSlashCommand, setSelectedSlashCommand] = useState<ChatSlashCommand | null>(null);
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
  const [chatBusyLabel, setChatBusyLabel] = useState<string | null>(null);
  const [characterEmotion, setCharacterEmotion] = useState<CharacterEmotion>("neutral");
  const [characterExpressionTrigger, setCharacterExpressionTrigger] = useState(0);
  const [characterPoseTrigger, setCharacterPoseTrigger] = useState(0);
  const emotionResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoScrollChatRef = useRef(true);
  const loadedRuntimeProfileIdRef = useRef(promptProfileId);
  const runtimeChatStoreRef = useRef(emptyRuntimeChatStore);
  const runtimeChatStoreLoadedRef = useRef(false);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  function resetChatComposer() {
    setChatInput("");
    setSelectedSlashCommand(null);
  }

  // Emit a momentary emotion the Live2D overlay holds for a few seconds, then
  // settle back to neutral so the next identical emotion still re-triggers.
  function pulseEmotion(emotion: CharacterEmotion) {
    if (emotion === "neutral") {
      return;
    }
    if (emotionResetTimerRef.current) {
      clearTimeout(emotionResetTimerRef.current);
    }
    setCharacterEmotion(emotion);
    emotionResetTimerRef.current = setTimeout(() => {
      setCharacterEmotion("neutral");
      emotionResetTimerRef.current = null;
    }, 1500);
  }

  useEffect(() => {
    return () => {
      if (emotionResetTimerRef.current) {
        clearTimeout(emotionResetTimerRef.current);
      }
    };
  }, []);

  const slashCommands = useMemo(() => {
    const profile = activeLocalProfile ?? buildCurrentLocalAssistantProfile();
    return buildSlashCommandsForProfile(profile);
  }, [activeLocalProfile, buildCurrentLocalAssistantProfile, promptProfileId]);

  useEffect(() => {
    if (!selectedSlashCommand) {
      return;
    }

    const commandStillAvailable = slashCommands.some((command) => (
      command.id === selectedSlashCommand.id || command.aliases.some((alias) => selectedSlashCommand.aliases.includes(alias))
    ));
    if (!commandStillAvailable) {
      setSelectedSlashCommand(null);
    }
  }, [selectedSlashCommand, slashCommands]);

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

  // NOTE: We intentionally do NOT prune the in-memory chat store down to the
  // currently-visible assistants. `visibleAssistantProfiles` hides cloud (non-Ollama)
  // assistants while signed out, so pruning here — combined with the autosave effect
  // below — used to permanently delete those conversations from disk on every launch.
  // Visibility is already handled at display time (historyConversations in App and
  // assistantConversationGroups above), and real profile deletion is handled by
  // deleteRuntimeChatMessagesForAssistant, so no destructive cleanup is needed here.

  function updateChatMessages(mode: AppMode, updater: (current: ChatMessage[]) => ChatMessage[]) {
    if (mode === "runtime") {
      setRuntimeChatMessages(updater);
      return;
    }

    setTestChatMessages(updater);
  }

  function clearCurrentChat() {
    updateChatMessages(appMode, () => []);
    resetChatComposer();
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
    resetChatComposer();
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
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
  }

  function scrollChatToLatest(behavior: ScrollBehavior = "auto") {
    const element = chatScrollRef.current;
    if (element) {
      if (behavior === "auto") {
        element.scrollTop = element.scrollHeight;
      } else {
        element.scrollTo({ top: element.scrollHeight, behavior });
      }
    } else {
      chatEndRef.current?.scrollIntoView({ behavior, block: "end" });
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
      void onLibraryItemsAdd(loaded.map(createLibraryItemFromImageAttachment));
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
      const imagePaths = selectedPaths.filter((path) => isAttachmentImagePath(path));
      const documentPaths = selectedPaths.filter((path) => !isAttachmentImagePath(path));
      const existingImagePaths = new Set(imageAttachments.map((attachment) => attachment.path.toLowerCase()));
      const existingDocumentPaths = new Set(documentAttachments.map((attachment) => attachment.path.toLowerCase()));
      let availableSlots = Math.max(0, 4 - imageAttachments.length - documentAttachments.length);

      const nextImagePaths = imagePaths
        .filter((path) => !existingImagePaths.has(path.toLowerCase()))
        .slice(0, availableSlots);

      if (nextImagePaths.length > 0) {
        const loaded = await Promise.all(nextImagePaths.map(async (path) => {
          const payload = await readImageAttachment(path);
          return createImageAttachment(path, payload);
        }));
        setImageAttachments((current) => [...current, ...loaded]);
        void onLibraryItemsAdd(loaded.map(createLibraryItemFromImageAttachment));
        availableSlots -= loaded.length;
      }

      const paths = documentPaths
        .filter((path) => !existingDocumentPaths.has(path.toLowerCase()))
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
          void onLibraryItemsAdd([
            createLibraryItemFromDocument({
              name: result.name,
              path: attachment.path,
              extension: result.extension,
              sizeBytes: result.sizeBytes,
            }),
          ]);
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

  function normalizePromptFixRule(value: string) {
    const trimmed = value.trim().replace(/^[-*]\s*/, "");
    if (!trimmed) {
      return "";
    }

    return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
  }

  function triggerCharacterExpression() {
    setCharacterExpressionTrigger((current) => current + 1);
  }

  function triggerCharacterPose() {
    setCharacterPoseTrigger((current) => current + 1);
  }

  function cleanGeneratedPromptFixRule(value: string) {
    const firstContentLine = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !/^```/.test(line));
    const cleaned = (firstContentLine || value)
      .replace(/^rule\s*:\s*/i, "")
      .replace(/^[-*]\s*/, "")
      .replace(/^["'“”]+|["'“”]+$/g, "")
      .trim();

    return normalizePromptFixRule(cleaned);
  }

  function truncateForPrompt(value: string | undefined, maxChars: number) {
    const text = value?.trim() ?? "";
    if (text.length <= maxChars) {
      return text;
    }

    return `${text.slice(0, maxChars)}\n...[truncated]`;
  }

  function buildPromptFixRuleGenerationPrompt(input: {
    assistantProfile: LocalAssistantProfile;
    promptSettings: PromptSettings;
    userFeedback: string;
    selectedExcerpt: string;
    originalAssistantAnswer: string;
    memorySummary: RuntimeMemorySummary | null | undefined;
  }) {
    const userProfile = loadUserProfile();
    const profileMemory = buildProfileMemory(input.assistantProfile, userProfile);
    const settings = input.promptSettings;
    const assistantContext = {
      name: input.assistantProfile.name,
      description: input.assistantProfile.description,
      useCase: input.assistantProfile.useCase,
      answerStyle: input.assistantProfile.answerStyle,
      priority: input.assistantProfile.priority,
      languageUse: input.assistantProfile.languageUse,
      localMode: input.assistantProfile.localMode,
      assistantPurpose: settings.simple.assistantPurpose,
      desiredTasks: settings.simple.desiredTasks,
      preferredTone: settings.simple.preferredTone,
      avoidances: settings.simple.avoidances,
      persona: settings.persona,
      roleGoal: settings.roleGoal,
      existingResponseRules: settings.responseRules,
      safetyRules: settings.safetyRules,
      personalization: personalizationSettings,
    };

    return [
      "You generate durable MiVA /fix prompt rules.",
      "Return exactly one plain English instruction sentence.",
      "Do not include markdown, bullets, quotes, labels, explanations, JSON, or examples.",
      "The rule will be inserted into the assistant's system prompt and reused in future conversations.",
      "Make the rule generalizable from the user's feedback. Do not overfit to one exact sentence unless the user explicitly asks for a literal phrase.",
      "If the user says not to explain something, write a rule that suppresses that kind of explanation.",
      "If the user asks for more explanation, write a rule that adds that kind of detail when relevant.",
      "",
      "Assistant configuration:",
      JSON.stringify(assistantContext, null, 2),
      "",
      "User profile and memory:",
      truncateForPrompt(profileMemory, 3000) || "(none)",
      "",
      "Current runtime memory:",
      truncateForPrompt(input.memorySummary?.content, 3000) || "(none)",
      "",
      "Original assistant answer:",
      truncateForPrompt(input.originalAssistantAnswer, 12000) || "(not provided)",
      "",
      "User-selected excerpt from that answer:",
      truncateForPrompt(input.selectedExcerpt, 3000) || "(not provided)",
      "",
      "User's /fix feedback:",
      input.userFeedback,
      "",
      "Output one durable rule sentence only.",
    ].join("\n");
  }

  async function generatePromptFixRule(input: {
    assistantProfile: LocalAssistantProfile;
    userFeedback: string;
    selectedExcerpt: string;
    originalAssistantAnswer: string;
  }) {
    const promptSettings = input.assistantProfile.prompt.settings;
    const memorySummary = runtimeChatStoreRef.current.summaries[promptProfileId] ?? null;
    const prompt = buildPromptFixRuleGenerationPrompt({
      assistantProfile: input.assistantProfile,
      promptSettings,
      userFeedback: input.userFeedback,
      selectedExcerpt: input.selectedExcerpt,
      originalAssistantAnswer: input.originalAssistantAnswer,
      memorySummary,
    });

    const generated = await runChatOnce({
      provider: "gemini",
      model: "gemini-2.5-flash-lite",
      prompt,
      locale: activeLocale,
      apiKey: null,
      authToken: authSession?.token ?? null,
      profile: input.assistantProfile,
    });

    return cleanGeneratedPromptFixRule(generated);
  }

  function applyFixRuleToSystemPrompt(systemPrompt: string | undefined, rule: string, promptSettings: PromptSettings) {
    const base = applyPromptAssistantName(systemPrompt, promptSettings);
    const nextRule = `- ${rule}`;
    if (!base) {
      return [
        "# Role",
        buildPromptAssistantIdentityLine(promptSettings),
        "",
        "# Runtime fixes",
        nextRule,
      ].join("\n");
    }

    if (base.includes(nextRule)) {
      return base;
    }

    if (/(^|\n)# Runtime fixes\b/i.test(base)) {
      return `${base}\n${nextRule}`;
    }

    return `${base}\n\n# Runtime fixes\n${nextRule}`;
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

  function buildMemoryContentForStorage(input: {
    pinnedMemory: string;
    sessionSummary: string;
  }) {
    return buildRuntimeMemoryContent({
      pinnedMemory: input.pinnedMemory,
      sessionSummary: input.sessionSummary,
    });
  }

  function buildMemoryContextForRequest(profile: LocalAssistantProfile, summary: RuntimeMemorySummary | null | undefined) {
    return buildRuntimeMemoryContent({
      profileMemory: buildProfileMemory(profile, loadUserProfile()),
      pinnedMemory: getPinnedRuntimeMemory(summary),
      sessionSummary: getCompactedSessionMemory(summary),
    });
  }

  function getMemoryGenerationModel(input: {
    assistantProfile: LocalAssistantProfile;
    fallbackProvider: ProviderId;
    fallbackModel: string;
    preferOpenAi?: boolean;
  }) {
    const openAiKey = providerKeys.openai.trim();
    if (input.preferOpenAi && openAiKey) {
      return {
        provider: "openai" as ProviderId,
        model: selectedProvider === "openai" && selectedCloudModel ? selectedCloudModel : OPENAI_COMPACTION_MODEL,
        apiKey: openAiKey,
      };
    }

    const summaryModel = getRuntimeSummaryModel({
      profile: input.assistantProfile,
      fallbackProvider: input.fallbackProvider,
      fallbackModel: input.fallbackModel,
      selectedModel,
      selectedCloudModel,
    });

    return {
      ...summaryModel,
      apiKey: getApiKeyForProvider(summaryModel.provider) || null,
    };
  }

  async function persistRuntimeMemorySummary(summary: RuntimeMemorySummary, logMessage: string) {
    const savedStore = await saveRuntimeMemorySummary(runtimeChatStoreRef.current, promptProfileId, summary);
    runtimeChatStoreRef.current = savedStore;
    setRuntimeChatStore(savedStore);
    await updateAssistantProfileRollingSummary(promptProfileId, summary);
    onLog(logMessage);
    return summary;
  }

  async function compactRuntimeContextIfNeeded(input: {
    assistantProfile: LocalAssistantProfile;
    currentMessages: ChatMessage[];
    latestUserMessage: string;
    provider: ProviderId;
    model: string;
  }) {
    const settings = input.assistantProfile.prompt?.settings.summaryMemory;
    const currentSummary = runtimeChatStoreRef.current.summaries[promptProfileId] ?? null;
    if (appMode !== "runtime" || !settings?.rollingSummary) {
      return currentSummary;
    }

    const compactTargetCount = Math.max(0, input.currentMessages.length - RECENT_CONTEXT_MESSAGE_LIMIT);
    if (compactTargetCount <= 0) {
      return currentSummary;
    }

    const alreadyCompactedCount = Math.min(currentSummary?.compactedMessageCount ?? 0, compactTargetCount);
    const messagesToCompact = input.currentMessages.slice(alreadyCompactedCount, compactTargetCount);
    if (messagesToCompact.length === 0) {
      return currentSummary;
    }

    const triggerTokenBudget = settings.triggerTokenBudget || MEMORY_COMPACTION_FALLBACK_BUDGET;
    const estimatedConversationTokens = estimateChatTokens([
      ...input.currentMessages,
      { content: input.latestUserMessage },
    ]);
    const estimatedMemoryTokens =
      estimateTokensFromText(getPinnedRuntimeMemory(currentSummary)) +
      estimateTokensFromText(getCompactedSessionMemory(currentSummary));
    const shouldCompact =
      estimatedConversationTokens + estimatedMemoryTokens >= triggerTokenBudget ||
      messagesToCompact.length >= RECENT_CONTEXT_MESSAGE_LIMIT;

    if (!shouldCompact) {
      return currentSummary;
    }

    const existingPinnedMemory = getPinnedRuntimeMemory(currentSummary);
    const existingSessionSummary = getCompactedSessionMemory(currentSummary);
    const generationModel = getMemoryGenerationModel({
      assistantProfile: input.assistantProfile,
      fallbackProvider: input.provider,
      fallbackModel: input.model,
      preferOpenAi: true,
    });
    if (generationModel.provider !== "openai") {
      onLog("OpenAI key is not configured for compaction. Using the configured summary model instead.");
    }

    const summaryPrompt = [
      "Compact the current MiVA conversation context.",
      "This is session memory, not long-term user memory.",
      "Keep active tasks, decisions, constraints, named files, unresolved questions, and details needed to continue this conversation.",
      "Do not store stable user identity, preferences, or how to address the user here unless directly needed for this active thread.",
      "Merge the new messages into the existing compacted session context. Remove repetition and temporary filler.",
      "Output only the updated compacted session context. Do not answer the user.",
      existingSessionSummary ? `Existing compacted session context:\n${existingSessionSummary}` : "Existing compacted session context: none.",
      "New messages to compact:",
      messagesToCompact.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n"),
    ].join("\n\n");

    try {
      const sessionSummary = (await runChatOnce({
        provider: generationModel.provider,
        model: generationModel.model,
        prompt: summaryPrompt,
        locale: activeLocale,
        apiKey: generationModel.apiKey,
        authToken: authSession?.token ?? null,
        profile: input.assistantProfile,
      })).trim();
      const content = buildMemoryContentForStorage({
        pinnedMemory: existingPinnedMemory,
        sessionSummary,
      });
      const nextSummary: RuntimeMemorySummary = {
        content,
        pinnedMemory: existingPinnedMemory || undefined,
        sessionSummary,
        compactedMessageCount: compactTargetCount,
        updatedAt: new Date().toISOString(),
        provider: generationModel.provider,
        model: generationModel.model,
        sourceMessageCount: input.currentMessages.length,
        estimatedTokens: estimateTokensFromText(content),
      };

      return await persistRuntimeMemorySummary(
        nextSummary,
        `Compacted runtime conversation context through ${compactTargetCount} message(s).`,
      );
    } catch (error) {
      onLog(`Runtime context compaction failed: ${String(error)}`);
      return currentSummary;
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

    const currentSummary = runtimeChatStoreRef.current.summaries[promptProfileId] ?? null;
    const currentPinnedMemory = getPinnedRuntimeMemory(currentSummary);
    const currentSessionSummary = getCompactedSessionMemory(currentSummary);
    const triggerTokenBudget = settings.triggerTokenBudget || MEMORY_COMPACTION_FALLBACK_BUDGET;
    const currentPinnedMemoryTokens = estimateTokensFromText(currentPinnedMemory);
    const memoryRequested = hasExplicitMemoryRequest(input.latestUserMessage);
    const needsPinnedMemoryCompaction = currentPinnedMemoryTokens >= triggerTokenBudget;
    if (!memoryRequested && !needsPinnedMemoryCompaction) {
      return;
    }

    const messagesForMemory = memoryRequested
      ? input.messages.slice(-RECENT_CONTEXT_MESSAGE_LIMIT)
      : [];
    const estimatedTokens = estimateChatTokens(messagesForMemory) + currentPinnedMemoryTokens;
    const summaryModel = getMemoryGenerationModel({
      assistantProfile: input.assistantProfile,
      fallbackProvider: input.provider,
      fallbackModel: input.model,
    });
    const summaryPrompt = [
      "Update this assistant's pinned long-term memory for MiVA.",
      "Store only information the user explicitly asked the assistant to remember, plus stable preferences, active long-term projects, important facts, and unresolved long-term tasks.",
      "Do not store temporary details from the active conversation unless the user explicitly asked to remember them.",
      "Do not include session progress here; current conversation context is compacted separately.",
      "If the existing pinned memory is getting long, compact it by merging duplicates and removing stale temporary details.",
      "Use concise bullets grouped under stable headings when helpful.",
      "Output only the updated pinned long-term memory. Do not explain the process.",
      currentPinnedMemory ? `Existing pinned memory:\n${currentPinnedMemory}` : "Existing pinned memory: none.",
      memoryRequested
        ? "Recent conversation with the explicit memory request:"
        : "No new memory request. Compact the existing pinned memory only.",
      memoryRequested
        ? messagesForMemory.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n")
        : "",
    ].join("\n\n");

    const pinnedMemory = (await runChatOnce({
      provider: summaryModel.provider,
      model: summaryModel.model,
      prompt: summaryPrompt,
      locale: activeLocale,
      apiKey: summaryModel.apiKey,
      authToken: authSession?.token ?? null,
      profile: input.assistantProfile,
    })).trim();
    const content = buildMemoryContentForStorage({
      pinnedMemory,
      sessionSummary: currentSessionSummary,
    });
    const nextSummary: RuntimeMemorySummary = {
      content,
      pinnedMemory,
      sessionSummary: currentSessionSummary || undefined,
      compactedMessageCount: currentSummary?.compactedMessageCount ?? 0,
      updatedAt: new Date().toISOString(),
      provider: summaryModel.provider,
      model: summaryModel.model,
      sourceMessageCount: input.messages.length,
      estimatedTokens: estimatedTokens + estimateTokensFromText(content),
    };
    await persistRuntimeMemorySummary(nextSummary, `Updated pinned memory for ${input.assistantProfile.name}.`);
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

    const currentSummary = runtimeChatStoreRef.current.summaries[promptProfileId] ?? null;
    const currentPinnedMemory = getPinnedRuntimeMemory(currentSummary);
    const currentSessionSummary = getCompactedSessionMemory(currentSummary);
    const mivaProvider = selectedProvider;
    const mivaModel = selectedProvider === "ollama" ? selectedModel : selectedCloudModel;
    const summaryModel = getMemoryGenerationModel({
      assistantProfile: input.assistantProfile,
      fallbackProvider: mivaProvider,
      fallbackModel: mivaModel,
    });
    const summaryPrompt = buildImageAnalysisMemoryPrompt({
      currentSummary: currentPinnedMemory,
      userMessage: input.userMessage,
      imageNames: input.imageNames,
      visionAnswer: input.visionAnswer,
    });

    const pinnedMemory = (await runChatOnce({
      provider: summaryModel.provider,
      model: summaryModel.model,
      prompt: summaryPrompt,
      locale: activeLocale,
      apiKey: summaryModel.apiKey,
      authToken: authSession?.token ?? null,
      profile: input.assistantProfile,
    })).trim();
    const content = buildMemoryContentForStorage({
      pinnedMemory,
      sessionSummary: currentSessionSummary,
    });
    const nextSummary: RuntimeMemorySummary = {
      content,
      pinnedMemory,
      sessionSummary: currentSessionSummary || undefined,
      compactedMessageCount: currentSummary?.compactedMessageCount ?? 0,
      updatedAt: new Date().toISOString(),
      provider: summaryModel.provider,
      model: summaryModel.model,
      sourceMessageCount: input.messageCount,
      estimatedTokens: estimateTokensFromText(content) + estimateTokensFromText(input.visionAnswer),
    };
    await persistRuntimeMemorySummary(nextSummary, `Stored image analysis in pinned memory for ${input.assistantProfile.name}.`);
  }

  async function completeClawCodeWorkspaceFromChat(messageCreatedAt: string, workspaceRoot: string) {
    await applyClawCodeWorkspace(workspaceRoot);
    updateChatMessages(appMode, (current) => current.map((message) => (
      message.createdAt === messageCreatedAt
        ? {
            ...message,
            content: clawWorkspaceSuccessCopy(activeLocale, workspaceRoot),
            uiAction: null,
          }
        : message
    )));
  }

  async function sendMessage(options?: { promptFixQuote?: string; promptFixOriginalAnswer?: string }) {
    const rawInput = chatInput.trim();
    const readyAttachments = documentAttachments.filter((attachment) => attachment.status === "ready");
    const readyImageAttachments = imageAttachments;
    const attachmentsAnalyzing = documentAttachments.some((attachment) => attachment.status === "analyzing");
    const usesImageVision = readyImageAttachments.length > 0;
    const parsed = resolveSlashInvocation(chatInput, selectedSlashCommand, slashCommands);
    const prompt = parsed?.prompt ?? (rawInput || (usesImageVision
      ? getDefaultImagePrompt()
      : readyAttachments.length > 0
        ? "Analyze the attached document data and summarize the information relevant to me."
        : ""));
    const isCodeSlashCommand = parsed?.command.id === "code";
    const isPromptFixSlashCommand = parsed?.command.id === "fix";
    const isImageSlashCommand = parsed?.command.id === "image";
    const isWorkspaceSlashCommand = Boolean(parsed?.command.workspaceService);
    const isImportedSkillSlashCommand = Boolean(parsed?.command.importedSkillId);
    const baseDisplayContent = parsed ? formatSlashUserMessage(parsed.command, parsed.prompt) : rawInput || (usesImageVision ? "Analyze the attached image(s)." : "Analyze the attached document data.");
    const promptFixQuote: string = isPromptFixSlashCommand ? (options?.promptFixQuote?.trim() ?? "") : "";
    const promptFixOriginalAnswer: string = isPromptFixSlashCommand ? (options?.promptFixOriginalAnswer?.trim() ?? "") : "";
    const attachmentLabel = readyAttachments.length > 0
      ? `\n\nAttached: ${readyAttachments.map((attachment) => attachment.name).join(", ")}`
      : "";
    const promptFixQuoteLabel = promptFixQuote
      ? `\n\nSelected assistant answer:\n> ${promptFixQuote.replace(/\n/g, "\n> ")}`
      : "";
    const displayContent = `${baseDisplayContent}${promptFixQuoteLabel}${attachmentLabel}`;
    const messageImages = readyImageAttachments.length > 0
      ? readyImageAttachments.map((attachment) => ({
          dataUrl: attachment.previewUrl,
          alt: attachment.name,
        }))
      : undefined;
    let assistantProfile = buildCurrentLocalAssistantProfile();
    if (parsed) {
      assistantProfile = applySlashCommandProfile(assistantProfile, parsed.command.id, slashCommands);
    }
    assistantProfile = {
      ...assistantProfile,
      personalization: personalizationSettings,
    };
    const chatMode = appMode;
    const activeProvider = usesImageVision ? IMAGE_VISION_PROVIDER : selectedProvider;
    const activeModel = usesImageVision ? IMAGE_VISION_MODEL : (selectedProvider === "ollama" ? selectedModel : selectedCloudModel);
    const providerModel = activeModel;
    const apiKey = getApiKeyForProvider(activeProvider);
    const localUnavailable = !usesImageVision && selectedProvider === "ollama" && !statusInstalled;
    const currentMessages = chatMode === "runtime" ? runtimeChatMessages : testChatMessages;

    if (
      attachmentsAnalyzing ||
      localUnavailable ||
      busyAction === "chat"
    ) {
      return;
    }

    if (parsed && !prompt.trim()) {
      const requestedAt = new Date().toISOString();
      const helpContent = isCodeSlashCommand && !clawCodeStatus?.installed
        ? clawCodeInstallRequiredCopy(activeLocale)
        : slashCommandHelpCopy(parsed.command, activeLocale);
      resetChatComposer();
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
      updateChatMessages(chatMode, (current) => [
        ...current,
        { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
        {
          role: "assistant",
          content: helpContent,
          createdAt: new Date().toISOString(),
          provider: activeProvider,
          model: providerModel,
        },
      ]);
      return;
    }

    if (
      !prompt &&
      !usesImageVision &&
      readyAttachments.length === 0
    ) {
      return;
    }

    if (isCodeSlashCommand && !clawCodeStatus?.installed) {
      const requestedAt = new Date().toISOString();
      resetChatComposer();
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
      updateChatMessages(chatMode, (current) => [
        ...current,
        { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
        {
          role: "assistant",
          content: clawCodeInstallRequiredCopy(activeLocale),
          createdAt: new Date().toISOString(),
          provider: activeProvider,
          model: providerModel,
        },
      ]);
      return;
    }

    if (isPromptFixSlashCommand) {
      const requestedAt = new Date().toISOString();
      const userFixFeedback = prompt.trim();
      if (!userFixFeedback) {
        return;
      }

      resetChatComposer();
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
      updateChatMessages(chatMode, (current) => [
        ...current,
        { role: "user", content: displayContent, createdAt: requestedAt, provider: activeProvider, model: providerModel },
      ]);

      try {
        const fixRule = await generatePromptFixRule({
          assistantProfile,
          userFeedback: userFixFeedback,
          selectedExcerpt: promptFixQuote,
          originalAssistantAnswer: promptFixOriginalAnswer || promptFixQuote,
        });
        if (!fixRule) {
          throw new Error("Gemini returned an empty prompt rule.");
        }

        const updatedProfile = await updateAssistantPromptSettings(assistantProfile.id, (settings) => ({
          ...settings,
          responseRules: settings.responseRules.includes(fixRule)
            ? settings.responseRules
            : [...settings.responseRules, fixRule],
          generatedFinalSystemPrompt: applyFixRuleToSystemPrompt(
            settings.generatedFinalSystemPrompt || assistantProfile.prompt.systemPrompt,
            fixRule,
            settings,
          ),
        }));
        updateChatMessages(chatMode, (current) => [
          ...current,
          {
            role: "assistant",
            content: updatedProfile
              ? `Generated and saved this prompt rule with Gemini:\n\n- ${fixRule}\n\nYou can review it in Studio > Prompts.`
              : "I could not find the active assistant profile to update.",
            createdAt: new Date().toISOString(),
            provider: activeProvider,
            model: providerModel,
          },
        ]);
        onLog(`Prompt rule generated with Gemini from /fix: ${fixRule}`);
      } catch (error) {
        const message = `Prompt rule update failed: ${String(error)}`;
        updateChatMessages(chatMode, (current) => [
          ...current,
          {
            role: "assistant",
            content: message,
            createdAt: new Date().toISOString(),
            provider: activeProvider,
            model: providerModel,
          },
        ]);
        onLog(message);
      }
      return;
    }

    const latestUserMessage = displayContent;

    const workspaceEnabled = isWorkspaceSlashCommand && assistantProfile.prompt.settings.toolConnections.googleWorkspace;
    const workspaceServices = assistantProfile.prompt.settings.toolConnections.googleWorkspaceServices;
    if (!isCodeSlashCommand && !isPromptFixSlashCommand && !isImageSlashCommand && !isImportedSkillSlashCommand && chatMode === "runtime" && workspaceEnabled && workspaceServices.length > 0) {
      const workspaceStatus = await refreshGoogleWorkspaceStatus();
      if (!workspaceStatus?.connected) {
        await onWorkspaceAuthRequired();
        const requestedAt = new Date().toISOString();
        resetChatComposer();
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

    if (!usesImageVision && !isCodeSlashCommand && !isImageSlashCommand && selectedProvider !== "ollama" && !authSession) {
      const requestedAt = new Date().toISOString();
      resetChatComposer();
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

    setChatBusyLabel(
      isImageSlashCommand
        ? (activeLocale === "en" ? "Generating image with Hugging Face..." : "Hugging Face로 이미지 생성 중...")
        : resolveClawCodeBusyLabel(prompt, assistantProfile, activeLocale, isCodeSlashCommand)
          || resolveWorkspaceBusyLabel(rawInput, currentMessages, assistantProfile, activeLocale, isWorkspaceSlashCommand),
    );
    setBusyAction("chat");
    if (!usesImageVision && !isCodeSlashCommand && !isImageSlashCommand) {
      const runtimeReady = await ensureOllamaReadyForChat(providerModel);
      if (!runtimeReady) {
        setBusyAction(null);
        setChatBusyLabel(null);
        return;
      }
    }

    const runtimeSummaryForRequest = chatMode === "runtime"
      ? await compactRuntimeContextIfNeeded({
          assistantProfile,
          currentMessages,
          latestUserMessage: displayContent,
          provider: activeProvider,
          model: providerModel,
        })
      : null;
    const recentContextMessages = currentMessages
      .slice(-RECENT_CONTEXT_MESSAGE_LIMIT)
      .map((message) => ({ role: message.role, content: message.content }));
    const memorySummary = chatMode === "runtime"
      ? buildMemoryContextForRequest(assistantProfile, runtimeSummaryForRequest)
      : null;

    resetChatComposer();
    setDocumentAttachments([]);
    setImageAttachments([]);
    shouldAutoScrollChatRef.current = true;
    setShowJumpToLatest(false);
    const startedAt = performance.now();
    const requestedAt = new Date().toISOString();
    updateChatMessages(chatMode, (current) => [
      ...current,
      { role: "user", content: displayContent, images: messageImages, createdAt: requestedAt, provider: activeProvider, model: providerModel },
    ]);

    if (chatMode === "runtime" && assistantProfile.prompt.settings.character.enabled) {
      const localCharacterCommand = detectLocalCharacterCommand(rawInput || prompt);
      if (localCharacterCommand.expression) {
        triggerCharacterExpression();
      }
      if (localCharacterCommand.pose) {
        triggerCharacterPose();
      }
    }

    try {
      if (isImageSlashCommand) {
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

        try {
          const result = await generateImageRequest({
            prompt,
            apiKey: providerKeys.huggingface,
          });
          const dataUrl = toImageDataUrl(result.mimeType, result.imageBase64);
          const successCopy = activeLocale === "en"
            ? `Generated with ${result.model}.`
            : `${result.model}로 이미지를 생성했습니다.`;
          updateChatMessages(chatMode, (current) => current.map((message) => (
            message.role === "assistant" && message.createdAt === assistantCreatedAt
              ? {
                  ...message,
                  content: successCopy,
                  images: [{ dataUrl, alt: result.prompt, model: result.model }],
                  latencyMs: Math.round(performance.now() - startedAt),
                }
              : message
          )));
          onLog(`Image generated with Hugging Face (${result.model}).`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Image generation failed.";
          updateChatMessages(chatMode, (current) => current.map((entry) => (
            entry.role === "assistant" && entry.createdAt === assistantCreatedAt
              ? { ...entry, content: message }
              : entry
          )));
          onLog(message);
        }
        return;
      }

      const toolContexts: string[] = [];
      if (isImportedSkillSlashCommand && parsed) {
        const skillContent = getImportedSkillContent(assistantProfile, parsed.command);
        if (skillContent) {
          toolContexts.push([
            `The user invoked imported skill /${parsed.command.id} (${parsed.command.label}).`,
            "Follow the skill instructions below for this request only.",
            "===== Skill instructions =====",
            skillContent,
          ].join("\n\n"));
        }
      }

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

      if (
        chatMode === "runtime"
        && assistantProfile.prompt.settings.character.enabled
        && assistantProfile.prompt.settings.character.reactionMode === "aiCues"
      ) {
        toolContexts.push(MOOD_TAG_INSTRUCTION);
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
      let generatedFiles: ChatGeneratedFile[] = [];
      const requestAssistantProfile = applyPromptIdentityToProfile(assistantProfile);
      const chatPayload = {
        provider: activeProvider,
        model: providerModel,
        prompt,
        locale: activeLocale,
        apiKey: apiKey || null,
        openAiApiKey: providerKeys.openai.trim() || null,
        clawCodeForced: isCodeSlashCommand,
        workspaceSlashForced: isWorkspaceSlashCommand,
        authToken: authSession?.token ?? null,
        profile: requestAssistantProfile,
        messages: recentContextMessages,
        memorySummary,
        toolContext,
        imageAttachments: readyImageAttachments.map((attachment) => ({
          name: attachment.name,
          mimeType: attachment.mimeType,
          data: attachment.dataBase64,
        })),
      };

      let chatUiAction: ChatUiAction | null = null;

      try {
        const streamResult = await streamChatOnce(chatPayload, {
          onDelta: appendAssistantDelta,
        }, streamSignal);
        answer = streamResult.answer;
        chatUiAction = streamResult.uiAction;
        generatedFiles = streamResult.files ?? [];
      } catch (streamError) {
        const streamMessage = streamError instanceof Error ? streamError.message : String(streamError);
        const fetchBlocked = streamError instanceof TypeError || /failed to fetch/i.test(streamMessage);
        if (!fetchBlocked) {
          throw streamError;
        }

        onLog("Streaming chat unavailable. Falling back to standard chat response.");
        answer = await runChatOnce(chatPayload);
        chatUiAction = null;
        updateChatMessages(chatMode, (current) => current.map((message) => (
          message.role === "assistant" && message.createdAt === assistantCreatedAt
            ? {
                ...message,
                content: answer,
                files: generatedFiles.length ? generatedFiles : undefined,
                uiAction: null,
                showClawWorkspacePicker: isCodeSlashCommand || undefined,
              }
            : message
        )));
      }
      const latencyMs = Math.round(performance.now() - startedAt);
      // Honor an AI mood cue if present, then strip it so it never reaches the
      // user's screen or TTS. The cleaned answer is what we display and store.
      const moodFromTag = parseMoodTag(answer);
      const cleanAnswer = stripMoodTag(answer);
      if (chatMode === "runtime" && assistantProfile.prompt.settings.character.enabled) {
        if (moodFromTag) {
          pulseEmotion(moodFromTag);
        }
      }
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
              content: cleanAnswer || message.content,
              files: generatedFiles.length ? generatedFiles : undefined,
              latencyMs,
              uiAction: chatUiAction,
              showClawWorkspacePicker: isCodeSlashCommand || undefined,
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
              content: cleanAnswer,
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
        void speakAssistantAnswer(cleanAnswer);
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
      setChatBusyLabel(null);
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

    if (!assistantProfileLoaded) {
      return;
    }

    loadedRuntimeProfileIdRef.current = "";
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
      resetChatComposer();
      shouldAutoScrollChatRef.current = true;
      setShowJumpToLatest(false);
    }

    return () => {
      cancelled = true;
    };
  }, [appMode, assistantProfileLoaded, onLog, promptProfileId]);

  useLayoutEffect(() => {
    if (appMode !== "runtime" && !(appMode === "setup" && activeStep === "chat")) {
      return;
    }

    if (!shouldAutoScrollChatRef.current) {
      return;
    }

    scrollChatToLatest("auto");
  }, [appMode, activeStep, activeChatMessages.length, busyAction, showChatIntroCard, selectedProvider, selectedModel, selectedCloudModel]);

  useEffect(() => {
    if (appMode !== "runtime" && !(appMode === "setup" && activeStep === "chat")) {
      return;
    }

    if (!shouldAutoScrollChatRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollChatToLatest("auto");
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
    characterEmotion,
    characterExpressionTrigger,
    characterPoseTrigger,
    chatBusyLabel,
    chatEndRef,
    chatInput,
    chatIntroKey,
    chatMetrics,
    chatScrollRef,
    chooseAndAttachDocuments,
    chooseAndAttachImages,
    chooseClawCodeWorkspace,
    completeClawCodeWorkspaceFromChat,
    documentAttachments,
    imageAttachments,
    handleChatScroll,
    runtimeChatStore,
    scrollChatToLatest,
    sendMessage,
    selectedSlashCommand,
    slashCommands,
    setChatInput,
    setSelectedSlashCommand,
    clearSlashCommand: () => setSelectedSlashCommand(null),
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
