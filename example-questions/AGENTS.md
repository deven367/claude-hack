# share-your-story-and-a-lot-more

## basic idea

1. we want to create a simple to use interface for a person to "share their story"
2. the input for that the story can be text based or voice based
3. we would like to have the ability to link the stories of an individual and then visualize it (single person, multiple stories, broader life lessons)
4. if the user is sharing a story, the LLM (ideally an LLM that can run locally) can aid the user to refine it (make it better), the discretion for that lies at the user's end
5. we would like to have the functionality to create tags from the story, eg: childhood, hardships, wars, etc
6. you would also need to prepare a questionnaire for a person's story, the questions need to be adaptive based on the content of the story
7. the eventual plan is to also have a GUI in this app
8. the person sharing their story can be of any age, be it a teenager, young adult, working professional, student or even an old person
9. the plan is store these stories locally in a sqlite db with the final goal of creating a story (story archive) that can be shared on YouTube, Instagram or some other form of social media

## development instructions

1. Always run code in the uv-based `.venv` in the project
2. You are free to install dependencies in this venv
3. Once the `.venv` is activated, there is no need to activate it again
4. Always try to develop very simple python scripts
5. Once the project starts growing, consider adding a `pyproject.toml`
6. Add tests once the logic in the code starts getting complex
7. Do not merge code directly into the `main` branch, always create PRs and wait for human approval
8. After every session, update `AGENTS.md` with what you've learnt
9. Ask clarifying questions if deliverables seem to ambiguous.