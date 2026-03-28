.PHONY: setup-backend setup-frontend setup start-backend start-frontend

setup-backend:
	cd backend && uv sync

setup-frontend:
	cd frontend && npm install

setup: setup-backend setup-frontend

start-backend:
	cd backend && uv run python server.py

start-frontend:
	cd frontend && npm run dev
