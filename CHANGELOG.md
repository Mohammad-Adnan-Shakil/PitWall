# Changelog

All notable changes to PitWall are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Planned
- Add more seasons (2020–2022)
- Implement real-time race data streaming
- Add authentication and rate limiting
- Explore hybrid search (vector + keyword)

## [2026-07-25]

### Added
- Final README with live URLs, architecture, and evaluation results
- Pitwall pit board logo, favicon, and OG meta tags
- Full landing page redesign — stats strip, horizontal flow, live demo mockup
- Visual data panels: tire strategy timeline, podium card with real race data, pit stop timeline
- React frontend with landing page and split-panel chat interface
- FastAPI service layer with `/health` and `/query` endpoints

### Changed
- Switched to fastembed BAAI/bge-small-en-v1.5, re-ingested all 3 seasons (85,930 chunks)
- Switched embedding model from sentence-transformers to fastembed to fit Render 512MB
- Switched from Groq to OpenRouter for LLM access
- README updated with agentic architecture and engineering notes
- README updated with published RAGAS evaluation results

### Fixed
- Removed startup model warmup to fix Render free tier OOM on boot
- Pre-deployment audit: fixed Pydantic response model, DB connection leaks, env config
- Fixed Landing scroll animation

## [Earlier — 2026-07-24]

### Added
- LangGraph agentic layer with classification, targeted retrieval, and self-check
- Naive RAG pipeline with season-aware retrieval and grounded generation
- Full ingestion pipeline: idempotent per-season loading with retry logic
- RAGAS evaluation — naive vs agentic comparison
- 84,174 chunks across 70 races (initial ingestion)

### Changed
- README updated with live architecture and engineering notes
