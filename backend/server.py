"""Share Your Story - Flask server with REST API."""

from flask import Flask, render_template, jsonify, request

from storyteller import db
from storyteller import conversation

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
    message = data.get("message", "").strip()
    person_name = data.get("person_name", "Friend")

    if story_id is None or chapter_index is None:
        return jsonify({"error": "story_id and chapter_index required"}), 400

    # Load existing conversation or start fresh
    conv = db.get_conversation(story_id, chapter_index)

    if conv:
        messages = conv["messages"]
        extracted = conv["extracted_answers"]
    else:
        messages = []
        extracted = {}

    # If no messages yet, generate opening message from AI
    if not messages and not message:
        opening = conversation.get_opening_message(chapter_index, person_name)
        messages = [{"role": "assistant", "content": opening, "timestamp": ""}]
        db.save_conversation(story_id, chapter_index, messages, extracted)
        return jsonify({
            "ai_message": opening,
            "messages": messages,
            "extracted_answers": extracted,
            "chapter_info": conversation.get_chapter_info(chapter_index),
        })

    if not message:
        return jsonify({"error": "message is required"}), 400

    # Get AI response
    ai_response, updated_messages = conversation.chat(
        person_name, chapter_index, messages, message
    )

    # Extract answers from the updated conversation
    extracted = conversation.extract_answers(chapter_index, updated_messages)

    # Check if all questions are covered
    chapter_info = conversation.get_chapter_info(chapter_index)
    status = "completed" if len(extracted) >= chapter_info["question_count"] else "in_progress"

    # Save to DB
    db.save_conversation(story_id, chapter_index, updated_messages, extracted, status)

    return jsonify({
        "ai_message": ai_response,
        "messages": updated_messages,
        "extracted_answers": extracted,
        "chapter_info": chapter_info,
        "status": status,
    })


@app.route("/api/conversations/<int:story_id>", methods=["GET"])
def get_conversations(story_id):
    """Get all chapter conversations for a story (progress overview)."""
    convs = db.get_all_conversations(story_id)
    result = []
    for conv in convs:
        chapter_info = conversation.get_chapter_info(conv["chapter_index"])
        result.append({
            "chapter_index": conv["chapter_index"],
            "chapter_info": chapter_info,
            "message_count": len(conv["messages"]),
            "answers_count": len(conv["extracted_answers"]),
            "status": conv["status"],
        })
    return jsonify(result)


@app.route("/api/conversations/<int:story_id>/<int:chapter_index>", methods=["GET"])
def get_conversation(story_id, chapter_index):
    """Get full transcript + extracted answers for one chapter."""
    conv = db.get_conversation(story_id, chapter_index)
    if not conv:
        return jsonify({
            "messages": [],
            "extracted_answers": {},
            "status": "not_started",
            "chapter_info": conversation.get_chapter_info(chapter_index),
        })
    return jsonify({
        "messages": conv["messages"],
        "extracted_answers": conv["extracted_answers"],
        "status": conv["status"],
        "chapter_info": conversation.get_chapter_info(chapter_index),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5050)
