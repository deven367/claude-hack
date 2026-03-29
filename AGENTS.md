# Share Your Story — Development Notes

## Project vision

A simple, warm interface for capturing life stories through conversational AI interviews. 10 life chapters, each driven by an LLM conversation that extracts structured answers naturally. Stories are stored locally in SQLite and viewable as a book.

## Development instructions

1. Run code in the uv-based `.venv` in `backend/`
2. Do not merge directly into `main` — always create PRs
3. After every session, update this file with what you've learnt
4. Ask clarifying questions if deliverables seem ambiguous
5. Use existing code and external dependencies; don't reimplement
6. Use `sqlite-utils` for database operations, not raw SQL

## Key technical notes

- **Model alias**: `llm-anthropic` uses dot-separated aliases: `claude-opus-4.6` (NOT `claude-opus-4-6`). Dashes cause `UnknownModelError`.
- **API key setup**: Use `.env` file at project root (auto-loaded by server.py). Template at `.env_template`. Keys: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`.
- **DB location**: `stories.db` at repo root. `DB_PATH` in `db.py` resolves via `Path(__file__).resolve().parent.parent.parent / "stories.db"`.
- **Flask serves frontend**: `server.py` uses `template_folder="../frontend"` for production; Vite dev server proxies `/api` to Flask during development.
- **Qwen think mode**: Local Ollama model `qwen3.5:2b` requires `think=False` to avoid enormous reasoning traces.
- **Node version**: `package-lock.json` must be generated with the same Node version as CI (currently Node 20).
- **Chapter data duplication**: Questions are defined in both `frontend/src/data/chapters.js` and `backend/storyteller/conversation.py`. Keep them in sync.
- **Flask port**: Use port 5050 (not 5000). macOS Monterey+ reserves port 5000 for AirPlay Receiver.

## Build log

### Session 1 — Prototype (Deven, 2026-03-28)
- Streamlit GUI + SQLite storage, adaptive questionnaire, 20 preset tags
- Ollama integration (`qwen3.5:2b`) for title/tag generation
- Audio transcription placeholder via Whisper API

### Session 2 — Backend restructure (Deven, 2026-03-28)
- Moved all Python into `backend/storyteller/` package
- Replaced Streamlit with Flask API (`server.py`)
- Separated `pyproject.toml` for backend

### Session 3 — Frontend + dev tooling (Billy, 2026-03-28)
- React 19 + Vite frontend with warm book-themed design
- WelcomeScreen (library with shelves), JourneyScreen (questionnaire), ReaderScreen (book with page flip), ComposeScreen (freeform)
- Makefile, localStorage for story management

### Session 4 — Conversational life book (Billy, 2026-03-28)
- Replaced static questionnaire with LLM-driven conversations (Claude Sonnet 4.6 via `llm-anthropic`)
- New `conversations` table, `conversation.py` engine with per-chapter system prompts and answer extraction
- ChatScreen component with chat bubbles, chapter sidebar, progress tracking
- ReaderScreen updated to render conversation-extracted answers
- PRs: #17 (backend), #18 (frontend), #19 (reader + AGENTS.md)

### Session 5 — Full overhaul (Billy, 2026-03-29)

**Core UX:**
- Switched model from Sonnet 4.6 to **Opus 4.6**
- Rewrote all system prompts: no forced cheerfulness, questions are loose guides, model stays in user's story
- Merged "In the Beginning" and "Growing Up" into single "Childhood" chapter
- Welcome screen: book-shaped cards for "New Life Storybook" / "New Story", per-person library shelves, delete books
- Navigation: reader returns to chat (not home), removed particles background
- `.env` file loading for API keys (template at `.env_template`)
- Multi-session chapters: users can start multiple story sessions per chapter
- Freeform stories use conversational chat (same as guided)

**Voice-first experience:**
- ElevenLabs integration (`tts.py`): STT via Scribe API, TTS via text-to-speech API — zero external deps, uses urllib
- Single-question parchment UI: one question displayed at a time, quill writing animation between questions
- Large mic button with SVG icon, breathing pulse, recording ring animation
- Quill toggle for text input fallback
- Mute button (persists across navigation)
- Auto-play TTS on new AI responses, auto-send after voice transcription

**Reader & story management:**
- Transcript-based book rendering (conversation as dialogue, not Q&A)
- Polished text: user messages auto-cleaned for grammar, with Original/Polished toggle in reader
- Table of contents with chapter and per-story sub-entries, click to jump
- Session dividers in book content ("✧ Story 1 ✧")
- Custom chapters for freeform stories: create, rename (double-click), delete
- Story sessions: rename (double-click), delete with confirmation
- Non-first stories in guided chapters get open-ended prompts (not guided questions)
- PRs: #26, #27, #28

## Backlog

- Optimize extraction (runs on every message — could batch or run async)
- Story export for social media
- Richer visualization (timeline, tag clouds)
