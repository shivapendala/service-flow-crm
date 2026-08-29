# Multi‑stage Dockerfile for ServiceFlow CRM

# ---------- Stage 1: Build Frontend ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy backend source code
COPY backend/ ./backend/

# Collect static files (if using Django staticfiles)
# RUN python backend/manage.py collectstatic --noinput

# Expose port for Django (Gunicorn)
EXPOSE 8000

# Entry point: use Gunicorn to serve the Django app
CMD ["gunicorn", "backend.wsgi:application", "-b", "0.0.0.0:8000", "-w", "4"]
