#!/usr/bin/env bash
# ManyMinds — local dev launcher.
#
# Boots FastAPI against the local Postgres `manyminds` database. Pass GEMINI_API_KEY
# in your shell (or add it to .env) to switch chat responses from persona stubs to
# real Gemini. Pass ELEVENLABS_API_KEY for voice. Pass NEO4J_URI for the graph memory.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install --quiet -U pip
  .venv/bin/pip install --quiet -r requirements.txt
fi

export APP_ENV="${APP_ENV:-development}"
export FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-http://localhost:3000}"
export DATABASE_URL="${DATABASE_URL:-postgresql://keshav@localhost:5432/manyminds}"
export JWT_SECRET="${JWT_SECRET:-2f6c8a1d4e9b3f5a7c0d8e2b1a3f5d7c9e4b6a8d2c4e6f8a1b3c5d7e9f0a2b4c6d8e}"

exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload "$@"
