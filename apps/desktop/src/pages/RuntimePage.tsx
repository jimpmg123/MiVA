import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppMode, ChatMessage, ChatMetrics, DocumentAttachment, ImageAttachment, OllamaStatus, PromptSettings, ProviderId, ProviderMode } from "../types";
import { PrimaryButton } from "../components/ui";
import { ChatSlashMenu } from "../components/ChatSlashMenu";
import { getCharacterAsset } from "../features/characters/catalog";
import { Live2DStage } from "../features/characters/Live2DStage";
import { useCharacterOverlaySync } from "../features/characters/useCharacterOverlay";
import { isTauriRuntime } from "../app/tauri";
import { useChatSlashMenu } from "../features/chat/useChatSlashMenu";
import { formatChatLatency } from "../utils";

type RuntimePageProps = {
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
  documentAttachments: DocumentAttachment[];
  imageAttachments: ImageAttachment[];
  chatEndRef: RefObject<HTMLDivElement | null>;
  chatInput: string;
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
  saveSetupAssistantProfile: () => Promise<boolean> | boolean;
  handleChatScroll: () => void;
  scrollChatToLatest: (behavior?: ScrollBehavior) => void;
  sendMessage: () => Promise<void> | void;
  stopChat: () => void;
  removeDocumentAttachment: (id: string) => void;
  removeImageAttachment: (id: string) => void;
  setAppMode: (mode: AppMode) => void;
  setAssistantPanelMinimized: Dispatch<SetStateAction<boolean>>;
  setChatInput: Dispatch<SetStateAction<string>>;
  setDismissedChatIntroKeys: Dispatch<SetStateAction<string[]>>;
  setRuntimeTtsEnabled: Dispatch<SetStateAction<boolean>>;
  setRuntimeTtsSpeakingRate: (speakingRate: number) => void;
  setRuntimeTtsVolume: (volume: number) => void;
  stopRuntimeTts: () => void;
};

