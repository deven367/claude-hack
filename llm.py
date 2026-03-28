"""Ollama LLM integration for title and tag generation."""

import json
import logging

import ollama

logger = logging.getLogger(__name__)

MODEL = "qwen3.5:2b"

_TITLE_PROMPT = """You are a story title generator. Given a personal story, produce a single short, evocative title (5-10 words). Return ONLY the title text, nothing else."""

_TAGS_PROMPT = """You are a story tag classifier. Given a personal story, select the most relevant tags from this list:

{available_tags}

Rules:
- Pick 2-5 tags that best describe the story's themes
- You may also suggest up to 2 NEW tags not in the list, if warranted
- Return a JSON array of lowercase tag strings, e.g. ["childhood", "family", "new-tag"]
- Return ONLY the JSON array, no other text"""


def _chat(system_prompt: str, user_content: str) -> str:
    """Call Ollama with thinking disabled for fast, clean responses."""
    response = ollama.chat(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        think=False,
    )
    return response.message.content.strip()


def is_available() -> bool:
    """Check if Ollama is running and the model is accessible."""
    try:
        models = ollama.list()
        return any(m.model.startswith("qwen3.5") for m in models.models)
    except Exception:
        return False


def generate_title(story_content: str) -> str | None:
    """Generate a title for a story using the local LLM."""
    try:
        title = _chat(_TITLE_PROMPT, story_content[:3000])
        title = title.strip('"').strip("'")
        if title:
            return title
    except Exception as e:
        logger.warning("LLM title generation failed: %s", e)
    return None


def generate_tags(story_content: str, available_tags: list[str]) -> list[str] | None:
    """Generate tag suggestions for a story using the local LLM."""
    prompt = _TAGS_PROMPT.format(available_tags=", ".join(available_tags))
    try:
        raw = _chat(prompt, story_content[:3000])
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        tags = json.loads(raw)
        if isinstance(tags, list):
            return [t.strip().lower() for t in tags if isinstance(t, str) and t.strip()]
    except Exception as e:
        logger.warning("LLM tag generation failed: %s", e)
    return None
