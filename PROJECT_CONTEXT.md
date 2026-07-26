# PROJECT_CONTEXT.md — PitWall

## What This Project Is
An agentic RAG system that answers questions about Formula 1 races, strategy, and telemetry grounded in real FastF1 timing data — not model memory. Designed as a portfolio project demonstrating LangGraph, RAG, and vector search engineering.

## Current Status
- Working: Full agentic pipeline (5 nodes), 85,930 chunks across 70 races, evaluation showing +7.4% faithfulness over naive RAG
- In Progress: Frontend visual data panels (tire strategy timeline, podium card)
- Planned: More seasons, real-time data, authentication

## Architecture Overview
- Backend: Python (LangGraph, FastAPI, fastembed, pgvector)
- Frontend: React 19 + Vite 8 + Tailwind CSS 3
- Database: Neon PostgreSQL with pgvector extension
- ML/AI layer: OpenRouter (nemotron-3-ultra-550b), fastembed (bge-small-en-v1.5)
- Data Source: FastF1 API
- Deployment: Render (API), Vercel (frontend)

## Key Files & Entry Points
- agent.py — LangGraph agent pipeline definition
- main.py — FastAPI service with /query and /health endpoints
- retrieval.py — Vector + SQL retrieval layer
- build_chunks.py — Chunk building from FastF1 data
- ingest_season.py — Full season ingestion orchestrator
- evaluate.py — RAGAS evaluation framework
- frontend/src/pages/Chat.jsx — Main chat UI
- frontend/src/pages/Landing.jsx — Landing page

## Environment & Setup
- pip install -r requirements.txt
- Set up PITWALL_DB_URL (Neon Postgres with pgvector) and OPENROUTER_API_KEY
- Run: uvicorn main:app --host 0.0.0.0 --port 8000

## Where I Left Off
Evaluation complete. Full agentic RAG deployed. Frontend chat interface with visual data panels working. Final README with architecture and live URLs.

## Context for AI Assistants
- fastembed (ONNX) used instead of sentence-transformers to fit Render 512MB free tier
- Race summary retrieval uses direct SQL (bypasses vector search) to fix "who won" query failures
- Agentic pipeline has sufficiency evaluation loop (up to 2 retries) to improve recall
- 5 chunk tiers per race: lap, stint, pit_stop, race, race_summary
