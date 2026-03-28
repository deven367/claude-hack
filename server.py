"""Share Your Story - Flask server with REST API."""

from flask import Flask, render_template, jsonify, request

from backend.storyteller import db

app = Flask(__name__, template_folder="frontend")
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
