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

# Fly routes public HTTPS → this internal port (see fly.toml internal_port).
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
