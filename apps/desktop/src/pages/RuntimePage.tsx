import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AppMode, ChatMessage, ChatMetrics, OllamaStatus, ProviderId, ProviderMode } from "../types";
import { Badge, PrimaryButton } from "../components/ui";
import { formatChatLatency } from "../utils";

type RuntimePageProps = {
  activeChatMessages: ChatMessage[];
  activeModelLabel: string;
  activeProviderLabel: string;
  activeProviderMode: ProviderMode;
  appMode: AppMode;
  assistantPanelMinimized: boolean;
  busyAction: string | null;
  chatEndRef: RefObject<HTMLDivElement | null>;
  chatInput: string;
  chatIntroKey: string;
  chatMetrics: ChatMetrics | null;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  providerText: Record<string, string>;
  selectedModelInstalled: boolean;
  selectedProvider: ProviderId;
  showChatIntroCard: boolean;
  showJumpToLatest: boolean;
  status: OllamaStatus | null;
  t: Record<string, string>;
  saveSetupAssistantProfile: () => Promise<boolean> | boolean;
  handleChatScroll: () => void;
  scrollChatToLatest: (behavior?: ScrollBehavior) => void;
  sendMessage: () => Promise<void> | void;
  setAppMode: (mode: AppMode) => void;
  setAssistantPanelMinimized: Dispatch<SetStateAction<boolean>>;
  setChatInput: Dispatch<SetStateAction<string>>;
  setDismissedChatIntroKeys: Dispatch<SetStateAction<string[]>>;
};

