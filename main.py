import time
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from agent import pitwall_agent

load_dotenv()

app = FastAPI(
    title="Pitwall API",
    description="Agentic RAG system for F1 race data",
    version="1.0.0"
)

# ─── CORS ────────────────────────────────────────────────────────────────────
# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend URL after deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str


class SourceChunk(BaseModel):
    content: str
    chunk_type: str
    season: int | None
    race: str | None
    driver: str | None


class QueryResponse(BaseModel):
    question: str
    answer: str
    question_type: str
    retrieval_attempts: int
    sources: list[SourceChunk]
    latency_ms: float


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "Pitwall API"}


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    start = time.time()

    try:
        result = pitwall_agent.invoke({"question": request.question})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    elapsed = (time.time() - start) * 1000

    sources = [
        SourceChunk(
            content=c["content"],
            chunk_type=c["chunk_type"],
            season=c.get("season"),
            race=c.get("race"),
            driver=c.get("driver"),
        )
        for c in result.get("sources", [])
    ]

    return QueryResponse(
        question=request.question,
        answer=result["answer"],
        question_type=result["question_type"],
        retrieval_attempts=result["retrieval_attempts"],
        sources=sources,
        latency_ms=round(elapsed, 2),
    )