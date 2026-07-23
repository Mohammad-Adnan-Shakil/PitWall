import fastf1
import time
from build_chunks import (
    load_race, build_lap_chunks, build_stint_chunks,
    build_pit_stop_chunks, build_race_chunks, build_race_summary_chunk,
    embed_chunks, store_chunks
)

fastf1.Cache.enable_cache('cache')

def ingest_season(season, races_override=None):
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

if __name__ == "__main__":
    ingest_season(2025)