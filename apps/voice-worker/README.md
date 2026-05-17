# MiVA Voice Worker

Optional local Python runtime for voice features.

The worker is intentionally small for now. It provides health/status endpoints so MiVA can manage a separate voice runtime before STT/TTS engines are installed.

Planned engines:

- STT: faster-whisper / Whisper
- TTS: Kokoro TTS
- Advanced voice: Qwen voice or multimodal voice models

Run locally:

```powershell
python server.py
```

