"""Share Your Story - Flask server with REST API."""

import tempfile
from pathlib import Path

from flask import Flask, render_template, jsonify, request

from storyteller import db
from storyteller import conversation
from storyteller import speech

app = Flask(__name__, template_folder="../frontend")
db.init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/persons", methods=["GET"])
def get_persons():
    persons = db.get_all_persons()
    return jsonify(persons)


@app.route("/api/persons", methods=["POST"])
def create_person():
    data = request.json
    name = data.get("name", "").strip()
    age_group = data.get("age_group", "")
    if not name:
        return jsonify({"error": "Name is required"}), 400
    person_id = db.create_person(name, age_group)
    story_id = db.get_or_create_story(person_id, f"{name}'s Story")
    return jsonify({"person_id": person_id, "story_id": story_id})


@app.route("/api/persons/<int:person_id>", methods=["PUT"])
def update_person(person_id):
    data = request.json
    name = data.get("name", "").strip()
    if name:
        db.update_person(person_id, name)
        # Also update story title
        stories = db.get_stories_for_person(person_id)
        if stories:
            db.update_story(stories[0]["id"], f"{name}'s Story", stories[0].get("content", ""))
    return jsonify({"status": "ok"})


@app.route("/api/responses/<int:story_id>", methods=["GET"])
def get_responses(story_id):
    responses = db.get_questionnaire_responses(story_id)
    return jsonify(responses)


@app.route("/api/responses", methods=["POST"])
def save_response():
    data = request.json
    story_id = data.get("story_id")
    question = data.get("question", "").strip()
    answer = data.get("answer", "").strip()
    if not story_id or not question:
        return jsonify({"error": "story_id and question required"}), 400
    db.save_or_update_response(story_id, question, answer)
    return jsonify({"status": "ok"})


@app.route("/api/stories", methods=["GET"])
def get_all_stories():
    stories = db.get_all_stories()
    for story in stories:
        story["responses"] = db.get_questionnaire_responses(story["id"])
    return jsonify(stories)


@app.route("/api/stories/<int:story_id>", methods=["GET"])
def get_story(story_id):
    story = db.get_story(story_id)
    if not story:
        return jsonify({"error": "Story not found"}), 404
    story["responses"] = db.get_questionnaire_responses(story_id)
    return jsonify(story)


@app.route("/api/stories/<int:story_id>", methods=["PUT"])
def update_story(story_id):
    data = request.json
    title = data.get("title", "").strip()
    content = data.get("content", "")
    if not title:
        return jsonify({"error": "Title is required"}), 400
    db.update_story(story_id, title, content)
    return jsonify({"status": "ok"})


# --- Conversation / Chat endpoints ---

@app.route("/api/chapters", methods=["GET"])
def get_chapters():
    """Return chapter metadata for all chapters."""
    chapters = []
    for i in range(conversation.get_chapter_count()):
        chapters.append(conversation.get_chapter_info(i))
    return jsonify(chapters)


@app.route("/api/chat", methods=["POST"])
def chat():
    """Send a message in a chapter conversation. Returns AI response."""
    data = request.json
    story_id = data.get("story_id")
    chapter_index = data.get("chapter_index")
    conversation_id = data.get("conversation_id")
    message = data.get("message", "").strip()
    person_name = data.get("person_name", "Friend")

    if story_id is None or chapter_index is None:
        return jsonify({"error": "story_id and chapter_index required"}), 400

    # Load specific conversation or latest for chapter
    conv = None
    if conversation_id:
        conv = db.get_conversation_by_id(conversation_id)
    if not conv:
        conv = db.get_conversation(story_id, chapter_index)

    if conv:
        messages = conv["messages"]
        extracted = conv["extracted_answers"]
        conv_id = conv["id"]
    else:
        messages = []
        extracted = {}
        conv_id = None

    # Gather context from previous sessions in this chapter
    prior_stories = []
    if conv_id:
        all_sessions = db.get_chapter_conversations(story_id, chapter_index)
        for sess in all_sessions:
            if sess["id"] != conv_id:
                for k, v in sess["extracted_answers"].items():
                    prior_stories.append(v)

    # If no messages yet, generate opening message from AI
    if not messages and not message:
        opening = conversation.get_opening_message(chapter_index, person_name, prior_context=prior_stories)
        messages = [{"role": "assistant", "content": opening, "timestamp": ""}]
        if conv_id:
            db.update_conversation(conv_id, messages, extracted)
        else:
            conv_id = db.create_conversation(story_id, chapter_index, messages, extracted)
        return jsonify({
            "ai_message": opening,
            "messages": messages,
            "extracted_answers": extracted,
            "chapter_info": conversation.get_chapter_info(chapter_index),
            "conversation_id": conv_id,
        })

    if not message:
        return jsonify({"error": "message is required"}), 400

    # Get AI response
    ai_response, updated_messages = conversation.chat(
        person_name, chapter_index, messages, message, prior_context=prior_stories,
    )

    # Extract answers from the updated conversation
    extracted = conversation.extract_answers(chapter_index, updated_messages)

    # Save to DB
    chapter_info = conversation.get_chapter_info(chapter_index)
    if conv_id:
        db.update_conversation(conv_id, updated_messages, extracted)
    else:
        conv_id = db.create_conversation(story_id, chapter_index, updated_messages, extracted)

    return jsonify({
        "ai_message": ai_response,
        "messages": updated_messages,
        "extracted_answers": extracted,
        "chapter_info": chapter_info,
        "conversation_id": conv_id,
        "status": "in_progress",
    })


