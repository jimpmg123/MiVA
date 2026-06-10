import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptSettings, SttProviderId, TtsProviderId } from "../types";
import { Badge, InfoTile, Input, Panel, PrimaryButton, SecondaryButton, SectionHeader, Select, SelectionOptionCard, StatusAlert, Switch } from "../components/ui";
import {
  getKokoroPythonRuntime,
  getVoiceWorkerStatus,
  installKokoroTts,
  startVoiceWorker,
  synthesizeVoice,
} from "../features/voice/voiceRuntime";
import type { VoiceWorkerStatus } from "../types";

type VoiceStudioPanelProps = {
  settings: PromptSettings;
  onOpenPythonSetup: () => void;
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

const fallbackKokoroVoices = [
  { id: "af_heart", label: "Heart", language: "American English", gender: "Female" },
  { id: "af_bella", label: "Bella", language: "American English", gender: "Female" },
  { id: "af_nicole", label: "Nicole", language: "American English", gender: "Female" },
  { id: "af_nova", label: "Nova", language: "American English", gender: "Female" },
  { id: "af_sarah", label: "Sarah", language: "American English", gender: "Female" },
  { id: "af_sky", label: "Sky", language: "American English", gender: "Female" },
  { id: "am_adam", label: "Adam", language: "American English", gender: "Male" },
  { id: "am_echo", label: "Echo", language: "American English", gender: "Male" },
  { id: "am_eric", label: "Eric", language: "American English", gender: "Male" },
  { id: "am_liam", label: "Liam", language: "American English", gender: "Male" },
  { id: "am_puck", label: "Puck", language: "American English", gender: "Male" },
  { id: "bf_alice", label: "Alice", language: "British English", gender: "Female" },
  { id: "bf_emma", label: "Emma", language: "British English", gender: "Female" },
  { id: "bf_lily", label: "Lily", language: "British English", gender: "Female" },
  { id: "bm_daniel", label: "Daniel", language: "British English", gender: "Male" },
  { id: "bm_george", label: "George", language: "British English", gender: "Male" },
  { id: "bm_lewis", label: "Lewis", language: "British English", gender: "Male" },
  { id: "jf_alpha", label: "Alpha", language: "Japanese", gender: "Female" },
  { id: "jf_gongitsune", label: "Gongitsune", language: "Japanese", gender: "Female" },
  { id: "jm_kumo", label: "Kumo", language: "Japanese", gender: "Male" },
  { id: "zf_xiaobei", label: "Xiaobei", language: "Mandarin Chinese", gender: "Female" },
  { id: "zf_xiaoxiao", label: "Xiaoxiao", language: "Mandarin Chinese", gender: "Female" },
  { id: "zm_yunjian", label: "Yunjian", language: "Mandarin Chinese", gender: "Male" },
  { id: "zm_yunxi", label: "Yunxi", language: "Mandarin Chinese", gender: "Male" },
];

const TEST_VOICE_TEXT = "Hello, my name is Miva, your customized AI assistant";

export function VoiceStudioPanel({
  settings,
  onOpenPythonSetup,
  onPromptSettingsChange,
}: VoiceStudioPanelProps) {
  const voice = settings.voice;
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const [workerStatus, setWorkerStatus] = useState<VoiceWorkerStatus | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [workerNotice, setWorkerNotice] = useState<string | null>(null);
  const [workerBusy, setWorkerBusy] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [testVoiceBusy, setTestVoiceBusy] = useState(false);

  const refreshVoiceWorker = useCallback(async () => {
    setWorkerBusy(true);
    setWorkerError(null);
    try {
      setWorkerStatus(await getVoiceWorkerStatus());
    } catch (error) {
      setWorkerStatus(null);
      const message = error instanceof Error ? error.message : String(error);
      setWorkerError(/failed to fetch/i.test(message)
        ? "Local helper에 연결하지 못했습니다. MiVA 앱이 실행 중인지 확인한 뒤 Refresh status를 다시 눌러 주세요."
        : message);
    } finally {
      setWorkerBusy(false);
    }
  }, []);

  const runVoiceWorker = useCallback(async () => {
    setWorkerBusy(true);
    setWorkerError(null);
    setWorkerNotice(null);
    try {
      const python = await getKokoroPythonRuntime();
      if (!python.meetsMinimum || !python.command) {
        setWorkerError("Python 3.12 is required. Open Initial Setup to install it.");
        return;
      }
      setWorkerStatus(await startVoiceWorker(python.command));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkerError(/failed to fetch/i.test(message)
        ? "Local helper에 연결하지 못했습니다. MiVA 앱이 실행 중인지 확인한 뒤 다시 시도해 주세요."
        : message);
    } finally {
      setWorkerBusy(false);
    }
  }, []);

  const installKokoro = useCallback(async () => {
    setInstallBusy(true);
    setWorkerError(null);
    setWorkerNotice(null);
    try {
      const python = await getKokoroPythonRuntime();
      if (!python.meetsMinimum || !python.command) {
        onOpenPythonSetup();
        return;
      }
      const result = await installKokoroTts(python.command);
      setWorkerStatus(result.status);
      setWorkerNotice(result.message || "Kokoro TTS dependencies installed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkerError(/failed to fetch/i.test(message)
        ? "Local helper에 연결하지 못했습니다. MiVA 앱이 실행 중인지 확인한 뒤 다시 시도해 주세요."
        : message);
    } finally {
      setInstallBusy(false);
    }
  }, [onOpenPythonSetup]);

  useEffect(() => {
    void refreshVoiceWorker();
  }, [refreshVoiceWorker]);

  useEffect(() => () => {
    testAudioRef.current?.pause();
    testAudioRef.current = null;
  }, []);

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

  const ttsInstalled = workerStatus?.engines?.tts?.installed === true;
  const ttsDependencies = workerStatus?.engines?.tts?.dependencies ?? {};
  const kokoroVoices = workerStatus?.engines?.tts?.voices?.length
    ? workerStatus.engines.tts.voices
    : fallbackKokoroVoices;
  const selectedVoiceKnown = kokoroVoices.some((option) => option.id === voice.tts.voiceId);
  const assistantVoiceEnabled = voice.enabled && (voice.stt.enabled || voice.tts.enabled);
  const kokoroVoiceEnabled = voice.tts.enabled && voice.tts.provider === "localVoice";
  const ttsConfigured = voice.tts.enabled && voice.tts.provider !== "disabled";
  const sttConfigured = voice.stt.enabled && voice.stt.provider !== "disabled";
  const canTestKokoroVoice = ttsInstalled && !testVoiceBusy;
  const toggleKokoroVoice = () => {
    updateVoice((current) => {
      const nextTtsEnabled = !(current.tts.enabled && current.tts.provider === "localVoice");
      return {
        ...current,
        enabled: current.stt.enabled || nextTtsEnabled,
        tts: {
          ...current.tts,
          enabled: nextTtsEnabled,
          provider: nextTtsEnabled ? "localVoice" : "disabled",
        },
      };
    });
  };
  const playTestVoice = useCallback(async () => {
    setTestVoiceBusy(true);
    setWorkerError(null);
    setWorkerNotice(null);

    try {
      testAudioRef.current?.pause();
      testAudioRef.current = null;
      const result = await synthesizeVoice({
        text: TEST_VOICE_TEXT,
        provider: "kokoro",
        voiceId: voice.tts.voiceId || "af_heart",
        speakingRate: voice.tts.speakingRate,
        language: "en",
      });

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(`data:${result.mimeType};base64,${result.audioBase64}`);
        audio.volume = voice.tts.volume;
        testAudioRef.current = audio;
        audio.onended = () => {
          testAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          testAudioRef.current = null;
          reject(new Error("Audio playback failed."));
        };
        void audio.play().catch((error) => {
          testAudioRef.current = null;
          reject(error);
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkerError(/failed to fetch|error sending request/i.test(message)
        ? "Local voice engine is not ready. Check the worker status and try again."
        : message);
    } finally {
      setTestVoiceBusy(false);
    }
  }, [voice.tts.speakingRate, voice.tts.voiceId, voice.tts.volume]);
  const installSteps = [
    "Check active Python runtime",
    "Install Kokoro, SoundFile, and NumPy",
    "Refresh local TTS engine status",
  ];

  return (
    <div className="grid gap-6">
      <Panel>
        <SectionHeader
          eyebrow="Voice workspace"
          title="Prepare STT and TTS for this assistant"
          body="This page stores per-assistant voice preferences. Worker status below only means the local runtime is available; these badges show whether this assistant is configured to use voice."
          actions={
            <>
              <SecondaryButton
                aria-pressed={kokoroVoiceEnabled}
                className="h-9 px-3 text-xs"
                onClick={toggleKokoroVoice}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {kokoroVoiceEnabled ? "volume_off" : "graphic_eq"}
                </span>
                {kokoroVoiceEnabled ? "Disable Kokoro" : "Enable Kokoro"}
              </SecondaryButton>
              <Badge tone={assistantVoiceEnabled ? "success" : "neutral"}>{assistantVoiceEnabled ? "Assistant voice on" : "Assistant voice off"}</Badge>
              <Badge tone={sttConfigured ? "action" : "neutral"}>{sttConfigured ? "STT setting on" : "STT setting off"}</Badge>
              <Badge tone={ttsConfigured ? "action" : "neutral"}>{ttsConfigured ? "TTS setting on" : "TTS setting off"}</Badge>
            </>
          }
        />
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Python voice worker"
          title="Optional local voice runtime"
          body="Local STT/TTS engines run in a separate Python worker so the main desktop app stays lightweight. This status is separate from the assistant voice settings above."
          actions={
            <>
              <Badge tone={workerStatus?.running ? "success" : "neutral"}>
                {workerBusy ? "Checking worker" : workerStatus?.running ? "Worker running" : "Worker not running"}
              </Badge>
              <Badge tone={ttsInstalled ? "success" : "neutral"}>
                {ttsInstalled ? "Kokoro ready" : "Kokoro missing"}
              </Badge>
            </>
          }
        />

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Endpoint", workerStatus?.baseUrl ?? "http://127.0.0.1:43120"],
            ["Python", workerStatus?.python?.version ?? "Not detected"],
            ["Engines", workerStatus?.engines?.tts?.installed ? "Kokoro TTS ready" : workerStatus?.running ? "Kokoro not installed" : "Worker offline"],
          ].map(([label, value]) => (
            <InfoTile className="p-4" key={label} label={label} value={value} />
          ))}
        </div>

        {voice.tts.provider === "localVoice" && !ttsInstalled && (
          <div className="mt-4">
            <StatusAlert tone="warning">
              Kokoro is required for local voice output. Install it for the current Python runtime, then refresh the status.
            </StatusAlert>
          </div>
        )}

        {workerError && (
          <div className="mt-4"><StatusAlert tone="danger">{workerError}</StatusAlert></div>
        )}

        {workerNotice && (
          <div className="mt-4"><StatusAlert tone="success">{workerNotice}</StatusAlert></div>
        )}

        <div className="mt-5 grid gap-3 rounded-lg bg-[var(--miva-bg-soft)] p-4 text-sm text-[var(--miva-text-muted)] md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Kokoro", ttsDependencies.kokoro ? "installed" : "missing"],
            ["SoundFile", ttsDependencies.soundfile ? "installed" : "missing"],
            ["NumPy", ttsDependencies.numpy ? "installed" : "missing"],
            ["Japanese speech", ttsDependencies.japanese ? "ready" : "optional"],
            ["Japanese tokenizer", ttsDependencies.misaki && ttsDependencies.fugashi && ttsDependencies.unidicLite ? "ready" : "optional"],
            ["espeak", ttsDependencies.espeak ? "available" : "optional"],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{label}</span>
              <span className="mt-1 block font-semibold text-[var(--miva-text)]">{value}</span>
            </div>
          ))}
        </div>

        {(installBusy || (!ttsInstalled && voice.tts.provider === "localVoice")) && (
          <div className={`mt-5 rounded-lg border p-5 ${
            installBusy ? "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)]" : "border-[var(--miva-border)] bg-[var(--miva-bg-soft)]"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Kokoro setup</p>
                <h4 className="mt-1 font-heading text-lg font-bold text-[var(--miva-text)]">
                  {installBusy ? "Installing local TTS dependencies" : "Local TTS is not installed yet"}
                </h4>
              </div>
              <Badge tone={installBusy ? "action" : "neutral"}>
                {installBusy ? "Installing" : "Required for Kokoro"}
              </Badge>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--miva-surface-muted)] shadow-inner">
              <div
                className={`h-full rounded-full bg-[var(--miva-primary)] transition-all ${
                  installBusy ? "w-2/3 animate-pulse" : "w-1/6"
                }`}
              />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {installSteps.map((step, index) => (
                <div
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                    installBusy
                      ? index === 1
                        ? "bg-[var(--miva-control-active-bg)] text-[var(--miva-control-active-text)] shadow-sm"
                        : "bg-[var(--miva-surface-muted)] text-[var(--miva-text-muted)]"
                      : "bg-[var(--miva-surface)] text-[var(--miva-text-muted)]"
                  }`}
                  key={step}
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--miva-text-muted)]">
              {installBusy
                ? "This can take several minutes on the first install. Keep MiVA open while Python downloads the packages."
                : "Click Install Kokoro to add the optional local TTS packages to the current Python runtime."}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <SecondaryButton disabled={workerBusy || installBusy} onClick={() => void refreshVoiceWorker()}>
            Refresh status
          </SecondaryButton>
          <PrimaryButton disabled={workerBusy || installBusy || workerStatus?.running} onClick={() => void runVoiceWorker()}>
            Start voice worker
          </PrimaryButton>
          <PrimaryButton disabled={installBusy || ttsInstalled} onClick={() => void installKokoro()}>
            {installBusy ? "Installing Kokoro..." : ttsInstalled ? "Kokoro installed" : "Install Kokoro"}
          </PrimaryButton>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Speech to text"
          title="Choose how speech becomes chat input"
          body="STT settings are stored in this assistant profile. Planned providers are visible now, but only connected runtimes can actually transcribe audio."
          actions={<Badge tone={sttConfigured ? "action" : "neutral"}>{sttConfigured ? voice.stt.provider : "STT off"}</Badge>}
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {sttOptions.map((option) => (
            <SelectionOptionCard
              active={voice.stt.provider === option.id}
              description={option.body}
              icon={<span className="material-symbols-outlined text-[22px]">{option.icon}</span>}
              key={option.id}
              onClick={() => selectSttProvider(option.id)}
              title={option.title}
              trailing={<Badge tone={voice.stt.provider === option.id ? "action" : "neutral"}>{voice.stt.provider === option.id ? "Selected" : option.badge}</Badge>}
            />
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Recording behavior"
          title="Toggle recording"
          actions={<Badge>Toggle recording</Badge>}
        />
        <div className="mt-4">
          <StatusAlert>
            Runtime voice will use one microphone control: tap once to start recording, tap again to stop. Recognized speech can be shown or hidden with the transcript option below.
          </StatusAlert>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Recognition language</span>
            <Input
              className="mt-2 w-full font-semibold"
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
        <SectionHeader
          eyebrow="Text to speech"
          title="Choose how MiVA speaks responses"
          body="TTS controls whether runtime shows spoken-response controls. The Python worker can be running while this assistant's TTS setting remains off."
          actions={
            <>
              <Badge tone={ttsConfigured ? "action" : "neutral"}>{ttsConfigured ? voice.tts.provider : "TTS off"}</Badge>
              {voice.tts.provider === "localVoice" && <Badge tone={ttsInstalled ? "success" : "neutral"}>{ttsInstalled ? "Kokoro ready" : "Install needed"}</Badge>}
            </>
          }
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {ttsOptions.map((option) => (
            <SelectionOptionCard
              active={voice.tts.provider === option.id}
              description={option.body}
              icon={<span className="material-symbols-outlined text-[22px]">{option.icon}</span>}
              key={option.id}
              onClick={() => selectTtsProvider(option.id)}
              title={option.title}
              trailing={<Badge tone={voice.tts.provider === option.id ? "action" : "neutral"}>{voice.tts.provider === option.id ? "Selected" : option.badge}</Badge>}
            />
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Kokoro voice preset</span>
            <Select
              className="mt-2 w-full font-semibold"
              value={selectedVoiceKnown ? voice.tts.voiceId : "__custom"}
              onChange={(event) => updateVoice((current) => ({
                ...current,
                tts: { ...current.tts, voiceId: event.target.value === "__custom" ? current.tts.voiceId : event.target.value },
              }))}
            >
              {kokoroVoices.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} / {option.language}{option.gender ? ` / ${option.gender}` : ""} ({option.id})
                </option>
              ))}
              {!selectedVoiceKnown && <option value="__custom">Custom voice ({voice.tts.voiceId})</option>}
            </Select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Custom voice ID</span>
            <Input
              className="mt-2 w-full font-semibold"
              placeholder="af_heart"
              value={voice.tts.voiceId}
              onChange={(event) => updateVoice((current) => ({
                ...current,
                tts: { ...current.tts, voiceId: event.target.value },
              }))}
            />
          </label>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Speaking rate</span>
            <input
              className="mt-2 w-full accent-[var(--miva-primary)]"
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
            <span className="mt-1 block text-sm font-semibold text-[var(--miva-text-muted)]">{voice.tts.speakingRate.toFixed(1)}x</span>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Playback volume</span>
            <input
              className="mt-2 w-full accent-[var(--miva-primary)]"
              max={1}
              min={0}
              step={0.05}
              type="range"
              value={voice.tts.volume}
              onChange={(event) => updateVoice((current) => ({
                ...current,
                tts: { ...current.tts, volume: Number(event.target.value) },
              }))}
            />
            <span className="mt-1 block text-sm font-semibold text-[var(--miva-text-muted)]">{Math.round(voice.tts.volume * 100)}%</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <SecondaryButton disabled={!canTestKokoroVoice} onClick={() => void playTestVoice()}>
            <span className="material-symbols-outlined text-[18px]">{testVoiceBusy ? "progress_activity" : "play_arrow"}</span>
            {testVoiceBusy ? "Playing test voice..." : "Test voice"}
          </SecondaryButton>
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
            <label className="flex items-start gap-3 rounded-lg bg-[var(--miva-bg-soft)] p-4" key={item.title}>
              <Switch
                checked={item.checked}
                className="mt-1"
                onCheckedChange={item.onChange}
              />
              <span>
                <span className="block text-sm font-bold text-[var(--miva-text)]">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--miva-text-muted)]">{item.body}</span>
              </span>
            </label>
          ))}
        </div>
      </Panel>
    </div>
  );
}
