.PHONY: setup-backend setup-frontend start-backend start-frontend test-backend

setup-backend:
	cd backend && uv sync --extra dev

setup-frontend:
	@echo "Frontend is static HTML — no dependencies to install."

start-backend:
	cd backend && uv run python server.py

start-frontend:
	@echo "Frontend is served by Flask at http://localhost:5000"
	@echo "Run 'make start-backend' to start the server."

test-backend:
	cd backend && uv run pytest tests/ -v
