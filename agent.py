import os
import re
import time
from typing import TypedDict
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from groq import Groq
from retrieval import retrieve, retrieve_race_summary
from generate import build_context, SYSTEM_PROMPT

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ─── Driver Map ───────────────────────────────────────────────────────────────

DRIVER_MAP = {
    "VER": ["verstappen", "max"],
    "HAM": ["hamilton", "lewis"],
    "LEC": ["leclerc", "charles"],
    "NOR": ["norris", "lando"],
    "PIA": ["piastri", "oscar"],
    "SAI": ["sainz", "carlos"],
    "RUS": ["russell", "george"],
    "ALO": ["alonso", "fernando"],
    "PER": ["perez", "checo", "sergio"],
    "STR": ["stroll", "lance"],
    "GAS": ["gasly", "pierre"],
    "OCO": ["ocon", "esteban"],
    "ALB": ["albon", "alex"],
    "BOT": ["bottas", "valtteri"],
    "HUL": ["hulkenberg", "nico"],
    "MAG": ["magnussen", "kevin"],
    "TSU": ["tsunoda", "yuki"],
    "RIC": ["ricciardo", "daniel"],
    "LAW": ["lawson", "liam"],
    "BEA": ["bearman", "oli"],
    "HAD": ["hadjar", "isack"],
    "ANT": ["antonelli", "andrea"],
}


# ─── Helper Functions ─────────────────────────────────────────────────────────

def extract_drivers(question):
    q_lower = question.lower()
    q_upper = question.upper()
    found = []
    for code, names in DRIVER_MAP.items():
        if re.search(rf'\b{code}\b', q_upper):
            found.append(code)
        elif any(name in q_lower for name in names):
            found.append(code)
    return found


def extract_race(question):
    match = re.search(
        r'(bahrain|saudi|australian|japanese|chinese|miami|emilia romagna|monaco|canadian|spanish|austrian|british|hungarian|belgian|dutch|italian|azerbaijani|singapore|united states|mexico|s\u00e3o paulo|las vegas|qatar|abu dhabi)\s*(grand prix)?',
        question.lower()
    )
    return match.group(0).strip() if match else ""


# ─── State Schema ────────────────────────────────────────────────────────────

class PitwallState(TypedDict):
    question: str
    question_type: str
    drivers_mentioned: list
    season: int | None
    retrieved_chunks: list
    sufficiency_verdict: str
    missing_context: str
    answer: str
    sources: list
    retrieval_attempts: int


# ─── Node 1: Analyze Question ────────────────────────────────────────────────

def analyze_question(state: PitwallState) -> PitwallState:
    question = state["question"]

    match = re.search(r'\b(2023|2024|2025)\b', question)
    season = int(match.group()) if match else None

    drivers_mentioned = extract_drivers(question)

    q_lower = question.lower()
    if any(w in q_lower for w in ["won", "winner", "win", "podium", "race result"]):
        question_type = "race_result"
    elif len(drivers_mentioned) >= 2 or any(w in q_lower for w in ["differ", "compare", "vs", "versus", "between"]):
        question_type = "comparison"
    elif any(w in q_lower for w in ["strategy", "pit stop", "pitted", "tire", "tyre"]):
        question_type = "strategy"
    elif any(w in q_lower for w in ["lap time", "fastest", "sector", "lap "]):
        question_type = "lap"
    else:
        question_type = "general"

    return {
        **state,
        "question_type": question_type,
        "drivers_mentioned": drivers_mentioned,
        "season": season,
        "retrieved_chunks": [],
        "sufficiency_verdict": "",
        "missing_context": "",
        "answer": "",
        "sources": [],
        "retrieval_attempts": 0,
    }


# ─── Node 2: Retrieve ─────────────────────────────────────────────────────────
def retrieve_node(state: PitwallState) -> PitwallState:
    question = state["question"]
    question_type = state["question_type"]
    season = state["season"]
    drivers_mentioned = state["drivers_mentioned"]
    existing_chunks = state["retrieved_chunks"]
    attempts = state["retrieval_attempts"]

    new_chunks = []
    race_context = extract_race(question)

    if question_type == "race_result":
        # fetch race_summary directly by exact name match — no embedding ranking issue
        summary_chunk = retrieve_race_summary(race_context, season)
        if summary_chunk:
            new_chunks.append(summary_chunk)
        # also get semantic results as backup context
        semantic = retrieve(question, k=4, season_filter=season)
        seen = {c["content"] for c in new_chunks}
        for c in semantic:
            if c["content"] not in seen:
                seen.add(c["content"])
                new_chunks.append(c)

    elif question_type == "comparison" and attempts == 0:
        for driver in drivers_mentioned[:2]:
            raw = retrieve(f"{driver} {race_context} strategy", k=5, season_filter=season)
            filtered = [r for r in raw if r["chunk_type"] in ("race", "stint", "pit_stop")]
            new_chunks.extend(filtered[:3] if filtered else raw[:3])

    elif question_type == "strategy":
        raw = retrieve(question, k=8, season_filter=season)
        filtered = [r for r in raw if r["chunk_type"] in ("race", "pit_stop", "stint")]
        new_chunks = filtered if filtered else raw

    else:
        new_chunks = retrieve(question, k=5, season_filter=season)

    existing_contents = {c["content"] for c in existing_chunks}
    merged = existing_chunks + [c for c in new_chunks if c["content"] not in existing_contents]

    return {
        **state,
        "retrieved_chunks": merged,
        "retrieval_attempts": attempts + 1,
    }