@app.route("/api/conversations/<int:story_id>/<chapter_index>/new", methods=["POST"])
def new_conversation_session(story_id, chapter_index):
    chapter_index = int(chapter_index)
    """Start a new conversation session within a chapter."""
    data = request.json or {}
    person_name = data.get("person_name", "Friend")

    # Gather context from all existing sessions in this chapter
    prior_stories = []
    all_sessions = db.get_chapter_conversations(story_id, chapter_index)
    for sess in all_sessions:
        for k, v in sess["extracted_answers"].items():
            prior_stories.append(v)

    opening = conversation.get_opening_message(chapter_index, person_name, prior_context=prior_stories)
    messages = [{"role": "assistant", "content": opening, "timestamp": ""}]
    conv_id = db.create_conversation(story_id, chapter_index, messages, {})

    return jsonify({
        "ai_message": opening,
        "messages": messages,
        "extracted_answers": {},
        "chapter_info": conversation.get_chapter_info(chapter_index),
        "conversation_id": conv_id,
        "session_number": len(all_sessions) + 1,
    })


@app.route("/api/conversations/<int:story_id>", methods=["GET"])
def get_conversations(story_id):
    """Get all chapter conversations for a story (progress overview)."""
    convs = db.get_all_conversations(story_id)
    # Group by chapter for summary
    chapters = {}
    for conv in convs:
        ci = conv["chapter_index"]
        if ci not in chapters:
            chapters[ci] = {"sessions": 0, "total_messages": 0, "total_answers": 0}
        chapters[ci]["sessions"] += 1
        chapters[ci]["total_messages"] += len(conv["messages"])
        chapters[ci]["total_answers"] += len(conv["extracted_answers"])

    result = []
    for ci, info in sorted(chapters.items()):
        chapter_info = conversation.get_chapter_info(ci)
        result.append({
            "chapter_index": ci,
            "chapter_info": chapter_info,
            "message_count": info["total_messages"],
            "answers_count": info["total_answers"],
            "session_count": info["sessions"],
            "status": "in_progress" if info["total_messages"] > 0 else "not_started",
        })
    return jsonify(result)


@app.route("/api/conversations/<int:story_id>/<chapter_index>", methods=["GET"])
def get_conversation(story_id, chapter_index):
    chapter_index = int(chapter_index)
    """Get all conversation sessions for a chapter."""
    sessions = db.get_chapter_conversations(story_id, chapter_index)
    if not sessions:
        return jsonify({
            "sessions": [],
            "latest": {
                "messages": [],
                "extracted_answers": {},
                "conversation_id": None,
            },
            "status": "not_started",
            "chapter_info": conversation.get_chapter_info(chapter_index),
        })

    latest = sessions[-1]
    return jsonify({
        "sessions": [
            {
                "conversation_id": s["id"],
                "message_count": len(s["messages"]),
                "answers_count": len(s["extracted_answers"]),
                "extracted_answers": s["extracted_answers"],
                "created_at": s.get("created_at", ""),
            }
            for s in sessions
        ],
        "latest": {
            "messages": latest["messages"],
            "extracted_answers": latest["extracted_answers"],
            "conversation_id": latest["id"],
        },
        "status": "in_progress",
        "chapter_info": conversation.get_chapter_info(chapter_index),
    })


@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    """Transcribe an audio file to text using Whisper."""
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        audio_file.save(tmp)
        tmp_path = Path(tmp.name)

    try:
        text = speech.transcribe_audio_file(tmp_path)
        return jsonify({"text": text})
    except speech.TranscriptionError as e:
        return jsonify({"error": str(e)}), 500
    finally:
        tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
