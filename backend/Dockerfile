# ManyMinds backend — container image for Fly.io (or any container host).
#
# Python 3.12 (not 3.13) on purpose: every pinned dependency in
# requirements.txt ships prebuilt cp312 wheels, so the image builds with no
# compiler/Rust toolchain. The code runs identically on 3.12.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install deps first so this layer caches across code changes.
COPY requirements.txt .
RUN pip install -r requirements.txt

# App source (everything except what .dockerignore excludes).
COPY . .

# Listens on $PORT when the host provides one (e.g. Render), otherwise 8000.
# On Hugging Face set the Space's `app_port: 8000`; on Fly it's internal_port=8000.
EXPOSE 8000

# Shell form so ${PORT:-8000} expands at runtime.
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
