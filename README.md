# Share Your Story

A conversational storytelling app that helps people capture their life stories by talking naturally with an AI listener. Priceless family stories disappear every day -- not because people don't want to share, but because nobody sits down and asks in the right way.

**Share Your Story** sits with you like a friend at the kitchen table and helps you tell your story -- in your own voice, in your own words.

## How it works

1. **Start a book** -- choose a guided life storybook (10 chapters from childhood to reflections) or a freeform story where you talk about anything
2. **Just talk** -- press the mic and speak naturally. The AI listens, asks follow-ups about the people and details in your story, and never interrupts with a checklist
3. **Read your book** -- everything becomes a paginated book you can flip through, with a table of contents, polished text, and the original transcript side by side
4. **Share it** -- export as an MP3 audiobook or a short video reel for social media

## Key features

- **Voice-first conversation** -- real-time speech-to-text and text-to-speech via ElevenLabs. Speak naturally, hear the AI respond out loud
- **33 languages** -- full UI translation and AI conversation in all languages supported by ElevenLabs (English, Spanish, French, German, Japanese, Chinese, Korean, Arabic, Hindi, and 24 more). A grandmother in Seoul or a dad in Mumbai can share in the language they think in
- **Instant opening questions** -- pre-written openers in every language mean zero wait time to start a conversation
- **Multi-session chapters** -- come back to any chapter and add more stories. The AI remembers what you've shared and doesn't repeat
- **Freeform mode** -- skip the guided chapters entirely and just tell whatever story is on your mind
- **Book reader** -- paginated book view with cover page, table of contents, chapter headers, and page-flip animations
- **Social sharing** -- generate a narrated video reel (with background video and music) or a full MP3 audiobook from any story
- **Privacy by default** -- stories are stored locally. Nothing leaves your device without your say-so

## Built with

- **[Claude Sonnet 4.6](https://anthropic.com)** -- powers all conversations, follow-up questions, transcript polishing, and story summarization
- **[ElevenLabs](https://elevenlabs.io)** -- `eleven_multilingual_v2` for text-to-speech in 33 languages, Scribe v1 for real-time speech-to-text
- **Frontend**: React 19 + Vite
- **Backend**: Flask REST API + SQLite
- **Video generation**: FFmpeg + Pillow
- **Deployment**: Vercel (backend API) + GitHub Pages (frontend)

## Run locally

### Prerequisites

- Python 3.12+ with [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)
- An [ElevenLabs API key](https://elevenlabs.io/)
- FFmpeg (for reel/audiobook export)

### Setup

```bash
make setup
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
```

Then set the Anthropic key for the `llm` package:

```bash
cd backend && .venv/bin/llm keys set anthropic
```

### Start

```bash
# Terminal 1 -- backend (port 5050)
make start-backend

# Terminal 2 -- frontend (port 5173)
make start-frontend
```

Open http://localhost:5173

## Project structure

```
backend/
  server.py                  # Flask API (chat, TTS, STT, share endpoints)
  storyteller/
    conversation.py          # Claude conversation engine + instant openers
    db.py                    # SQLite database layer
    tts.py                   # ElevenLabs TTS and STT
    share.py                 # Reel video + audiobook generation
    ai.py                    # Title/tag generation

frontend/
  src/
    App.jsx                  # Screen routing + language provider
    components/
      ChatScreen.jsx         # Conversational interview UI with voice
      WelcomeScreen.jsx      # Home / library with book shelves
      ReaderScreen.jsx       # Paginated book viewer
      SharePanel.jsx         # Export to reel or audiobook
      LanguageSelector.jsx   # Language dropdown (33 languages)
    contexts/
      LanguageContext.jsx     # i18n React context
    data/
      chapters.js            # 10 guided life chapters + questions
      translations.js        # UI translations for 33 languages
    utils/
      api.js                 # API client
      storage.js             # localStorage helpers

assets/
  background.mp4             # Background video for reel generation
  music.mp3                  # Background music for reels
```

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/persons` | Create a person + initial story |
| POST | `/api/chat` | Send message, get AI response (accepts `language` param) |
| GET | `/api/conversations/:storyId` | Chapter progress overview |
| GET | `/api/conversations/:storyId/:chapter` | Full transcript + extracted answers |
| POST | `/api/conversations/:storyId/:chapter/new` | Start new story session in a chapter |
| POST | `/api/tts` | Text-to-speech (returns MP3) |
| POST | `/api/transcribe` | Speech-to-text (accepts audio upload) |
| GET | `/api/stories/:id/share/summary` | AI-generated story summary |
| POST | `/api/stories/:id/share/audiobook` | Generate MP3 audiobook |
| POST | `/api/stories/:id/share/reel` | Generate MP4 video reel |

## AI & Ethics

- **Claude is the listener, not the author.** It never writes your story for you. It asks context-aware follow-ups and follows tangents -- that's where the real stories live
- **No fake enthusiasm.** The AI is prompted to never say "That's wonderful!" or "What a beautiful memory!" -- people can tell when responses are scripted
- **Gentle with difficult topics.** If someone brings up loss, regret, or trauma, the AI doesn't probe. It's designed to be respectful and let people share at their own pace
- **Your data stays yours.** Stories are stored locally on your device. You can delete any story or conversation at any time
