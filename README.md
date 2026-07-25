markdown
# Pitwall

**Live demo**: [pit-wall-lemon.vercel.app](https://pit-wall-lemon.vercel.app)

Pitwall is an agentic RAG (Retrieval-Augmented Generation) system that answers questions about Formula 1 races, strategy, and telemetry — grounded in real race data, not model memory.

Instead of a fixed retrieve-then-generate pipeline, Pitwall uses a LangGraph agent that classifies your question, decides what to retrieve, evaluates whether what it retrieved is sufficient, retrieves again if not, generates a grounded answer, and self-checks for hallucinations before responding.

> Built as a full-stack, production-grade project covering data engineering, agentic AI, vector search, evaluation, and frontend — end to end.

---

## Live URLs

| Service | URL |
|---|---|
| Frontend | [pit-wall-lemon.vercel.app](https://pit-wall-lemon.vercel.app) |
| API | [pitwall-lj01.onrender.com](https://pitwall-lj01.onrender.com) |
| API Health | [pitwall-lj01.onrender.com/health](https://pitwall-lj01.onrender.com/health) |

> Note: The Render free tier suspends the service after inactivity. The first request after a cold start may take 60-90 seconds while the service wakes up and loads the embedding model. Subsequent requests are 15-25 seconds.

---

## What it does

Ask Pitwall anything about F1 strategy, lap times, pit stops, race results, or weather — and it returns a grounded answer with the exact source chunks it used, rendered as visual data panels:

- **Race result questions** → podium card (P1/P2/P3 with weather badge)
- **Strategy comparison questions** → tire strategy timeline (compound bars per driver)
- **General questions** → structured source cards with chunk type badges

Every answer is grounded in real FastF1 timing data. The system explicitly refuses to answer when the retrieved context doesn't contain enough information — it never hallucinates a plausible-sounding F1 fact.

---

## Architecture

User question
│
▼
[analyze_question] — classify type, extract season + drivers
│
▼
[retrieve] — targeted retrieval based on question type:
race_result → direct SQL race_summary lookup + semantic backup
comparison → per-driver retrieval for each named driver
strategy → pit-stop / stint / race chunks
general → standard semantic search
│
▼
[evaluate_sufficiency] — are both drivers present? is a result chunk present?
│
├── No, attempts < 2 → retrieve again
│
▼
[generate] — grounded generation (answer only from retrieved context)
│
▼
[self_check] — flag answers containing unsupported claims
│
▼
Return: answer + sources + question_type + retrieval_attempts + latency_ms


---

## Tech stack

| Layer | Technology |
|---|---|
| Data source | [FastF1](https://github.com/theOehrly/Fast-F1) — official F1 timing data |
| Embeddings | fastembed (`BAAI/bge-small-en-v1.5`) — 384-dim, ONNX-based, ~66MB |
| Vector store | pgvector on Neon Postgres |
| Agent framework | LangGraph |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| Evaluation | Custom RAGAS-style scorer (Gemini Flash) |
| Service layer | FastAPI + uvicorn |
| Frontend | React + Vite |
| API deployment | Render (free tier) |
| Frontend deployment | Vercel |

---

## Knowledge base

| Season | Races | Chunks |
|---|---|---|
| 2023 | 22 | 27,436 |
| 2024 | 24 | 29,334 |
| 2025 | 24 | 29,160 |
| **Total** | **70** | **85,930** |

Five chunk tiers per race: lap-level, stint-level, pit-stop-level, race-level, race-summary. Each tier converts FastF1's structured data into natural-language text via a fixed template before embedding — necessary because embedding models are trained on prose, not tabular data.

Ingestion is idempotent — re-running for any season clears and rebuilds only that season's data.

---

## Evaluation results

Evaluated on a 30-question test set spanning factual lookups, race winners, driver strategy comparisons, tire/pit-stop questions, weather inference, and out-of-scope questions.

| Metric | Naive RAG | Agentic RAG | Change |
|---|---|---|---|
| Faithfulness | 0.741 | 0.815 | ↑ 0.074 |
| Answer relevancy | 0.880 | 0.907 | ↑ 0.027 |
| Context precision | 0.731 | 0.812 | ↑ 0.081 |

Every metric improved with the agentic layer. The largest gains are in faithfulness (+7.4%) and context precision (+8.1%), directly reflecting the targeted retrieval improvements — per-driver comparison retrieval and direct SQL race_summary lookup for "who won" questions.

---

## Project status

- [x] Phase 1 — Theory (10-topic RAG curriculum)
- [x] Step 1 — Environment setup
- [x] Step 2 — Data pipeline (FastF1 ingestion, chunking, embedding, pgvector storage)
- [x] Step 3 — Basic RAG baseline
- [x] Step 4 — Agentic layer (LangGraph)
- [x] Step 5 — RAGAS evaluation
- [x] Step 6 — FastAPI service layer
- [x] Step 7 — React frontend
- [x] Step 8 — Deployment (Render + Vercel)
- [x] Step 9 — Documentation

---

## Engineering notes

**Why fastembed instead of sentence-transformers**: The original implementation used `sentence-transformers` with PyTorch, which requires ~400MB RAM just to load the model. Render's free tier provides 512MB total — not enough. Switched to `fastembed` which uses ONNX runtime and loads the same `bge-small-en-v1.5` model at ~66MB, fitting comfortably within the free tier limit.

**Why direct SQL for race_summary retrieval**: Semantic similarity search consistently failed to rank race_summary chunks highly for "who won" questions — "winner" and "podium" embed closer to per-driver race chunks than to the summary chunk that actually answers the question. Fixed by bypassing embedding search for race_result questions and using a direct SQL lookup by race name — a practical reminder that embeddings are not always the right retrieval tool.

**Why idempotent ingestion matters**: An early full-season run produced duplicate data after re-processing races already ingested during testing. Fixed by making ingestion idempotent — each season's chunks are cleared before rebuilding. Combined with retry-with-backoff for transient Neon connection drops under sustained scripted load.

**RAGAS 0.3.9 + Groq incompatibility**: RAGAS 0.3.9 hardcodes `n=2` in its internal LLM calls; Groq only supports `n=1`. Worked around by replacing RAGAS's internal scorer with a custom single-call evaluator using Gemini Flash (1M free tokens/day vs Groq's 100k).

---

## Setup

```bash
git clone https://github.com/Mohammad-Adnan-Shakil/PitWall.git
cd PitWall

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

python -m pip install -r requirements.txt
```

Create a `.env` file in the project root (see `.env.example`):

PITWALL_DB_URL=your_neon_postgres_connection_string
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_ai_studio_key


Run the API:
```bash
uvicorn main:app --reload --port 8000
```

Run the frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Author

Mohammad Adnan Shakil — [GitHub](https://github.com/Mohammad-Adnan-Shakil)