"""Conversational interview engine powered by Claude via llm-anthropic."""

import json
import logging
from datetime import datetime, timezone

import llm

logger = logging.getLogger(__name__)

MODEL_ID = "claude-opus-4.6"

# Chapter data mirrored from frontend — questions the AI should cover per chapter.
CHAPTERS = [
    {
        "id": "beginning",
        "title": "In the Beginning",
        "subtitle": "Where your story starts",
        "questions": [
            {"id": "birthday", "text": "When is your birthday?"},
            {"id": "birthplace", "text": "Where were you born?"},
            {"id": "named_after", "text": "Were you named after anyone special?"},
            {"id": "baby_stories", "text": "What stories has your family told about you as a baby?"},
            {"id": "earliest_memory", "text": "What is your earliest childhood memory?"},
        ],
    },
    {
        "id": "growing_up",
        "title": "Growing Up",
        "subtitle": "Childhood days",
        "questions": [
            {"id": "hometown", "text": "Where did you grow up?"},
            {"id": "nickname", "text": "Did you have a nickname?"},
            {"id": "best_friend", "text": "Who was your best friend growing up?"},
            {"id": "fav_candy", "text": "What was your favorite candy or treat?"},
            {"id": "kid_personality", "text": "What were you like as a kid?"},
            {"id": "miss_childhood", "text": "What do you miss most about being a kid?"},
        ],
    },
    {
        "id": "school",
        "title": "School Days",
        "subtitle": "Lessons learned, not all from books",
        "questions": [
            {"id": "enjoy_school", "text": "Did you enjoy school?"},
            {"id": "fav_subject", "text": "Favorite and least favorite subjects?"},
            {"id": "school_activities", "text": "What activities did you participate in?"},
            {"id": "grades", "text": "What kind of student were you?"},
            {"id": "teacher_impact", "text": "Was there a teacher who changed your life?"},
            {"id": "school_advice", "text": "Knowing what you know now, what would you tell your student self?"},
        ],
    },
    {
        "id": "teenage",
        "title": "The Teenage Years",
        "subtitle": "Finding out who you were going to be",
        "questions": [
            {"id": "teen_style", "text": "How did you dress and style your hair as a teenager?"},
            {"id": "teen_weekend", "text": "What was a typical weekend night like?"},
            {"id": "teen_friends", "text": "Big group or a few close friends?"},
            {"id": "first_car", "text": "What kind of car did you learn to drive?"},
            {"id": "teen_personality", "text": "What were you like during your teen years?"},
            {"id": "teen_advice", "text": "What advice would you give your teenage self?"},
        ],
    },
    {
        "id": "parents",
        "title": "Mom & Dad",
        "subtitle": "The people who shaped you",
        "questions": [
            {"id": "describe_mother", "text": "Three words to describe your mother?"},
            {"id": "describe_father", "text": "Three words to describe your father?"},
            {"id": "parents_meet", "text": "How did your parents meet?"},
            {"id": "family_traditions", "text": "What family traditions do you remember?"},
            {"id": "like_parents", "text": "How are you most like your parents? Least like them?"},
        ],
    },
    {
        "id": "love",
        "title": "Love & Romance",
        "subtitle": "Matters of the heart",
        "questions": [
            {"id": "first_crush", "text": "Who was your biggest crush?"},
            {"id": "first_kiss", "text": "How old were you for your first kiss?"},
            {"id": "romantic_memory", "text": "What is your most romantic memory?"},
            {"id": "love_lesson", "text": "What is the most important thing love has taught you?"},
            {"id": "relationship_qualities", "text": "What matters most in a relationship?"},
        ],
    },
    {
        "id": "career",
        "title": "Work & Dreams",
        "subtitle": "The paths taken and not taken",
        "questions": [
            {"id": "childhood_dream", "text": "What did you want to be when you grew up?"},
            {"id": "first_job", "text": "What was your very first job?"},
            {"id": "favorite_job", "text": "What was your favorite job and why?"},
            {"id": "dream_profession", "text": "If you could do anything, what would it be?"},
            {"id": "never_do_jobs", "text": "Three jobs you would never do?"},
        ],
    },
    {
        "id": "adventures",
        "title": "Adventures",
        "subtitle": "The places and moments that changed everything",
        "questions": [
            {"id": "fav_travel", "text": "What is your favorite travel memory?"},
            {"id": "dream_vacation", "text": "What is your fantasy vacation?"},
            {"id": "always_packs", "text": "What do you always bring on a trip?"},
            {"id": "most_impulsive", "text": "What is the most impulsive thing you ever did?"},
        ],
    },
    {
        "id": "parent_hood",
        "title": "Becoming a Parent",
        "subtitle": "The chapter that changed everything",
        "questions": [
            {"id": "first_parent_age", "text": "How old were you when you first became a parent?"},
            {"id": "first_told", "text": "Who was the first person you told?"},
            {"id": "sang_to_kids", "text": "Was there a song you would sing to your children?"},
            {"id": "parenting_advice", "text": "What advice would you give yourself as a new parent?"},
            {"id": "fav_kid_memory", "text": "What is your favorite memory of your children?"},
        ],
    },
    {
        "id": "favorites",
        "title": "Favorites & Quirks",
        "subtitle": "The little things that make you, you",
        "questions": [
            {"id": "ice_cream", "text": "Favorite ice cream flavor?"},
            {"id": "coffee", "text": "How do you like your coffee?"},
            {"id": "favorite_season", "text": "Favorite season and why?"},
            {"id": "last_meal", "text": "What would you pick as your last meal?"},
            {"id": "autobiography_title", "text": "What would be the title of your autobiography?"},
            {"id": "perfect_day", "text": "What does a perfect day look like for you?"},
        ],
    },
    {
        "id": "reflections",
        "title": "Looking Back",
        "subtitle": "Wisdom, wonder, and what matters most",
        "questions": [
            {"id": "proudest", "text": "What are you most proud of?"},
            {"id": "biggest_regret", "text": "What is your biggest regret?"},
            {"id": "modern_surprise", "text": "What about the modern world surprises you most?"},
            {"id": "lesson_to_share", "text": "What would you want someone to learn from your story?"},
        ],
    },
]


