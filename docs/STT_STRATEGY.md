# MiVA STT Strategy

Last updated: 2026-04-30

## Purpose

MiVA should not treat speech-to-text as one generic feature.

Voice input has different product requirements depending on what the user wants:

- Task Voice: schedule, memo, email draft, to-do, and command-style assistant work.
- Live Companion: real-time game, streaming, virtual character, and always-on assistant conversation.
- Dictation: longer writing and document input.

Each mode has different latency, accuracy, privacy, and hardware requirements.

## Voice Modes

### Task Voice

Use case:

- Scheduling
- Notes
- To-do creation
- Google Workspace actions later
- Short voice commands

Recommended interaction:

```txt
record -> transcribe -> show text -> confirm -> execute
```

This is the safest first voice mode for MiVA.

Why:

- It does not require real-time transcription.
- It can ask for confirmation before calendar, Gmail, Drive, or file actions.
- It works better on normal PCs.
- It keeps server and GPU load lower.

### Live Companion

Use case:

- Game commentary
- Streaming
- Virtual character conversation
- Always-on or push-to-talk assistant

Recommended interaction:

```txt
microphone chunks -> VAD -> low-latency STT -> assistant response -> TTS -> character reaction
```

This should be treated as an advanced mode.

Why:

- It needs low latency.
- It competes with the local LLM, TTS, and Live2D/character rendering for CPU/GPU resources.
- It may need cloud STT/TTS on lower-spec PCs.
- It requires stronger controls for wake mode, silence detection, and interruption handling.

### Dictation

Use case:

- Longer text input
- Writing
- Drafting
- Document editing

Recommended interaction:

```txt
record or stream -> transcribe -> editable text -> optional assistant rewrite
```

This mode needs better editing UX than Task Voice, but does not need the same low latency as Live Companion.

## Local STT vs Cloud STT

### Local STT

Local STT means speech is transcribed on the user's computer.

Pros:

- Better privacy.
- No per-minute API cost.
- Works without sending raw audio to MiVA servers.
- Fits MiVA's local-first positioning.

Cons:

- Requires model download.
- Uses CPU/GPU/RAM.
- Quality depends heavily on model size.
- Real-time mode can be hard on low-spec PCs.

### Cloud STT

Cloud STT means audio is sent to an external provider.

Pros:

- Easier MVP implementation.
- Usually strong accuracy.
- Lower local hardware requirements.
- Better fallback for weak PCs.

Cons:

- Requires API key or paid provider.
- Sends audio outside the user's machine.
- Can create server/provider cost.
- Needs clear privacy messaging.

MiVA should keep raw audio off the MiVA cloud server by default. If cloud STT is used, the desktop app or local helper can call the selected provider directly, while MiVA Cloud stores only preferences, consent, and non-sensitive status.

## Recommended Local Engines

### whisper.cpp

Default local STT engine candidate.

Best for:

- Normal-user desktop distribution.
- CPU-first transcription.
- Local-first Task Voice.
- Avoiding Python requirements for the default path.

Notes:

- Uses Whisper-compatible models.
- Can run quantized models.
- Easier to package than Python-first stacks.
- Good fit for a Tauri desktop app with a local helper.

### faster-whisper

Advanced local STT engine candidate.

Best for:

- GPU-enabled users.
- Higher performance Whisper inference.
- Developer/advanced mode.

Notes:

- Python-based.
- Can use CTranslate2 optimizations.
- Adds Python/CUDA/environment complexity.
- Should not be the first default for non-technical users.

### Vosk

Low-resource fallback candidate.

Best for:

- Lightweight offline transcription.
- Simple command recognition.
- Lower-spec machines.

Notes:

- Usually weaker than Whisper for natural speech and mixed-language input.
- More suitable as a fallback than the main MiVA STT path.

### NVIDIA Parakeet

English-focused advanced candidate.

Best for:

- English-only transcription.
- High-speed ASR experiments.

Notes:

- Not the default choice for Korean or bilingual use.
- Useful later if MiVA adds English streaming or creator-focused modes.