export function RuntimePage({
  activeChatMessages,
  activeModelLabel,
  activeProviderLabel,
  activeProviderMode,
  appMode,
  assistantPanelMinimized,
  busyAction,
  chatEndRef,
  chatInput,
  chatIntroKey,
  chatMetrics,
  chatScrollRef,
  providerText,
  selectedModelInstalled,
  selectedProvider,
  showChatIntroCard,
  showJumpToLatest,
  status,
  t,
  saveSetupAssistantProfile,
  handleChatScroll,
  scrollChatToLatest,
  sendMessage,
  setAppMode,
  setAssistantPanelMinimized,
  setChatInput,
  setDismissedChatIntroKeys,
}: RuntimePageProps) {
const runtimeChat = appMode === "runtime";
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
    const chatSubmitDisabled = chatUnavailable || busyAction === "chat";
    const chatLatencyMetric = formatChatLatency(chatMetrics?.latencyMs);
    const chatMessageMetric = `Messages: ${activeChatMessages.length}`;
    const chatProviderMetric = `${activeProviderMode === "local" ? "Local" : "Cloud"}: ${activeModelLabel}`;
    const showAssistantRuntimePanel = runtimeChat;
    const chatShellClass = !showAssistantRuntimePanel
      ? "relative mx-auto min-h-[calc(100vh-132px)] max-w-[880px] overflow-visible"
      : assistantPanelMinimized
      ? runtimeChat
        ? "relative mx-auto h-[calc(100vh-132px)] max-w-[1180px] overflow-visible"
        : "relative mx-auto min-h-[calc(100vh-132px)] max-w-[1180px] overflow-visible"
      : runtimeChat
        ? "relative mx-auto grid h-[calc(100vh-132px)] max-w-[1180px] grid-cols-[minmax(0,1fr)_300px] gap-6 overflow-visible"
        : "relative mx-auto grid min-h-[calc(100vh-132px)] max-w-[1180px] grid-cols-[minmax(0,1fr)_300px] gap-6 overflow-visible";
    const chatSectionClass = runtimeChat
      ? "flex min-h-0 flex-col overflow-hidden"
      : "flex flex-col";
    const chatMessagesClass = runtimeChat
      ? "flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-28 pr-1 pt-2"
      : "flex flex-col gap-8 pb-8 pr-1 pt-2";
    const assistantCardClass = runtimeChat
      ? "sticky top-4 flex h-[calc(100vh-156px)] self-start flex-col overflow-hidden rounded-3xl border border-[#c2c7ce] bg-white shadow-[0_18px_48px_rgba(53,96,127,0.10)]"
      : "sticky top-2 flex max-h-[calc(100vh-156px)] self-start flex-col overflow-hidden rounded-3xl border border-[#c2c7ce] bg-white shadow-[0_18px_48px_rgba(53,96,127,0.10)]";

    return (
      <div className={chatShellClass}>
        <section className={chatSectionClass}>
        <div
          className={chatMessagesClass}
          ref={chatScrollRef}
          onScroll={handleChatScroll}
        >
          {appMode === "setup" && (
            <section className="relative overflow-hidden rounded-3xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_18px_48px_rgba(53,96,127,0.10)]">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#cae6ff]/60 blur-3xl" />
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#c9e8cb] text-[#334d38] shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">verified</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#72787e]">Test Chat</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-[#191c1d]">Try this assistant before entering runtime</h2>
                    <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#42474d]">
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
                    setAppMode("runtime");
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

          {showChatIntroCard && (
            <section className="relative rounded-2xl border border-[#c2c7ce] bg-white p-6 shadow-sm">
              <button
                aria-label={t.close}
                className="absolute right-4 top-4 rounded-full p-1 text-[#72787e] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                onClick={() => setDismissedChatIntroKeys((current) => [...current, chatIntroKey])}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="flex items-start gap-4 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#4f7999] text-white">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div>
                  <h2 className="font-heading mb-2 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">
                    {t.chatSandboxTitle}
                  </h2>
                  <p className="text-sm leading-6 text-[#42474d]">
                    {selectedProvider === "ollama" ? (
                      <>
                        {sandboxBody.split(activeModelLabel)[0]}
                        <span className="font-semibold text-[#35607f]">{activeModelLabel}</span>
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
              <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
            </div>
            <div className="rounded-2xl rounded-bl-none border border-[#c2c7ce] bg-white p-4 shadow-[0_8px_24px_rgba(53,96,127,0.08)]">
              <p className="text-sm leading-6 text-[#191c1d]">{greeting}</p>
              <span className="mt-2 block text-right text-[10px] text-[#72787e]">{t.justNow}</span>
            </div>
          </div>

          {activeChatMessages.map((message, index) => (
            <div
              className={`flex max-w-[85%] items-end gap-4 ${message.role === "user" ? "self-end" : "self-start"}`}
              key={`${message.role}-${index}`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
                  <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
                </div>
              )}
              <div
                className={`rounded-2xl border p-4 text-sm leading-6 shadow-[0_8px_24px_rgba(53,96,127,0.08)] ${
                  message.role === "user"
                    ? "rounded-br-none border-[#35607f] bg-[#35607f] text-white"
                    : "rounded-bl-none border-[#c2c7ce] bg-white text-[#191c1d]"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {busyAction === "chat" && (
            <div className="flex max-w-[85%] items-end gap-4 self-start" aria-live="polite">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
                <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
              </div>
              <div className="rounded-2xl rounded-bl-none border border-[#c2c7ce] bg-white p-4 shadow-[0_8px_24px_rgba(53,96,127,0.08)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-[#35607f]">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>{t.generatingResponse}</span>
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="typing-dot" />
                    <span className="typing-dot animation-delay-150" />
                    <span className="typing-dot animation-delay-300" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeChatMessages.length === 0 && (
            <div className="mt-3 flex flex-col items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#72787e]">{t.suggestedAction}</p>
              <button
                className="group flex items-center gap-3 rounded-full border border-[#35607f]/20 bg-[#f3f4f5] px-6 py-3 text-[#35607f] transition-all duration-200 hover:border-[#35607f] hover:bg-[#35607f]/5"
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

        <div className="sticky bottom-0 z-10 bg-[#f8f9fa]/90 pb-2 pt-4 backdrop-blur">
          {showJumpToLatest && (
            <button
              aria-label={t.jumpToLatest}
              className="absolute -top-5 left-1/2 z-20 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-[#c2c7ce] bg-white text-[#35607f] shadow-[0_10px_24px_rgba(53,96,127,0.18)] transition hover:-translate-y-0.5 hover:border-[#35607f]"
              title={t.jumpToLatest}
              type="button"
              onClick={() => scrollChatToLatest()}
            >
              <span className="material-symbols-outlined text-[22px]">arrow_downward</span>
            </button>
          )}

          <form
            className="flex items-center gap-2 rounded-2xl border border-[#c2c7ce] bg-white p-2 shadow-[0_12px_40px_rgba(53,96,127,0.10)]"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <button className="p-3 text-[#72787e] transition hover:text-[#35607f]" type="button">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <textarea
              className="min-h-11 flex-1 resize-none border-none bg-transparent py-3 text-sm text-[#191c1d] outline-none placeholder:text-[#72787e]"
              disabled={chatUnavailable}
              placeholder={busyAction === "chat" ? t.generatingResponse : t.messagePlaceholder}
              rows={1}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (!chatSubmitDisabled) {
                    void sendMessage();
                  }
                }
              }}
            />
            <button className="p-2 text-[#72787e] transition hover:text-[#4a654e]" type="button">
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#35607f] text-white shadow-md transition hover:bg-[#4f7999] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={chatSubmitDisabled}
              type="submit"
            >
              <span className={`material-symbols-outlined ${busyAction === "chat" ? "animate-spin" : ""}`}>
                {busyAction === "chat" ? "progress_activity" : "send"}
              </span>
            </button>
          </form>

          <div className="mt-3 flex justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4a654e]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{chatLatencyMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#35607f]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{chatMessageMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#555d63]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{chatProviderMetric}</span>
            </div>
          </div>
        </div>
        </section>

        {showAssistantRuntimePanel && (assistantPanelMinimized ? (
          <button
            className="absolute right-0 top-0 z-20 flex max-w-[240px] items-center gap-3 rounded-2xl border border-[#c2c7ce] bg-white/95 p-3 text-left shadow-[0_16px_40px_rgba(53,96,127,0.16)] transition hover:border-[#35607f]"
            type="button"
            title="Show assistant panel"
            onClick={() => setAssistantPanelMinimized(false)}
          >
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#35607f] text-white">
              <span className="material-symbols-outlined text-[24px]">smart_toy</span>
              <span
                className={`absolute -right-0.5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  busyAction === "chat" ? "bg-[#35607f] animate-pulse" : "bg-[#4a654e]"
                }`}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#191c1d]">{activeModelLabel}</span>
              <span className="block text-xs font-semibold text-[#72787e]">Assistant profile</span>
            </span>
            <span className="material-symbols-outlined text-[18px] text-[#72787e]">open_in_full</span>
          </button>
        ) : (
          <aside className={assistantCardClass}>
          <div className="border-b border-[#e1e3e4] p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.assistantStageTitle}</p>
              <button
                aria-label="Minimize assistant panel"
                className="grid h-8 w-8 place-items-center rounded-full text-[#72787e] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                type="button"
                title="Minimize"
                onClick={() => setAssistantPanelMinimized(true)}
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>
            <h2 className="mt-2 font-heading text-[22px] font-bold leading-7 text-[#191c1d]">{activeModelLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">{t.assistantStageBody}</p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#cae6ff_0%,#f8f9fa_48%,#ffffff_100%)] p-6 text-center">
            <div className="relative grid h-40 w-40 place-items-center rounded-full bg-[#35607f] text-white shadow-[0_24px_60px_rgba(53,96,127,0.28)]">
              <span className="absolute inset-3 rounded-full border border-white/25" />
              <span className="material-symbols-outlined text-[64px]">smart_toy</span>
              <span
                className={`absolute -right-1 top-8 h-5 w-5 rounded-full border-4 border-white ${
                  busyAction === "chat" ? "bg-[#35607f] animate-pulse" : "bg-[#4a654e]"
                }`}
              />
            </div>

            <h3 className="mt-8 font-heading text-xl font-bold text-[#191c1d]">{t.characterPreview}</h3>
            <p className="mt-3 text-sm leading-6 text-[#42474d]">{t.characterPreviewBody}</p>

            <div className="mt-6 grid w-full gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-[#72787e]">
                  {selectedProvider === "ollama" ? providerText.localRuntimeReady : providerText.cloudRuntimeReady}
                </span>
                <Badge tone={selectedProvider === "ollama" ? (status?.running ? "success" : "neutral") : "action"}>
                  {selectedProvider === "ollama" ? (status?.running ? t.running : t.stopped) : activeProviderLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-[#72787e]">{t.characterIdle}</span>
                <Badge tone={busyAction === "chat" ? "action" : "neutral"}>
                  {busyAction === "chat" ? t.generatingResponse : t.characterListening}
                </Badge>
              </div>
            </div>
          </div>
          </aside>
        ))}
      </div>
    );
}
