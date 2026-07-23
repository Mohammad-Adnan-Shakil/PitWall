import os
from dotenv import load_dotenv
import psycopg2
from sentence_transformers import SentenceTransformer

load_dotenv()

_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model


def retrieve(query, k=5, season_filter=None):
    model = get_model()
    query_embedding = model.encode(query).tolist()

    conn = psycopg2.connect(os.getenv("PITWALL_DB_URL"))
    cur = conn.cursor()

    if season_filter:
        cur.execute(
            """
            SELECT content, chunk_type, season, race, driver,
                   embedding <=> %s::vector AS distance
            FROM pitwall_chunks
            WHERE season = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_embedding, season_filter, query_embedding, k)
        )
    else:
        cur.execute(
            """
            SELECT content, chunk_type, season, race, driver,
                   embedding <=> %s::vector AS distance
            FROM pitwall_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_embedding, query_embedding, k)
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    results = []
    for content, chunk_type, season, race, driver, distance in rows:
        results.append({
            "content": content,
            "chunk_type": chunk_type,
            "season": season,
            "race": race,
            "driver": driver,
            "distance": distance,
        })

    return results


if __name__ == "__main__":
    question = "How did Verstappen's tire strategy differ from Norris in the Belgian Grand Prix?"
    results = retrieve(question, k=5)
    print(f"Query: {question}\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. [{r['chunk_type']}] (distance: {r['distance']:.4f})")
        print(f"   {r['content']}")
        print()