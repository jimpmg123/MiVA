import { useCallback, useEffect, useState } from "react";
import type { PromptSettings, SttProviderId, TtsProviderId } from "../types";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import { getVoiceWorkerStatus, startVoiceWorker } from "../features/voice/voiceRuntime";
import type { VoiceWorkerStatus } from "../types";

type VoiceStudioPanelProps = {
  settings: PromptSettings;
  onPromptSettingsChange: (updater: (current: PromptSettings) => PromptSettings) => void;
};

type ProviderOption<T extends string> = {
  id: T;
  title: string;
  body: string;
  badge: string;
  icon: string;
};

const sttOptions: Array<ProviderOption<SttProviderId>> = [
  {
    id: "browser",
    title: "Browser speech recognition",
    body: "Fast prototype path for microphone transcripts when the platform supports Web Speech APIs.",
    badge: "Prototype",
    icon: "mic",
  },
  {
    id: "localWhisper",
    title: "Local Whisper",
    body: "Future local STT path for offline transcription. This will need a bundled runtime or optional Python tools.",
    badge: "Planned",
    icon: "memory",
  },
  {
    id: "cloud",
    title: "Cloud STT",
    body: "Future API-based transcription for better quality when the user accepts cloud processing.",
    badge: "Planned",
    icon: "cloud",
  },
  {
    id: "disabled",
    title: "Text only",
    body: "Keep microphone input disabled for this assistant.",
    badge: "Off",
    icon: "keyboard",
  },
];

const ttsOptions: Array<ProviderOption<TtsProviderId>> = [
  {
    id: "browser",
    title: "Browser voice",
    body: "Use the operating system or browser-provided voices for the first speaking prototype.",
    badge: "Prototype",
    icon: "record_voice_over",
  },
  {
    id: "localVoice",
    title: "Kokoro local voice",
    body: "Use the optional Python voice worker for local Kokoro speech output.",
    badge: "Local",
    icon: "graphic_eq",
  },
  {
    id: "cloud",
    title: "Cloud TTS",
    body: "Future API-based voice generation for higher quality voices.",
    badge: "Planned",
    icon: "cloud",
  },
  {
    id: "disabled",
    title: "Silent runtime",
    body: "Keep spoken responses disabled for this assistant.",
    badge: "Off",
    icon: "volume_off",
  },
];

