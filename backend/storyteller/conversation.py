"""Conversational interview engine powered by Claude via llm-anthropic."""

import json
import logging
from datetime import datetime, timezone

import llm

logger = logging.getLogger(__name__)

MODEL_ID = "claude-sonnet-4.6"

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


def _build_system_prompt(chapter_index: int, person_name: str, extracted_answers: dict) -> str:
    chapter = CHAPTERS[chapter_index]
    questions = chapter["questions"]

    answered_ids = set(extracted_answers.keys())
    unanswered = [q for q in questions if q["id"] not in answered_ids]
    answered = [q for q in questions if q["id"] in answered_ids]

    prompt = f"""You are a warm, empathetic interviewer helping {person_name} tell the story of their life. You are currently on the chapter called "{chapter['title']}" — {chapter['subtitle']}.

Your role is to have a natural, flowing conversation that draws out {person_name}'s memories and stories. You are NOT filling out a form — you are having a heartfelt conversation.

Guidelines:
- Ask ONE question at a time. Never list multiple questions.
- Follow up on interesting details before moving to a new topic. If they mention something touching or surprising, explore it.
- Be warm, encouraging, and genuinely curious. Use their name occasionally.
- Keep your responses concise — 2-3 sentences usually. This is their story, not yours.
- Acknowledge what they share before asking the next question. Show you're listening.
- If they give a short answer, gently encourage them to elaborate. "Tell me more about that..." or "What was that like?"
- If they want to skip a topic, respect that gracefully and move on.
- Don't be robotic or overly formal. Be like a kind friend who genuinely wants to hear their story.

Topics to explore in this chapter (use these as guidance, not a rigid checklist):
"""

    for q in questions:
        status = "ALREADY ANSWERED" if q["id"] in answered_ids else "not yet covered"
        prompt += f"- {q['text']} [{status}]\n"

    if answered:
        prompt += "\nWhat we already know from this chapter:\n"
        for q in answered:
            prompt += f"- {q['text']}: {extracted_answers[q['id']]}\n"

    if unanswered:
        prompt += f"\nTopics still to explore: {len(unanswered)} remaining. Weave these in naturally."
    else:
        prompt += "\nAll topics in this chapter have been covered! You can wrap up warmly and suggest moving to the next chapter."

    return prompt


def _build_extraction_prompt(chapter_index: int) -> str:
    chapter = CHAPTERS[chapter_index]
    questions = chapter["questions"]

    prompt = """Extract answers from this conversation transcript. For each question below, if the person has provided an answer (even partial), extract it. Use their own words as much as possible, cleaned up slightly for readability. If a question hasn't been answered yet, omit it from the output.

Return ONLY a JSON object mapping question IDs to extracted answer text. No other text.

Questions to extract:
"""
    for q in questions:
        prompt += f'- "{q["id"]}": {q["text"]}\n'

    prompt += '\nExample output: {"birthday": "March 15, 1952", "birthplace": "Portland, Oregon"}'
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


def get_opening_message(chapter_index: int, person_name: str) -> str:
    """Generate the AI's opening message for a new chapter conversation."""
    chapter = CHAPTERS[chapter_index]
    model = llm.get_model(MODEL_ID)

    system = f"""You are a warm interviewer helping {person_name} tell their life story. You're starting a new chapter: "{chapter['title']}" — {chapter['subtitle']}.

Write a brief, warm opening (2-3 sentences max) that:
1. Introduces the chapter theme naturally
2. Asks the first question from this list in a conversational way: {chapter['questions'][0]['text']}

Be warm and inviting, not formal. Make them feel comfortable sharing."""

    response = model.prompt("Begin the conversation.", system=system)
    return response.text().strip()


def chat(
    person_name: str,
    chapter_index: int,
    messages: list[dict],
    user_message: str,
) -> tuple[str, list[dict]]:
    """Send a message and get AI response. Returns (ai_response, updated_messages)."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Append user message
    messages.append({"role": "user", "content": user_message, "timestamp": now})

    # Build conversation for LLM — currently extracted answers are computed separately
    # so we pass empty dict for the system prompt (answers get refreshed after each exchange)
    existing_answers = extract_answers(chapter_index, messages)

    system = _build_system_prompt(chapter_index, person_name, existing_answers)
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
