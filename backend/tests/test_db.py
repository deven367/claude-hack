"""Tests for storyteller.db — CRUD operations on persons, stories, tags, and questionnaire responses."""

import storyteller.db as db


class TestPersonOperations:
    def test_create_and_get_person(self):
        pid = db.create_person("Alice", "Adult (30-49)")
        person = db.get_person(pid)
        assert person is not None
        assert person["name"] == "Alice"
        assert person["age_group"] == "Adult (30-49)"

    def test_get_all_persons_sorted_by_name(self):
        db.create_person("Zara", "Senior (65+)")
        db.create_person("Alice", "Teenager (13-19)")
        persons = db.get_all_persons()
        names = [p["name"] for p in persons]
        assert names == ["Alice", "Zara"]

    def test_get_nonexistent_person_returns_none(self):
        assert db.get_person(9999) is None

    def test_update_person_name(self):
        pid = db.create_person("Bob", "Young Adult (20-29)")
        db.update_person(pid, "Robert")
        person = db.get_person(pid)
        assert person["name"] == "Robert"


class TestStoryOperations:
    def test_create_story_with_tags(self):
        pid = db.create_person("Carol", "Adult (30-49)")
        sid = db.create_story(pid, "My Journey", "Once upon a time...", ["travel", "adventure"])
        story = db.get_story(sid)
        assert story is not None
        assert story["title"] == "My Journey"
        assert story["content"] == "Once upon a time..."
        assert set(story["tags"]) == {"travel", "adventure"}

    def test_create_story_creates_custom_tags(self):
        pid = db.create_person("Dan", "Senior (65+)")
        db.create_story(pid, "Custom", "text", ["brand-new-tag"])
        tags = db.get_all_tags()
        assert "brand-new-tag" in tags

    def test_create_story_ignores_blank_tags(self):
        pid = db.create_person("Eve", "Teenager (13-19)")
        sid = db.create_story(pid, "Title", "body", ["family", "", "  "])
        tags = db.get_tags_for_story(sid)
        assert tags == ["family"]

    def test_get_stories_for_person(self):
        pid = db.create_person("Frank", "Adult (30-49)")
        db.create_story(pid, "Story A", "aaa", ["childhood"])
        db.create_story(pid, "Story B", "bbb", ["career"])
        stories = db.get_stories_for_person(pid)
        assert len(stories) == 2
        titles = {s["title"] for s in stories}
        assert titles == {"Story A", "Story B"}

    def test_get_all_stories_includes_person_name(self):
        pid = db.create_person("Grace", "Young Adult (20-29)")
        db.create_story(pid, "Title", "content", [])
        stories = db.get_all_stories()
        assert any(s["person_name"] == "Grace" for s in stories)

    def test_update_story(self):
        pid = db.create_person("Hank", "Adult (30-49)")
        sid = db.create_story(pid, "Old Title", "old body", [])
        db.update_story(sid, "New Title", "new body")
        story = db.get_story(sid)
        assert story["title"] == "New Title"
        assert story["content"] == "new body"

    def test_get_nonexistent_story_returns_none(self):
        assert db.get_story(9999) is None

    def test_get_or_create_story_creates_when_missing(self):
        pid = db.create_person("Iris", "Mature Adult (50-64)")
        sid = db.get_or_create_story(pid, "Iris's Story")
        assert sid is not None
        story = db.get_story(sid)
        assert story["title"] == "Iris's Story"

    def test_get_or_create_story_returns_existing(self):
        pid = db.create_person("Jack", "Senior (65+)")
        sid1 = db.get_or_create_story(pid, "Jack's Story")
        sid2 = db.get_or_create_story(pid, "Different Title")
        assert sid1 == sid2


class TestTagOperations:
    def test_preset_tags_created_on_init(self):
        tags = db.get_all_tags()
        for preset in ["childhood", "family", "friendship", "love", "loss"]:
            assert preset in tags

    def test_get_stories_by_tag(self):
        pid = db.create_person("Kate", "Adult (30-49)")
        db.create_story(pid, "Story 1", "content", ["humor"])
        db.create_story(pid, "Story 2", "content", ["humor", "family"])
        db.create_story(pid, "Story 3", "content", ["family"])

        humor_stories = db.get_stories_by_tag("humor")
        assert len(humor_stories) == 2
        assert all("humor" in s["tags"] for s in humor_stories)

    def test_get_stories_by_nonexistent_tag(self):
        stories = db.get_stories_by_tag("nonexistent-tag-xyz")
        assert stories == []


class TestQuestionnaireResponses:
    def test_save_and_get_responses(self):
        pid = db.create_person("Leo", "Young Adult (20-29)")
        sid = db.create_story(pid, "Title", "content", [])
        db.save_questionnaire_responses(sid, [
            {"question": "Q1?", "answer": "A1"},
            {"question": "Q2?", "answer": "A2"},
        ])
        responses = db.get_questionnaire_responses(sid)
        assert len(responses) == 2
        assert responses[0]["question"] == "Q1?"
        assert responses[0]["answer"] == "A1"

    def test_save_response_without_answer_defaults_to_empty(self):
        pid = db.create_person("Mia", "Teenager (13-19)")
        sid = db.create_story(pid, "Title", "content", [])
        db.save_questionnaire_responses(sid, [{"question": "Q?"}])
        responses = db.get_questionnaire_responses(sid)
        assert responses[0]["answer"] == ""

    def test_save_or_update_response_creates_new(self):
        pid = db.create_person("Nate", "Adult (30-49)")
        sid = db.create_story(pid, "Title", "content", [])
        db.save_or_update_response(sid, "Favorite color?", "Blue")
        responses = db.get_questionnaire_responses(sid)
        assert len(responses) == 1
        assert responses[0]["answer"] == "Blue"

    def test_save_or_update_response_updates_existing(self):
        pid = db.create_person("Olivia", "Senior (65+)")
        sid = db.create_story(pid, "Title", "content", [])
        db.save_or_update_response(sid, "Favorite color?", "Blue")
        db.save_or_update_response(sid, "Favorite color?", "Green")
        responses = db.get_questionnaire_responses(sid)
        assert len(responses) == 1
        assert responses[0]["answer"] == "Green"
