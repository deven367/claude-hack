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