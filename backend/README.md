# ManyMinds Backend

## What ManyMinds is

ManyMinds is a personalised **Council** of five AI friends — Aria, Rex, Sage,
Nova and Echo — who chat one-on-one, debate each other, play turn-based games
with the user, and remember everything that's been said. The product layer
adds 3D avatars per member and streamed voice (ElevenLabs) on top of the chat
loop, so the same conversation can be read, listened to, or watched.

This README covers the **backend only**. The browser frontend (Three.js / R3F)
lives in `../frontend` and consumes the HTTP + WebSocket surface documented
below.

## Stack at a glance

| Layer                    | Service                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| Framework                | FastAPI 0.115 on Python 3.11+, async end-to-end                         |
| Validation               | Pydantic 2.10 + pydantic-settings                                       |
| Database                 | Azure Cosmos DB (NoSQL API) via `azure-cosmos==4.7.0` async             |
| Auth                     | JWT (access + refresh) with passlib/bcrypt                              |
| LLM                      | Azure OpenAI via the `openai` SDK (`app/services/llm.py`)               |
| Image understanding      | Azure Computer Vision — Image Analysis 4.0                              |
| Language detect + scores | Azure AI Language (Text Analytics)                                      |
| Translation              | Azure Translator REST (no extra SDK; uses `httpx`)                      |
| Voice TTS + STT          | ElevenLabs streaming (`app/services/voice.py`)                          |
| Knowledge graph          | Neo4j async driver (`app/services/memory_graph.py`)                     |
| Email (password reset)   | SendGrid → SMTP → console fallback (`app/services/email_provider.py`)   |
| Frontend origin (CORS)   | Configured via `FRONTEND_ORIGIN`, default `http://localhost:3000`       |

## Stub mode (read this first)

Every external integration in this service is **optional**. The very first
thing to internalise: `uvicorn app.main:app` will boot with a totally empty
`.env`, and every HTTP route, every WebSocket, every council member will keep
working. They just return canned data instead of calling out.

How it works:

- `app/core/config.py` defines a `has_*` property for each integration —
  `has_database`, `has_llm`, `has_vision`, `has_language`, `has_translator`,
  `has_voice`, `has_neo4j`, `has_email`. Each one checks whether the
  corresponding env-var pair is set.
- Each service in `app/services/` is constructed lazily and exposes an
  `.available` boolean. Routes branch on that flag and fall back to the
  stub functions in `app/services/stubs.py` when the live client is down.
- `app/services/stubs.py` holds per-member response banks for every intent
  (`greeting`, `decision`, `vent`, `brainstorm`, `analytical`, `provoke`,
  `debate_argument`, `debate_moderation`, `game_commentary`, `default`).
  Selection is hash-stable on `(member_id, intent, seed)` so the same
  prompt produces the same reply within a session — easy to demo, easy to
  screenshot.
- Cosmos DB is special: when it's missing, the **whole app** drops into
  in-memory stub mode. Repositories write to module-level dicts that mirror
  the live document shapes, so the API surface is identical either way.

Missing one integration's env-var pair disables only that integration. The
rest of the app keeps running. There is no "all or nothing" mode.

## Quickstart (no Azure, no creds)

You can have the API answering requests in under a minute, with zero secrets.

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt

uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

On boot you should see log lines like these, confirming you're in stub mode:

```
manyminds | Starting ManyMinds (env=development, mode=stub)
manyminds | COSMOS_ENDPOINT / COSMOS_KEY not set — running in stub mode
manyminds | Running in STUB mode — no Cosmos DB, all routes return mocks/in-memory data
manyminds | Azure OpenAI not configured — using canned stub responses
manyminds | Azure Vision not configured — image messages skipped
manyminds | Azure Language not configured — language detect / sentiment disabled
manyminds | Memory graph in fallback mode (NEO4J_URI not set or unreachable)
manyminds | ElevenLabs voice not configured — voice toggle stays UI-only
manyminds | Email provider: console
```

Smoke-test it:

```bash
curl -s http://127.0.0.1:8000/healthz | jq .
# {
#   "status": "ok", "service": "ManyMinds", "mode": "stub",
#   "db": false, "llm": false, "vision": false, "language": false, ...
# }
```

