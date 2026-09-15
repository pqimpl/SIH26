"""Voice Pipeline: STT -> LLM -> TTS

Provider:
    Sarvam AI (Saaras STT + Bulbul TTS)

Install:
    pip install requests python-dotenv sounddevice numpy

Env vars (.env) -- must sit in the SAME FOLDER as this script,
or somewhere find_dotenv() can locate it:

    SARVAM_API_KEY=your_sarvam_api_key
    LLM_API_KEY=your_gemini_api_key
    LLM_API_URL=https://generativelanguage.googleapis.com/v1beta/models
    LLM_MODEL=gemini-2.5-flash
"""

import os
import sys
import time
import base64
import logging
import threading
import wave
from dataclasses import dataclass
from typing import Optional, Literal

import requests
from dotenv import load_dotenv, find_dotenv

# --------------------------------------------------------------------------
# Env loading (with visibility into what was actually found)
# --------------------------------------------------------------------------

_dotenv_path = find_dotenv()
load_dotenv(_dotenv_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("voice_pipeline")

if _dotenv_path:
    log.info(".env loaded from: %s", _dotenv_path)
else:
    log.warning("No .env file found on the search path — relying on real environment variables, if any.")

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_BASE_URL = "https://api.sarvam.ai"

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_URL = os.getenv("LLM_API_URL", "https://generativelanguage.googleapis.com/v1beta/models")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")

Provider = Literal["sarvam"]


def _post_with_retry(url, *, max_retries: int = 3, base_timeout: int = 60, **kwargs) -> requests.Response:
    """POST with retries, for transient network issues (slow connections,
    momentary timeouts). Every attempt uses the same timeout. Raises the
    last error if every attempt fails."""
    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            return requests.post(url, timeout=base_timeout, **kwargs)
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError) as e:
            last_exc = e
            log.warning(
                "Request to %s timed out/failed (attempt %d/%d, timeout=%ds): %s",
                url, attempt, max_retries, base_timeout, e,
            )
    raise last_exc

# Reference: common Sarvam language_code values (BCP-47-style).
# Pass one of these as PipelineConfig(language=...) to force a language
# instead of relying on auto-detection ("unknown").
#
# Major Indic languages: hi-IN, bn-IN, ta-IN, te-IN, kn-IN, ml-IN, mr-IN,
#   gu-IN, pa-IN, od-IN, en-IN
# North-Eastern (Eighth Schedule) languages: as-IN (Assamese),
#   brx-IN (Bodo), mni-IN (Manipuri / Meitei)
#
# Note: languages outside India's Eighth Schedule (Khasi, Garo, Mizo,
# Naga languages, Nagamese, etc.) are not currently supported by Sarvam.
# If a language_code is wrong, Sarvam's error response lists the exact
# valid options -- check the logged error text if a call fails.


def _check_keys() -> None:
    """Fail fast with a clear message instead of a raw 401 deep in requests."""
    problems = []
    if not SARVAM_API_KEY:
        problems.append("SARVAM_API_KEY is missing/empty")
    if not LLM_API_KEY:
        problems.append("LLM_API_KEY is missing/empty")

    if problems:
        log.warning("Key check found issues: %s", "; ".join(problems))
    else:
        log.info(
            "Key check OK — SARVAM_API_KEY len=%d, LLM_API_KEY len=%d",
            len(SARVAM_API_KEY), len(LLM_API_KEY),
        )


# --------------------------------------------------------------------------
# STT (Speech -> Text)
# --------------------------------------------------------------------------

