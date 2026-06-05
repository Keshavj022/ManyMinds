# ManyMinds

> **Multi-agent AI social intelligence platform.** Five distinct AI personalities with independent memory, voice, and 3D avatars — who converse, debate, play games, and build a living knowledge graph of who you are across every session.

Not a chatbot. A council.

---

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-0.183-000000?style=flat&logo=three.js&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-Aura-008CC1?style=flat&logo=neo4j&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-OpenAI-0089D6?style=flat&logo=microsoft-azure&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-black?style=flat)

---

## How the AI System Works

### Multi-Agent Orchestration

Each of the five council members — **Aria** (Analyst), **Rex** (Provocateur), **Sage** (Architect), **Nova** (Creator), **Echo** (Empath) — is an independently prompted AI agent with its own personality profile, behavioral constraints, and voice. They are not personas layered on one model call. They are five separate, parallel LLM dispatches per message.

When a user sends a message, the orchestrator:

1. **Queries Neo4j** — retrieves a subgraph of the user's relational memory: entities, relationships, emotional patterns, topics, and preferences extracted from every prior session
2. **Assembles per-member context** — injects personality profile, memory subgraph, session history, and the user's Big Five personality scores into each member's system prompt independently
3. **Dispatches in parallel** — fires five concurrent Azure OpenAI calls, one per member
4. **Sequences the response turn** — controls who speaks, in what order, and triggers cross-member reactions based on the conversation state
5. **Updates the memory graph** — extracts entities and relationships from the exchange and writes them as typed nodes and edges to Neo4j

### Context Injection Pipeline

```text
User Input (text · image · voice)
    │
    ├─► Memory Query ──── Neo4j subgraph retrieval (entities, relationships, patterns)
    ├─► Session History ─ last N turns from Cosmos DB
    └─► Personality Profile ─ Big Five scores + traits + behavioral constraints
                │
                ▼
    Context Assembly (per-member system prompt × 5)
                │
                ▼
    ┌───────────────────────────────────────────────┐
    │         Azure OpenAI (parallelized)            │
    │  Aria │ Rex │ Sage │ Nova │ Echo               │
    └───────────────────────────────────────────────┘
                │
                ▼
    Response Orchestrator (turn sequencing · cross-member reactions)
                │
                ▼
    Memory Writer ─── entity extraction · sentiment · graph update (Neo4j)
```

### Graph Memory Architecture

Standard AI chat stores a flat list of messages. ManyMinds stores a **living knowledge graph**.

Every conversation, debate, game, and quiz updates Neo4j with:

- **Entity nodes**: people, places, topics, emotions, preferences
- **Relationship edges**: typed connections between entities (e.g., `user -[INTERESTED_IN]-> topic`, `topic -[RELATED_TO]-> emotion`)
- **Temporal context**: when each relationship was established or reinforced
- **Confidence weights**: how strongly the system has inferred each preference

Council members query this graph before every response. They recall not just what was said — they recall the *web of meaning* around it. The longer you use ManyMinds, the better the council knows you.

---

## System Architecture

```text
┌─────────────────── Next.js 16  ·  React Three Fiber ──────────────────────┐
│  Cinematic landing · chat · debate · games · memory graph · 3D rooms       │
│  Three.js / WebGL · WebAudio · Framer Motion 11 · GSAP · Lenis             │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │  HTTP + WebSocket  (JWT)
┌───────────────────────────────────▼───────────────────────────────────────┐
│                        FastAPI  ·  async  ·  Pydantic v2                   │
│                                                                             │
│  ┌──────────────────────── Multi-Agent Orchestrator ──────────────────┐   │
│  │   Aria · Rex · Sage · Nova · Echo                                   │   │
│  │   Context injection → parallel LLM dispatch → turn sequencing       │   │
│  └──────────┬──────────────────────────────────────┬───────────────────┘   │
│             │                                        │                      │
│  ┌──────────▼───────────┐           ┌───────────────▼──────────────────┐   │
│  │  Conversation Engine │           │         Memory Engine             │   │
│  │  chat · debate       │           │  entity extraction · graph write  │   │
│  │  games · moderation  │           │  subgraph retrieval · adaptation  │   │
│  └──────────────────────┘           └──────────────────────────────────┘   │
└──┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────────┘
   │             │             │             │             │
Azure        Azure          Azure        Azure +       ElevenLabs
Cosmos DB    OpenAI         Vision       Translator    streaming TTS/STT
(users ·     (GPT-4o ·      (image       (language     per-member voice
 sessions ·  debates ·      analysis)    detection ·   profiles
 council ·   games ·                     translation)
 auth)       greetings)
                  │
                  ▼
           Neo4j Aura
      (knowledge graph —
       entities · relationships
       preferences · emotional patterns)
```

