# share-your-story-and-a-lot-more

## basic idea

1. we want to create a simple to use interface for a person to "share their story"
2. the input for that the story can be text based or voice based
3. we would like to have the ability to link the stories of an individual and then visualize it (single person, multiple stories, broader life lessons)
4. if the user is sharing a story, the LLM (ideally an LLM that can run locally) can aid the user to refine it (make it better), the discretion for that lies at the user's end
5. we would like to have the functionality to create tags from the story, eg: childhood, hardships, wars, etc
6. you would also need to prepare a questionnaire for a person's story, the questions need to be adaptive based on the content of the story
7. the eventual plan is to also have a GUI in this app
8. the person sharing their story can be of any age, be it a teenager, young adult, working professional, student or even an old person
9. the plan is store these stories locally in a sqlite db with the final goal of creating a story (story archive) that can be shared on YouTube, Instagram or some other form of social media

## what's been built

### session 1 — prototype (2026-03-28)

- **Stack**: Streamlit (GUI) + SQLite (storage), managed with `uv` and `pyproject.toml`
- **`db.py`**: Full database layer — persons, stories, tags (20 presets + custom), story-tag associations, questionnaire responses. All CRUD operations.
- **`app.py`**: Three-page Streamlit app:
  - *Share a Story* — register storytellers, write stories, select/create tags, adaptive follow-up questionnaire
  - *Story Archive* — browse all stories, filter by person or tag
  - *My Story Timeline* — per-person timeline view with life-theme summary
- **Adaptive questionnaire**: Base questions + tag-specific follow-ups (13 tag categories with 2 questions each)
- **Voice input**: Placeholder UI with `st.audio_input`, transcription not yet wired up
- **Run with**: `streamlit run app.py`

### session 2 — LLM integration (2026-03-28)

- **`llm.py`**: Ollama integration using `qwen3.5:2b` running locally
  - `generate_title(story)` — produces a short evocative title from story content
  - `generate_tags(story, available_tags)` — selects 2-5 relevant tags (from presets or new) as JSON
  - `is_available()` — checks Ollama connectivity and model presence
- **`app.py` updated**: "Share a Story" page now has a 3-step flow:
  1. Write story content
  2. (Optional) Click "Suggest Title & Tags" to get AI-generated suggestions
  3. Review/edit suggestions and save
- **Sidebar**: Shows Ollama connection status indicator
- **Key learning**: Qwen3.5 is a thinking model — must pass `think=False` to `ollama.chat()` to disable the reasoning trace. Without this, the model produces enormous internal monologues (200+ lines for "hi") and takes minutes. With `think=False`, responses are fast (~3s for title + tags).

### session 3 — backend restructure (2026-03-28)

- **Moved all backend logic into `backend/` package**:
  - `backend/db.py` — database layer (unchanged logic, `DB_PATH` resolves to project root)
  - `backend/ai.py` — LLM title/tag generation (was `ai.py`, previously `llm.py`)
  - `backend/speech.py` — audio transcription via Whisper API / llm CLI
  - `backend/questionnaire.py` — adaptive questionnaire logic (extracted from `app.py`: age groups, base questions, tag-specific follow-ups)
  - `backend/__init__.py` — package marker
- **Removed `app.py`** — Streamlit frontend is being replaced by a new frontend
- **`pyproject.toml` moved into `backend/`** — bumped to v0.2.0, removed `streamlit` dep, uses `py-modules` for flat module discovery. The frontend will have its own separate config.
- **Key decision**: `stories.db` stays at the repo root (not inside `backend/`); `DB_PATH` uses `Path(__file__).resolve().parent.parent` to find it
- **Repo layout** is now: `backend/` (Python + pyproject.toml), `frontend/` (TBD), shared files at root (AGENTS.md, README, .gitignore, stories.db)

### what's next (backlog)

- New frontend (replaces Streamlit)
- Wire up voice-to-text (e.g. Whisper) for spoken story input
- LLM-powered story refinement suggestions (rewrite/improve flow)
- Story export for social media (YouTube/Instagram format)
- Richer visualization (timeline charts, tag clouds, story graphs)
- Add tests once logic grows more complex

## development instructions

1. Always run code in the uv-based `.venv` in the project
2. You are free to install dependencies in this venv
3. Once the `.venv` is activated, there is no need to activate it again
4. Always try to develop very simple python scripts
5. Once the project starts growing, consider adding a `pyproject.toml`
6. Add tests once the logic in the code starts getting complex
7. Do not merge code directly into the `main` branch, always create PRs and wait for human approval
8. After every session, update `AGENTS.md` with what you've learnt
9. Ask clarifying questions if deliverables seem to ambiguous.
10. Do not reimplement functionality that already exists. Use the existing code as a reference.
11. Install external dependencies instead of re-implementing them. Use `sqlite-utils` for database operations instead of writing raw SQL queries.

