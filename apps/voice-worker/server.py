from __future__ import annotations

import argparse
import base64
import importlib.util
import io
import json
import os
import platform
import shutil
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 43120
MAX_TTS_TEXT_CHARS = 4000
MAX_DOCUMENT_BYTES = 50 * 1024 * 1024
MAX_DOCUMENT_CONTEXT_CHARS = 24000
MAX_PDF_PAGES = 100
MAX_EXCEL_SHEETS = 20
MAX_EXCEL_ROWS_PER_SHEET = 250
MAX_EXCEL_COLUMNS = 40
KOKORO_SAMPLE_RATE = 24000
DEFAULT_KOKORO_VOICE = "af_heart"
KOKORO_VOICES = [
    {"id": "af_heart", "label": "Heart", "language": "American English", "gender": "Female"},
    {"id": "af_bella", "label": "Bella", "language": "American English", "gender": "Female"},
    {"id": "af_nicole", "label": "Nicole", "language": "American English", "gender": "Female"},
    {"id": "af_nova", "label": "Nova", "language": "American English", "gender": "Female"},
    {"id": "af_sarah", "label": "Sarah", "language": "American English", "gender": "Female"},
    {"id": "af_sky", "label": "Sky", "language": "American English", "gender": "Female"},
    {"id": "am_adam", "label": "Adam", "language": "American English", "gender": "Male"},
    {"id": "am_echo", "label": "Echo", "language": "American English", "gender": "Male"},
    {"id": "am_eric", "label": "Eric", "language": "American English", "gender": "Male"},
    {"id": "am_liam", "label": "Liam", "language": "American English", "gender": "Male"},
    {"id": "am_puck", "label": "Puck", "language": "American English", "gender": "Male"},
    {"id": "bf_alice", "label": "Alice", "language": "British English", "gender": "Female"},
    {"id": "bf_emma", "label": "Emma", "language": "British English", "gender": "Female"},
    {"id": "bf_lily", "label": "Lily", "language": "British English", "gender": "Female"},
    {"id": "bm_daniel", "label": "Daniel", "language": "British English", "gender": "Male"},
    {"id": "bm_george", "label": "George", "language": "British English", "gender": "Male"},
    {"id": "bm_lewis", "label": "Lewis", "language": "British English", "gender": "Male"},
    {"id": "jf_alpha", "label": "Alpha", "language": "Japanese", "gender": "Female"},
    {"id": "jf_gongitsune", "label": "Gongitsune", "language": "Japanese", "gender": "Female"},
    {"id": "jm_kumo", "label": "Kumo", "language": "Japanese", "gender": "Male"},
    {"id": "zf_xiaobei", "label": "Xiaobei", "language": "Mandarin Chinese", "gender": "Female"},
    {"id": "zf_xiaoxiao", "label": "Xiaoxiao", "language": "Mandarin Chinese", "gender": "Female"},
    {"id": "zm_yunjian", "label": "Yunjian", "language": "Mandarin Chinese", "gender": "Male"},
    {"id": "zm_yunxi", "label": "Yunxi", "language": "Mandarin Chinese", "gender": "Male"},
]
KOKORO_VOICE_IDS = {voice["id"] for voice in KOKORO_VOICES}
KOKORO_VOICE_ALIASES = {
    "default": DEFAULT_KOKORO_VOICE,
    "kokoro-default": DEFAULT_KOKORO_VOICE,
    "heart": DEFAULT_KOKORO_VOICE,
    "bella": "af_bella",
    "nicole": "af_nicole",
    "niko": "af_nicole",
    "nova": "af_nova",
    "sarah": "af_sarah",
    "sky": "af_sky",
    "adam": "am_adam",
    "echo": "am_echo",
    "eric": "am_eric",
    "liam": "am_liam",
    "puck": "am_puck",
    "alice": "bf_alice",
    "emma": "bf_emma",
    "lily": "bf_lily",
    "daniel": "bm_daniel",
    "george": "bm_george",
    "lewis": "bm_lewis",
}

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


def kokoro_japanese_ready() -> bool:
    return package_available("pyopenjtalk") and package_available("misaki")


def document_dependencies_ready() -> bool:
    return (
        package_available("pandas")
        and package_available("openpyxl")
        and package_available("fitz")
    )


