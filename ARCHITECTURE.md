# Architecture

## Component Breakdown

### LangGraph Agent
- **Role:** Orchestrates RAG pipeline: classify → retrieve → evaluate → generate → self-check
- **Tech:** LangGraph StateGraph with 5 nodes
- **Location:** agent.py

### FastAPI Service
- **Role:** HTTP server with /query and /health endpoints
- **Tech:** FastAPI + Uvicorn
- **Location:** main.py

### Vector Retrieval
- **Role:** Semantic search over 85,930 chunks via pgvector cosine distance
- **Tech:** fastembed (bge-small-en-v1.5, 384-dim) + Neon PostgreSQL + pgvector
- **Location:** retrieval.py

### Data Ingestion Pipeline
- **Role:** Loads FastF1 race data, builds 5 chunk types, embeds, stores
- **Tech:** FastF1 API + custom chunk builders + fastembed
- **Location:** ingest_season.py, build_chunks.py

### React Frontend
- **Role:** Split-panel chat UI with visual data panels (tire strategy, podium, pit stops)
- **Tech:** React 19 + Vite 8 + Tailwind 3 + react-markdown
- **Location:** frontend/

### Evaluation Framework
- **Role:** RAGAS metrics (faithfulness, relevancy, context precision) using Gemini Flash
- **Tech:** RAGAS 0.3.9 + Google Gemini 1.5 Flash
- **Location:** evaluate.py

## Key Architectural Decisions

### Decision 1: fastembed over sentence-transformers
**What:** Uses BAAI/bge-small-en-v1.5 via fastembed (ONNX runtime) instead of sentence-transformers
**Why:** fastembed is 66MB vs 400MB for sentence-transformers, fitting Render's 512MB free tier without OOM. ONNX inference is faster on CPU.
**Tradeoff:** Slightly lower embedding quality vs larger models. Limited to 384-dim vectors.

### Decision 2: Direct SQL Lookup for Race Summary Chunks
**What:** Uses SQL ILIKE query instead of vector search for race_summary chunks
**Why:** Embedding-based ranking failed for "who won" questions — race_summary chunks ranked too low despite being the exact answer. Direct SQL guarantees finding the winner.
**Tradeoff:** Maintenance: must keep both vector and SQL retrieval paths. SQL approach doesn't scale to fuzzy race name matching.

### Decision 3: Agentic RAG with Sufficiency Evaluation Loop
**What:** After retrieval, agent evaluates whether enough context was found; if not, retries up to 2 more times
**Why:** Single-shot retrieval may miss context. Iterative retrieval improves recall, especially for comparison questions requiring multiple drivers.
**Tradeoff:** Up to 3x retrieval latency per query. More API calls to pgvector.

### Decision 4: OpenRouter over Direct Groq
**What:** Uses OpenRouter API to access nvidia/nemotron-3-ultra-550b instead of direct Groq calls
**Why:** OpenRouter provides free access to high-quality models without the Groq free-tier rate limits. The nemotron model was available for free during development.
**Tradeoff:** Third-party API dependency. Potential latency from OpenRouter routing.

### Decision 5: 5-Tier Chunk Strategy
**What:** Each race split into 5 chunk types: lap, stint, pit_stop, race, race_summary
**Why:** Different questions need different granularity. Lap-level for telemetry, stint-level for tire strategy, race_summary for quick "who won" answers. Targeted retrieval by chunk type improves precision.
**Tradeoff:** More storage (85,930 chunks for 70 races). More complex ingestion pipeline.

## Data Flow
1. User submits question → POST /query → main.py invokes LangGraph agent
2. analyze_question node classifies type (race_result/comparison/strategy/lap/general) and extracts season/drivers
3. retrieve_node: targeted retrieval based on type — SQL for race_summary, vector search for others, filtered by chunk_type and season
4. evaluate_sufficiency: checks if context is sufficient; if not, routes back to retrieve (max 2 retries)
5. generate_node: builds context from chunks, calls OpenRouter model with temperature=0.1
6. self_check: verifies faithfulness; prepends [Low confidence] if unsupported claims detected
7. Returns answer + sources + question_type + retrieval_attempts + latency_ms

## Known Limitations
- First request after idle has 30-50s cold start on Render free tier
- Only covers 2023-2025 seasons
- wav2vec2 deep model in FakeOut-AI is disabled (sibling project)
- No authentication/rate limiting on API
- RAGAS evaluation uses Gemini Flash (could differ from Groq/OpenRouter results)

## Future Considerations
- Add more seasons (2020-2022)
- Implement real-time race data streaming
- Add authentication and usage limits
- Explore hybrid search (vector + keyword) for better recall
