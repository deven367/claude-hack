# Share Your Story

## Run locally

1. Ensure Python 3.12+ and `uv` are installed.
2. Install dependencies:
   - `uv pip install -e .`
3. Set environment variables (uses dotenv if `.env` is present):
   - Create a `.env` file in the project root with:
     - `OPENAI_API_KEY=your_openai_api_key_here`
4. Start the app:
   - `streamlit run app.py`

## Speech to Text (GPT-4o mini Transcribe)

- In “Share a Story”, choose “Speak”.
- Record audio; transcription runs automatically on stop.
- The transcript pre-fills the story text area as an editable draft.
- Audio is saved locally under `data/audio/` for retry.
- Click “Retry transcription” to re-run without re-recording.

Notes:
- Multilingual input is supported via auto language detection.
- Transcription returns plain text (no timestamps/diarization).

### Using llm-whisper-api (preferred if installed)

This app can use Simon Willison’s `llm whisper-api` CLI for transcription and will auto-detect it if available.

Install:

```bash
pip install llm
llm install llm-whisper-api
# Optional: configure key within llm
llm keys set openai
```

Usage in this app:
- If the `llm` binary is in PATH, the app will run `llm whisper-api <audio>` automatically.
- If not installed, it falls back to the OpenAI Python SDK.
- You can force-disable the CLI attempt by setting `USE_LLM_WHISPER_API=0`.

Reference: [`llm-whisper-api` README](https://github.com/simonw/llm-whisper-api)