def kokoro_setup_message() -> str:
    return (
        "Kokoro TTS is not installed for this Python runtime. "
        "Install it with: python -m pip install \"kokoro>=0.9.4\" soundfile numpy pyopenjtalk \"misaki[ja]\" \"fugashi[unidic-lite]\". "
        "Some languages may also require espeak-ng."
    )


def worker_status() -> dict[str, Any]:
    kokoro_installed = package_available("kokoro")
    soundfile_installed = package_available("soundfile")
    numpy_installed = package_available("numpy")
    pyopenjtalk_installed = package_available("pyopenjtalk")
    misaki_installed = package_available("misaki")
    fugashi_installed = package_available("fugashi")
    unidic_lite_installed = package_available("unidic_lite")
    jaconv_installed = package_available("jaconv")
    espeak_available = shutil.which("espeak-ng") is not None or shutil.which("espeak") is not None
    tts_installed = kokoro_installed and soundfile_installed and numpy_installed
    pandas_installed = package_available("pandas")
    openpyxl_installed = package_available("openpyxl")
    xlrd_installed = package_available("xlrd")
    pymupdf_installed = package_available("fitz")
    documents_installed = pandas_installed and openpyxl_installed and pymupdf_installed

    return {
        "ok": True,
        "service": "miva-voice-worker",
        "version": "0.1.0",
        "pid": os.getpid(),
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
                "defaultVoice": DEFAULT_KOKORO_VOICE,
                "voices": KOKORO_VOICES,
                "dependencies": {
                    "kokoro": kokoro_installed,
                    "soundfile": soundfile_installed,
                    "numpy": numpy_installed,
                    "pyopenjtalk": pyopenjtalk_installed,
                    "misaki": misaki_installed,
                    "fugashi": fugashi_installed,
                    "unidicLite": unidic_lite_installed,
                    "jaconv": jaconv_installed,
                    "japanese": pyopenjtalk_installed and misaki_installed,
                    "espeak": espeak_available,
                },
            },
            "multimodalVoice": {
                "installed": False,
                "activeProvider": None,
                "availableProviders": ["qwen2.5-omni"],
            },
            "documents": {
                "installed": documents_installed,
                "activeProvider": "python" if documents_installed else None,
                "availableFormats": ["pdf", "xlsx", "xls", "csv"],
                "dependencies": {
                    "pandas": pandas_installed,
                    "openpyxl": openpyxl_installed,
                    "xlrd": xlrd_installed,
                    "pymupdf": pymupdf_installed,
                },
            },
        },
        "capabilities": {
            "transcribe": False,
            "synthesize": tts_installed,
            "lipSync": False,
            "analyzeDocuments": documents_installed,
        },
        "setup": {
            "kokoro": "python -m pip install \"kokoro>=0.9.4\" soundfile numpy pyopenjtalk \"misaki[ja]\" \"fugashi[unidic-lite]\"",
            "documents": "python -m pip install pandas openpyxl xlrd PyMuPDF",
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


def truncate_document_context(value: str) -> tuple[str, bool]:
    normalized = value.replace("\x00", "").strip()
    if len(normalized) <= MAX_DOCUMENT_CONTEXT_CHARS:
        return normalized, False
    return normalized[:MAX_DOCUMENT_CONTEXT_CHARS].rstrip() + "\n\n[Document context truncated by MiVA.]", True


def analyze_pdf(path: Path) -> dict[str, Any]:
    import fitz

    document = fitz.open(path)
    page_count = len(document)
    page_sections: list[str] = []
    extracted_pages = min(page_count, MAX_PDF_PAGES)

    for page_index in range(extracted_pages):
        text = document.load_page(page_index).get_text("text").strip()
        if text:
            page_sections.append(f"--- Page {page_index + 1} ---\n{text}")

    context, truncated = truncate_document_context("\n\n".join(page_sections))
    if not context:
        return {
            "ok": False,
            "error": "PDF_TEXT_NOT_FOUND",
            "message": "No selectable text was found. This PDF may be scanned and require OCR.",
        }

    return {
        "ok": True,
        "kind": "pdf",
        "context": context,
        "truncated": truncated or page_count > extracted_pages,
        "metadata": {
            "pageCount": page_count,
            "extractedPages": extracted_pages,
            "textChars": len(context),
        },
    }


def dataframe_to_context(sheet_name: str, dataframe: Any) -> str:
    limited = dataframe.iloc[:MAX_EXCEL_ROWS_PER_SHEET, :MAX_EXCEL_COLUMNS].copy()
    limited = limited.where(limited.notna(), "")
    columns = [str(column) for column in limited.columns]
    lines = [
        f"--- Sheet: {sheet_name} ---",
        f"Columns: {', '.join(columns)}",
        limited.to_csv(index=False).strip(),
    ]
    if len(dataframe.index) > len(limited.index):
        lines.append(f"[Only the first {len(limited.index)} of {len(dataframe.index)} rows are included.]")
    if len(dataframe.columns) > len(limited.columns):
        lines.append(f"[Only the first {len(limited.columns)} of {len(dataframe.columns)} columns are included.]")
    return "\n".join(line for line in lines if line)


def analyze_spreadsheet(path: Path, extension: str) -> dict[str, Any]:
    import pandas as pd

    if extension == ".csv":
        dataframe = pd.read_csv(path, nrows=MAX_EXCEL_ROWS_PER_SHEET)
        sheet_names = ["CSV"]
        sections = [dataframe_to_context("CSV", dataframe)]
        sheet_metadata = [{
            "name": "CSV",
            "rows": len(dataframe.index),
            "columns": len(dataframe.columns),
        }]
    else:
        workbook = pd.ExcelFile(path)
        sheet_names = workbook.sheet_names[:MAX_EXCEL_SHEETS]
        sections = []
        sheet_metadata = []
        for sheet_name in sheet_names:
            dataframe = pd.read_excel(
                workbook,
                sheet_name=sheet_name,
                nrows=MAX_EXCEL_ROWS_PER_SHEET,
            )
            sections.append(dataframe_to_context(sheet_name, dataframe))
            sheet_metadata.append({
                "name": sheet_name,
                "rows": len(dataframe.index),
                "columns": len(dataframe.columns),
            })

    context, truncated = truncate_document_context("\n\n".join(sections))
    return {
        "ok": True,
        "kind": "spreadsheet",
        "context": context,
        "truncated": truncated,
        "metadata": {
            "sheetNames": sheet_names,
            "sheets": sheet_metadata,
            "textChars": len(context),
        },
    }


def analyze_document(payload: dict[str, Any]) -> dict[str, Any]:
    raw_path = str(payload.get("path") or "").strip()
    if not raw_path:
        return {
            "ok": False,
            "error": "DOCUMENT_PATH_REQUIRED",
            "message": "A document path is required.",
        }

    path = Path(os.path.abspath(os.path.expanduser(raw_path)))
    if not path.is_file():
        return {
            "ok": False,
            "error": "DOCUMENT_NOT_FOUND",
            "message": "The selected document no longer exists.",
        }

    extension = path.suffix.lower()
    if extension not in {".pdf", ".xlsx", ".xls", ".csv"}:
        return {
            "ok": False,
            "error": "DOCUMENT_FORMAT_NOT_SUPPORTED",
            "message": f"Unsupported document format: {extension or 'unknown'}",
        }

    size_bytes = path.stat().st_size
    if size_bytes > MAX_DOCUMENT_BYTES:
        return {
            "ok": False,
            "error": "DOCUMENT_TOO_LARGE",
            "message": "Documents larger than 50 MB are not supported.",
        }

    if not document_dependencies_ready():
        return {
            "ok": False,
            "error": "DOCUMENT_DEPENDENCIES_MISSING",
            "message": "Document parsing requires pandas, openpyxl, xlrd, and PyMuPDF.",
            "status": worker_status(),
        }

    started_at = time.perf_counter()
    result = analyze_pdf(path) if extension == ".pdf" else analyze_spreadsheet(path, extension)
    if not result.get("ok"):
        return result

    result.update({
        "name": path.name,
        "extension": extension.lstrip("."),
        "sizeBytes": size_bytes,
        "durationMs": int((time.perf_counter() - started_at) * 1000),
    })
    return result


def infer_kokoro_language_from_voice(voice_id: str) -> str | None:
    prefix = voice_id.split("_", 1)[0].lower()
    if prefix in {"af", "am"}:
        return "a"
    if prefix in {"bf", "bm"}:
        return "b"
    if prefix in {"jf", "jm"}:
        return "j"
    if prefix in {"zf", "zm"}:
        return "z"
    return None


def normalize_kokoro_voice_id(value: str | None) -> tuple[str, str]:
    requested = str(value or DEFAULT_KOKORO_VOICE).strip() or DEFAULT_KOKORO_VOICE
    normalized = requested[:-3] if requested.endswith(".pt") else requested
    normalized = KOKORO_VOICE_ALIASES.get(normalized.lower(), normalized)
    if normalized not in KOKORO_VOICE_IDS:
        return DEFAULT_KOKORO_VOICE, requested
    return normalized, requested


def get_kokoro_pipeline(lang_code: str) -> Any:
    with _kokoro_lock:
        if lang_code in _kokoro_pipelines:
            return _kokoro_pipelines[lang_code]

        from kokoro import KPipeline

        if lang_code == "j":
            from misaki import ja

            original_jag2p = ja.JAG2P

            def pyopenjtalk_jag2p(*args: Any, **kwargs: Any) -> Any:
                kwargs["version"] = "pyopenjtalk"
                return original_jag2p(*args, **kwargs)

            ja.JAG2P = pyopenjtalk_jag2p
            try:
                pipeline = KPipeline(lang_code=lang_code)
            finally:
                ja.JAG2P = original_jag2p

            pipeline.g2p = original_jag2p(version="pyopenjtalk")
        else:
            pipeline = KPipeline(lang_code=lang_code)
        _kokoro_pipelines[lang_code] = pipeline
        return pipeline


def collect_kokoro_chunks(
    pipeline: Any,
    text: str,
    voice_id: str,
    speed_value: float,
) -> list[Any]:
    try:
        generator = pipeline(text, voice=voice_id, speed=speed_value)
    except TypeError:
        generator = pipeline(text, voice=voice_id)

    import numpy as np

    chunks = []
    for _, _, audio in generator:
        if audio is not None:
            chunks.append(np.asarray(audio))
    return chunks


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

    voice_id, requested_voice_id = normalize_kokoro_voice_id(payload.get("voiceId"))
    lang_code = infer_kokoro_language_from_voice(voice_id) or normalize_kokoro_language(payload.get("langCode") or payload.get("language"))
    if lang_code == "j" and not kokoro_japanese_ready():
        return {
            "ok": False,
            "error": "KOKORO_JAPANESE_DEPS_MISSING",
            "message": (
                "Japanese Kokoro voices require pyopenjtalk, misaki[ja], and fugashi[unidic-lite]. "
                "Install them from the Studio voice setup screen."
            ),
            "status": worker_status(),
        }

    speed = payload.get("speakingRate", payload.get("speed", 1.0))
    try:
        speed_value = max(0.5, min(2.0, float(speed)))
    except (TypeError, ValueError):
        speed_value = 1.0

    started_at = time.perf_counter()
    pipeline = get_kokoro_pipeline(lang_code)

    import numpy as np
    import soundfile as sf

    fallback_reason = None
    try:
        chunks = collect_kokoro_chunks(pipeline, text, voice_id, speed_value)
    except Exception as error:
        if voice_id == DEFAULT_KOKORO_VOICE:
            raise
        fallback_reason = str(error)
        voice_id = DEFAULT_KOKORO_VOICE
        chunks = collect_kokoro_chunks(pipeline, text, voice_id, speed_value)

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
        "requestedVoiceId": requested_voice_id,
        "voiceFallback": requested_voice_id != voice_id or fallback_reason is not None,
        "voiceFallbackReason": fallback_reason,
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
        if self.path == "/documents/analyze":
            try:
                result = analyze_document(read_json_body(self))
                json_response(self, 200 if result.get("ok") else 422, result)
            except Exception as error:
                json_response(self, 500, {
                    "ok": False,
                    "error": "DOCUMENT_ANALYSIS_FAILED",
                    "message": str(error),
                })
            return

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
    parser.add_argument(
        "--analyze-document",
        dest="analyze_document_path",
        default=None,
        help="Parse a single document and print the result as JSON, then exit.",
    )
    args = parser.parse_args()

    # One-shot document analysis mode. This lets the local helper extract text
    # from PDFs/spreadsheets without starting (or cold-booting) the long-running
    # Kokoro TTS worker, so attaching a file never waits on the voice engine.
    if args.analyze_document_path is not None:
        try:
            result = analyze_document({"path": args.analyze_document_path})
        except Exception as error:  # noqa: BLE001 - report any failure as JSON
            result = {
                "ok": False,
                "error": "DOCUMENT_ANALYSIS_FAILED",
                "message": str(error),
            }
        sys.stdout.write(json.dumps(result))
        sys.stdout.flush()
        return

    server = ThreadingHTTPServer((args.host, args.port), VoiceWorkerHandler)
    print(f"MiVA Voice Worker listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
