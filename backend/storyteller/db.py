"""SQLite database layer for Share Your Story, powered by sqlite-utils."""

from datetime import datetime, timezone
from pathlib import Path

import sqlite_utils

DB_PATH = Path(__file__).resolve().parent.parent.parent / "stories.db"

PRESET_TAGS = [
    "childhood",
    "family",
    "friendship",
    "love",
    "loss",
    "hardships",
    "achievement",
    "career",
    "education",
    "travel",
    "war",
    "migration",
    "health",
    "faith",
    "humor",
    "adventure",
    "coming-of-age",
    "life-lesson",
    "turning-point",
    "gratitude",
]


def get_db() -> sqlite_utils.Database:
    db = sqlite_utils.Database(DB_PATH)
    db.execute("PRAGMA foreign_keys = ON")
    return db


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def init_db():
    db = get_db()

    db["persons"].create(
        {"id": int, "name": str, "age_group": str, "created_at": str},
        pk="id",
        if_not_exists=True,
    )

    db["stories"].create(
        {
            "id": int,
            "person_id": int,
            "title": str,
            "content": str,
            "created_at": str,
            "updated_at": str,
        },
        pk="id",
        foreign_keys=[("person_id", "persons")],
        if_not_exists=True,
    )

    db["tags"].create(
        {"id": int, "name": str},
        pk="id",
        if_not_exists=True,
    )
    if "idx_tags_name" not in {idx.name for idx in db["tags"].indexes}:
        db["tags"].create_index(["name"], unique=True, index_name="idx_tags_name", if_not_exists=True)

    db["story_tags"].create(
        {"story_id": int, "tag_id": int},
        pk=("story_id", "tag_id"),
        foreign_keys=[("story_id", "stories"), ("tag_id", "tags")],
        if_not_exists=True,
    )

    db["questionnaire_responses"].create(
        {
            "id": int,
            "story_id": int,
            "question": str,
            "answer": str,
            "created_at": str,
        },
        pk="id",
        foreign_keys=[("story_id", "stories")],
        if_not_exists=True,
    )

    db["tags"].insert_all(
        [{"name": t} for t in PRESET_TAGS],
        ignore=True,
    )


# --- Person operations ---

def create_person(name: str, age_group: str) -> int:
    db = get_db()
    return db["persons"].insert(
        {"name": name, "age_group": age_group, "created_at": _now()},
    ).last_pk


def get_all_persons() -> list[dict]:
    db = get_db()
    return list(db["persons"].rows_where(order_by="name"))


def get_person(person_id: int) -> dict | None:
    db = get_db()
    try:
        return db["persons"].get(person_id)
    except sqlite_utils.db.NotFoundError:
        return None


# --- Story operations ---

def create_story(person_id: int, title: str, content: str, tag_names: list[str]) -> int:
    db = get_db()
    now = _now()
    story_id = db["stories"].insert(
        {
            "person_id": person_id,
            "title": title,
            "content": content,
            "created_at": now,
            "updated_at": now,
        },
    ).last_pk

    for tag_name in tag_names:
        tag_name = tag_name.strip().lower()
        if not tag_name:
            continue
        db["tags"].insert({"name": tag_name}, ignore=True)
        tag_row = list(db["tags"].rows_where("name = ?", [tag_name]))[0]
        db["story_tags"].insert(
            {"story_id": story_id, "tag_id": tag_row["id"]},
            ignore=True,
        )

    return story_id


def get_stories_for_person(person_id: int) -> list[dict]:
    db = get_db()
    stories = list(
        db["stories"].rows_where("person_id = ?", [person_id], order_by="-created_at")
    )
    for story in stories:
        story["tags"] = _get_tags_for_story(db, story["id"])
    return stories


def get_all_stories() -> list[dict]:
    db = get_db()
    stories = list(db.execute("""
        SELECT s.*, p.name as person_name
        FROM stories s
        JOIN persons p ON s.person_id = p.id
        ORDER BY s.created_at DESC
    """).fetchall())
    columns = ["id", "person_id", "title", "content", "created_at", "updated_at", "person_name"]
    stories = [dict(zip(columns, row)) for row in stories]
    for story in stories:
        story["tags"] = _get_tags_for_story(db, story["id"])
    return stories


def get_story(story_id: int) -> dict | None:
    db = get_db()
    rows = list(db.execute("""
        SELECT s.*, p.name as person_name
        FROM stories s
        JOIN persons p ON s.person_id = p.id
        WHERE s.id = ?
    """, [story_id]).fetchall())
    if not rows:
        return None
    columns = ["id", "person_id", "title", "content", "created_at", "updated_at", "person_name"]
    story = dict(zip(columns, rows[0]))
    story["tags"] = _get_tags_for_story(db, story_id)
    return story


def update_story(story_id: int, title: str, content: str):
    db = get_db()
    db["stories"].update(story_id, {"title": title, "content": content, "updated_at": _now()})


# --- Tag operations ---

def _get_tags_for_story(db: sqlite_utils.Database, story_id: int) -> list[str]:
    rows = db.execute("""
        SELECT t.name FROM tags t
        JOIN story_tags st ON t.id = st.tag_id
        WHERE st.story_id = ?
        ORDER BY t.name
    """, [story_id]).fetchall()
    return [r[0] for r in rows]


def get_tags_for_story(story_id: int) -> list[str]:
    return _get_tags_for_story(get_db(), story_id)


def get_all_tags() -> list[str]:
    db = get_db()
    return [row["name"] for row in db["tags"].rows_where(order_by="name")]


def get_stories_by_tag(tag_name: str) -> list[dict]:
    db = get_db()
    rows = db.execute("""
        SELECT s.*, p.name as person_name
        FROM stories s
        JOIN persons p ON s.person_id = p.id
        JOIN story_tags st ON s.id = st.story_id
        JOIN tags t ON st.tag_id = t.id
        WHERE t.name = ?
        ORDER BY s.created_at DESC
    """, [tag_name]).fetchall()
    columns = ["id", "person_id", "title", "content", "created_at", "updated_at", "person_name"]
    stories = [dict(zip(columns, row)) for row in rows]
    for story in stories:
        story["tags"] = _get_tags_for_story(db, story["id"])
    return stories


# --- Questionnaire operations ---

def save_questionnaire_responses(story_id: int, responses: list[dict]):
    db = get_db()
    now = _now()
    db["questionnaire_responses"].insert_all([
        {
            "story_id": story_id,
            "question": resp["question"],
            "answer": resp.get("answer", ""),
            "created_at": now,
        }
        for resp in responses
    ])


def get_questionnaire_responses(story_id: int) -> list[dict]:
    db = get_db()
    return list(
        db["questionnaire_responses"].rows_where(
            "story_id = ?", [story_id], order_by="id"
        )
    )
