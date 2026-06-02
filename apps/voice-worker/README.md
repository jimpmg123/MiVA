# MiVA Voice Worker

Optional local Python runtime for voice features.

The worker provides health/status endpoints and the first local TTS path through Kokoro.
Japanese Kokoro voices use the Japanese pipeline and require `pyopenjtalk`, `misaki[ja]`, and `fugashi[unidic-lite]`.

Planned engines:

- STT: faster-whisper / Whisper
- TTS: Kokoro TTS
- Advanced voice: Qwen voice or multimodal voice models

Install optional local TTS dependencies:

```powershell
python -m pip install -r requirements.txt
```

Run locally:

```powershell
python server.py
```

Endpoints:

- `GET /voice/status`: check Python and optional engine availability
- `POST /voice/tts`: synthesize speech with Kokoro and return base64 WAV audio