export function RuntimePage({
  activeChatMessages,
  activeModelLabel,
  activeProviderLabel,
  activeProviderMode,
  appMode,
  assistantPanelMinimized,
  busyAction,
  chatBusyLabel,
  chooseAndAttachDocuments,
  chooseAndAttachImages,
  documentAttachments,
  imageAttachments,
  chatEndRef,
  chatInput,
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
  setDismissedChatIntroKeys,
  setRuntimeTtsEnabled,
  setRuntimeTtsSpeakingRate,
  setRuntimeTtsVolume,
  stopRuntimeTts,
}: RuntimePageProps) {
const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
const previousBusyActionRef = useRef(busyAction);
const previousMessageCountRef = useRef(activeChatMessages.length);
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
  inputRef: chatInputRef,
  disabled: busyAction === "chat",
});
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
    const overlaySyncState = characterRuntimeEnabled && characterSettings.renderer === "live2d"
      ? { character: characterSettings, activity: characterActivity }
      : null;
    const { overlayOpen, toggleOverlay } = useCharacterOverlaySync(overlaySyncState);
    const canUseCharacterOverlay = isTauriRuntime() && Boolean(overlaySyncState);

    useEffect(() => {
      if (overlayOpen) {
        setAssistantPanelMinimized(true);
      }
    }, [overlayOpen, setAssistantPanelMinimized]);
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
    const chatSubmitDisabled = (chatUnavailable && !hasImageAttachments) || busyAction === "chat" || hasPendingAttachments;
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

    useEffect(() => {
      const element = chatInputRef.current;
      if (!element) {
        return;
      }

      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight, 144)}px`;
    }, [chatInput]);

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

    const showAssistantRuntimePanel = characterRuntimeEnabled;
    const chatShellClass = !showAssistantRuntimePanel
      ? "relative mx-auto min-h-0 w-full max-w-[880px] flex-1 overflow-visible"
      : assistantPanelMinimized
      ? runtimeChat
        ? "relative mx-auto min-h-0 w-full max-w-[1180px] flex-1 overflow-visible"
        : "relative mx-auto min-h-0 w-full max-w-[1180px] flex-1 overflow-visible"
      : runtimeChat
        ? "relative mx-auto min-h-0 w-full max-w-[1320px] flex-1 overflow-visible pr-[448px]"
        : "relative mx-auto min-h-0 w-full max-w-[1320px] flex-1 overflow-visible pr-[448px]";
    const chatSectionClass = "flex h-full min-h-0 flex-col overflow-hidden";
    const chatMessagesClass = "miva-scrollbar-hidden flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain pb-6 pt-2";
    const assistantCardClass = runtimeChat
      ? "absolute bottom-0 right-0 top-0 flex w-[420px] flex-col overflow-visible rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] shadow-[var(--miva-shadow-md)]"
      : "absolute bottom-0 right-0 top-0 flex w-[420px] flex-col overflow-visible rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] shadow-[var(--miva-shadow-md)]";

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
          {shouldShowChatIntroCard && (
            <section className="relative rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-6 shadow-sm">
              <button
                aria-label={t.close}
                className="absolute right-4 top-4 rounded-full p-1 text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                onClick={() => setDismissedChatIntroKeys((current) => [...current, chatIntroKey])}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="flex items-start gap-4 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--miva-primary)] text-[var(--miva-on-primary)]">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div>
                  <h2 className="font-heading mb-2 text-[22px] font-semibold leading-[30px] tracking-normal text-[var(--miva-text)]">
                    {t.chatSandboxTitle}
                  </h2>
                  <p className="text-sm leading-6 text-[var(--miva-text-muted)]">
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
              </div>
            </section>
          )}

          <div className="flex max-w-[85%] items-end gap-4 self-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--miva-primary-soft)]">
              <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">bolt</span>
            </div>
            <div className="rounded-lg rounded-bl-none border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4 shadow-[var(--miva-shadow-sm)]">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--miva-text)]">{greeting}</p>
              <span className="mt-2 block text-right text-[10px] text-[var(--miva-text-soft)]">{t.justNow}</span>
            </div>
          </div>

          {activeChatMessages.map((message, index) => {
            const isLastMessage = index === activeChatMessages.length - 1;
            const isStreamingAssistant = message.role === "assistant" && isLastMessage && busyAction === "chat";
            const isAwaitingFirstToken = isStreamingAssistant && !message.content.trim();
            const isStreamingTokens = isStreamingAssistant && Boolean(message.content.trim());
            const generatingLabel = chatBusyLabel || t.generatingResponse;

            return (
              <div
                className={`flex max-w-[85%] items-end gap-4 ${message.role === "user" ? "self-end" : "self-start"}`}
                key={`${message.role}-${index}`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--miva-primary-soft)]">
                    <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">bolt</span>
                  </div>
                )}
                <div
                  className={`whitespace-pre-wrap break-words rounded-lg border p-4 text-sm leading-6 shadow-[var(--miva-shadow-sm)] ${
                    message.role === "user"
                      ? "rounded-br-none border-[var(--miva-primary)] bg-[var(--miva-primary)] text-[var(--miva-on-primary)]"
                      : "rounded-bl-none border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-text)]"
                  }`}
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
                      {message.content}
                      {isStreamingTokens ? (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[var(--miva-primary)] align-[-2px]" aria-hidden="true" />
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {activeChatMessages.length === 0 && (
            <div className="mt-3 flex flex-col items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--miva-text-soft)]">{t.suggestedAction}</p>
              <button
                className="group flex items-center gap-3 rounded-full border border-[var(--miva-border)] bg-[var(--miva-surface-muted)] px-6 py-3 text-[var(--miva-primary)] transition-all duration-200 hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
                onClick={() => setChatInput(t.suggestedPrompt)}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="text-sm font-medium italic">{t.suggestedPrompt}</span>
                <span className="material-symbols-outlined translate-x-1 text-sm opacity-0 transition-opacity group-hover:opacity-100">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
          <div ref={chatEndRef} className="h-1 shrink-0" />
        </div>

        <div className="relative z-10 shrink-0 border-t border-[var(--miva-border)] bg-[var(--miva-input-bar-bg)] pb-1 pt-4 backdrop-blur">
          {showJumpToLatest && (
            <button
              aria-label={t.jumpToLatest}
              className="absolute -top-5 left-1/2 z-20 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-primary)] shadow-[var(--miva-shadow-md)] transition hover:-translate-y-0.5 hover:border-[var(--miva-primary)]"
              title={t.jumpToLatest}
              type="button"
              onClick={() => scrollChatToLatest("smooth")}
            >
              <span className="material-symbols-outlined text-[22px]">arrow_downward</span>
            </button>
          )}

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
              {documentAttachments.map((attachment) => (
                <div className="relative flex min-w-[140px] items-center gap-2 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-2 text-xs font-semibold text-[var(--miva-text-muted)]" key={attachment.id}>
                  <span className="material-symbols-outlined text-[16px] text-[var(--miva-primary)]">description</span>
                  <span className="truncate">{attachment.name}</span>
                  <button
                    aria-label={`Remove ${attachment.name}`}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[var(--miva-text-soft)] hover:text-[var(--miva-danger-hover)]"
                    onClick={() => removeDocumentAttachment(attachment.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}

          <form
            className="relative flex items-center gap-2 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-2 shadow-[var(--miva-shadow-md)]"
            onSubmit={(event) => {
              event.preventDefault();
              if (slashMenu.menuOpen) {
                return;
              }
              void sendMessage();
              focusChatInput();
            }}
          >
            {slashMenu.menuOpen && (
              <ChatSlashMenu
                activeIndex={slashMenu.activeIndex}
                commands={slashMenu.filteredCommands}
                onHighlight={slashMenu.setActiveIndex}
                onSelect={(command) => slashMenu.selectCommand(command)}
              />
            )}
            <button
              className="p-3 text-[var(--miva-text-muted)] transition hover:text-[var(--miva-primary)]"
              onClick={() => void chooseAndAttachImages()}
              title={t.attachImage}
              type="button"
            >
              <span className="material-symbols-outlined">image</span>
            </button>
            <button
              className="p-3 text-[var(--miva-text-muted)] transition hover:text-[var(--miva-primary)]"
              onClick={() => void chooseAndAttachDocuments()}
              title="Attach document"
              type="button"
            >
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <textarea
              aria-busy={chatGenerating}
              className="miva-scrollbar-hidden max-h-[9rem] min-h-11 flex-1 resize-none overflow-y-auto border-none bg-transparent py-3 text-sm leading-6 text-[var(--miva-text)] outline-none placeholder:text-[var(--miva-text-soft)]"
              placeholder={chatGenerating ? t.generatingResponse : t.messagePlaceholder}
              readOnly={chatGenerating}
              ref={chatInputRef}
              rows={1}
              value={chatInput}
              onChange={(event) => {
                event.currentTarget.style.height = "auto";
                event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 144)}px`;
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
                    void sendMessage();
                    focusChatInput();
                  }
                }
              }}
              onSelect={(event) => slashMenu.syncCaret(event.currentTarget)}
            />
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
            <button className="p-2 text-[var(--miva-text-muted)] transition hover:text-[var(--miva-success)]" type="button">
              <span className="material-symbols-outlined">mic</span>
            </button>
            {busyAction === "chat" ? (
              <button
                aria-label={t.stopGeneration}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)] shadow-md transition hover:bg-[var(--miva-danger-soft)] active:scale-95"
                onClick={stopChat}
                title={t.stopGeneration}
                type="button"
              >
                <span className="material-symbols-outlined">stop_circle</span>
              </button>
            ) : (
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--miva-primary)] text-[var(--miva-on-primary)] shadow-md transition hover:bg-[var(--miva-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={chatSubmitDisabled}
                type="submit"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            )}
          </form>
          {ttsError && runtimeTtsAvailable && (
            <p className="mt-2 rounded-lg bg-[var(--miva-danger-soft)] px-4 py-2 text-xs font-semibold text-[var(--miva-danger-hover)]">
              TTS failed: {ttsError}
            </p>
          )}

          <div className="mt-2 flex justify-center gap-6">
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
        </section>

        {showAssistantRuntimePanel && (assistantPanelMinimized ? (
          <button
            className="absolute right-0 top-0 z-20 flex max-w-[220px] items-center gap-3 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] p-3 text-left shadow-[var(--miva-shadow-md)] transition hover:border-[var(--miva-primary)]"
            type="button"
            title="Show assistant panel"
            onClick={() => setAssistantPanelMinimized(false)}
          >
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--miva-primary)] text-[var(--miva-on-primary)]">
              <span className="material-symbols-outlined text-[24px]">{characterAsset.icon}</span>
              <span
                className={`absolute -right-0.5 top-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--miva-floating-surface)] ${
                  characterActivity !== "Idle" ? "bg-[var(--miva-primary)] animate-pulse" : "bg-[var(--miva-success)]"
                }`}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[var(--miva-text)]">{characterSettings.displayName}</span>
              <span className="block text-xs font-semibold text-[var(--miva-text-muted)]">{characterActivity}</span>
            </span>
            <span className="material-symbols-outlined text-[18px] text-[var(--miva-text-muted)]">open_in_full</span>
          </button>
        ) : (
          <aside className={assistantCardClass} aria-label={t.assistantStageTitle}>
          <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,var(--miva-primary-soft)_0%,var(--miva-bg-soft)_48%,var(--miva-surface)_100%)] text-center">
            <div className="absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] px-3 py-2 text-[11px] font-bold text-[var(--miva-text-muted)] shadow-[var(--miva-shadow-sm)] backdrop-blur">
              <span className="material-symbols-outlined text-[16px]">{characterActivityIcon}</span>
              <span>Character state</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  characterActivity !== "Idle"
                    ? "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]"
                    : "bg-[var(--miva-surface-muted)] text-[var(--miva-text-muted)]"
                }`}
              >
                {characterActivity}
              </span>
            </div>
            <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
              {canUseCharacterOverlay && (
                <button
                  aria-label={overlayOpen ? "Close floating character window" : "Open floating character window"}
                  className={`grid h-10 w-10 place-items-center rounded-full border shadow-[var(--miva-shadow-sm)] backdrop-blur transition ${
                    overlayOpen
                      ? "border-[var(--miva-primary)] bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]"
                      : "border-[var(--miva-border)] bg-[var(--miva-floating-surface)] text-[var(--miva-text-muted)] hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                  }`}
                  type="button"
                  title={overlayOpen ? "Close floating window" : "Open floating window"}
                  onClick={() => void toggleOverlay()}
                >
                  <span className="material-symbols-outlined text-[20px]">picture_in_picture_alt</span>
                </button>
              )}
              <button
                aria-label="Minimize assistant panel"
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] text-[var(--miva-text-muted)] shadow-[var(--miva-shadow-sm)] backdrop-blur transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                type="button"
                title="Minimize"
                onClick={() => setAssistantPanelMinimized(true)}
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>
            {characterSettings.renderer === "live2d" ? (
              <div className="relative z-20 h-full min-h-0 flex-1 overflow-visible px-2 pt-10">
                <Live2DStage
                  activity={characterActivity}
                  bottomReservePx={240}
                  character={characterSettings}
                  topReservePx={56}
                />
              </div>
            ) : (
              <div className="absolute left-1/2 top-1/2 z-20 grid h-64 w-64 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full bg-[var(--miva-primary)] text-[var(--miva-on-primary)] shadow-[var(--miva-character-shadow)]">
                <span className="absolute inset-3 rounded-full border border-white/25" />
                {characterAsset.previewImage ? (
                  <img alt={`${characterSettings.displayName} character preview`} className="h-full w-full object-cover" src={characterAsset.previewImage} />
                ) : (
                  <span className="material-symbols-outlined text-[64px]">{characterAsset.icon}</span>
                )}
                <span
                  className={`absolute -right-1 top-8 h-5 w-5 rounded-full border-4 border-[var(--miva-surface)] ${
                    characterActivity !== "Idle" ? "bg-[var(--miva-primary)] animate-pulse" : "bg-[var(--miva-success)]"
                  }`}
                />
              </div>
            )}
          </div>
          </aside>
        ))}
      </div>
    );
}
