import type { VoiceWorkerStatus } from "../../types";

const LOCAL_HELPER_BASE_URL = "http://127.0.0.1:43110";
const KOKORO_VOICE_ALIASES: Record<string, string> = {
  default: "af_heart",
  "kokoro-default": "af_heart",
  heart: "af_heart",
  bella: "af_bella",
  nicole: "af_nicole",
  niko: "af_nicole",
  nova: "af_nova",
  sarah: "af_sarah",
  sky: "af_sky",
  adam: "am_adam",
  echo: "am_echo",
  eric: "am_eric",
  liam: "am_liam",
  puck: "am_puck",
  alice: "bf_alice",
  emma: "bf_emma",
  lily: "bf_lily",
  daniel: "bm_daniel",
  george: "bm_george",
  lewis: "bm_lewis",
};

function normalizeKokoroVoiceId(value: string) {
  const trimmed = value.trim() || "af_heart";
  const withoutExtension = trimmed.endsWith(".pt") ? trimmed.slice(0, -3) : trimmed;
  return KOKORO_VOICE_ALIASES[withoutExtension.toLowerCase()] ?? withoutExtension;
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${LOCAL_HELPER_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }

  return data as T;
}

export function getVoiceWorkerStatus() {
  return readJson<VoiceWorkerStatus>("/voice/status");
}

export async function startVoiceWorker() {
  const result = await readJson<{ status: VoiceWorkerStatus }>("/voice/start", {
    method: "POST",
    body: "{}",
  });
  return result.status;
}

export type KokoroInstallResult = {
  ok: boolean;
  message: string;
  packages: string[];
  command?: string;
  stdout?: string;
  stderr?: string;
  status: VoiceWorkerStatus;
};

export async function installKokoroTts() {
  return readJson<KokoroInstallResult>("/voice/install-kokoro", {
    method: "POST",
    body: "{}",
  });
}

export type VoiceSynthesisRequest = {
  text: string;
  provider: "kokoro";
  voiceId: string;
  speakingRate: number;
  language?: string;
};

export type VoiceSynthesisResult = {
  ok: boolean;
  provider: string;
  voiceId: string;
  langCode?: string;
  sampleRate: number;
  mimeType: string;
  audioBase64: string;
  textChars: number;
  durationMs?: number;
};

export function synthesizeVoice(request: VoiceSynthesisRequest) {
  return readJson<VoiceSynthesisResult>("/voice/tts", {
    method: "POST",
    body: JSON.stringify({
      ...request,
      voiceId: normalizeKokoroVoiceId(request.voiceId),
    }),
  });
}
