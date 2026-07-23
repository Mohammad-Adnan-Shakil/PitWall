import os
import time
import re
from dotenv import load_dotenv
from groq import Groq
from retrieval import retrieve

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are Pitwall, an F1 data assistant. Answer the user's question using ONLY the information in the provided context below.

Rules:
- If the context contains the answer, answer clearly and cite specific facts (lap numbers, times, positions) from the context.
- If the context does NOT contain enough information to answer the question, say so explicitly — do not guess or use outside knowledge.
- Do not add any information not present in the context, even if you believe it to be true.
"""

def build_context(chunks):
    lines = []
    for i, c in enumerate(chunks, 1):
        lines.append(f"[{i}] {c['content']}")
    return "\n".join(lines)


def extract_season(question):
    match = re.search(r'\b(2023|2024|2025)\b', question)
    return int(match.group()) if match else None


def answer_question(question, k=5):
    season = extract_season(question)
    chunks = retrieve(question, k=k, season_filter=season)
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
        "question": question,
        "answer": answer,
        "sources": chunks,
    }


if __name__ == "__main__":
    test_questions = [
        "What was Hamilton's finishing position in the 2024 Bahrain Grand Prix?",
        "Who won the 2023 Monaco Grand Prix?",
        "How did Verstappen's tire strategy differ from Norris in the Belgian Grand Prix?",
        "What was the weather like during the 2024 Singapore Grand Prix?",
        "How many pit stops did Leclerc make in the 2024 Australian Grand Prix?",
        "What was Piastri's fastest lap time in the 2025 Spanish Grand Prix?",
        "Which driver had the longest stint on hard tires in the 2023 Dutch Grand Prix?",
        "Did it rain during the 2024 São Paulo Grand Prix?",
    ]

    for question in test_questions:
        start = time.time()
        result = answer_question(question)
        elapsed = (time.time() - start) * 1000

        print(f"Q: {question}")
        print(f"A: {result['answer']}")
        print(f"Latency: {elapsed:.0f}ms")
        print(f"Top source: [{result['sources'][0]['chunk_type']}] {result['sources'][0]['content'][:70]}...")
        print("---")