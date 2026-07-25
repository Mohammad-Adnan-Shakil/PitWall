import os
from dotenv import load_dotenv
import psycopg2
from fastembed import TextEmbedding

load_dotenv()

_model = None

def get_model():
    global _model
    if _model is None:
        _model = TextEmbedding("BAAI/bge-small-en-v1.5")
    return _model


def embed_text(text):
    model = get_model()
    embeddings = list(model.embed([text]))
    return embeddings[0].tolist()


def retrieve(query, k=5, season_filter=None):
    query_embedding = embed_text(query)

    conn = psycopg2.connect(os.getenv("PITWALL_DB_URL"))
    try:
        cur = conn.cursor()
        try:
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
        finally:
            cur.close()
    finally:
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
    try:
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT content, chunk_type, season, race, driver "
                "FROM pitwall_chunks "
                "WHERE chunk_type = 'race_summary' AND season = %s AND race ILIKE %s "
                "LIMIT 1",
                (season, f"%{race_name}%")
            )
            row = cur.fetchone()
        finally:
            cur.close()
    finally:
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
