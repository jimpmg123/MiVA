import type { Dispatch, MouseEvent, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppMode, CharacterEmotion, ChatMessage, ChatMetrics, DocumentAttachment, ImageAttachment, OllamaStatus, PromptSettings, ProviderId, ProviderMode } from "../types";
import type { Locale } from "../i18n";
import { ClawCodeWorkspaceChatAction } from "../components/ClawCodeWorkspaceChatAction";
import { PrimaryButton } from "../components/ui";
import { ChatAssistantMarkdownContent } from "../components/ChatAssistantMarkdownContent";
import { ChatSlashChip } from "../components/ChatSlashChip";
import { ChatSlashMenu } from "../components/ChatSlashMenu";
import { ChatUserMessageContent } from "../components/ChatUserMessageContent";
import type { ChatSlashCommand } from "../features/chat/slashCommands";
import { getCharacterAsset } from "../features/characters/catalog";
import { useCharacterOverlaySync } from "../features/characters/useCharacterOverlay";
import { isTauriRuntime } from "../app/tauri";
import { useChatSlashMenu } from "../features/chat/useChatSlashMenu";
import { formatChatLatency } from "../utils";

type RuntimePageProps = {
  activeLocale: Locale;
  activeChatMessages: ChatMessage[];
  activeModelLabel: string;
  activeProviderLabel: string;
  activeProviderMode: ProviderMode;
  appMode: AppMode;
  assistantPanelMinimized: boolean;
  busyAction: string | null;
  chatBusyLabel: string | null;
  chooseAndAttachDocuments: () => Promise<void> | void;
  chooseAndAttachImages: () => Promise<void> | void;
  chooseClawCodeWorkspace: () => Promise<string | null> | string | null;
  completeClawCodeWorkspaceFromChat: (messageCreatedAt: string, workspaceRoot: string) => Promise<void> | void;
  documentAttachments: DocumentAttachment[];
  imageAttachments: ImageAttachment[];
  chatEndRef: RefObject<HTMLDivElement | null>;
  chatInput: string;
  selectedSlashCommand: ChatSlashCommand | null;
  slashCommands: ChatSlashCommand[];
  chatIntroKey: string;
  chatMetrics: ChatMetrics | null;
  characterSettings: PromptSettings["character"];
  chatScrollRef: RefObject<HTMLDivElement | null>;
  providerText: Record<string, string>;
  selectedModelInstalled: boolean;
  selectedProvider: ProviderId;
  showChatIntroCard: boolean;
  showJumpToLatest: boolean;
  status: OllamaStatus | null;
  runtimeTtsAvailable: boolean;
  runtimeTtsEnabled: boolean;
  runtimeTtsSpeakingRate: number;
  runtimeTtsVolume: number;
  t: Record<string, string>;
  ttsError: string | null;
  ttsPlaybackState: "idle" | "starting" | "speaking" | "error";
  characterEmotion: CharacterEmotion;
  saveSetupAssistantProfile: () => Promise<boolean> | boolean;
  handleChatScroll: () => void;
  scrollChatToLatest: (behavior?: ScrollBehavior) => void;
  sendMessage: (options?: { promptFixQuote?: string }) => Promise<void> | void;
  stopChat: () => void;
  removeDocumentAttachment: (id: string) => void;
  removeImageAttachment: (id: string) => void;
  setAppMode: (mode: AppMode) => void;
  setAssistantPanelMinimized: Dispatch<SetStateAction<boolean>>;
  setChatInput: Dispatch<SetStateAction<string>>;
  setSelectedSlashCommand: (command: ChatSlashCommand | null) => void;
  setDismissedChatIntroKeys: Dispatch<SetStateAction<string[]>>;
  setRuntimeTtsEnabled: Dispatch<SetStateAction<boolean>>;
  setRuntimeTtsSpeakingRate: (speakingRate: number) => void;
  setRuntimeTtsVolume: (volume: number) => void;
  stopRuntimeTts: () => void;
};

const LONG_ASSISTANT_JUMP_MIN_CHARS = 600;
const CHAT_INPUT_MAX_HEIGHT_PX = 240;

function getRuntimeMessageKey(message: ChatMessage, index: number) {
  return `${message.role}-${message.createdAt ?? "draft"}-${index}`;
}

function getNormalizedMessageCharCount(content: string) {
  return content.replace(/\s+/g, " ").trim().length;
}

function getMessageJumpPreview(content: string) {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? content.trim();
  const normalized = firstLine.replace(/\s+/g, " ");

  if (!normalized) {
    return "Empty message";
  }

  return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
}

