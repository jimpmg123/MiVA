import { requestLocalHelper } from "../localHelper/client";
import type { VoiceWorkerStatus } from "../../types";

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

export function getVoiceWorkerStatus() {
  return requestLocalHelper<VoiceWorkerStatus>("/voice/status");
}

export async function startVoiceWorker() {
  const result = await requestLocalHelper<{ status: VoiceWorkerStatus }>("/voice/start", {
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
  return requestLocalHelper<KokoroInstallResult>("/voice/install-kokoro", {
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
  return requestLocalHelper<VoiceSynthesisResult>("/voice/tts", {
    method: "POST",
    body: JSON.stringify({
      ...request,
      voiceId: normalizeKokoroVoiceId(request.voiceId),
    }),
  });
}
