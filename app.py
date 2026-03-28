"""Share Your Story - A simple interface for people to share and preserve their stories."""

import streamlit as st

import db

db.init_db()

AGE_GROUPS = [
    "Teenager (13-19)",
    "Young Adult (20-29)",
    "Adult (30-49)",
    "Mature Adult (50-64)",
    "Senior (65+)",
]

BASE_QUESTIONS = [
    "What period of your life does this story come from?",
    "Who are the key people involved in this story?",
    "Where did this take place?",
    "How did this experience change you?",
    "What would you want someone to learn from this story?",
]

TAG_ADAPTIVE_QUESTIONS = {
    "childhood": [
        "How old were you when this happened?",
        "What is your fondest memory from that time?",
    ],
    "family": [
        "Which family members were most important in this story?",
        "How did this shape your family relationships?",
    ],
    "hardships": [
        "What helped you get through this difficult time?",
        "What strength did you discover in yourself?",
    ],
    "war": [
        "How did the conflict affect your daily life?",
        "What moments of humanity did you witness during this time?",
    ],
    "career": [
        "What motivated you to pursue this path?",
        "What was your biggest professional challenge?",
    ],
    "love": [
        "How did you meet this person?",
        "What is the most important thing love has taught you?",
    ],
    "loss": [
        "How do you keep their memory alive?",
        "What helped you cope with the loss?",
    ],
    "travel": [
        "What surprised you most about this place?",
        "How did this journey change your perspective?",
    ],
    "achievement": [
        "What obstacles did you overcome to reach this goal?",
        "Who supported you along the way?",
    ],
    "migration": [
        "What did you leave behind?",
        "How did you build a new sense of home?",
    ],
    "education": [
        "Who was the most influential teacher or mentor?",
        "What lesson extends beyond the classroom?",
    ],
    "health": [
        "How did this health experience change your outlook on life?",
        "What support system helped you through it?",
    ],
    "turning-point": [
        "What made you realize this was a turning point?",
        "What would have happened if you'd made a different choice?",
    ],
}


def get_adaptive_questions(selected_tags: list[str]) -> list[str]:
    """Build a question list that adapts based on selected tags."""
    questions = list(BASE_QUESTIONS)
    for tag in selected_tags:
        extra = TAG_ADAPTIVE_QUESTIONS.get(tag, [])
        questions.extend(extra)
    return questions


# --- Page: Share a Story ---

def page_share_story():
    st.header("Share Your Story")
    st.markdown(
        "Everyone has a story worth telling. Use this page to write yours — "
        "or record it with your voice."
    )

    all_persons = db.get_all_persons()

    with st.expander("New storyteller? Register here", expanded=not bool(all_persons)):
        with st.form("new_person_form"):
            new_name = st.text_input("Your name")
            new_age_group = st.selectbox("Age group", AGE_GROUPS)
            submitted = st.form_submit_button("Register")
            if submitted and new_name.strip():
                db.create_person(new_name.strip(), new_age_group)
                st.success(f"Welcome, {new_name}!")
                st.rerun()

    if not all_persons:
        st.info("Register above to start sharing your story.")
        return

    selected_person = st.selectbox(
        "Who is sharing?",
        options=all_persons,
        format_func=lambda p: f"{p['name']} ({p['age_group']})",
    )
    person_id = selected_person["id"]

    st.divider()

    input_mode = st.radio("How would you like to share?", ["Write", "Speak"], horizontal=True)

    if input_mode == "Speak":
        audio = st.audio_input("Record your story")
        if audio:
            st.info(
                "Voice-to-text transcription will be available in a future update. "
                "For now, please use the Write mode."
            )
        return

    with st.form("story_form", clear_on_submit=True):
        title = st.text_input("Story title", placeholder="Give your story a title...")
        content = st.text_area(
            "Your story",
            height=250,
            placeholder="Start writing your story here...",
        )

        all_tags = db.get_all_tags()
        selected_tags = st.multiselect(
            "Tags (select or type new ones)",
            options=all_tags,
            default=None,
            help="Choose tags that describe your story's themes",
        )
        custom_tags = st.text_input(
            "Add custom tags (comma-separated)",
            placeholder="e.g. resilience, music, 1990s",
        )

        submitted = st.form_submit_button("Save Story", type="primary")

        if submitted:
            if not title.strip() or not content.strip():
                st.error("Please provide both a title and your story.")
            else:
                all_selected = list(selected_tags)
                if custom_tags.strip():
                    all_selected.extend(
                        t.strip().lower() for t in custom_tags.split(",") if t.strip()
                    )

                story_id = db.create_story(person_id, title.strip(), content.strip(), all_selected)
                st.success("Your story has been saved!")

                st.session_state["last_story_id"] = story_id
                st.session_state["last_story_tags"] = all_selected
                st.session_state["show_questionnaire"] = True
                st.rerun()

    if st.session_state.get("show_questionnaire"):
        _show_questionnaire()