function getPromptFixQuotePreview(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

export function RuntimePage({
  activeLocale,
  activeChatMessages,
  activeModelLabel,
  activeProviderLabel,
  activeProviderMode,
  appMode,
  assistantPanelMinimized,
  busyAction,
  chatBusyLabel,
  chooseAndAttachDocuments,
  chooseAndAttachImages: _chooseAndAttachImages,
  chooseClawCodeWorkspace,
  completeClawCodeWorkspaceFromChat,
  documentAttachments,
  imageAttachments,
  chatEndRef,
  chatInput,
  selectedSlashCommand,
  slashCommands,
  chatIntroKey,
  chatMetrics,
  characterSettings,
  chatScrollRef,
  providerText,
  selectedModelInstalled,
  selectedProvider,
  showChatIntroCard,
  showJumpToLatest,
  status,
  runtimeTtsAvailable,
  runtimeTtsEnabled,
  runtimeTtsSpeakingRate,
  runtimeTtsVolume,
  t,
  ttsError,
  ttsPlaybackState,
  characterEmotion,
  saveSetupAssistantProfile,
  handleChatScroll,
  scrollChatToLatest,
  sendMessage,
  stopChat,
  removeDocumentAttachment,
  removeImageAttachment,
  setAppMode,
  setAssistantPanelMinimized,
  setChatInput,
  setSelectedSlashCommand,
  setDismissedChatIntroKeys,
  setRuntimeTtsEnabled,
  setRuntimeTtsSpeakingRate,
  setRuntimeTtsVolume,
  stopRuntimeTts,
}: RuntimePageProps) {
const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
const userMessageRefs = useRef<Record<string, HTMLDivElement | null>>({});
const previousBusyActionRef = useRef(busyAction);
const previousMessageCountRef = useRef(activeChatMessages.length);
const [hoveredJumpTooltip, setHoveredJumpTooltip] = useState<{ label: string; top: number } | null>(null);
const [assistantSelectionAction, setAssistantSelectionAction] = useState<{ text: string; left: number; top: number } | null>(null);
const [promptFixQuote, setPromptFixQuote] = useState<string | null>(null);
const [promptFixSaving, setPromptFixSaving] = useState(false);
const [composerNotice, setComposerNotice] = useState<string | null>(null);
const chatGenerating = busyAction === "chat";

const focusChatInput = useCallback(() => {
  requestAnimationFrame(() => {
    const element = chatInputRef.current;
    if (!element || element.disabled) {
      return;
    }

    element.focus();
    const caret = element.value.length;
    element.setSelectionRange(caret, caret);
  });
}, []);
const [assistantReplyPulse, setAssistantReplyPulse] = useState(false);
const slashMenu = useChatSlashMenu({
  chatInput,
  setChatInput,
  selectedSlashCommand,
  setSelectedSlashCommand,
  slashCommands,
  inputRef: chatInputRef,
  disabled: busyAction === "chat",
});
const fixPromptCommand = slashCommands.find((command) => command.id === "fix") ?? null;
const promptFixMode = selectedSlashCommand?.id === "fix" && Boolean(promptFixQuote);
const promptFixComposerActive = promptFixMode || promptFixSaving;
const runtimeChat = appMode === "runtime";
const showRuntimeTtsControl = runtimeChat;
const shouldShowChatIntroCard = runtimeChat && showChatIntroCard;
    const characterAsset = getCharacterAsset(characterSettings.characterId);
    const characterRuntimeEnabled = runtimeChat && characterSettings.enabled && characterSettings.showInRuntime;
    const characterActivity: "Idle" | "Thinking" | "Speaking" = ttsPlaybackState === "speaking" || ttsPlaybackState === "starting" || assistantReplyPulse
      ? "Speaking"
      : busyAction === "chat"
        ? "Thinking"
        : "Idle";
    const usesFloatingCharacterWindow = characterRuntimeEnabled && characterSettings.renderer === "live2d";
    const overlaySyncState = usesFloatingCharacterWindow
      ? { character: characterSettings, activity: characterActivity, emotion: characterEmotion }
      : null;
    const { overlayOpen, openOverlay } = useCharacterOverlaySync(overlaySyncState);
    const canUseCharacterOverlay = isTauriRuntime() && Boolean(overlaySyncState);

    useEffect(() => {
      if ((usesFloatingCharacterWindow || overlayOpen) && !assistantPanelMinimized) {
        setAssistantPanelMinimized(true);
      }
    }, [assistantPanelMinimized, overlayOpen, setAssistantPanelMinimized, usesFloatingCharacterWindow]);

    const openFloatingCharacterWindow = useCallback(() => {
      if (usesFloatingCharacterWindow) {
        if (canUseCharacterOverlay && !overlayOpen) {
          void openOverlay();
        }
        return;
      }

      setAssistantPanelMinimized(false);
    }, [canUseCharacterOverlay, openOverlay, overlayOpen, setAssistantPanelMinimized, usesFloatingCharacterWindow]);
    const userMessageJumpItems: Array<{ key: string; label: string }> = [];
    let latestUserJumpItem: { key: string; label: string } | null = null;
    activeChatMessages.forEach((message, index) => {
      if (message.role === "user") {
        latestUserJumpItem = {
          key: getRuntimeMessageKey(message, index),
          label: getMessageJumpPreview(message.content),
        };
        return;
      }

      if (
        latestUserJumpItem
        && getNormalizedMessageCharCount(message.content) >= LONG_ASSISTANT_JUMP_MIN_CHARS
        && userMessageJumpItems[userMessageJumpItems.length - 1]?.key !== latestUserJumpItem.key
      ) {
        userMessageJumpItems.push(latestUserJumpItem);
      }
    });
    const scrollToUserMessage = useCallback((messageKey: string) => {
      const container = chatScrollRef.current;
      const target = userMessageRefs.current[messageKey];

      if (!container || !target) {
        return;
      }

      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + targetTop - containerTop,
        behavior: "smooth",
      });
    }, [chatScrollRef]);
    const characterActivityIcon = characterActivity === "Speaking"
      ? "record_voice_over"
      : characterActivity === "Thinking"
        ? "psychology"
        : "self_improvement";
    const greeting =
      selectedProvider === "ollama"
        ? t.chatGreeting.replace("{model}", activeModelLabel)
        : `Hello. MiVA has prepared ${activeProviderLabel} / ${activeModelLabel}. If an API key is configured, you can test responses now.`;
    const sandboxBody = runtimeChat
      ? selectedProvider === "ollama"
        ? t.chatSandboxBody.replace("{model}", activeModelLabel)
        : providerText.cloudDataNotice
      : `${t.chatSandboxBody} Current provider: ${activeProviderLabel} / ${activeModelLabel}.`;
    const chatUnavailable = selectedProvider === "ollama"
      ? !status?.installed || (status.running && !selectedModelInstalled)
      : false;
    const hasPendingAttachments = documentAttachments.some((attachment) => attachment.status === "analyzing");
    const hasImageAttachments = imageAttachments.length > 0;
    // The button stays enabled while a document is analyzing; pressing it shows
    // an inline notice instead of silently doing nothing (see submitComposer).
    const chatSubmitDisabled = promptFixSaving
      || (promptFixMode && !chatInput.trim())
      || (!promptFixMode && chatUnavailable && !hasImageAttachments)
      || busyAction === "chat";
    const chatPlaceholder = chatGenerating
      ? t.generatingResponse
      : promptFixMode
        ? "Describe what MIVA should do differently next time..."
      : selectedSlashCommand
        ? `Add instructions for ${selectedSlashCommand.label}...`
        : t.messagePlaceholder;
    const chatLatencyMetric = formatChatLatency(chatMetrics?.latencyMs);
    const chatMessageMetric = `Messages: ${activeChatMessages.length}`;
    const chatProviderMetric = `${activeProviderMode === "local" ? "Local" : "Cloud"}: ${activeModelLabel}`;
    const ttsMetric = `TTS: ${
      !runtimeTtsAvailable
        ? "Not configured"
        : !runtimeTtsEnabled
          ? "Off"
          : ttsPlaybackState === "speaking" || ttsPlaybackState === "starting"
            ? "Speaking"
            : "On"
    }`;
    const runtimeTtsVolumePercent = Math.round(runtimeTtsVolume * 100);
    const runtimeTtsButtonTitle = runtimeTtsAvailable
      ? runtimeTtsEnabled ? "Turn off runtime TTS" : "Turn on runtime TTS"
      : "Enable TTS in Studio > TTS / Voice";

    const handleAssistantMessageSelection = useCallback((event: MouseEvent<HTMLDivElement>) => {
      if (busyAction === "chat") {
        return;
      }

      const selection = window.getSelection();
      const selectedText = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
      if (!selection || selectedText.length < 3 || !selection.rangeCount) {
        setAssistantSelectionAction(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!event.currentTarget.contains(range.commonAncestorContainer)) {
        setAssistantSelectionAction(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      const left = Math.min(Math.max(rect.left + rect.width / 2 - 54, 16), window.innerWidth - 132);
      const top = Math.max(rect.top - 46, 16);
      setAssistantSelectionAction({
        text: selectedText,
        left,
        top,
      });
    }, [busyAction]);

    const startPromptFixFromSelection = useCallback(() => {
      if (!assistantSelectionAction) {
        return;
      }

      setPromptFixQuote(assistantSelectionAction.text);
      setAssistantSelectionAction(null);
      if (fixPromptCommand) {
        setSelectedSlashCommand(fixPromptCommand);
        setChatInput("");
      } else {
        setChatInput("/fix ");
      }
      focusChatInput();
    }, [assistantSelectionAction, fixPromptCommand, focusChatInput, setChatInput, setSelectedSlashCommand]);

    const cancelPromptFix = useCallback(() => {
      setPromptFixQuote(null);
      setPromptFixSaving(false);
      if (selectedSlashCommand?.id === "fix") {
        setSelectedSlashCommand(null);
      }
    }, [selectedSlashCommand?.id, setSelectedSlashCommand]);

    const submitComposer = useCallback(() => {
      if (slashMenu.menuOpen) {
        return;
      }

      if (hasPendingAttachments) {
        setComposerNotice(
          t.attachmentsAnalyzingNotice ?? "Still analyzing the attached file — please wait a moment."
        );
        focusChatInput();
        return;
      }

      if (promptFixMode && chatInput.trim()) {
        setPromptFixSaving(true);
      }
      void sendMessage(promptFixQuote ? { promptFixQuote } : undefined);
      focusChatInput();
    }, [chatInput, focusChatInput, hasPendingAttachments, promptFixMode, promptFixQuote, sendMessage, slashMenu.menuOpen, t]);

    useEffect(() => {
      const element = chatInputRef.current;
      if (!element) {
        return;
      }

      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight, CHAT_INPUT_MAX_HEIGHT_PX)}px`;
    }, [chatInput]);

    useEffect(() => {
      if (!composerNotice) {
        return;
      }
      const timeout = window.setTimeout(() => setComposerNotice(null), 3200);
      return () => window.clearTimeout(timeout);
    }, [composerNotice]);

    useEffect(() => {
      if (!hasPendingAttachments) {
        setComposerNotice(null);
      }
    }, [hasPendingAttachments]);

    useEffect(() => {
      const wasGenerating = previousBusyActionRef.current === "chat";
      previousBusyActionRef.current = busyAction;
      if (wasGenerating && busyAction !== "chat") {
        focusChatInput();
      }
    }, [busyAction, focusChatInput]);

    useEffect(() => {
      const previousCount = previousMessageCountRef.current;
      previousMessageCountRef.current = activeChatMessages.length;
      const latestMessage = activeChatMessages[activeChatMessages.length - 1];
      if (activeChatMessages.length <= previousCount || latestMessage?.role !== "assistant") {
        return;
      }

      setAssistantReplyPulse(true);
      const timeout = window.setTimeout(() => setAssistantReplyPulse(false), 2400);
      return () => window.clearTimeout(timeout);
    }, [activeChatMessages]);

    useEffect(() => {
      if (!promptFixSaving) {
        return;
      }

      const latestMessage = activeChatMessages[activeChatMessages.length - 1];
      if (
        latestMessage?.role === "assistant"
        && (
          latestMessage.content.startsWith("Saved this as a prompt rule")
          || latestMessage.content.startsWith("Prompt rule update failed")
          || latestMessage.content.startsWith("I could not find the active assistant profile")
        )
      ) {
        setPromptFixSaving(false);
        setPromptFixQuote(null);
      }
    }, [activeChatMessages, promptFixSaving]);

    const showAssistantRuntimePanel = characterRuntimeEnabled;
    const chatShellClass = "relative min-h-0 w-full flex-1 overflow-hidden bg-[var(--miva-surface)]";
    const chatSectionClass = "relative flex h-full min-h-0 flex-col overflow-hidden";
    const chatMessagesClass = "miva-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 pt-0";
    const assistantCardClass = "pointer-events-none absolute bottom-24 right-3 top-4 z-20 flex w-[340px] flex-col overflow-visible";
    const compactAssistantLauncherVisible = showAssistantRuntimePanel
      && (assistantPanelMinimized || usesFloatingCharacterWindow)
      && !(usesFloatingCharacterWindow && overlayOpen);
    const assistantRuntimePanelVisible = showAssistantRuntimePanel
      && !assistantPanelMinimized
      && !usesFloatingCharacterWindow;
    const compactAssistantLauncherDisabled = usesFloatingCharacterWindow && !canUseCharacterOverlay;
    const compactAssistantLauncherTitle = usesFloatingCharacterWindow
      ? canUseCharacterOverlay ? "Open floating window" : "Floating window is only available in the desktop app"
      : "Show assistant panel";

    return (
      <div className={chatShellClass}>
        <section className={chatSectionClass}>
          {appMode === "setup" && (
            <section className="relative z-20 mb-4 shrink-0 overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-6 shadow-[var(--miva-shadow-md)]">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--miva-primary-soft)] blur-3xl" />
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[var(--miva-success-soft)] text-[var(--miva-success)] shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">verified</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--miva-text-soft)]">Test Chat</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-[var(--miva-text)]">Try this assistant before entering runtime</h2>
                    <p className="mt-2 max-w-[560px] text-sm leading-6 text-[var(--miva-text-muted)]">
                      Test chat is temporary for setup validation. Runtime chat is saved locally and can be restored after restart.
                    </p>
                  </div>
                </div>
                <PrimaryButton
                  className="shrink-0 rounded-xl px-4 py-2.5 text-sm"
                  onClick={async () => {
                    const saved = await saveSetupAssistantProfile();
                    if (!saved) {
                      return;
                    }
                    setAppMode("studio");
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    {t.enterMiVA}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </span>
                </PrimaryButton>
              </div>
            </section>
          )}
        <div
          className={chatMessagesClass}
          ref={chatScrollRef}
          onScroll={handleChatScroll}
        >
          <div className="miva-runtime-thread flex min-h-full flex-col gap-2 pb-4 pt-6">
          {shouldShowChatIntroCard && (
            <section className="relative border-b border-[var(--miva-border)] pb-5 pr-10">
              <button
                aria-label={t.close}
                className="absolute right-0 top-0 rounded-[8px] p-1.5 text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                onClick={() => setDismissedChatIntroKeys((current) => [...current, chatIntroKey])}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div>
                  <p className="mb-2 text-[11px] font-semibold text-[var(--miva-primary)]">Runtime</p>
                  <h2 className="font-heading mb-2 text-[20px] font-semibold leading-7 tracking-[-0.01em] text-[var(--miva-text)]">
                    {t.chatSandboxTitle}
                  </h2>
                  <p className="max-w-[72ch] text-sm leading-6 text-[var(--miva-text-muted)]">
                    {selectedProvider === "ollama" ? (
                      <>
                        {sandboxBody.split(activeModelLabel)[0]}
                        <span className="font-semibold text-[var(--miva-primary)]">{activeModelLabel}</span>
                        {sandboxBody.split(activeModelLabel)[1] ?? ""}
                      </>
                    ) : (
                      sandboxBody
                    )}
                  </p>
              </div>
            </section>
          )}

          <div className="miva-assistant-message self-start">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{greeting}</p>
          </div>

          {activeChatMessages.map((message, index) => {
            const messageKey = getRuntimeMessageKey(message, index);
            const isLastMessage = index === activeChatMessages.length - 1;
            const isStreamingAssistant = message.role === "assistant" && isLastMessage && busyAction === "chat";
            const isAwaitingFirstToken = isStreamingAssistant && !message.content.trim();
            const isStreamingTokens = isStreamingAssistant && Boolean(message.content.trim());
            const generatingLabel = chatBusyLabel || t.generatingResponse;

            return (
              <div
                className={message.role === "user" ? "miva-user-message self-end px-4 py-3" : "miva-assistant-message self-start"}
                key={messageKey}
                ref={message.role === "user"
                  ? (element) => {
                    userMessageRefs.current[messageKey] = element;
                  }
                  : undefined}
              >
                <div
                  className={`break-words ${
                    message.role === "user"
                      ? "whitespace-pre-wrap text-[15px] leading-7"
                      : "text-[15px] leading-7 text-[var(--miva-text)]"
                  }`}
                  onMouseUp={message.role === "assistant" ? handleAssistantMessageSelection : undefined}
                >
                  {isAwaitingFirstToken ? (
                    <div aria-live="polite" className="flex items-center gap-3 font-semibold text-[var(--miva-primary)]">
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>{generatingLabel}</span>
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="typing-dot" />
                        <span className="typing-dot animation-delay-150" />
                        <span className="typing-dot animation-delay-300" />
                      </span>
                    </div>
                  ) : (
                    <>
                      {message.role === "user" ? (
                        <ChatUserMessageContent content={message.content} images={message.images} slashCommands={slashCommands} />
                      ) : (
                        <ChatAssistantMarkdownContent
                          content={message.content}
                          images={message.images}
                          imageKeyPrefix={messageKey}
                        />
                      )}
                      {message.uiAction === "claw-pick-workspace" && message.createdAt && isTauriRuntime() ? (
                        <ClawCodeWorkspaceChatAction
                          activeLocale={activeLocale}
                          busy={busyAction !== null}
                          onChooseFolder={chooseClawCodeWorkspace}
                          onConfirm={(workspaceRoot) => completeClawCodeWorkspaceFromChat(message.createdAt!, workspaceRoot)}
                        />
                      ) : null}
                      {isStreamingTokens ? (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--miva-primary)] align-[-2px]" aria-hidden="true" />
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {assistantSelectionAction ? (
            <button
              className="fixed z-[80] inline-flex h-9 items-center gap-2 rounded-full border border-[var(--miva-primary)] bg-[var(--miva-floating-surface)] px-3 text-xs font-black text-[var(--miva-primary)] shadow-[0_12px_30px_rgba(31,57,88,0.18)] backdrop-blur transition hover:bg-[var(--miva-primary-surface)]"
              style={{ left: assistantSelectionAction.left, top: assistantSelectionAction.top }}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={startPromptFixFromSelection}
            >
              <span className="material-symbols-outlined text-[16px]">rule_settings</span>
              Fix prompt
            </button>
          ) : null}

          {activeChatMessages.length === 0 && (
            <div className="mt-2 flex flex-col items-start gap-3 border-t border-[var(--miva-border)] pt-5">
              <p className="text-xs font-semibold text-[var(--miva-text-soft)]">{t.suggestedAction}</p>
              <button
                className="group flex items-center gap-2 rounded-[10px] border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] px-4 py-2.5 text-left text-[var(--miva-primary)] transition hover:bg-[var(--miva-primary-surface)]"
                onClick={() => setChatInput(t.suggestedPrompt)}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="text-sm font-medium">{t.suggestedPrompt}</span>
                <span className="material-symbols-outlined text-sm opacity-0 transition-opacity group-hover:opacity-100">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
          <div ref={chatEndRef} className="h-1 shrink-0" />
          </div>
        </div>

        {userMessageJumpItems.length > 0 && (
          <nav
            aria-label="Jump to conversation messages"
            className="miva-chat-jump-rail"
            onMouseLeave={() => setHoveredJumpTooltip(null)}
          >
            <div className="miva-chat-jump-list">
              {userMessageJumpItems.map((item) => (
                <button
                  aria-label={`Jump to: ${item.label}`}
                  className="miva-chat-jump-marker"
                  key={item.key}
                  onClick={() => scrollToUserMessage(item.key)}
                  onFocus={(event) => {
                    const list = event.currentTarget.parentElement;
                    setHoveredJumpTooltip({
                      label: item.label,
                      top: event.currentTarget.offsetTop - (list?.scrollTop ?? 0) + event.currentTarget.offsetHeight / 2,
                    });
                  }}
                  onMouseEnter={(event) => {
                    const list = event.currentTarget.parentElement;
                    setHoveredJumpTooltip({
                      label: item.label,
                      top: event.currentTarget.offsetTop - (list?.scrollTop ?? 0) + event.currentTarget.offsetHeight / 2,
                    });
                  }}
                  title={item.label}
                  type="button"
                >
                  <span aria-hidden="true" className="miva-chat-jump-marker-line" />
                </button>
              ))}
            </div>
            {hoveredJumpTooltip && (
              <span className="miva-chat-jump-tooltip" style={{ top: hoveredJumpTooltip.top }}>
                {hoveredJumpTooltip.label}
              </span>
            )}
          </nav>
        )}

        <div className="relative z-30 shrink-0 bg-[linear-gradient(180deg,transparent,var(--miva-surface)_18%)] pb-3 pt-6">
          {showJumpToLatest && (
            <button
              aria-label={t.jumpToLatest}
              className="absolute top-0 left-1/2 z-20 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-primary)] shadow-[var(--miva-shadow-sm)] transition hover:border-[var(--miva-primary)]"
              title={t.jumpToLatest}
              type="button"
              onClick={() => scrollChatToLatest("smooth")}
            >
              <span className="material-symbols-outlined text-[22px]">arrow_downward</span>
            </button>
          )}

          <div className="miva-runtime-composer-wrap">
          {(imageAttachments.length > 0 || documentAttachments.length > 0) && (
            <div className="mb-3 px-1">
              {hasImageAttachments ? (
                <p className="mb-2 text-xs font-semibold text-[var(--miva-text-muted)]">{t.imageVisionNotice}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
              {imageAttachments.map((attachment) => (
                <div className="relative overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)]" key={attachment.id}>
                  <img alt={attachment.name} className="h-20 w-20 object-cover" src={attachment.previewUrl} />
                  <button
                    aria-label={`Remove ${attachment.name}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--miva-overlay)] text-white"
                    onClick={() => removeImageAttachment(attachment.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
              {documentAttachments.map((attachment) => {
                const isAnalyzing = attachment.status === "analyzing";
                const isError = attachment.status === "error";
                const statusIcon = isAnalyzing ? "progress_activity" : isError ? "error" : "description";
                const statusLabel = isAnalyzing
                  ? (t.attachmentAnalyzing ?? "Analyzing…")
                  : isError
                    ? (attachment.error || t.attachmentError || "Analysis failed")
                    : (t.attachmentReady ?? "Ready");
                return (
                  <div
                    className="relative flex min-w-[160px] max-w-[240px] items-center gap-2 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-2 text-xs font-semibold text-[var(--miva-text-muted)]"
                    key={attachment.id}
                    title={isError ? (attachment.error ?? undefined) : undefined}
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] ${isError ? "text-[var(--miva-danger-hover)]" : "text-[var(--miva-primary)]"} ${isAnalyzing ? "animate-spin" : ""}`}
                    >
                      {statusIcon}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{attachment.name}</span>
                      <span className={`truncate text-[10px] font-medium ${isError ? "text-[var(--miva-danger-hover)]" : "text-[var(--miva-text-soft)]"}`}>
                        {statusLabel}
                      </span>
                    </span>
                    <button
                      aria-label={`Remove ${attachment.name}`}
                      className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full text-[var(--miva-text-soft)] hover:text-[var(--miva-danger-hover)]"
                      onClick={() => removeDocumentAttachment(attachment.id)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {promptFixQuote ? (
            <div className="mb-2 rounded-[14px] border border-[var(--miva-primary)]/25 bg-[var(--miva-primary-surface)] px-3 py-2 shadow-[var(--miva-shadow-sm)]">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-[17px] text-[var(--miva-primary)]">format_quote</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-primary)]">Selected assistant answer</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--miva-text-muted)]">{getPromptFixQuotePreview(promptFixQuote)}</p>
                </div>
                <button
                  aria-label="Cancel prompt fix"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--miva-text-soft)] transition hover:bg-[var(--miva-surface)] hover:text-[var(--miva-text)]"
                  type="button"
                  onClick={cancelPromptFix}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          ) : null}

          {composerNotice ? (
            <div className="mb-2 flex items-center gap-2 rounded-[12px] border border-[var(--miva-primary)]/25 bg-[var(--miva-primary-surface)] px-3 py-2 text-xs font-semibold text-[var(--miva-primary)]">
              <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
              <span>{composerNotice}</span>
            </div>
          ) : null}

          <form
            className={`relative flex items-end gap-2 rounded-[16px] border p-2 shadow-[0_10px_28px_rgba(31,57,88,0.10)] transition focus-within:shadow-[0_12px_32px_rgba(31,57,88,0.13)] ${
              promptFixComposerActive
                ? "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)]"
                : "border-[var(--miva-border-strong)] bg-[var(--miva-surface)] focus-within:border-[var(--miva-primary)]"
            }`}
            onSubmit={(event) => {
              event.preventDefault();
              submitComposer();
            }}
          >
            {slashMenu.menuOpen && (
              <ChatSlashMenu
                activeIndex={slashMenu.activeIndex}
                commands={slashMenu.filteredCommands}
                locale={activeLocale}
                onHighlight={slashMenu.setActiveIndex}
                onSelect={(command) => slashMenu.selectCommand(command)}
              />
            )}
            <button
              className="miva-composer-add-button"
              onClick={() => void chooseAndAttachDocuments()}
              title="Attach file"
              type="button"
            >
              +
            </button>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {selectedSlashCommand ? (
                <ChatSlashChip
                  command={selectedSlashCommand}
                  compact
                  onRemove={selectedSlashCommand.id === "fix" ? cancelPromptFix : () => setSelectedSlashCommand(null)}
                />
              ) : null}
              <textarea
                aria-busy={chatGenerating}
                className={`max-h-[15rem] min-h-10 min-w-[8rem] flex-1 resize-none overflow-y-auto border-none bg-transparent px-1 py-2 text-sm leading-6 text-[var(--miva-text)] outline-none ${
                  promptFixComposerActive ? "placeholder:text-[var(--miva-primary)]/70" : "placeholder:text-[var(--miva-text-soft)]"
                }`}
                placeholder={chatPlaceholder}
                readOnly={chatGenerating}
                ref={chatInputRef}
                rows={1}
                value={chatInput}
                onChange={(event) => {
                  event.currentTarget.style.height = "auto";
                  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, CHAT_INPUT_MAX_HEIGHT_PX)}px`;
                  slashMenu.handleInputChange(event.target.value, event.currentTarget);
                }}
                onClick={(event) => slashMenu.syncCaret(event.currentTarget)}
                onKeyDown={(event) => {
                  if (slashMenu.handleKeyDown(event)) {
                    return;
                  }

                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (!chatSubmitDisabled) {
                      submitComposer();
                    }
                  }
                }}
                onSelect={(event) => slashMenu.syncCaret(event.currentTarget)}
              />
            </div>
            {showRuntimeTtsControl && (
              <div className="group relative flex items-center">
                <div className="pointer-events-none absolute bottom-full right-0 z-30 w-56 translate-y-1 pb-3 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <div className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] p-3 shadow-[var(--miva-shadow-md)] backdrop-blur">
                    {runtimeTtsAvailable ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">volume_up</span>
                          <input
                            aria-label="Runtime TTS volume"
                            className="min-w-0 flex-1 accent-[var(--miva-primary)]"
                            max={1}
                            min={0}
                            step={0.05}
                            type="range"
                            value={runtimeTtsVolume}
                            onChange={(event) => setRuntimeTtsVolume(Number(event.target.value))}
                          />
                          <span className="w-9 text-right text-[11px] font-bold tabular-nums text-[var(--miva-text-muted)]">
                            {runtimeTtsVolumePercent}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">speed</span>
                          <input
                            aria-label="Runtime TTS speed"
                            className="min-w-0 flex-1 accent-[var(--miva-primary)]"
                            max={2}
                            min={0.5}
                            step={0.1}
                            type="range"
                            value={runtimeTtsSpeakingRate}
                            onChange={(event) => setRuntimeTtsSpeakingRate(Number(event.target.value))}
                          />
                          <span className="w-9 text-right text-[11px] font-bold tabular-nums text-[var(--miva-text-muted)]">
                            {runtimeTtsSpeakingRate.toFixed(1)}x
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-3 text-sm leading-5 text-[var(--miva-text-muted)]">
                        <span className="material-symbols-outlined text-[18px] text-[var(--miva-text-soft)]">volume_off</span>
                        <span>Runtime TTS is off for this assistant. Enable a TTS provider in Studio &gt; TTS / Voice.</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  aria-pressed={runtimeTtsEnabled}
                  className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                    !runtimeTtsAvailable
                      ? "cursor-not-allowed bg-[var(--miva-surface-muted)] text-[var(--miva-text-soft)] opacity-80"
                      : runtimeTtsEnabled
                      ? "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
                      : "bg-[var(--miva-surface-muted)] text-[var(--miva-text-muted)] hover:text-[var(--miva-primary)]"
                  }`}
                  disabled={!runtimeTtsAvailable}
                  title={runtimeTtsButtonTitle}
                  type="button"
                  onClick={() => {
                    if (!runtimeTtsAvailable) {
                      return;
                    }
                    setRuntimeTtsEnabled((current) => {
                      if (current) {
                        stopRuntimeTts();
                      }
                      return !current;
                    });
                  }}
                >
                  <span className={`material-symbols-outlined text-[22px] ${ttsPlaybackState === "speaking" ? "animate-pulse" : ""}`}>
                    {runtimeTtsAvailable && runtimeTtsEnabled ? "volume_up" : "volume_off"}
                  </span>
                </button>
              </div>
            )}
            <button className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-success)]" type="button">
              <span className="material-symbols-outlined">mic</span>
            </button>
            {busyAction === "chat" ? (
              <button
                aria-label={t.stopGeneration}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)] transition active:scale-95"
                onClick={stopChat}
                title={t.stopGeneration}
                type="button"
              >
                <span className="material-symbols-outlined">stop_circle</span>
              </button>
            ) : (
              <button
                className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--miva-text)] text-white transition hover:bg-[var(--miva-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={chatSubmitDisabled}
                type="submit"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            )}
          </form>
          {promptFixSaving ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--miva-primary-surface)] px-3 py-2 text-xs font-bold text-[var(--miva-primary)]">
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              <span>Updating this assistant's prompt rules...</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/70">
                <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--miva-primary)]" />
              </span>
            </div>
          ) : null}
          {ttsError && runtimeTtsAvailable && (
            <p className="mt-2 rounded-lg bg-[var(--miva-danger-soft)] px-4 py-2 text-xs font-semibold text-[var(--miva-danger-hover)]">
              TTS failed: {ttsError}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--miva-success)]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[var(--miva-text-muted)]">{chatLatencyMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--miva-primary)]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[var(--miva-text-muted)]">{chatMessageMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--miva-text-muted)]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[var(--miva-text-muted)]">{chatProviderMetric}</span>
            </div>
            {runtimeChat && (
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${runtimeTtsEnabled ? "bg-[var(--miva-success)]" : "bg-[var(--miva-text-soft)]"}`} />
                <span className="text-[11px] font-semibold uppercase tracking-tight text-[var(--miva-text-muted)]">{ttsMetric}</span>
              </div>
            )}
          </div>
          </div>
        </div>
        </section>

        {compactAssistantLauncherVisible && (
          <button
            aria-label={compactAssistantLauncherTitle}
            className={`absolute right-4 top-4 z-40 flex max-w-[210px] items-center gap-2 rounded-[10px] border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] px-3 py-2 text-left shadow-[var(--miva-shadow-sm)] transition ${
              compactAssistantLauncherDisabled ? "cursor-not-allowed opacity-60" : "hover:border-[var(--miva-primary)]"
            }`}
            disabled={compactAssistantLauncherDisabled}
            type="button"
            title={compactAssistantLauncherTitle}
            onClick={openFloatingCharacterWindow}
          >
            <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]">
              <span className="material-symbols-outlined text-[19px]">{characterAsset.icon}</span>
              <span
                className={`absolute -right-0.5 top-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--miva-floating-surface)] ${
                  characterActivity !== "Idle" ? "bg-[var(--miva-primary)] animate-pulse" : "bg-[var(--miva-success)]"
                }`}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-[var(--miva-text)]">{characterSettings.displayName}</span>
              <span className="block text-[10px] text-[var(--miva-text-muted)]">{characterActivity}</span>
            </span>
            <span className="material-symbols-outlined text-[18px] text-[var(--miva-text-muted)]">
              {usesFloatingCharacterWindow ? "picture_in_picture_alt" : "open_in_full"}
            </span>
          </button>
        )}

        {assistantRuntimePanelVisible && (
          <aside className={assistantCardClass} aria-label={t.assistantStageTitle}>
          <div className="relative flex min-h-0 flex-1 overflow-visible text-center">
            <div className="pointer-events-auto absolute left-1 top-1 z-30 inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--miva-text-muted)] shadow-[var(--miva-shadow-sm)] backdrop-blur">
              <span className="material-symbols-outlined text-[16px]">{characterActivityIcon}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                  characterActivity !== "Idle"
                    ? "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]"
                    : "bg-[var(--miva-surface-muted)] text-[var(--miva-text-muted)]"
                }`}
              >
                {characterActivity}
              </span>
            </div>
            <div className="pointer-events-auto absolute right-1 top-1 z-30 flex items-center gap-1.5">
              <button
                aria-label="Minimize assistant panel"
                className="grid h-9 w-9 place-items-center rounded-[9px] border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] text-[var(--miva-text-muted)] shadow-[var(--miva-shadow-sm)] backdrop-blur transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                type="button"
                title="Minimize"
                onClick={() => setAssistantPanelMinimized(true)}
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>
            <div className="absolute bottom-8 left-1/2 z-20 grid h-64 w-64 -translate-x-1/2 place-items-center overflow-hidden text-[var(--miva-primary)] drop-shadow-[var(--miva-character-shadow)]">
              {characterAsset.previewImage ? (
                <img alt={`${characterSettings.displayName} character preview`} className="h-full w-full object-contain" src={characterAsset.previewImage} />
              ) : (
                <span className="grid h-32 w-32 place-items-center rounded-full bg-[var(--miva-primary-soft)]">
                  <span className="material-symbols-outlined text-[64px]">{characterAsset.icon}</span>
                </span>
              )}
              <span
                className={`absolute -right-1 top-8 h-5 w-5 rounded-full border-4 border-[var(--miva-surface)] ${
                  characterActivity !== "Idle" ? "bg-[var(--miva-primary)] animate-pulse" : "bg-[var(--miva-success)]"
                }`}
              />
            </div>
          </div>
        </aside>
        )}
      </div>
    );
}
