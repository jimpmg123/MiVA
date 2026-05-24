from __future__ import annotations

import argparse
import base64
import importlib.util
import io
import json
import platform
import shutil
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 43120
MAX_TTS_TEXT_CHARS = 4000
KOKORO_SAMPLE_RATE = 24000
DEFAULT_KOKORO_VOICE = "af_heart"

_kokoro_lock = threading.Lock()
_kokoro_pipelines: dict[str, Any] = {}


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("content-type", "application/json; charset=utf-8")
    handler.send_header("content-length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def package_available(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def kokoro_ready() -> bool:
    return package_available("kokoro") and package_available("soundfile") and package_available("numpy")


def kokoro_setup_message() -> str:
    return (
        "Kokoro TTS is not installed for this Python runtime. "
        "Install it with: python -m pip install \"kokoro>=0.9.4\" soundfile numpy. "
        "Some languages may also require espeak-ng."
    )


def worker_status() -> dict[str, Any]:
    kokoro_installed = package_available("kokoro")
    soundfile_installed = package_available("soundfile")
    numpy_installed = package_available("numpy")
    espeak_available = shutil.which("espeak-ng") is not None or shutil.which("espeak") is not None
    tts_installed = kokoro_installed and soundfile_installed and numpy_installed

    return {
        "ok": True,
        "service": "miva-voice-worker",
        "version": "0.1.0",
        "python": {
            "version": platform.python_version(),
            "executable": sys.executable,
            "platform": platform.platform(),
        },
        "engines": {
            "stt": {
                "installed": False,
                "activeProvider": None,
                "availableProviders": ["faster-whisper", "whisper"],
            },
            "tts": {
                "installed": tts_installed,
                "activeProvider": "kokoro" if tts_installed else None,
                "availableProviders": ["kokoro", "qwen-voice"],
                "dependencies": {
                    "kokoro": kokoro_installed,
                    "soundfile": soundfile_installed,
                    "numpy": numpy_installed,
                    "espeak": espeak_available,
                },
            },
            "multimodalVoice": {
                "installed": False,
                "activeProvider": None,
                "availableProviders": ["qwen2.5-omni"],
            },
        },
        "capabilities": {
            "transcribe": False,
            "synthesize": tts_installed,
            "lipSync": False,
        },
        "setup": {
            "kokoro": "python -m pip install \"kokoro>=0.9.4\" soundfile numpy",
            "note": "Kokoro models are optional and are only needed when local TTS is enabled.",
        },
    }


def read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    content_length = int(handler.headers.get("content-length") or "0")
    if content_length <= 0:
        return {}

    raw = handler.rfile.read(content_length)
    if not raw:
        return {}

    return json.loads(raw.decode("utf-8"))


def normalize_kokoro_language(value: str | None) -> str:
    normalized = (value or "a").strip().lower()
    aliases = {
        "en": "a",
        "en-us": "a",
        "english": "a",
        "en-gb": "b",
        "british": "b",
        "ja": "j",
        "jp": "j",
        "japanese": "j",
        "zh": "z",
        "cn": "z",
        "chinese": "z",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in {"a", "b", "e", "f", "h", "i", "j", "p", "z"} else "a"


def get_kokoro_pipeline(lang_code: str) -> Any:
    with _kokoro_lock:
        if lang_code in _kokoro_pipelines:
            return _kokoro_pipelines[lang_code]

        from kokoro import KPipeline

        pipeline = KPipeline(lang_code=lang_code)
        _kokoro_pipelines[lang_code] = pipeline
        return pipeline


def synthesize_kokoro(payload: dict[str, Any]) -> dict[str, Any]:
    if not kokoro_ready():
        return {
            "ok": False,
            "error": "KOKORO_NOT_INSTALLED",
            "message": kokoro_setup_message(),
            "status": worker_status(),
        }

    text = str(payload.get("text") or "").strip()
    if not text:
        return {
            "ok": False,
            "error": "EMPTY_TEXT",
            "message": "TTS text is empty.",
        }

    if len(text) > MAX_TTS_TEXT_CHARS:
        text = text[:MAX_TTS_TEXT_CHARS]

    provider = str(payload.get("provider") or "kokoro").strip().lower()
    if provider not in {"kokoro", "localvoice", "local-voice"}:
        return {
            "ok": False,
            "error": "UNSUPPORTED_TTS_PROVIDER",
            "message": f"Unsupported TTS provider: {provider}",
        }

    voice_id = str(payload.get("voiceId") or DEFAULT_KOKORO_VOICE).strip() or DEFAULT_KOKORO_VOICE
    if voice_id.lower() in {"default", "kokoro-default"}:
        voice_id = DEFAULT_KOKORO_VOICE
    lang_code = normalize_kokoro_language(payload.get("langCode") or payload.get("language"))
    speed = payload.get("speakingRate", payload.get("speed", 1.0))
    try:
        speed_value = max(0.5, min(2.0, float(speed)))
    except (TypeError, ValueError):
        speed_value = 1.0

    started_at = time.perf_counter()
    pipeline = get_kokoro_pipeline(lang_code)

    try:
        generator = pipeline(text, voice=voice_id, speed=speed_value)
    except TypeError:
        generator = pipeline(text, voice=voice_id)

    import numpy as np
    import soundfile as sf

    chunks = []
    for _, _, audio in generator:
        if audio is not None:
            chunks.append(np.asarray(audio))

    if not chunks:
        return {
            "ok": False,
            "error": "EMPTY_AUDIO",
            "message": "Kokoro did not return audio.",
        }

    audio = np.concatenate(chunks)
    buffer = io.BytesIO()
    sf.write(buffer, audio, KOKORO_SAMPLE_RATE, format="WAV")

    return {
        "ok": True,
        "provider": "kokoro",
        "voiceId": voice_id,
        "langCode": lang_code,
        "sampleRate": KOKORO_SAMPLE_RATE,
        "mimeType": "audio/wav",
        "audioBase64": base64.b64encode(buffer.getvalue()).decode("ascii"),
        "textChars": len(text),
        "durationMs": int((time.perf_counter() - started_at) * 1000),
    }


class VoiceWorkerHandler(BaseHTTPRequestHandler):
    server_version = "MiVAVoiceWorker/0.1.0"

    def log_message(self, format: str, *args: Any) -> None:
        sys.stdout.write("[voice-worker] " + format % args + "\n")
        sys.stdout.flush()

    def do_GET(self) -> None:
        if self.path in ("/", "/health", "/voice/status"):
            json_response(self, 200, worker_status())
            return

        json_response(self, 404, {"error": "NOT_FOUND", "path": self.path})

    def do_POST(self) -> None:
        if self.path == "/voice/stt":
            json_response(self, 501, {
                "error": "STT_NOT_IMPLEMENTED",
                "message": "STT engine is not installed yet. This endpoint is reserved for faster-whisper or Whisper.",
            })
            return

        if self.path == "/voice/tts":
            try:
                result = synthesize_kokoro(read_json_body(self))
                json_response(self, 200 if result.get("ok") else 503, result)
            except Exception as error:
                json_response(self, 500, {
                    "ok": False,
                    "error": "TTS_SYNTHESIS_FAILED",
                    "message": str(error),
                })
            return

        json_response(self, 404, {"error": "NOT_FOUND", "path": self.path})


def main() -> None:
    parser = argparse.ArgumentParser(description="MiVA optional Python voice worker")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", default=DEFAULT_PORT, type=int)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), VoiceWorkerHandler)
    print(f"MiVA Voice Worker listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