Browse `http://127.0.0.1:8000/docs` for the live OpenAPI surface. Every
endpoint is callable right now against the stub stack.

## Quickstart (with Azure)

When you're ready to wire up live services:

1. Read `./AZURE_SETUP.md` first — it walks through provisioning the Cosmos
   account, the OpenAI deployment, Vision, Language and Translator resources,
   and where each key lives in the portal.
2. Copy the example env file and fill in keys for whichever services you want
   on. Every variable is optional — leave the ones you don't have blank and
   their service stays in stub mode.

```bash
cp .env.example .env
# edit .env: paste COSMOS_ENDPOINT/KEY, AZURE_OPENAI_*, ELEVENLABS_API_KEY, etc.
```

3. Restart `uvicorn`. If everything is wired correctly the boot log should
   read more like this:

```
manyminds | Starting ManyMinds (env=development, mode=live)
manyminds | Cosmos DB ready (database=manyminds, containers=users, council, sessions, conversations, auth_tokens, environments)
manyminds | Cosmos DB connected (database=manyminds)
manyminds | Azure OpenAI available (deployment=gpt-4o-mini, api-version=2024-02-15-preview)
manyminds | Azure Vision available (endpoint=https://<resource>.cognitiveservices.azure.com/)
manyminds | Azure Language available (endpoint=https://<resource>.cognitiveservices.azure.com/)
manyminds | Azure Translator configured (region=eastus)
manyminds | Memory graph live on Neo4j (uri=neo4j+s://xxxx.databases.neo4j.io)
manyminds | ElevenLabs voice available (model=eleven_turbo_v2_5)
manyminds | Email provider: sendgrid
```

`GET /healthz` will now report `"mode": "live"` and each integration's flag
flipped to `true`.

## Architecture

```
app/
  main.py                  FastAPI app, lifespan, /healthz, CORS, router mount
  core/
    config.py              pydantic-settings, all env vars + has_* probes
    database.py            Cosmos async client, container catalog, helpers
  schemas/                 Pydantic request + response models per domain
  api/v1/                  HTTP + WebSocket routers (one file per domain)
  services/                Domain logic, external client wrappers, stubs
    personalities/         Frozen 5-member persona definitions + prompt builder
```

**`app/core/`** — settings and the Cosmos client singleton. `config.py` is
the one place env vars are read. `database.py` defines the container catalog,
boots containers on first run when `COSMOS_BOOTSTRAP_CONTAINERS=true`, and
exposes thin async helpers (`upsert`, `read_item`, `delete_item`, `query`)
that no-op when the client is unavailable.

**`app/services/`** — one module per integration plus one per domain. The
integration wrappers (`llm.py`, `voice.py`, `azure_vision.py`,
`azure_language.py`, `memory_graph.py`, `email_provider.py`) expose
`.available` and gracefully degrade. The domain modules (`chat.py`,
`debate.py`, `games.py`, `council.py`, `orchestration.py`, `security.py`)
compose those wrappers and own the business rules. `stubs.py` is the canned
response bank.

**`app/api/v1/`** — one router per domain (`auth`, `onboarding`, `council`,
`chat`, `debate`, `games`, `memory`, `voice`). Routers are thin: they
validate via `schemas/`, call into `services/`, and return Pydantic models.
The chat router additionally hosts the streaming-stub WebSocket.

**`app/schemas/`** — Pydantic v2 models grouped by domain (`auth.py`,
`council.py`, `chat.py`, `debate.py`, `games.py`, `memory.py`,
`onboarding.py`, `common.py`). These are the only types crossing the HTTP
boundary.

**`app/services/personalities/`** — the five council members are frozen:
Aria (Analyst), Rex (Provocateur), Sage (Architect), Nova (Creator), Echo
(Empath). `personas.py` declares their traits, voice profile and default
prompts. `prompts.py` assembles the per-message system prompt by injecting
the active persona, user demographics, Big Five scores, recent conversation
history and graph-recalled memory facts. `voices.md` documents the chosen
ElevenLabs voice IDs.

### Cosmos container catalog