---

## Feature Breakdown

| Feature | Technical Implementation |
| --- | --- |
| **Multi-agent Council** | 5 independently-prompted agents, each with personality constraints; parallelized Azure OpenAI calls; turn-based response orchestration |
| **Graph Memory** | Neo4j knowledge graph — entity extraction, relationship typing, confidence weighting, subgraph retrieval per conversation |
| **Big Five Onboarding** | Psychometric quiz (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) scores embedded into every member's system prompt |
| **Debate Mode** | Structured agent orchestration: role assignment, argument generation, rebuttal chains, AI moderator scoring |
| **Games Engine** | Server-side deterministic game state (Chess, Ludo, Truth or Dare); AI move generation with context-aware banter |
| **Multimodal** | Azure Computer Vision Image Analysis 4.0 → extracted scene description injected into per-member context |
| **Multilingual** | Azure Language for detection + sentiment; Azure Translator for real-time translation; per-user language preferences |
| **Voice** | ElevenLabs low-latency streaming TTS per member (distinct voice profiles); STT transcription pipeline |
| **3D Environments** | Rigged glTF avatars in 7 switchable environments; React Three Fiber + drei; context-triggered animations (idle, laugh, think, lean) |
| **Stub Mode** | Full product demoable with zero cloud credentials — hash-stable canned responses, in-memory storage; `GET /healthz` reports per-service availability |

---

## Tech Stack

| Layer | Stack |
| --- | --- |
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 |
| **3D / Motion** | React Three Fiber 9 · drei 10 · Three.js 0.183 · Framer Motion 11 · GSAP · Lenis |
| **Backend** | FastAPI 0.115 · Python 3.11+ · Pydantic v2 · async end-to-end |
| **Database** | Azure Cosmos DB (NoSQL API) · async SDK |
| **LLM** | Azure OpenAI (GPT-4o) via `openai` SDK |
| **Vision** | Azure Computer Vision — Image Analysis 4.0 |
| **Language** | Azure AI Language (Text Analytics) · Azure Translator |
| **Voice** | ElevenLabs streaming TTS + STT |
| **Knowledge Graph** | Neo4j Aura · async Python driver |
| **Auth** | JWT (access + refresh tokens) · passlib/bcrypt |

---

## Repository Structure

```text
ManyMinds/
├── frontend/                   Next.js 16 + React Three Fiber
│   └── src/
│       ├── app/                App Router pages (chat, debate, games, memory, onboarding)
│       └── components/
│           ├── landing/        Scroll-driven cinematic sections
│           └── three/          3D environments, avatar system, animation controller
│
├── backend/                    FastAPI service
│   ├── app/
│   │   ├── api/                REST endpoints
│   │   ├── services/           Agent orchestrator, memory engine, debate, games, voice
│   │   ├── models/             Domain models
│   │   ├── schemas/            Pydantic request/response schemas
│   │   ├── repositories/       Cosmos DB + Neo4j data access
│   │   └── core/               Config, auth, DB clients
│   └── README.md               Full backend guide + API surface
│
└── database/                   Relational reference schema (schema.sql + migrations)
```

---

## Quickstart

Both halves run locally with no cloud credentials. The backend boots into **stub mode** — hash-stable canned responses and in-memory storage — so the full product is demoable end-to-end without any Azure account.

### Backend

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload    # http://localhost:8000 · API docs at /docs
```

To connect live services: copy `.env.example` → `.env` with your Azure, ElevenLabs, and Neo4j Aura credentials. `GET /healthz` reports availability per service.

### Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

---

## Future Improvements

| Improvement | Description |
| --- | --- |
| **Full Council Customization** | Users build their own council from scratch — choose each member's gender, appearance, personality type, communication style, expertise, and behavioral constraints. No fixed five; every council is unique to its owner. |
| **3D Character Builder** | In-app character creation for council members: body type, face, outfit, accessories, animation style. Custom glTF assets generated or assembled from a modular part library. |
| **Deeper Immersiveness** | Richer avatar expressiveness, dynamic environment reactivity (environments shift mood based on conversation tone), haptic feedback, spatial audio positioning per member. |
| **AR / VR Integration** | WebXR support to place council members in the user's physical space (AR) or enter fully immersive environments (VR). Conversation continues spatially — members sit across from you, not on a screen. |
| **Multilingual Council Members** | Per-member language personality — a council member can be configured to speak only in a chosen language, enabling language learning use cases and culturally-specific interaction styles. |
