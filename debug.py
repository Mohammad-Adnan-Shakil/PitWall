import os
import psycopg2
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
emb = model.encode('monaco grand prix winner podium result').tolist()
load_dotenv()
conn = psycopg2.connect(os.getenv('PITWALL_DB_URL'))
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM pitwall_chunks WHERE chunk_type = 'race_summary'")
print('Total race_summary chunks:', cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM pitwall_chunks WHERE chunk_type = 'race_summary' AND season = 2023")
print('race_summary chunks for 2023:', cur.fetchone()[0])

cur.execute("SELECT DISTINCT chunk_type FROM pitwall_chunks")
print('Distinct chunk types:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT DISTINCT season FROM pitwall_chunks ORDER BY season")
print('Distinct seasons:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT pg_typeof(season) FROM pitwall_chunks LIMIT 1")
print('Season column type:', cur.fetchone()[0])

cur.execute("SELECT season, chunk_type FROM pitwall_chunks WHERE chunk_type = 'race_summary' LIMIT 3")
for r in cur.fetchall():
    print('Season value:', repr(r[0]), '| type:', type(r[0]))

# Test with NO filters first
cur.execute(
    "SELECT content, chunk_type, season FROM pitwall_chunks "
    "ORDER BY embedding <=> %s::vector LIMIT 3",
    [emb]
)
print('\nNo filter results:')
for r in cur.fetchall():
    print(r[2], r[1], r[0][:60])

# Test with season filter only
cur.execute(
    "SELECT content, chunk_type, season FROM pitwall_chunks "
    "WHERE season = %s "
    "ORDER BY embedding <=> %s::vector LIMIT 3",
    [emb, 2023, emb]
)
print('\nSeason filter only:')
for r in cur.fetchall():
    print(r[2], r[1], r[0][:60])

cur.close()
conn.close()