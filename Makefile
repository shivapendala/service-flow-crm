# Makefile for ServiceFlow CRM

.PHONY: install backend-setup frontend-setup backend-run frontend-run test lint docker-build docker-up docker-down

install: backend-setup frontend-setup

backend-setup:
	python -m venv venv
	venv\\Scripts\\activate && pip install -r backend/requirements.txt && pip freeze > backend/requirements.lock

frontend-setup:
	cd frontend && npm ci && npm run build

backend-run:
	venv\\Scripts\\activate && python backend/manage.py runserver

frontend-run:
	cd frontend && npm run dev

test:
	# Backend tests
	venv\\Scripts\\activate && pytest backend --cov=backend --cov-report=term-missing
	# Frontend tests (vitest)
	cd frontend && npx vitest run --coverage

lint:
	venv\\Scripts\\activate && flake8 backend
	cd frontend && npx eslint . --ext .tsx,.ts

docker-build:
	docker build -t serviceflowcrm .

docker-up:
	docker compose up -d

docker-down:
	docker compose down
