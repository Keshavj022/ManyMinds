# ManyMinds

Most AI chat is one model, one user, no memory, no personality. **ManyMinds**
is the opposite: a personalized **Council** of five distinct AI friends —
**Aria** (the Analyst), **Rex** (the Provocateur), **Sage** (the Architect),
**Nova** (the Creator), and **Echo** (the Empath) — who chat with you, debate
each other, play games, remember everything as a living graph, and live in
switchable 3D rooms with their own voices.

They don't behave like a tool. They behave like a friend group that happens to
be AI — and they get to know you over time.

This is the monorepo: a 3D-cinematic web frontend, an async FastAPI backend on
Azure, and the data model that ties them together.

---

## What's in the box

| Capability             | What it does                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Multi-agent Council**| Five members with their own personality, tone, expertise, and behavioural constraints.         |
| **Conversation engine**| One-on-one chat or full group discussions with turn-based, context-injected responses.         |
| **Debate mode**        | Members take sides on a topic, argue and rebut, moderated by an AI moderator.                  |
| **Games**              | Server-side game state for Chess, Ludo, and Truth-or-Dare with AI players + live banter.       |
| **Multimodal**         | Attach an image; each member reacts to it (Azure Computer Vision feeds the prompt).            |
| **Multilingual**       | Automatic language detection + translation so the Council replies in the user's language.      |
| **Graph memory**       | Every interaction updates a Neo4j knowledge graph — relationships, not a flat chat log.        |
| **Personalization**    | Two-phase onboarding (demographics + Big Five quiz) calibrates how each member talks to you.    |
| **3D + voice**         | Rigged glTF avatars in 7 switchable environments; per-member ElevenLabs voice profiles.        |
| **Auth**               | JWT access/refresh, bcrypt password hashing, email-based password reset.                       |

---

## Repository layout

```
ManyMinds/
├── frontend/     Next.js 16 + React Three Fiber web app (the cinematic landing + the product)
├── backend/      FastAPI service — the Council, auth, onboarding, chat/debate/games, memory
│   ├── README.md       full backend guide (stack, stub mode, API surface, run instructions)
│   └── AZURE_SETUP.md  step-by-step provisioning for every Azure service it uses
├── database/     Relational reference schema (schema.sql + migrations) the data model derives from
└── docs/         Supplementary documentation
```

Each app has its own README — start there for depth. This file is the map.

---

## Architecture

```
            ┌─────────────────────── frontend (Next.js 16 / R3F) ───────────────────────┐
            │  Cinematic landing page + the product UI (chat, debate, games, memory,     │
            │  onboarding, 3D rooms, voice). Three.js / WebGL, Framer Motion, Lenis.     │
            └───────────────────────────────────┬───────────────────────────────────────┘
                                                 │  HTTP + WebSocket (JWT auth)
            ┌───────────────────────────────────▼───────────────────────────────────────┐
            │                       backend (FastAPI, async, Pydantic v2)                 │
            │                                                                              │
            │   Context injection  ──►  Azure OpenAI  ──►  per-member response orchestration│
            │   (personality + memory query + session history)                             │
            └───┬───────────────┬───────────────┬───────────────┬───────────────┬─────────┘
                │               │               │               │               │
         Azure Cosmos DB    Azure OpenAI    Azure Vision    Azure Language    ElevenLabs
        (users, sessions,  (member replies, (image-aware    + Translator     (per-member
         council, chats,    debates, games,  chat)          (detect, score,   streaming
         debates, games,    greetings)                       translate)        voice)
         auth tokens)                                              │
                                                                   ▼
                                                            Neo4j (the living
                                                            knowledge graph)
```

Every external integration is **optional**. With an empty `.env` the backend
boots into "stub mode" — canned, hash-stable responses and in-memory storage —
so the entire product is demoable end-to-end without any Azure subscription.
See [`backend/README.md`](backend/README.md) for exactly how that works.

---

## Tech stack

| Layer            | Choice                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| Frontend         | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4                    |
| 3D / motion      | React Three Fiber 9 + drei 10 (three.js 0.183), Framer Motion 11, GSAP, Lenis |
| Backend          | FastAPI 0.115 on Python 3.11+, async end-to-end, Pydantic 2                  |
| Database         | Azure Cosmos DB (NoSQL API), async SDK                                        |
| LLM              | Azure OpenAI (via the `openai` SDK)                                          |
| Vision           | Azure Computer Vision — Image Analysis 4.0                                    |
| Language         | Azure AI Language (Text Analytics) + Azure Translator                         |
| Voice            | ElevenLabs (streaming TTS + STT)                                              |
| Knowledge graph  | Neo4j (async driver)                                                          |
| Auth             | JWT (access + refresh), passlib/bcrypt                                        |

---

## Quickstart

Run both halves locally. Neither needs cloud credentials to start — the
backend serves stub data and the frontend renders against it.

### Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000  (docs at /docs)
```

Boots in stub mode with no `.env`. To go live, copy `.env.example` to `.env`
and follow [`backend/AZURE_SETUP.md`](backend/AZURE_SETUP.md) to provision
Azure Cosmos DB, Azure OpenAI, Vision, Language/Translator, plus ElevenLabs
and Neo4j (Aura). Health and per-service availability are reported at
`GET /healthz`.

### Frontend

```bash
cd frontend
npm install
npm run dev                            # http://localhost:3000
```

The landing page opens with the hero cinematic; the app routes (chat, debate,
games, dashboard, memory, onboarding) consume the backend API. Point it at a
non-default backend via the relevant env var if needed.

---

## The landing experience

The marketing landing page is a single scroll-driven cinematic, not a stack of
cards. The five members **boot up inside a computer**, wave, then **break out
of the screen and fall through all seven 3D environments** before settling into
a seated council — followed by interactive sections for the debate, games,
"meet the council" hover stage, graph memory, and onboarding. It's built on a
self-pausing canvas system (only the on-screen 3D section renders) so the
scroll stays smooth. Lives under `frontend/src/components/landing/` and
`frontend/src/components/three/`.

---

## Project status

Active development. The product vision is captured in `CLAUDE.md`; the backend
is fully runnable (live or stub), and the frontend landing + core product
surfaces are in place. Architecture decisions favour graceful degradation —
nothing hard-fails when a credential is missing.