# ─── Node 3: Evaluate Sufficiency ────────────────────────────────────────────

def evaluate_sufficiency(state: PitwallState) -> PitwallState:
    chunks = state["retrieved_chunks"]
    question_type = state["question_type"]
    drivers_mentioned = state["drivers_mentioned"]

    if not chunks:
        return {
            **state,
            "sufficiency_verdict": "insufficient",
            "missing_context": "no chunks retrieved at all",
        }

    context = build_context(chunks)

    if question_type == "comparison" and len(drivers_mentioned) >= 2:
        covered = [d for d in drivers_mentioned[:2] if d in context]
        if len(covered) < 2:
            missing = [d for d in drivers_mentioned[:2] if d not in covered]
            return {
                **state,
                "sufficiency_verdict": "insufficient",
                "missing_context": f"missing data for driver(s): {missing}",
            }

    if question_type == "race_result":
        has_result_chunk = any(
            c["chunk_type"] in ("race_summary", "race") for c in chunks
        )
        if not has_result_chunk:
            return {
                **state,
                "sufficiency_verdict": "insufficient",
                "missing_context": "no race result or summary chunk retrieved",
            }

    return {
        **state,
        "sufficiency_verdict": "sufficient",
        "missing_context": "",
    }


# ─── Node 4: Generate ────────────────────────────────────────────────────────

def generate_node(state: PitwallState) -> PitwallState:
    question = state["question"]
    chunks = state["retrieved_chunks"]
    context = build_context(chunks)

    user_prompt = f"""Context:
{context}

Question: {question}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
    )

    answer = response.choices[0].message.content
    return {
        **state,
        "answer": answer,
        "sources": chunks,
    }


# ─── Node 5: Self Check ───────────────────────────────────────────────────────

def self_check(state: PitwallState) -> PitwallState:
    answer = state["answer"]
    chunks = state["retrieved_chunks"]
    context = build_context(chunks)

    check_prompt = f"""You are a strict fact-checker for an F1 data assistant.

Context that was retrieved:
{context}

Answer that was generated:
{answer}

Does the answer contain any claims NOT supported by the context above?
Reply with ONLY one of:
- "FAITHFUL" if every claim in the answer is supported by the context
- "UNFAITHFUL: <brief reason>" if the answer contains unsupported claims"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": check_prompt}],
        temperature=0.0,
    )

    verdict = response.choices[0].message.content.strip()

    if verdict.startswith("UNFAITHFUL"):
        flagged_answer = f"[Low confidence — answer may contain unsupported claims]\n\n{answer}"
        return {**state, "answer": flagged_answer}

    return state


# ─── Routing Functions ────────────────────────────────────────────────────────

def route_after_sufficiency(state: PitwallState) -> str:
    if state["sufficiency_verdict"] == "sufficient":
        return "generate"
    if state["retrieval_attempts"] >= 2:
        return "generate"
    return "retrieve"


# ─── Build the Graph ─────────────────────────────────────────────────────────

def build_graph():
    graph = StateGraph(PitwallState)

    graph.add_node("analyze_question", analyze_question)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("evaluate_sufficiency", evaluate_sufficiency)
    graph.add_node("generate", generate_node)
    graph.add_node("self_check", self_check)

    graph.set_entry_point("analyze_question")
    graph.add_edge("analyze_question", "retrieve")
    graph.add_edge("retrieve", "evaluate_sufficiency")
    graph.add_conditional_edges(
        "evaluate_sufficiency",
        route_after_sufficiency,
        {"generate": "generate", "retrieve": "retrieve"}
    )
    graph.add_edge("generate", "self_check")
    graph.add_edge("self_check", END)

    return graph.compile()


pitwall_agent = build_graph()


# ─── Test ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_questions = [
        "Who won the 2023 Monaco Grand Prix?",
        "How did Verstappen's tire strategy differ from Norris in the 2023 Belgian Grand Prix?",
        "What was Hamilton's finishing position in the 2024 Bahrain Grand Prix?",
        "Did it rain during the 2024 São Paulo Grand Prix?",
    ]

    for question in test_questions:
        start = time.time()
        result = pitwall_agent.invoke({"question": question})
        elapsed = (time.time() - start) * 1000

        print(f"Q: {question}")
        print(f"Type: {result['question_type']} | Drivers: {result['drivers_mentioned']} | Season: {result['season']}")
        print(f"Retrieval attempts: {result['retrieval_attempts']}")
        print(f"Sufficiency: {result['sufficiency_verdict']}")
        print(f"A: {result['answer']}")
        print(f"Latency: {elapsed:.0f}ms")
        print("---")