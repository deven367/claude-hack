# Share Your Story

A warm, conversational app for capturing life stories. Instead of filling out forms, users chat with an AI interviewer who guides them through 11 life chapters — from childhood memories to life reflections — one natural conversation at a time.

## How it works

1. Enter your name and click **Begin Guided Story**
2. An AI interviewer opens a conversation about your first life chapter
3. Chat naturally — the AI asks one question at a time, follows up on interesting details
4. Switch between chapters anytime; conversations are saved automatically
5. Read your completed story as a book in the **Reader** view

## Stack

- **Frontend**: React 19 + Vite (dev server on `localhost:5173`)
- **Backend**: Flask REST API + SQLite (on `localhost:5050`)
- **AI**: Claude Sonnet 4.6 via `llm-anthropic`
- **Styling**: Custom CSS with DM Serif Display, Crimson Pro, and Kalam fonts

## Run locally

### Prerequisites

- Python 3.12+ with [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+
- An Anthropic API key

### Setup

```bash
make setup
cd backend && .venv/bin/llm keys set anthropic
# paste your Anthropic API key when prompted
```

### Start

```bash
# Terminal 1 — backend
make start-backend

# Terminal 2 — frontend
make start-frontend
```

Open http://localhost:5173

### Alternative: Freeform stories

Click **Write a Blank Story** to write prose directly instead of using the guided conversation.

## Project structure

```
backend/
  server.py              # Flask API
  storyteller/
    db.py                # SQLite database layer
    conversation.py      # LLM conversation engine
    ai.py                # Title/tag generation (Ollama)
    speech.py            # Audio transcription (Whisper)
    questionnaire.py     # Adaptive questionnaire logic
  pyproject.toml         # Python dependencies

frontend/
  src/
    App.jsx              # Screen routing
    components/
      ChatScreen.jsx     # Conversational interview UI
      WelcomeScreen.jsx  # Home / library
      ReaderScreen.jsx   # Book-like story viewer
      ComposeScreen.jsx  # Freeform writing
    data/chapters.js     # 11 life chapters + questions
    utils/
      api.js             # Fetch wrapper
      storage.js         # localStorage helpers

stories.db               # SQLite database (auto-created)
Makefile                 # setup, start-backend, start-frontend, test-backend
```

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/persons` | Create a person + initial story |
| POST | `/api/chat` | Send message, get AI response |
| GET | `/api/chapters` | List all 11 chapters |
| GET | `/api/conversations/:storyId` | Chapter progress overview |
| GET | `/api/conversations/:storyId/:chapter` | Full transcript + answers |
| GET | `/api/stories` | List all stories |
| GET | `/api/stories/:id` | Get story details |