## Recommended Model Tiers

### Whisper large-v3

Use when:

- Accuracy matters most.
- Korean and English mixed input should be handled well.
- The user has strong hardware.

Tradeoff:

- Heavy.
- Not a good default for normal PCs.
- Can compete with local LLM/TTS for GPU resources.

### Whisper large-v3-turbo

Use when:

- The user wants high quality with better speed than large-v3.
- The PC has enough resources.
- Live Companion is desired on stronger hardware.

Recommended role:

- High-quality local STT option.
- Possible premium/high-spec default later.

### Whisper medium

Use when:

- Task Voice needs better quality than small.
- The user has a mid-range PC.
- Latency is less important than accuracy.

Recommended role:

- Balanced local STT option for Task Voice.

### Whisper small

Use when:

- The user has a lower or mid-range PC.
- Short commands are the main use case.
- Live Companion needs lower latency.

Recommended role:

- First practical local model for MVP experiments.
- Good enough for short voice commands, but not ideal for noisy or long speech.

### Whisper tiny/base

Use when:

- Testing installation.
- Very low-spec hardware.
- Speed matters more than accuracy.

Recommended role:

- Demo or fallback only.
- Not recommended as the main Korean STT experience.

## Hardware Guidance

MiVA should not assume a user's PC can run everything locally at once.

Resource priority:

1. Local LLM
2. STT
3. TTS
4. Character rendering

For normal users:

- Prefer CPU STT for Task Voice when using a local LLM.
- Keep GPU available for the local LLM when possible.
- Avoid defaulting to local LLM + local real-time STT + local TTS at the same time.
- Recommend cloud STT/TTS when hardware is weak or the user wants real-time voice.

Suggested profile recommendations:

```txt
Low-spec PC:
  Local chat + cloud STT/TTS, or text-only.

Mid-range PC:
  Local chat + local Task Voice with Whisper small or medium.

High-spec PC:
  Local chat + local STT + optional local TTS.

Creator / Live Companion:
  Prefer low-latency STT, VAD, and optional cloud STT/TTS unless hardware is strong.
```

## Product Recommendation

### Near-term MVP

Do not start with full real-time STT.

Implement:

```txt
Push-to-talk or click-to-record -> transcribe -> fill chat input -> user sends or confirms
```

Recommended first implementation path:

- Desktop app captures microphone audio.
- Local helper handles STT routing.
- Start with a provider abstraction:
  - `local-whisper`
  - `cloud-openai`
  - `cloud-google`
  - `cloud-gemini`
- Store STT mode and provider in the assistant profile.

### Later

Add:

- Live dictation.
- VAD and silence detection.
- Partial transcripts.
- Real-time Live Companion mode.
- TTS and character expression sync.
- Hardware-based voice recommendations.

## Assistant Profile Fields

Future assistant profiles should include voice settings.

Suggested shape:

```json
{
  "voice": {
    "enabled": false,
    "mode": "task",
    "inputBehavior": "pushToTalk",
    "sttProvider": "local-whisper",
    "sttEngine": "whisper.cpp",
    "sttModel": "small",
    "realtime": false,
    "confirmBeforeAction": true
  }
}
```

Possible values:

```txt
mode:
  task
  liveCompanion
  dictation

inputBehavior:
  pushToTalk
  clickToRecord
  alwaysListening

sttProvider:
  local-whisper
  local-vosk
  cloud-openai
  cloud-google
  cloud-gemini

sttEngine:
  whisper.cpp
  faster-whisper
  vosk
  parakeet
```

## Decision

MiVA should design voice input around use cases:

- Task Voice first.
- Live Companion later.
- Dictation as a separate writing feature.

Default local STT direction:

- Engine: `whisper.cpp`
- First model candidates: `small` and `medium`
- High-quality option: `large-v3-turbo`
- Accuracy-first option: `large-v3`
- Tiny/base: install test or low-spec fallback only

Cloud STT should remain an optional fallback, not the default server responsibility.
