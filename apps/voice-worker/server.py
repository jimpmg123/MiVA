from __future__ import annotations

import argparse
import json
import platform
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 43120


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("content-type", "application/json; charset=utf-8")
    handler.send_header("content-length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def worker_status() -> dict[str, Any]:
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
                "installed": False,
                "activeProvider": None,
                "availableProviders": ["kokoro", "qwen-voice"],
            },
            "multimodalVoice": {
                "installed": False,
                "activeProvider": None,
                "availableProviders": ["qwen2.5-omni"],
            },
        },
        "capabilities": {
            "transcribe": False,
            "synthesize": False,
            "lipSync": False,
        },
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
            json_response(self, 501, {
                "error": "TTS_NOT_IMPLEMENTED",
                "message": "TTS engine is not installed yet. This endpoint is reserved for Kokoro or Qwen voice models.",
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