def _show_questionnaire():
    story_id = st.session_state.get("last_story_id")
    tags = st.session_state.get("last_story_tags", [])
    if not story_id:
        return

    story = db.get_story(story_id)
    if not story:
        return

    st.divider()
    st.subheader("Follow-up Questions")
    st.markdown(
        f'Your story **"{story["title"]}"** has been saved. '
        "Answer these optional follow-up questions to add more depth."
    )

    questions = get_adaptive_questions(tags)

    with st.form("questionnaire_form"):
        answers = {}
        for i, q in enumerate(questions):
            answers[q] = st.text_area(q, key=f"q_{i}", height=80)

        col1, col2 = st.columns(2)
        with col1:
            save_btn = st.form_submit_button("Save Answers", type="primary")
        with col2:
            skip_btn = st.form_submit_button("Skip")

        if save_btn:
            responses = [
                {"question": q, "answer": a}
                for q, a in answers.items()
                if a.strip()
            ]
            if responses:
                db.save_questionnaire_responses(story_id, responses)
                st.success("Your answers have been saved!")
            st.session_state["show_questionnaire"] = False
            st.rerun()

        if skip_btn:
            st.session_state["show_questionnaire"] = False
            st.rerun()


# --- Page: Browse Stories ---

def page_browse():
    st.header("Story Archive")

    view_mode = st.radio("View by", ["All Stories", "By Person", "By Tag"], horizontal=True)

    if view_mode == "All Stories":
        stories = db.get_all_stories()
        if not stories:
            st.info("No stories yet. Go to 'Share a Story' to add the first one!")
            return
        _render_story_list(stories)

    elif view_mode == "By Person":
        persons = db.get_all_persons()
        if not persons:
            st.info("No storytellers registered yet.")
            return
        selected = st.selectbox(
            "Select a person",
            options=persons,
            format_func=lambda p: f"{p['name']} ({p['age_group']})",
        )
        if selected:
            stories = db.get_stories_for_person(selected["id"])
            if stories:
                st.markdown(f"### Stories by {selected['name']}")
                _render_story_list(stories)
            else:
                st.info(f"No stories from {selected['name']} yet.")

    elif view_mode == "By Tag":
        tags = db.get_all_tags()
        selected_tag = st.selectbox("Select a tag", options=tags)
        if selected_tag:
            stories = db.get_stories_by_tag(selected_tag)
            if stories:
                st.markdown(f"### Stories tagged: *{selected_tag}*")
                _render_story_list(stories)
            else:
                st.info(f"No stories with the tag '{selected_tag}' yet.")


def _render_story_list(stories: list[dict]):
    for story in stories:
        with st.container(border=True):
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"#### {story['title']}")
                author = story.get("person_name", "Unknown")
                st.caption(f"by {author} · {story['created_at']}")
            with col2:
                if story.get("tags"):
                    tag_str = " ".join(f"`{t}`" for t in story["tags"])
                    st.markdown(tag_str)

            with st.expander("Read full story"):
                st.markdown(story["content"])

                responses = db.get_questionnaire_responses(story["id"])
                if responses:
                    st.divider()
                    st.markdown("**Follow-up responses:**")
                    for resp in responses:
                        st.markdown(f"*{resp['question']}*")
                        st.markdown(resp["answer"])


# --- Page: Story Detail / Visualization ---

def page_my_stories():
    st.header("My Story Timeline")

    persons = db.get_all_persons()
    if not persons:
        st.info("No storytellers registered yet.")
        return

    selected = st.selectbox(
        "Select a person",
        options=persons,
        format_func=lambda p: f"{p['name']} ({p['age_group']})",
    )
    if not selected:
        return

    stories = db.get_stories_for_person(selected["id"])
    if not stories:
        st.info(f"No stories from {selected['name']} yet.")
        return

    st.markdown(f"### {selected['name']}'s Story Journey")
    st.caption(f"Age group: {selected['age_group']} · {len(stories)} stories shared")

    all_tags = set()
    for s in stories:
        all_tags.update(s.get("tags", []))

    if all_tags:
        st.markdown("**Life themes:** " + " ".join(f"`{t}`" for t in sorted(all_tags)))

    st.divider()

    for i, story in enumerate(reversed(stories)):
        col_marker, col_content = st.columns([1, 10])
        with col_marker:
            st.markdown(f"**{i + 1}.**")
        with col_content:
            st.markdown(f"**{story['title']}**")
            st.caption(story["created_at"])
            if story.get("tags"):
                st.markdown(" ".join(f"`{t}`" for t in story["tags"]))
            with st.expander("Read"):
                st.markdown(story["content"])

    if len(stories) >= 2:
        st.divider()
        st.subheader("Story Insights")
        st.markdown(
            f"**{selected['name']}** has shared **{len(stories)}** stories "
            f"covering **{len(all_tags)}** life themes."
        )
        if all_tags:
            st.markdown(
                "The recurring themes suggest a life rich with experiences in: "
                + ", ".join(f"**{t}**" for t in sorted(all_tags))
                + "."
            )


# --- Main App ---

st.set_page_config(
    page_title="Share Your Story",
    page_icon="📖",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.sidebar.title("Share Your Story")
st.sidebar.markdown("*Everyone has a story worth telling.*")
st.sidebar.divider()

page = st.sidebar.radio(
    "Navigate",
    ["Share a Story", "Story Archive", "My Story Timeline"],
)

if page == "Share a Story":
    page_share_story()
elif page == "Story Archive":
    page_browse()
elif page == "My Story Timeline":
    page_my_stories()

st.sidebar.divider()
st.sidebar.caption("Share Your Story v0.1.0")
