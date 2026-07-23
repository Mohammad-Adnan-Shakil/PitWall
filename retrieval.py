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
            "SELECT content, chunk_type, season, race, driver, "
            "embedding <=> %s::vector AS distance "
            "FROM pitwall_chunks "
            "WHERE season = %s "
            "ORDER BY embedding <=> %s::vector "
            "LIMIT %s",
            [query_embedding, season_filter, query_embedding, k]
        )
    else:
        cur.execute(
            "SELECT content, chunk_type, season, race, driver, "
            "embedding <=> %s::vector AS distance "
            "FROM pitwall_chunks "
            "ORDER BY embedding <=> %s::vector "
            "LIMIT %s",
            [query_embedding, query_embedding, k]
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "content": content,
            "chunk_type": chunk_type,
            "season": season,
            "race": race,
            "driver": driver,
            "distance": distance,
        }
        for content, chunk_type, season, race, driver, distance in rows
    ]


def retrieve_race_summary(race_name, season):
    conn = psycopg2.connect(os.getenv("PITWALL_DB_URL"))
    cur = conn.cursor()
    cur.execute(
        "SELECT content, chunk_type, season, race, driver "
        "FROM pitwall_chunks "
        "WHERE chunk_type = 'race_summary' AND season = %s AND race ILIKE %s "
        "LIMIT 1",
        (season, f"%{race_name}%")
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return {
            "content": row[0],
            "chunk_type": row[1],
            "season": row[2],
            "race": row[3],
            "driver": row[4],
            "distance": 0.0,
        }
    return None


if __name__ == "__main__":
    question = "How did Verstappen's tire strategy differ from Norris in the Belgian Grand Prix?"
    results = retrieve(question, k=5)
    print(f"Query: {question}\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. [{r['chunk_type']}] (distance: {r['distance']:.4f})")
        print(f"   {r['content']}")
        print()