All six containers live in a single database (`COSMOS_DATABASE_NAME`,
default `manyminds`). Polymorphism is by a `type` discriminator on each
document. Created automatically on boot when `COSMOS_BOOTSTRAP_CONTAINERS`
is true.

| Container       | Partition key  | Doc types                                                                                        |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `users`         | `/userId`      | `user`, `userProfile`, `personalityProfile`, `quizResponses`, `userEnvironmentPreference`        |
| `council`       | `/userId`      | `councilMember`, `avatar`, `voiceProfile`                                                        |
| `sessions`      | `/userId`      | `session`                                                                                        |
| `conversations` | `/sessionId`   | `message`, `debate` (embeds participants + arguments), `game` (embeds participants), `gameMove`  |
| `auth_tokens`   | `/userId`      | `refreshToken`, `passwordResetToken`                                                             |
| `environments`  | `/type`        | `environment` (global 3D scene reference data)                                                   |

Unique-key policies enforce per-partition `/email` and `/username` on
`users`, `/userId+/slug` on `council`, and `/slug` on `environments`. See
`app/core/database.py::CONTAINER_SPECS` for the authoritative definition.

## API surface

All routes are mounted under `/api/v1`. Two top-level routes — `/` and
`/healthz` — live outside the versioned prefix.

### `auth.router` — sessions and password reset

- `POST /auth/signup` — create a user, return an access + refresh JWT pair.
- `POST /auth/login` — exchange email + password for a token pair.
- `POST /auth/refresh` — rotate the refresh token, return a fresh pair.
- `POST /auth/logout` — revoke the current refresh token.
- `GET /auth/me` — return the authenticated user document.
- `POST /auth/password-reset/request` — send a one-time reset email/log.
- `POST /auth/password-reset/confirm` — consume the token, set a new password.

### `onboarding.router` — two-phase user setup

- `POST /onboarding/demographics` — phase one (name, age, gender, DOB,
  location, preferred language).
- `POST /onboarding/quiz` — phase two (Big Five quiz responses; stored
  raw and as derived O/C/E/A/N scores).
- `GET /onboarding/status` — which phases are complete.

### `council.router` — members and the active 3D environment

- `GET /council/members` — the user's five council members with per-user
  customisations applied.
- `PATCH /council/members/{member_id}` — tweak a member (display name,
  trait dials, voice override, avatar URL).
- `GET /council/environments` — list available 3D environments.
- `PUT /council/environment` — set the active environment for the user.
- `GET /council/environment` — read the active environment for the user.

### `chat.router` — sessions, messages, streaming

- `POST /chat/sessions` — start a new chat session.
- `GET /chat/sessions` — list the user's sessions (most recent first).
- `GET /chat/sessions/{id}` — read a session header.
- `POST /chat/sessions/{id}/messages` — send a user message, get the
  full council turn (one reply per addressed member).
- `GET /chat/sessions/{id}/messages` — paginate the session transcript.
- `WS /chat/sessions/{id}/ws` — streaming-stub WebSocket; emits per-member
  token frames followed by a final `done` frame. Falls back to whole-reply
  emission when no live LLM is configured.

### `debate.router` — moderated AI debates

- `POST /debate` — start a debate (topic, sides, moderator, max rounds).
- `GET /debate/{id}` — read the debate doc (participants + all rounds so far).
- `POST /debate/{id}/advance` — produce the next round of arguments and the
  moderator's wrap-up for that round.

### `games.router` — turn-based games with AI players

- `POST /games` — start a game (currently `truth_or_dare`, `chess`, `ludo`).
- `GET /games/{id}` — read the game doc with full move history.
- `POST /games/{id}/moves` — submit a player move; AI participants reply.
- `POST /games/{id}/commentary` — request fresh per-member commentary on
  the current board / round.

### `memory.router` — knowledge graph

- `GET /memory/graph` — the user's Neo4j subgraph (nodes + edges). When
  Neo4j is unset, returns a deterministic per-user generator output so the
  frontend visualizer keeps working.

### `voice.router` — ElevenLabs TTS

- `POST /voice/synthesize` — request a streamed audio buffer for a given
  member + text. Returns an audio response when ElevenLabs is configured,
  otherwise a `503` so the frontend can fall back to muted playback.

