"""SQLite database layer for Share Your Story."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "stories.db"

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


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age_group TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (person_id) REFERENCES persons(id)
        );

        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS story_tags (
            story_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (story_id, tag_id),
            FOREIGN KEY (story_id) REFERENCES stories(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id)
        );

        CREATE TABLE IF NOT EXISTS questionnaire_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            story_id INTEGER NOT NULL,
            question TEXT NOT NULL,
            answer TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (story_id) REFERENCES stories(id)
        );
    """)

    for tag_name in PRESET_TAGS:
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))

    conn.commit()
    conn.close()


# --- Person operations ---

def create_person(name: str, age_group: str) -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO persons (name, age_group) VALUES (?, ?)",
        (name, age_group),
    )
    conn.commit()
    person_id = cursor.lastrowid
    conn.close()
    return person_id


def get_all_persons() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM persons ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_person(person_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM persons WHERE id = ?", (person_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# --- Story operations ---

def create_story(person_id: int, title: str, content: str, tag_names: list[str]) -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO stories (person_id, title, content) VALUES (?, ?, ?)",
        (person_id, title, content),
    )
    story_id = cursor.lastrowid

    for tag_name in tag_names:
        tag_name = tag_name.strip().lower()
        if not tag_name:
            continue
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
        tag_row = conn.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)).fetchone()
        conn.execute(
            "INSERT OR IGNORE INTO story_tags (story_id, tag_id) VALUES (?, ?)",
            (story_id, tag_row["id"]),
        )

    conn.commit()
    conn.close()
    return story_id


def get_stories_for_person(person_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM stories WHERE person_id = ? ORDER BY created_at DESC",
        (person_id,),
    ).fetchall()
    stories = [dict(r) for r in rows]
    for story in stories:
        story["tags"] = get_tags_for_story(story["id"], conn)
    conn.close()
    return stories


def get_all_stories() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.*, p.name as person_name
        FROM stories s
        JOIN persons p ON s.person_id = p.id
        ORDER BY s.created_at DESC
    """).fetchall()
    stories = [dict(r) for r in rows]
    for story in stories:
        story["tags"] = get_tags_for_story(story["id"], conn)
    conn.close()
    return stories


def get_story(story_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute("""
        SELECT s.*, p.name as person_name
        FROM stories s
        JOIN persons p ON s.person_id = p.id
        WHERE s.id = ?
    """, (story_id,)).fetchone()
    if row:
        story = dict(row)
        story["tags"] = get_tags_for_story(story_id, conn)
        conn.close()
        return story
    conn.close()
    return None


def update_story(story_id: int, title: str, content: str):
    conn = get_connection()
    conn.execute(
        "UPDATE stories SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
        (title, content, story_id),
    )
    conn.commit()
    conn.close()


# --- Tag operations ---

def get_tags_for_story(story_id: int, conn: sqlite3.Connection | None = None) -> list[str]:
    should_close = conn is None
    if conn is None:
        conn = get_connection()
    rows = conn.execute("""
        SELECT t.name FROM tags t
        JOIN story_tags st ON t.id = st.tag_id
        WHERE st.story_id = ?
        ORDER BY t.name
    """, (story_id,)).fetchall()
    if should_close:
        conn.close()
    return [r["name"] for r in rows]


def get_all_tags() -> list[str]:
    conn = get_connection()
    rows = conn.execute("SELECT name FROM tags ORDER BY name").fetchall()
    conn.close()
    return [r["name"] for r in rows]


def get_stories_by_tag(tag_name: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.*, p.name as person_name
        FROM stories s
        JOIN persons p ON s.person_id = p.id
        JOIN story_tags st ON s.id = st.story_id
        JOIN tags t ON st.tag_id = t.id
        WHERE t.name = ?
        ORDER BY s.created_at DESC
    """, (tag_name,)).fetchall()
    stories = [dict(r) for r in rows]
    for story in stories:
        story["tags"] = get_tags_for_story(story["id"], conn)
    conn.close()
    return stories


# --- Questionnaire operations ---

def save_questionnaire_responses(story_id: int, responses: list[dict]):
    conn = get_connection()
    for resp in responses:
        conn.execute(
            "INSERT INTO questionnaire_responses (story_id, question, answer) VALUES (?, ?, ?)",
            (story_id, resp["question"], resp.get("answer", "")),
        )
    conn.commit()
    conn.close()


def get_questionnaire_responses(story_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM questionnaire_responses WHERE story_id = ? ORDER BY id",
        (story_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_or_update_response(story_id: int, question: str, answer: str):
    """Upsert a single questionnaire response (for auto-save)."""
    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM questionnaire_responses WHERE story_id = ? AND question = ?",
        (story_id, question),
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE questionnaire_responses SET answer = ? WHERE id = ?",
            (answer, existing["id"]),
        )
    else:
        conn.execute(
            "INSERT INTO questionnaire_responses (story_id, question, answer) VALUES (?, ?, ?)",
            (story_id, question, answer),
        )
    conn.commit()
    conn.close()


def update_person(person_id: int, name: str):
    """Update a person's name."""
    conn = get_connection()
    conn.execute("UPDATE persons SET name = ? WHERE id = ?", (name, person_id))
    conn.commit()
    conn.close()


def get_or_create_story(person_id: int, title: str) -> int:
    """Get the first story for a person, or create one."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM stories WHERE person_id = ? ORDER BY id LIMIT 1",
        (person_id,),
    ).fetchone()
    if row:
        conn.close()
        return row["id"]
    cursor = conn.execute(
        "INSERT INTO stories (person_id, title, content) VALUES (?, ?, ?)",
        (person_id, title, ""),
    )
    story_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return story_id
