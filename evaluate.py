import time
import json
import sys
import os
from dotenv import load_dotenv
import google.generativeai as genai
from test_set import TEST_SET
from generate import answer_question
from agent import pitwall_agent

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
gemini = genai.GenerativeModel("gemini-1.5-flash")

def score_question(question, answer, contexts, ground_truth):
    context_str = "\n".join([f"[{i+1}] {c}" for i, c in enumerate(contexts)])

    prompt = f"""You are evaluating an F1 data assistant's answer. Score the following three metrics.

Question: {question}
Ground truth: {ground_truth}

Retrieved context:
{context_str}

Generated answer: {answer}

Score each metric from 0.0 to 1.0:
1. FAITHFULNESS: Are all claims in the answer supported by the retrieved context?
2. RELEVANCY: Does the answer actually address the question asked?
3. CONTEXT_PRECISION: What fraction of the retrieved context chunks are relevant to the question?

Reply in EXACTLY this format, nothing else:
FAITHFULNESS: <score>
RELEVANCY: <score>
CONTEXT_PRECISION: <score>"""

    response = gemini.generate_content(prompt)
    text = response.text.strip()

    scores = {"faithfulness": 0.0, "relevancy": 0.0, "context_precision": 0.0}
    for line in text.split("\n"):
        if line.startswith("FAITHFULNESS:"):
            try: scores["faithfulness"] = float(line.split(":")[1].strip())
            except: pass
        elif line.startswith("RELEVANCY:"):
            try: scores["relevancy"] = float(line.split(":")[1].strip())
            except: pass
        elif line.startswith("CONTEXT_PRECISION:"):
            try: scores["context_precision"] = float(line.split(":")[1].strip())
            except: pass
    return scores


def score(results, label):
    print(f"\nScoring {label}...")
    valid = [r for r in results if r["answer"] != "ERROR" and r["contexts"]]
    print(f"Scoring {len(valid)}/{len(results)} valid results")

    all_scores = {"faithfulness": [], "relevancy": [], "context_precision": []}

    for i, r in enumerate(valid, 1):
        print(f"  [{i}/{len(valid)}] scoring...")
        s = score_question(
            r["question"],
            r["answer"],
            r["contexts"],
            r["ground_truth"]
        )
        all_scores["faithfulness"].append(s["faithfulness"])
        all_scores["relevancy"].append(s["relevancy"])
        all_scores["context_precision"].append(s["context_precision"])
        time.sleep(3)

    f_avg = sum(all_scores["faithfulness"]) / len(all_scores["faithfulness"])
    rel_avg = sum(all_scores["relevancy"]) / len(all_scores["relevancy"])
    cp_avg = sum(all_scores["context_precision"]) / len(all_scores["context_precision"])

    print(f"\n{'='*50}")
    print(f"Results — {label}")
    print(f"{'='*50}")
    print(f"Faithfulness:      {f_avg:.3f}")
    print(f"Answer relevancy:  {rel_avg:.3f}")
    print(f"Context precision: {cp_avg:.3f}")
    print(f"{'='*50}")

    return {
        "faithfulness": f_avg,
        "answer_relevancy": rel_avg,
        "context_precision": cp_avg
    }


# ─── Run pipeline on test set ─────────────────────────────────────────────────

def run_naive_pipeline(test_set):
    results = []
    for i, item in enumerate(test_set, 1):
        print(f"  [{i}/{len(test_set)}] {item['question'][:60]}...")
        try:
            result = answer_question(item["question"])
            results.append({
                "question": item["question"],
                "answer": result["answer"],
                "contexts": [c["content"] for c in result["sources"]],
                "ground_truth": item["ground_truth"],
            })
        except Exception as e:
            print(f"    ERROR: {e}")
            results.append({
                "question": item["question"],
                "answer": "ERROR",
                "contexts": [],
                "ground_truth": item["ground_truth"],
            })
        time.sleep(1)
    return results


def run_agentic_pipeline(test_set):
    results = []
    for i, item in enumerate(test_set, 1):
        print(f"  [{i}/{len(test_set)}] {item['question'][:60]}...")
        try:
            state = pitwall_agent.invoke({"question": item["question"]})
            results.append({
                "question": item["question"],
                "answer": state["answer"],
                "contexts": [c["content"] for c in state["sources"]],
                "ground_truth": item["ground_truth"],
            })
        except Exception as e:
            print(f"    ERROR: {e}")
            results.append({
                "question": item["question"],
                "answer": "ERROR",
                "contexts": [],
                "ground_truth": item["ground_truth"],
            })
        time.sleep(1)
    return results


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--score-only" in sys.argv:
        print("Loading saved pipeline results...")
        with open("naive_results.json") as f:
            naive_results = json.load(f)
        with open("agentic_results.json") as f:
            agentic_results = json.load(f)
        print(f"Loaded {len(naive_results)} naive results, {len(agentic_results)} agentic results")
    else:
        print("Running naive RAG pipeline on test set...")
        naive_results = run_naive_pipeline(TEST_SET)
        print("\nRunning agentic RAG pipeline on test set...")
        agentic_results = run_agentic_pipeline(TEST_SET)
        with open("naive_results.json", "w") as f:
            json.dump(naive_results, f)
        with open("agentic_results.json", "w") as f:
            json.dump(agentic_results, f)
        print("Results saved.")

    naive_scores = score(naive_results, "Naive RAG (Step 3)")
    agentic_scores = score(agentic_results, "Agentic RAG (Step 4)")

    print("\nImprovement:")
    for metric in ["faithfulness", "answer_relevancy", "context_precision"]:
        diff = agentic_scores[metric] - naive_scores[metric]
        direction = "↑" if diff > 0 else "↓"
        print(f"  {metric}: {naive_scores[metric]:.3f} → {agentic_scores[metric]:.3f} {direction} {abs(diff):.3f}")
