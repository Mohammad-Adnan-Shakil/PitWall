Pitwall

Pitwall is an agentic RAG (Retrieval-Augmented Generation) system that answers questions about Formula 1 races, strategy, and telemetry — grounded in real race data, not model memory.

Instead of a fixed retrieve-then-generate pipeline, Pitwall uses an agent that decides when retrieval is needed, evaluates whether what it retrieved is actually sufficient to answer the question, retrieves again if not, and checks its own answer against the retrieved context before responding.

Status: in active development. This README is updated as each phase completes — see Project status below for exactly what's built vs. planned.

Why

Large language models hallucinate and have a fixed knowledge cutoff. Ask one about a specific lap time, pit stop, or strategy call, and it will often produce a plausible-sounding but fabricated answer. Pitwall solves this by grounding every answer in real Formula 1 data — lap times, telemetry, pit stops, and race results pulled directly from official timing data via FastF1 — and by using an agentic retrieval loop (rather than a single-shot lookup) to catch incomplete or irrelevant retrieval before it reaches the final answer.

Architecture
User question
      │
      ▼
Agent decides: retrieve, or answer directly?
      │
      ▼
Retrieve from pgvector (semantic search over embedded F1 data)
      │
      ▼
Agent evaluates: is this retrieval sufficient?
      │
      ├── No  → reformulate / retrieve again
      │
      ▼
Generate answer from retrieved context
      │
      ▼
Self-check: is the answer faithful to the retrieved context?
      │
      ▼
Return: answer + confidence + cited sources
Tech stack
Layer	Technology	Why
Data source	FastF1	Official F1 timing data — laps, telemetry, pit stops, weather, race results
Embeddings	sentence-transformers	Converts F1 data (translated to natural language) into vectors
Vector store	pgvector on Neon Postgres	Semantic similarity search over embedded race data
Agent framework	LangGraph	Models the retrieve → evaluate → retrieve-again → generate → self-check loop as a stateful graph
Evaluation	RAGAS	Measures faithfulness, answer relevance, context precision, and context recall against a held-out test set
Service layer	FastAPI	Exposes the agentic RAG chain as an HTTP API
Frontend	React	Chat interface with live retrieval/source panels

Pitwall is built as a fully independent project — not a feature bolted onto an existing app. The FastAPI service, database, and frontend all belong to Pitwall alone.

Target metrics

These are the quality bars the system is being built and evaluated against. Numbers below are targets, not yet-measured results — this section will be replaced with real, published RAGAS output once Step 5 (evaluation) is complete.

Metric	Target
Retrieval precision	> 85%
Answer faithfulness	> 90%
Hallucination rate	< 5%
End-to-end latency	< 500ms
Project status

Phase 1 — Theory: complete. Covered RAG fundamentals, embeddings, pgvector, the end-to-end RAG pipeline, RAG failure modes, agentic vs. naive RAG, LangGraph, RAGAS evaluation, FastF1 as a data source, and system integration design.

Phase 2 — Implementation:

 Step 1 — Environment setup. Neon Postgres project provisioned with pgvector enabled. Python 3.12 virtual environment with all core dependencies (LangGraph, RAGAS, FastF1, sentence-transformers, FastAPI, psycopg2) installed and verified. FastF1 confirmed pulling full race data (laps, telemetry, weather, race control) from live sessions. Python-to-Postgres pgvector connection confirmed.
 Step 2 — Data pipeline (FastF1 ingestion, structured-to-text conversion, chunking strategy, embedding, storage)
 Step 3 — Basic RAG (retrieval + generation, no agent yet)
 Step 4 — Agentic layer (LangGraph decision graph)
 Step 5 — RAGAS evaluation and iteration
 Step 6 — FastAPI service layer
 Step 7 — Frontend (React chat interface)
 Step 8 — Deployment
 Step 9 — Final documentation and published metrics
A real engineering note

Environment setup for this project surfaced a genuine chain of real-world issues worth documenting: Python 3.14 lacked prebuilt wheels for several ML dependencies (resolved by pinning to 3.12), a pip/python interpreter mismatch caused a package to appear "installed" when it wasn't, and a confirmed upstream bug in ragas==0.4.3 (a broken import against a relocated langchain_community class) required pinning langchain-community<0.4. These fixes are captured in requirements.txt.

Setup
bash
git clone https://github.com/Mohammad-Adnan-Shakil/PitWall.git
cd PitWall

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

python -m pip install -r requirements.txt

Create a .env file in the project root:

PITWALL_DB_URL=your_neon_postgres_connection_string_here
Author

Mohammad Adnan Shakil
