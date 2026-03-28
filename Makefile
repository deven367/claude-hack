.PHONY: setup-backend setup-frontend setup start-backend start-frontend test-backend

setup-backend:
	cd backend && uv sync --extra dev

setup-frontend:
	cd frontend && npm install

setup: setup-backend setup-frontend

start-backend:
	cd backend && uv run python server.py

start-frontend:
  cd frontend && npm run dev

test-backend:
	cd backend && uv run pytest tests/ -v