## Smoke checks

There is no formal test suite yet. The intent is to lean on FastAPI's
`TestClient` for ad-hoc verification.

Import-only smoke (catches typos and import-order bugs in stub mode):

```bash
python -c "from app.main import app; print(len(app.routes), 'routes mounted')"
```

Signup + list council, all in-process, no server running:

```bash
python - <<'PY'
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
r = c.post("/api/v1/auth/signup", json={
    "email": "smoke@manyminds.local",
    "username": "smoke",
    "password": "correct horse battery staple",
})
assert r.status_code in (200, 201), r.text
token = r.json()["access_token"]

r = c.get("/api/v1/council/members", headers={"Authorization": f"Bearer {token}"})
assert r.status_code == 200, r.text
print("council members:", [m["slug"] for m in r.json()])
PY
```

Create a chat session and send the first message:

```bash
python - <<'PY'
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
token = c.post("/api/v1/auth/signup", json={
    "email": "chat@manyminds.local",
    "username": "chat",
    "password": "correct horse battery staple",
}).json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

session = c.post("/api/v1/chat/sessions", json={"title": "smoke"}, headers=h).json()
reply = c.post(
    f"/api/v1/chat/sessions/{session['id']}/messages",
    json={"content": "Hey — should I take the new job?", "address": ["aria", "rex"]},
    headers=h,
).json()
for turn in reply["replies"]:
    print(turn["member_id"], "→", turn["content"][:80])
PY
```

The stub bank guarantees these complete deterministically with no Azure
credentials.

## Development tips

- **Hot reload.** `uvicorn app.main:app --reload` watches `app/` and restarts
  on save. `run-dev.sh` wraps the venv bootstrap if you'd rather one command.
- **OpenAPI playground.** `http://127.0.0.1:8000/docs` is live in every mode.
  Use it as the primary debugging surface — the live schema is generated from
  the Pydantic models in `app/schemas/`.
- **Health probe.** `GET /healthz` reports per-integration availability —
  `db`, `llm`, `vision`, `language`, `translator`, `memory_graph`, `voice`,
  `email`. Use it as the readiness check and as a quick "did I wire that
  env var correctly?" probe.
- **Disable bootstrap in prod.** Once IaC has provisioned the Cosmos
  containers with the right throughput and indexing policies, set
  `COSMOS_BOOTSTRAP_CONTAINERS=false`. The app will then `get_container_client`
  the existing handles instead of attempting `create_container_if_not_exists`
  on every boot, avoiding throughput conflicts and surprise RU spend.
- **Log level.** `LOG_LEVEL=DEBUG` in `.env` raises Cosmos and `httpx`
  chatter, useful when chasing a 4xx from an Azure service.
- **JWT_SECRET.** Defaults to a random value generated per process, which
  means tokens are invalidated on every restart. Set `JWT_SECRET` to a long
  stable string before sharing a deploy with anyone else.
- **Email in dev.** Without SendGrid or SMTP creds the email provider falls
  through to the console writer — password reset still works end-to-end,
  you just read the reset link out of the backend log.

## What's intentionally NOT in this backend

- **Azure Speech.** Voice is handled by **ElevenLabs** for both TTS and STT,
  because the per-member voice profiles (Aria / Rex / Sage / Nova / Echo)
  are part of the product identity. Azure Speech would force generic voices.
- **Cosmos DB Gremlin (graph API).** Long-term relational memory lives in
  **Neo4j** (`app/services/memory_graph.py`). The Cosmos NoSQL API holds
  structured records (users, sessions, messages, debates, games); the graph
  is a separate concern with very different query patterns.
- **Azure AI Foundry `agent_service` / managed agent runtime.** Council
  orchestration is **stateless prompt assembly** inside
  `app/services/orchestration.py` — each member's reply is a single Azure
  OpenAI chat completion with a fully-constructed system prompt. No
  long-running agent threads, no managed agent state.
- **Postgres.** All structured persistence is **Azure Cosmos DB**. There is
  no relational database, no migrations, no SQL connection string. The six
  containers documented above are the entire schema.