def stt_sarvam(audio_path: str, language_code: str = "unknown") -> tuple[str, str]:
    """Sarvam Speech-to-Text (Saaras v3 / Saarika). Synchronous REST endpoint,
    best for clips under ~30s. For longer audio use Sarvam's Batch API.

    language_code="unknown" lets Sarvam auto-detect the spoken language.
    Returns (transcript, detected_language_code) so the reply can be spoken
    back in the same language.
    """
    url = f"{SARVAM_BASE_URL}/speech-to-text"
    headers = {"api-subscription-key": SARVAM_API_KEY}
    t0 = time.time()
    with open(audio_path, "rb") as f:
        files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
        data = {
            "model": "saaras:v3",
            "language_code": language_code,   # "unknown" = auto-detect
            "mode": "transcribe",
        }
        resp = _post_with_retry(url, headers=headers, files=files, data=data, base_timeout=30)
    if not resp.ok:
        log.error("Sarvam STT call failed [%s]: %s", resp.status_code, resp.text)
    resp.raise_for_status()
    result = resp.json()
    transcript = result.get("transcript", "")
    detected_lang = result.get("language_code") or language_code
    log.info("Sarvam STT took %.1fs: %s (detected language: %s)", time.time() - t0, transcript[:80], detected_lang)
    return transcript, detected_lang


def speech_to_text(audio_path: str, provider: Provider = "sarvam", language: str = "unknown") -> tuple[str, str]:
    if provider != "sarvam":
        raise ValueError(f"Unknown STT provider: {provider}")
    return stt_sarvam(audio_path, language)


# --------------------------------------------------------------------------
# LLM
# --------------------------------------------------------------------------

def call_llm(user_text: str, system_prompt: str = "You are a helpful, concise voice assistant.") -> str:
    """Generic LLM chat-completion call (Gemini generateContent API). Swap this
    out for any provider you like -- the only contract is: text in, text out."""
    if not LLM_API_KEY:
        raise RuntimeError(
            "LLM_API_KEY is empty. Check that your .env file has a line "
            "'LLM_API_KEY=...' and that it's in the same folder as this "
            "script (or set the env var directly in your shell/OS)."
        )

    # Gemini's REST endpoint is: {LLM_API_URL}/{model}:generateContent?key=...
    url = f"{LLM_API_URL}/{LLM_MODEL}:generateContent"
    headers = {"content-type": "application/json"}
    params = {"key": LLM_API_KEY}
    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {
            "maxOutputTokens": 200,
            "thinkingConfig": {"thinkingLevel": "MINIMAL"},  # Gemini 3.x param -- fastest, lowest-latency thinking mode
        },
    }
    t0 = time.time()
    resp = _post_with_retry(url, headers=headers, params=params, json=body, base_timeout=60)
    if not resp.ok:
        # Provider returns a JSON body with error.message -- surface it.
        log.error("LLM call failed [%s]: %s", resp.status_code, resp.text)
    resp.raise_for_status()
    data = resp.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
        # Gemini 3.x may include internal "thinking" parts alongside the real
        # answer -- skip those, keep only the actual response text.
        reply = "".join(
            p.get("text", "") for p in parts if p.get("text") and not p.get("thought")
        ).strip()
    except (KeyError, IndexError):
        log.error("Unexpected LLM response shape: %s", data)
        reply = ""
    log.info("LLM took %.1fs: %s", time.time() - t0, reply[:80])
    return reply


# --------------------------------------------------------------------------
# TTS (Text -> Speech)
# --------------------------------------------------------------------------

def tts_sarvam(text: str, language_code: str = "hi-IN", speaker: str = "priya") -> bytes:
    """Sarvam Text-to-Speech (Bulbul v3). Returns raw audio bytes (wav)."""
    url = f"{SARVAM_BASE_URL}/text-to-speech"
    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    body = {
        "text": text,
        "target_language_code": language_code,
        "speaker": speaker,
        "model": "bulbul:v3",
    }
    t0 = time.time()
    resp = _post_with_retry(url, headers=headers, json=body, base_timeout=20)
    if not resp.ok:
        log.error("Sarvam TTS call failed [%s]: %s", resp.status_code, resp.text)
    resp.raise_for_status()
    audio_b64 = resp.json()["audios"][0]
    log.info("Sarvam TTS took %.1fs", time.time() - t0)
    return base64.b64decode(audio_b64)


def text_to_speech(text: str, provider: Provider = "sarvam", language: str = "hi-IN") -> bytes:
    if provider != "sarvam":
        raise ValueError(f"Unknown TTS provider: {provider}")
    return tts_sarvam(text, language)


