from __future__ import annotations

from pathlib import Path
from typing import Optional

from openai import OpenAI
import os


class TranscriptionError(Exception):
    pass


def get_openai_client() -> OpenAI:
    # Explicitly pass api_key to avoid env resolution issues in some runtimes
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise TranscriptionError(
            "Missing OPENAI_API_KEY. Set it in your environment or .env file."
        )
    return OpenAI(api_key=api_key)


def transcribe_audio_file(audio_path: Path, *, model: str = "gpt-4o-mini-transcribe") -> str:
    if not audio_path.exists() or not audio_path.is_file():
        raise TranscriptionError(f"Audio file not found: {audio_path}")

    client = get_openai_client()
    try:
        with audio_path.open("rb") as f:
            resp = client.audio.transcriptions.create(
                model=model,
                file=f,
                # Let the model auto-detect language. Provide plain text output.
                response_format="text",
            )
    except Exception as e:
        raise TranscriptionError(str(e)) from e

    # The SDK returns a plain text string when response_format="text"
    text: Optional[str] = resp  # type: ignore[assignment]
    if not text or not isinstance(text, str):
        raise TranscriptionError("Empty transcription result.")
    return text.strip()

