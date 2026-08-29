# ServiceFlow CRM

## Overview
ServiceFlow CRM is a full‑stack Customer Relationship Management system built with **Django** (backend) and **React + Vite** (frontend). It includes modules for customers, leads, sales pipelines, support tickets, service requests, tasks, appointments, and communication history.

## Prerequisites
- Python 3.11+
- Node 20
- Docker (optional)
- Git

## Installation (local development)
```bash
# Clone repository
git clone https://github.com/shivapendala/service-flow-crm.git
cd "service flow crm"

# Backend setup
python -m venv venv
venv\\Scripts\\activate  # PowerShell
pip install -r backend/requirements.txt
pip freeze > backend/requirements.lock

# Frontend setup
cd frontend
npm ci
npm run build   # builds static assets
cd ..
```

## Running the application
### Development (no Docker)
```bash
# Django dev server
cd backend
venv\\Scripts\\activate
python manage.py migrate
python manage.py runserver
```
API will be at `http://127.0.0.1:8000/`.

### Production (Docker)
```bash
docker compose up -d --build
```
Backend: `http://localhost:8000/`, Frontend: `http://localhost:5173/`.

## Testing
```bash
make test   # runs pytest and vitest, generates coverage reports
```
Coverage reports are stored in `coverage/`.

## Build & Deploy
```bash
make docker-build   # builds Docker image
make docker-up      # starts containers
```

## License
MIT – see `LICENSE` file.