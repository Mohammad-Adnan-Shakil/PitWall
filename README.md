# Pitwall

Pitwall is an agentic RAG (Retrieval-Augmented Generation) system that answers questions about Formula 1 races, strategy, and telemetry — grounded in real race data, not model memory.

Instead of a fixed retrieve-then-generate pipeline, Pitwall uses an agent that decides when retrieval is needed, evaluates whether what it retrieved is actually sufficient to answer the question, retrieves again if not, and checks its own answer against the retrieved context before responding.

> Status: in active development. This README is updated as each phase completes — see [Project status](#project-status) below for exactly what's built vs. planned.

## Why

Large language models hallucinate and have a fixed knowledge cutoff. Ask one about a specific lap time, pit stop, or strategy call, and it will often produce a plausible-sounding but fabricated answer. Pitwall solves this by grounding every answer in real Formula 1 data — lap times, telemetry, pit stops, and race results pulled directly from official timing data via FastF1 — and by using an agentic retrieval loop (rather than a single-shot lookup) to catch incomplete or irrelevant retrieval before it reaches the final answer.

## Architecture

User question
│
▼
Agent classifies question type and extracts season + drivers
│
▼
Targeted retrieval based on question type:
race_result → direct race_summary lookup by name + semantic backup
comparison → per-driver retrieval for each named driver
strategy → pit-stop / stint / race chunks
general → standard semantic search
│
▼
Agent evaluates sufficiency:
comparison → are both drivers represented in retrieved context?
race_result → is a result or summary chunk present?
│
├── No, attempts < 2 → retrieve again
│
▼
Generate answer (grounded: answer only from retrieved context)
│
▼
Self-check: does the answer contain claims not in the context?
→ Flag as low confidence if unfaithful
│
▼
Return: answer + sources + confidence signal


## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Data source | [FastF1](https://github.com/theOehrly/Fast-F1) | Official F1 timing data — laps, telemetry, pit stops, weather, race results |
| Embeddings | sentence-transformers | Converts F1 data (translated to natural language) into vectors |
| Vector store | pgvector on Neon Postgres | Semantic similarity search over embedded race data |
| Agent framework | LangGraph | Models the classify → retrieve → evaluate → retrieve-again → generate → self-check loop as a stateful graph |
| Evaluation | Custom RAGAS-style scorer (Gemini Flash) | Measures faithfulness, answer relevancy, and context precision against a 30-question held-out test set |
| LLM | Groq (llama-3.3-70b-versatile) | Fast, cheap inference for generation and self-check nodes |
| Service layer | FastAPI | Exposes the agentic RAG chain as an HTTP API |
| Frontend | React | Chat interface with live retrieval/source panels |

Pitwall is built as a fully independent project — not a feature bolted onto an existing app. The FastAPI service, database, and frontend all belong to Pitwall alone.

## Knowledge base

The vector database contains **84,174 embedded chunks** spanning the **2023, 2024, and 2025 seasons** (70 races total), across five chunk tiers:

| Chunk type | Purpose |
|---|---|
| Lap-level | Exact facts for a single lap (time, position, tire, track status) |
| Stint-level | Pace trends across a tire stint (degradation, average lap time) |
| Pit-stop-level | Individual pit stop events (lap, tire change) |
| Race-level | Per-driver race outcome (finish position, points, strategy summary) |
| Race-summary | Per-race overview (winner, podium, weather, safety car periods) |

Ingestion is idempotent — re-running the pipeline for a given season clears and rebuilds only that season's data, so it can be safely re-run without producing duplicates.

## Evaluation results

Evaluated on a 30-question test set spanning factual lookups, race winners, driver strategy comparisons, tire/pit-stop questions, weather inference, and out-of-scope questions. Scored using a custom RAGAS-style evaluator (Gemini Flash) measuring faithfulness, answer relevancy, and context precision.

| Metric | Naive RAG | Agentic RAG | Change |
|---|---|---|---|
| Faithfulness | 0.741 | 0.815 | ↑ 0.074 |
| Answer relevancy | 0.880 | 0.907 | ↑ 0.027 |
| Context precision | 0.731 | 0.812 | ↑ 0.081 |

Every metric improved with the agentic layer. The largest gains are in faithfulness (+7.4%) and context precision (+8.1%), directly reflecting the targeted retrieval improvements built in Step 4 — per-driver comparison retrieval and direct SQL race_summary lookup for "who won" questions.

Current metrics are below the original targets (faithfulness >90%, context precision >85%). The primary improvement levers for a future iteration are embedding model upgrade (from `all-MiniLM-L6-v2` to a larger model), chunk-size tuning, and k-value optimization — these are scoped for v2, not the current implementation.

## Project status

**Phase 1 — Theory:** complete. Covered RAG fundamentals, embeddings, pgvector, the end-to-end RAG pipeline, RAG failure modes, agentic vs. naive RAG, LangGraph, RAGAS evaluation, FastF1 as a data source, and system integration design.

**Phase 2 — Implementation:**

- [x] **Step 1 — Environment setup.** Neon Postgres project provisioned with pgvector enabled. Python 3.12 virtual environment with all core dependencies (LangGraph, RAGAS, FastF1, sentence-transformers, FastAPI, psycopg2) installed and verified. FastF1 confirmed pulling full race data (laps, telemetry, weather, race control) from live sessions. Python-to-Postgres pgvector connection confirmed.
- [x] **Step 2 — Data pipeline.** Chunk generation pipeline built across all five chunk tiers — lap, stint, pit-stop, race, and race-summary. Each tier converts FastF1's structured data into natural-language text via a fixed template, embeds it with `sentence-transformers` (`all-MiniLM-L6-v2`), and stores it in pgvector. Cosine similarity search confirmed correct. Scaled to full production size: 70 races across the 2023–2025 seasons, 84,174 chunks stored, zero unresolved failures. Ingestion is idempotent and resilient to transient database connection drops via automatic retry.
- [x] **Step 3 — Basic RAG (baseline).** Naive retrieve-then-generate pipeline built. Season-aware retrieval added to prevent year-disambiguation failures. Baseline tested across 8 varied question types — confirmed correct grounding behavior. Key failure modes identified: multi-driver comparison questions and "who won" questions both require more than a single semantic retrieval pass, motivating Step 4.
- [x] **Step 4 — Agentic layer (LangGraph).** Five-node LangGraph graph built: `analyze_question` → `retrieve` → `evaluate_sufficiency` → `generate` → `self_check`. Question classifier detects race_result, comparison, strategy, lap, and general question types. Driver name resolution maps full names to 3-letter codes. Targeted retrieval strategies per question type. Sufficiency evaluation checks both drivers are present for comparison questions. Self-check node flags low-confidence answers. Verified on 4 question types.
- [x] **Step 5 — RAGAS evaluation.** 30-question test set built spanning 6 question categories. Both naive and agentic pipelines evaluated. Agentic RAG outperforms naive RAG on all three metrics. Real, published scores above — not invented numbers.
- [ ] Step 6 — FastAPI service layer
- [ ] Step 7 — Frontend (React chat interface)
- [ ] Step 8 — Deployment
- [ ] Step 9 — Final documentation and published metrics

## A real engineering note

Environment setup surfaced: Python 3.14 wheel incompatibility (resolved by pinning to 3.12), a `pip`/`python` interpreter mismatch, and a confirmed upstream bug in `ragas==0.4.3` requiring `langchain-community<0.4`.

The chunk pipeline surfaced: a degradation metric using per-lap language for a total-stint value (producing implausible numbers like "15 seconds per lap"), same-compound pit stops printing misleading "changing from HARD to HARD" language, and an early similarity-search test silently returning wrong results due to full-name vs. 3-letter-code vocabulary mismatch.

Scaling ingestion surfaced: duplicate data from re-processing already-ingested races (fixed by idempotent per-season clearing), and Neon free-tier connection drops under sustained scripted load (fixed by retry-with-backoff).

The agentic retrieval layer surfaced: semantic similarity search consistently failing to rank race_summary chunks highly for "who won" questions — "winner" and "podium" embed closer to per-driver race chunks than to the actual race summary. Fixed by bypassing embedding search entirely for race_result questions and using direct SQL lookup by race name. Also: psycopg2's `ANY(%s)` parameter binding behaves differently than expected when passing Python lists — fixed by switching to `IN (...)` with individually expanded placeholders.

The RAGAS evaluation step surfaced: RAGAS 0.3.9 hardcodes `n=2` in its internal LLM calls, which Groq rejects (only supports `n=1`); worked around by replacing RAGAS's internal scorer with a custom single-call evaluator using Gemini Flash. Free-tier token limits across Groq (100k/day) and OpenRouter (50 requests/day) were exhausted during evaluation attempts; resolved by switching to Google AI Studio's Gemini Flash free tier (1M tokens/day).

## Setup

```bash
git clone https://github.com/Mohammad-Adnan-Shakil/PitWall.git
cd PitWall

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

python -m pip install -r requirements.txt
```

Create a `.env` file in the project root:

PITWALL_DB_URL=your_neon_postgres_connection_string_here
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_API_KEY=your_google_ai_studio_key_here


## Author

Mohammad Adnan Shakil