---

## Deven

### session 3 — backend restructure (2026-03-28)

- Moved all backend Python modules (`db.py`, `ai.py`, `speech.py`) into `backend/`
- Extracted questionnaire business logic from the Streamlit `app.py` into `backend/questionnaire.py` (age groups, base questions, 13 tag-specific adaptive follow-up categories)
- Deleted `app.py` — Streamlit frontend is being replaced
- Moved `pyproject.toml` into `backend/` so frontend and backend each own their own dependency config
- `stories.db` lives at repo root, shared between frontend and backend

---

## Billy

### session 1 — conversational UI & dev tooling (2026-03-28)

- **Repo layout**: `backend/` has its own `pyproject.toml` managed by `uv`; `frontend/` is a single static `index.html` served by Flask's `template_folder`; `server.py` lives in `backend/`
- **Flask serves everything**: `server.py` uses `Flask(__name__, template_folder="../frontend")` so the frontend has no separate dev server — it's all `localhost:5000`
- **Added `Makefile`** with 4 targets: `setup-backend`, `setup-frontend`, `start-backend`, `start-frontend`. Frontend targets are placeholders since Flask serves the HTML directly
- **Moved `server.py` into `backend/`**: import changed from `backend.storyteller` to `storyteller` (relative to its new location), template folder is now `../frontend`
- **`DB_PATH`** in `storyteller/db.py` resolves via `Path(__file__).resolve().parent.parent.parent / "stories.db"` — three levels up from `storyteller/` to repo root. This didn't need changing since `db.py` didn't move

### session 2 — conversational life book (2026-03-28)

**Goal**: Transform the static questionnaire into a conversational experience. Each of the 11 life chapters is now an LLM-driven conversation instead of a form.

**PRs created** (merge order: #17 → #18 → #19):
- **PR #17** (`feat/conversation-backend`): Backend conversation infrastructure
- **PR #18** (`feat/chat-frontend`): ChatScreen UI component
- **PR #19** (`feat/reader-conversations`): ReaderScreen reads conversation data

**Backend changes**:
- Added `conversations` table to `db.py` — stores `messages` (JSON transcript), `extracted_answers` (JSON structured data), `status` per story+chapter
- New `storyteller/conversation.py` — the conversation engine:
  - Builds per-chapter system prompts with chapter questions as "topics to explore"
  - Uses `llm-anthropic` plugin with model alias `claude-sonnet-4.6` (note: dot not dash)
  - `chat()` function sends conversation history + user message, gets AI response
  - `extract_answers()` runs a second LLM call to extract structured Q&A from transcript
  - Chapter data (questions) is duplicated from `frontend/src/data/chapters.js` into Python
- New API endpoints in `server.py`:
  - `POST /api/chat` — send message, get AI response + extracted answers
  - `GET /api/conversations/<story_id>` — progress overview for all chapters
  - `GET /api/conversations/<story_id>/<chapter_index>` — full transcript
  - `GET /api/chapters` — chapter metadata
- Added `llm-anthropic` to `pyproject.toml` dependencies

**Frontend changes**:
- New `ChatScreen.jsx` replaces `JourneyScreen` for guided stories
  - Chat bubbles (user right, AI left with avatar), typing indicator, auto-scroll
  - Chapter sidebar (collapsible on mobile) with progress per chapter
  - Progress bar showing topics covered per chapter
  - Input area with Enter to send, Shift+Enter for newline
- Updated `App.jsx`: "Begin Guided Story" and "Continue" now route to ChatScreen
- CSS: ~400 lines of chat styles matching the warm cream/terracotta aesthetic
- `ReaderScreen.jsx` updated to load `extracted_answers` from conversations, falling back to old `questionnaire_responses`

**Key learnings**:
- `llm-anthropic` model aliases use dots: `claude-sonnet-4.6`, NOT dashes: `claude-sonnet-4-6`. The dash version causes `UnknownModelError`.
- API key setup: `cd backend && .venv/bin/llm keys set anthropic` (one-time, persisted to `~/.config/io.datasette.llm/keys.json`). Also works via `ANTHROPIC_API_KEY` env var.
- The extraction step (second LLM call per message) adds latency. Could be optimized to run less frequently or async.
- `package-lock.json` was generated with Node 24 but CI uses Node 20 — lockfile needs to be generated with matching Node version.