function OptionCard<T extends string>({
  active,
  option,
  onSelect,
}: {
  active: boolean;
  option: ProviderOption<T>;
  onSelect: (id: T) => void;
}) {
  return (
    <button
      className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
        active ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
      }`}
      onClick={() => onSelect(option.id)}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
          <span className="material-symbols-outlined text-[22px]">{option.icon}</span>
        </span>
        <Badge tone={active ? "action" : "neutral"}>{active ? "Selected" : option.badge}</Badge>
      </div>
      <h4 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{option.title}</h4>
      <p className="mt-2 text-sm leading-6 text-[#42474d]">{option.body}</p>
    </button>
  );
}

export function VoiceStudioPanel({ settings, onPromptSettingsChange }: VoiceStudioPanelProps) {
  const voice = settings.voice;
  const [workerStatus, setWorkerStatus] = useState<VoiceWorkerStatus | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [workerBusy, setWorkerBusy] = useState(false);

  const refreshVoiceWorker = useCallback(async () => {
    setWorkerBusy(true);
    setWorkerError(null);
    try {
      setWorkerStatus(await getVoiceWorkerStatus());
    } catch (error) {
      setWorkerStatus(null);
      setWorkerError(String(error));
    } finally {
      setWorkerBusy(false);
    }
  }, []);

  const runVoiceWorker = useCallback(async () => {
    setWorkerBusy(true);
    setWorkerError(null);
    try {
      setWorkerStatus(await startVoiceWorker());
    } catch (error) {
      setWorkerError(String(error));
    } finally {
      setWorkerBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshVoiceWorker();
  }, [refreshVoiceWorker]);

  const updateVoice = (updater: (voice: PromptSettings["voice"]) => PromptSettings["voice"]) => {
    onPromptSettingsChange((current) => ({
      ...current,
      voice: updater(current.voice),
    }));
  };

  const selectSttProvider = (provider: SttProviderId) => {
    updateVoice((current) => ({
      ...current,
      enabled: provider !== "disabled" || current.tts.enabled,
      stt: {
        ...current.stt,
        enabled: provider !== "disabled",
        provider,
      },
    }));
  };

  const selectTtsProvider = (provider: TtsProviderId) => {
    updateVoice((current) => ({
      ...current,
      enabled: current.stt.enabled || provider !== "disabled",
      tts: {
        ...current.tts,
        enabled: provider !== "disabled",
        provider,
      },
    }));
  };

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Voice workspace</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Prepare STT and TTS for this assistant</h3>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#42474d]">
              This page stores voice preferences now. Runtime microphone input, transcripts, spoken responses, and character voice reactions can be connected on top of these settings later.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone={voice.enabled ? "success" : "neutral"}>{voice.enabled ? "Voice enabled" : "Voice off"}</Badge>
            <Badge>{voice.stt.enabled ? "STT ready" : "STT off"}</Badge>
            <Badge>{voice.tts.enabled ? "TTS ready" : "TTS off"}</Badge>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Python voice worker</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Optional local voice runtime</h3>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#42474d]">
              Local STT/TTS engines will run in a separate Python worker so the main desktop app stays lightweight. The worker is only needed when users install local voice models.
            </p>
          </div>
          <Badge tone={workerStatus?.running ? "success" : "neutral"}>
            {workerBusy ? "Checking" : workerStatus?.running ? "Running" : "Not running"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Endpoint", workerStatus?.baseUrl ?? "http://127.0.0.1:43120"],
            ["Python", workerStatus?.python?.version ?? "Not detected"],
            ["Engines", workerStatus?.engines?.tts?.installed ? "Kokoro TTS ready" : workerStatus?.running ? "Kokoro not installed" : "Worker offline"],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-[#f3f4f5] p-4" key={label}>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{label}</p>
              <p className="mt-2 break-words text-sm font-semibold text-[#191c1d]">{value}</p>
            </div>
          ))}
        </div>

        {workerError && (
          <div className="mt-4 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">
            {workerError}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <SecondaryButton disabled={workerBusy} onClick={() => void refreshVoiceWorker()}>
            Refresh status
          </SecondaryButton>
          <PrimaryButton disabled={workerBusy || workerStatus?.running} onClick={() => void runVoiceWorker()}>
            Start voice worker
          </PrimaryButton>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Speech to text</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Choose how speech becomes chat input</h3>
          </div>
          <Badge tone={voice.stt.enabled ? "action" : "neutral"}>{voice.stt.provider}</Badge>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {sttOptions.map((option) => (
            <OptionCard
              active={voice.stt.provider === option.id}
              key={option.id}
              option={option}
              onSelect={selectSttProvider}
            />
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Recording behavior</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Toggle recording</h3>
          </div>
          <Badge>Toggle recording</Badge>
        </div>
        <div className="mt-4 rounded-xl bg-[#f3f4f5] p-4 text-sm leading-6 text-[#42474d]">
          Runtime voice will use one microphone control: tap once to start recording, tap again to stop. Recognized speech can be shown or hidden with the transcript option below.
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#72787e]">Recognition language</span>
            <input
              className="mt-2 w-full rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm font-semibold text-[#191c1d] outline-none transition focus:border-[#35607f] focus:ring-4 focus:ring-[#cae6ff]"
              value={voice.stt.language}
              onChange={(event) => updateVoice((current) => ({
                ...current,
                stt: { ...current.stt, language: event.target.value },
              }))}
            />
          </label>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">Text to speech</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[#191c1d]">Choose how MiVA speaks responses</h3>
          </div>
          <Badge tone={voice.tts.enabled ? "action" : "neutral"}>{voice.tts.provider}</Badge>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {ttsOptions.map((option) => (
            <OptionCard
              active={voice.tts.provider === option.id}
              key={option.id}
              option={option}
              onSelect={selectTtsProvider}
            />
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#72787e]">Voice ID</span>
            <input
              className="mt-2 w-full rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm font-semibold text-[#191c1d] outline-none transition focus:border-[#35607f] focus:ring-4 focus:ring-[#cae6ff]"
              value={voice.tts.voiceId}
              onChange={(event) => updateVoice((current) => ({
                ...current,
                tts: { ...current.tts, voiceId: event.target.value },
              }))}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#72787e]">Speaking rate</span>
            <input
              className="mt-2 w-full accent-[#35607f]"
              max={2}
              min={0.5}
              step={0.1}
              type="range"
              value={voice.tts.speakingRate}
              onChange={(event) => updateVoice((current) => ({
                ...current,
                tts: { ...current.tts, speakingRate: Number(event.target.value) },
              }))}
            />
            <span className="mt-1 block text-sm font-semibold text-[#42474d]">{voice.tts.speakingRate.toFixed(1)}x</span>
          </label>
        </div>
      </Panel>

      <Panel>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              checked: voice.tts.autoSpeak,
              title: "Auto-speak assistant replies",
              body: "Speak runtime responses automatically after the model finishes.",
              onChange: (checked: boolean) => updateVoice((current) => ({
                ...current,
                tts: { ...current.tts, autoSpeak: checked },
              })),
            },
            {
              checked: voice.runtime.interruptOnUserSpeech,
              title: "Interrupt on user speech",
              body: "Stop speaking when the user starts talking.",
              onChange: (checked: boolean) => updateVoice((current) => ({
                ...current,
                runtime: { ...current.runtime, interruptOnUserSpeech: checked },
              })),
            },
            {
              checked: voice.runtime.showTranscripts,
              title: "Show transcripts",
              body: "Display recognized speech before or after sending it to chat.",
              onChange: (checked: boolean) => updateVoice((current) => ({
                ...current,
                runtime: { ...current.runtime, showTranscripts: checked },
              })),
            },
          ].map((item) => (
            <label className="flex items-start gap-3 rounded-2xl bg-[#f3f4f5] p-4" key={item.title}>
              <input
                checked={item.checked}
                className="mt-1 h-4 w-4 accent-[#35607f]"
                onChange={(event) => item.onChange(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-bold text-[#191c1d]">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[#72787e]">{item.body}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>
    </div>
  );
}
