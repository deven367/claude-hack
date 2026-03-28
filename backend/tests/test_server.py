"""Tests for the Flask API endpoints defined in server.py."""

import json


class TestPersonEndpoints:
    def test_create_person(self, client):
        resp = client.post("/api/persons", json={"name": "Alice", "age_group": "Adult (30-49)"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert "person_id" in data
        assert "story_id" in data

    def test_create_person_missing_name(self, client):
        resp = client.post("/api/persons", json={"name": "", "age_group": "Adult (30-49)"})
        assert resp.status_code == 400
        assert "error" in resp.get_json()

    def test_get_persons(self, client):
        client.post("/api/persons", json={"name": "Bob", "age_group": "Senior (65+)"})
        resp = client.get("/api/persons")
        assert resp.status_code == 200
        persons = resp.get_json()
        assert any(p["name"] == "Bob" for p in persons)

    def test_update_person(self, client):
        create_resp = client.post("/api/persons", json={"name": "Carl", "age_group": "Teenager (13-19)"})
        person_id = create_resp.get_json()["person_id"]
        resp = client.put(f"/api/persons/{person_id}", json={"name": "Carlos"})
        assert resp.status_code == 200

        persons = client.get("/api/persons").get_json()
        assert any(p["name"] == "Carlos" for p in persons)


class TestStoryEndpoints:
    def _create_person(self, client):
        resp = client.post("/api/persons", json={"name": "Tester", "age_group": "Adult (30-49)"})
        data = resp.get_json()
        return data["person_id"], data["story_id"]

    def test_get_all_stories(self, client):
        self._create_person(client)
        resp = client.get("/api/stories")
        assert resp.status_code == 200
        stories = resp.get_json()
        assert isinstance(stories, list)
        assert len(stories) >= 1

    def test_get_single_story(self, client):
        _, story_id = self._create_person(client)
        resp = client.get(f"/api/stories/{story_id}")
        assert resp.status_code == 200
        story = resp.get_json()
        assert story["id"] == story_id

    def test_get_nonexistent_story(self, client):
        resp = client.get("/api/stories/99999")
        assert resp.status_code == 404

    def test_update_story(self, client):
        _, story_id = self._create_person(client)
        resp = client.put(f"/api/stories/{story_id}", json={"title": "Updated", "content": "New content"})
        assert resp.status_code == 200
        story = client.get(f"/api/stories/{story_id}").get_json()
        assert story["title"] == "Updated"
        assert story["content"] == "New content"

    def test_update_story_missing_title(self, client):
        _, story_id = self._create_person(client)
        resp = client.put(f"/api/stories/{story_id}", json={"title": "", "content": "body"})
        assert resp.status_code == 400


class TestResponseEndpoints:
    def _create_person_and_story(self, client):
        resp = client.post("/api/persons", json={"name": "Respondent", "age_group": "Adult (30-49)"})
        return resp.get_json()["story_id"]

    def test_save_and_get_responses(self, client):
        story_id = self._create_person_and_story(client)
        client.post("/api/responses", json={
            "story_id": story_id,
            "question": "What happened?",
            "answer": "Everything.",
        })
        resp = client.get(f"/api/responses/{story_id}")
        assert resp.status_code == 200
        responses = resp.get_json()
        assert len(responses) == 1
        assert responses[0]["question"] == "What happened?"

    def test_save_response_missing_question(self, client):
        resp = client.post("/api/responses", json={"story_id": 1, "question": "", "answer": "x"})
        assert resp.status_code == 400

    def test_save_response_missing_story_id(self, client):
        resp = client.post("/api/responses", json={"question": "Q?", "answer": "A"})
        assert resp.status_code == 400

    def test_upsert_response(self, client):
        story_id = self._create_person_and_story(client)
        client.post("/api/responses", json={
            "story_id": story_id,
            "question": "Color?",
            "answer": "Blue",
        })
        client.post("/api/responses", json={
            "story_id": story_id,
            "question": "Color?",
            "answer": "Red",
        })
        responses = client.get(f"/api/responses/{story_id}").get_json()
        color_answers = [r for r in responses if r["question"] == "Color?"]
        assert len(color_answers) == 1
        assert color_answers[0]["answer"] == "Red"