def _build_system_prompt(
    chapter_index: int,
    person_name: str,
    extracted_answers: dict,
    prior_context: list[str] | None = None,
) -> str:
    chapter = CHAPTERS[chapter_index]
    questions = chapter["questions"]

    answered_ids = set(k for k in extracted_answers.keys() if not k.startswith("_"))
    unanswered = [q for q in questions if q["id"] not in answered_ids]
    answered = [q for q in questions if q["id"] in answered_ids]
    bonus_stories = {k: v for k, v in extracted_answers.items() if k.startswith("_")}

    prompt = f"""You are helping {person_name} tell the story of their life. Right now you're talking about "{chapter['title']}" — {chapter['subtitle']}.

This is a conversation, not a questionnaire. Let {person_name} lead. If they want to tell a long story, let them talk. If they go on tangents, follow — tangents are often where the real story lives. Your job is to be a good listener and help them go deeper into what matters to them.

IMPORTANT — do not steer the conversation toward your question list. If {person_name} is in the middle of a story, stay with that story. Ask about details, people, feelings, what happened next. Do NOT change the subject to try to "cover" a question. The questions below are only there so you have something to fall back on during a lull — they are not goals to accomplish.

How to talk:
- Sound like a normal person. No flowery language. No "So let's go back to where it all started" or "the world you were born into." Just talk plainly.
- NEVER use phrases like "That's wonderful!", "What a beautiful memory!", "Thank you for sharing that." These are fake and people can tell.
- Keep responses to 1-2 sentences. You're not giving a speech.
- If they're telling a story, engage with it. Ask about the people, the details, how they felt. Stay in their story.
- If there's a natural pause and they seem done with a thread, you can gently open a new one.
- If they give a short answer, you can invite more ("What was that like?") but don't push.
- If they want to skip something, just move on.
- Talk like a friend at a kitchen table, not like an interviewer on a podcast.

Background topics for this chapter (use ONLY during natural lulls, never interrupt a story for these):
"""

    for q in questions:
        status = "(covered)" if q["id"] in answered_ids else ""
        prompt += f"- {q['text']} {status}\n"

    if answered:
        prompt += "\nWhat's been shared in this conversation:\n"
        for q in answered:
            prompt += f"- {q['text']}: {extracted_answers[q['id']]}\n"

    if bonus_stories:
        prompt += "\nStories shared in this conversation:\n"
        for key, value in bonus_stories.items():
            prompt += f"- {value[:200]}\n"

    if prior_context:
        prompt += "\nFrom previous conversations in this chapter (don't repeat, but you can reference):\n"
        for ctx in prior_context[:10]:
            prompt += f"- {ctx[:150]}\n"

    prompt += f"""
{person_name}'s story is bigger than any list of questions. If they share memories, feelings, or stories that don't map to a specific question, that's some of the best material for their book. Let the conversation breathe.

{person_name} can always come back to this chapter to add more stories. There's no rush."""

    if not unanswered:
        prompt += f"\n\nYou've touched on the main topics for this chapter, but {person_name} may have more to say. Stay open. If the conversation winds down naturally, you can mention they could move to the next chapter or start a new story whenever they're ready."

    return prompt


