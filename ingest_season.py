import fastf1
import time
import os
import psycopg2
from dotenv import load_dotenv
from build_chunks import (
    load_race, build_lap_chunks, build_stint_chunks,
    build_pit_stop_chunks, build_race_chunks, build_race_summary_chunk,
    embed_chunks, store_chunks
)

fastf1.Cache.enable_cache('cache')
load_dotenv()

def ingest_season(season, races_override=None):
    conn = psycopg2.connect(os.getenv("PITWALL_DB_URL"))
    cur = conn.cursor()
    cur.execute("DELETE FROM pitwall_chunks WHERE season = %s", (season,))
    conn.commit()
    cur.close()
    conn.close()
    print(f"Cleared existing chunks for season {season}.")

    schedule = races_override if races_override is not None else fastf1.get_event_schedule(season)
    real_races = schedule[schedule['RoundNumber'] != 0] if races_override is None else schedule

    total_chunks_stored = 0
    failed_races = []

    for _, event in real_races.iterrows():
        race_name = event['EventName']
        print(f"\n{'='*60}")
        print(f"Processing: {season} {race_name}")
        print(f"{'='*60}")

        try:
            session = load_race(season, race_name)

            all_chunks = []
            all_chunks += build_lap_chunks(session, season)
            all_chunks += build_stint_chunks(session, season)
            all_chunks += build_pit_stop_chunks(session, season)
            all_chunks += build_race_chunks(session, season)
            all_chunks.append(build_race_summary_chunk(session, season))

            all_chunks = embed_chunks(all_chunks)
            store_chunks(all_chunks)

            total_chunks_stored += len(all_chunks)
            print(f"✓ {race_name}: {len(all_chunks)} chunks stored")

        except Exception as e:
            print(f"✗ FAILED: {race_name} — {e}")
            failed_races.append((race_name, str(e)))
            continue

        time.sleep(1)

    print(f"\n{'='*60}")
    print(f"Run complete.")
    print(f"Total chunks stored: {total_chunks_stored}")
    print(f"Failed races: {len(failed_races)}")
    for name, err in failed_races:
        print(f"  - {name}: {err}")

def store_chunks_with_retry(chunks, max_retries=3):
    for attempt in range(1, max_retries + 1):
        try:
            store_chunks(chunks)
            return
        except Exception as e:
            print(f"  Store attempt {attempt} failed: {e}")
            if attempt == max_retries:
                raise
            time.sleep(3)  # give Neon a moment to recover/wake up

if __name__ == "__main__":
    schedule = fastf1.get_event_schedule(2023)
    retry_races = schedule[schedule['EventName'].isin([
        'Australian Grand Prix', 'Singapore Grand Prix', 'São Paulo Grand Prix'
    ])]

    total_chunks_stored = 0
    failed_races = []

    for _, event in retry_races.iterrows():
        race_name = event['EventName']
        print(f"\nRetrying: 2023 {race_name}")
        try:
            session = load_race(2023, race_name)
            all_chunks = []
            all_chunks += build_lap_chunks(session, 2023)
            all_chunks += build_stint_chunks(session, 2023)
            all_chunks += build_pit_stop_chunks(session, 2023)
            all_chunks += build_race_chunks(session, 2023)
            all_chunks.append(build_race_summary_chunk(session, 2023))
            all_chunks = embed_chunks(all_chunks)
            store_chunks_with_retry(all_chunks)
            total_chunks_stored += len(all_chunks)
            print(f"✓ {race_name}: {len(all_chunks)} chunks stored")
        except Exception as e:
            print(f"✗ STILL FAILED: {race_name} — {e}")
            failed_races.append((race_name, str(e)))

    print(f"\nRetry complete. Stored: {total_chunks_stored}. Still failed: {len(failed_races)}")