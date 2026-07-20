import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()  # reads your .env file

conn = psycopg2.connect(os.getenv("PITWALL_DB_URL"))
cur = conn.cursor()

cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector';")
result = cur.fetchone()

print(f"pgvector extension found: {result}")

cur.close()
conn.close()