def _build_extraction_prompt(chapter_index: int) -> str:
    chapter = CHAPTERS[chapter_index]
    questions = chapter["questions"]

    prompt = """Extract information from this conversation for a life story book. Do two things:

1. For each question below, if the person answered it (even partially), extract their answer using their own words, cleaned up for readability. Omit unanswered questions.

2. If the person shared stories, memories, anecdotes, or details that don't fit neatly into any question — capture those too. These are often the richest material. Use keys like "_story_1", "_story_2", etc. Write each as a short narrative paragraph in the person's voice.

Return ONLY a JSON object. No other text.

Questions to look for:
"""
    for q in questions:
        prompt += f'- "{q["id"]}": {q["text"]}\n'

    prompt += '\nExample output: {"birthday": "March 15, 1952", "birthplace": "Portland, Oregon", "_story_1": "We lived on a farm outside town with no electricity until I was six. My mother used to read to us by candlelight every night — she could do all the voices."}'
    return prompt


def get_chapter_count() -> int:
    return len(CHAPTERS)


def get_chapter_info(chapter_index: int) -> dict:
    if 0 <= chapter_index < len(CHAPTERS):
        ch = CHAPTERS[chapter_index]
        return {
            "id": ch["id"],
            "title": ch["title"],
            "subtitle": ch["subtitle"],
            "question_count": len(ch["questions"]),
        }
    return {}


def get_opening_message(
    chapter_index: int,
    person_name: str,
    prior_context: list[str] | None = None,
) -> str:
    """Generate the AI's opening message for a new chapter conversation."""
    chapter = CHAPTERS[chapter_index]
    model = llm.get_model(MODEL_ID)

    has_prior = prior_context and len(prior_context) > 0

    # Build a summary of what this chapter covers vs other chapters
    questions_summary = ", ".join(q["text"].lower().rstrip("?") for q in chapter["questions"][:3])

    if has_prior:
        system = f"""You're having a conversation with {person_name} about their life, specifically "{chapter['title']}". They've talked about this before and are back to share more.

Write ONE short sentence welcoming them back. Something like "Hey, welcome back." or "Good to pick this up again." Don't be flowery. Don't summarize. Don't ask a question yet."""
    else:
        system = f"""You're having a conversation with {person_name} about their life. You're starting on "{chapter['title']}" — {chapter['subtitle']}.

This chapter is specifically about: {questions_summary}. Stay on THIS chapter's topic — don't ask about things covered in other chapters.

Write ONE short, simple sentence to get started. Something plain and direct that fits this specific chapter topic. Not dramatic, not poetic, not a paragraph. One sentence, no more."""

    response = model.prompt("Begin the conversation.", system=system)
    return response.text().strip()


def chat(
    person_name: str,
    chapter_index: int,
    messages: list[dict],
    user_message: str,
    prior_context: list[str] | None = None,
) -> tuple[str, list[dict]]:
    """Send a message and get AI response. Returns (ai_response, updated_messages)."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Append user message
    messages.append({"role": "user", "content": user_message, "timestamp": now})

    # Build conversation for LLM — currently extracted answers are computed separately
    # so we pass empty dict for the system prompt (answers get refreshed after each exchange)
    existing_answers = extract_answers(chapter_index, messages)

    system = _build_system_prompt(chapter_index, person_name, existing_answers, prior_context)
    model = llm.get_model(MODEL_ID)

    # Build the LLM conversation
    conversation = model.conversation()
    conversation.system = system

    # Replay prior messages through the conversation
    # The llm library's conversation.prompt() adds messages sequentially,
    # so we need to build the conversation from scratch each time.
    # Instead, we'll use a single prompt call with the full history in the system.
    history_text = ""
    for msg in messages[:-1]:  # all except the latest user message
        role_label = "You" if msg["role"] == "assistant" else person_name
        history_text += f"{role_label}: {msg['content']}\n\n"

    full_prompt = user_message
    if history_text:
        system += f"\n\nConversation so far:\n{history_text}\n{person_name}'s latest message follows."

    response = model.prompt(full_prompt, system=system)
    ai_text = response.text().strip()

    messages.append({"role": "assistant", "content": ai_text, "timestamp": now})
    return ai_text, messages


def extract_answers(chapter_index: int, messages: list[dict]) -> dict:
    """Extract structured answers from conversation transcript."""
    if not messages:
        return {}

    # Build transcript
    transcript = ""
    for msg in messages:
        label = "Interviewer" if msg["role"] == "assistant" else "Person"
        transcript += f"{label}: {msg['content']}\n\n"

    system = _build_extraction_prompt(chapter_index)
    model = llm.get_model(MODEL_ID)

    try:
        response = model.prompt(transcript, system=system)
        raw = response.text().strip()
        # Handle markdown code blocks
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        answers = json.loads(raw)
        if isinstance(answers, dict):
            return {k: v for k, v in answers.items() if isinstance(v, str) and v.strip()}
    except Exception as e:
        logger.warning("Answer extraction failed: %s", e)

    return {}