def play_audio(path: str) -> None:
    """Play a .wav file out loud through the default speakers (Windows only,
    using the built-in winsound module -- no extra install needed)."""
    if sys.platform != "win32":
        log.warning("play_audio() currently only supports Windows (winsound). "
                    "Skipping playback -- open %s manually to listen.", path)
        return
    import winsound
    log.info("Playing reply audio: %s", path)
    winsound.PlaySound(path, winsound.SND_FILENAME)


# --------------------------------------------------------------------------
# Microphone recording (talk directly instead of using a fixed .wav file)
# --------------------------------------------------------------------------

def record_from_mic(output_path: str = "input.wav", samplerate: int = 16000) -> str:
    """Record from the default microphone. Press Enter to start, speak, then
    press Enter again to stop. Saves a mono 16-bit wav file to output_path."""
    import sounddevice as sd
    import numpy as np

    input("Press Enter to start recording...")
    print("Recording... press Enter to stop.")

    frames = []
    stop_flag = threading.Event()

    def wait_for_enter():
        input()
        stop_flag.set()

    listener = threading.Thread(target=wait_for_enter, daemon=True)
    listener.start()

    with sd.InputStream(samplerate=samplerate, channels=1, dtype="int16") as stream:
        while not stop_flag.is_set():
            chunk, _ = stream.read(1024)
            frames.append(chunk.copy())

    audio = np.concatenate(frames, axis=0)
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(samplerate)
        wf.writeframes(audio.tobytes())

    log.info("Recorded %.1fs of audio -> %s", len(audio) / samplerate, output_path)
    return output_path


# --------------------------------------------------------------------------
# Orchestrator
# --------------------------------------------------------------------------

@dataclass
class PipelineConfig:
    stt_provider: Provider = "sarvam"
    tts_provider: Provider = "sarvam"
    language: str = "unknown"        # "unknown" = auto-detect from speech; or force e.g. "hi-IN", "ta-IN"
    system_prompt: str = "You are a helpful, concise voice assistant. Reply in the same language as the user. Keep replies to 1-2 short sentences unless the user asks for more detail."
    auto_play: bool = True           # play the reply out loud right after generating it


def run_voice_pipeline(input_audio_path: str, output_audio_path: str, config: Optional[PipelineConfig] = None) -> dict:
    """End-to-end: audio file in -> transcript -> LLM reply -> audio file out.
    The reply is spoken back in whatever language was detected in the input audio.
    Returns a dict with the intermediate transcript and reply text, useful for logging/UI."""
    config = config or PipelineConfig()

    log.info("Step 1/3: STT (%s)", config.stt_provider)
    transcript, detected_language = speech_to_text(input_audio_path, config.stt_provider, config.language)

    log.info("Step 2/3: LLM (%s)", LLM_MODEL)
    reply_text = call_llm(transcript, config.system_prompt)

    log.info("Step 3/3: TTS (%s, language=%s)", config.tts_provider, detected_language)
    audio_bytes = text_to_speech(reply_text, config.tts_provider, detected_language)

    with open(output_audio_path, "wb") as f:
        f.write(audio_bytes)

    if config.auto_play:
        play_audio(output_audio_path)

    return {
        "transcript": transcript,
        "detected_language": detected_language,
        "reply_text": reply_text,
        "output_audio_path": output_audio_path,
    }


if _name_ == "_main_":
    _check_keys()
    # language="unknown" -> Sarvam auto-detects the spoken language and the
    # reply is generated + spoken back in that same language.
    cfg = PipelineConfig(stt_provider="sarvam", tts_provider="sarvam", language="unknown")

    print("Voice assistant ready. Type 'q' + Enter at any prompt to quit.\n")
    while True:
        first_key = input("Press Enter to talk (or 'q' to quit)... ")
        if first_key.strip().lower() == "q":
            break

        record_from_mic("input.wav")
        result = run_voice_pipeline("input.wav", "reply.wav", cfg)

        print("Detected language:", result["detected_language"])
        print("You said:", result["transcript"])
        print("Reply:", result["reply_text"])
        print()