import fastf1
from build_chunks import (
    load_race, build_lap_chunks, build_stint_chunks,
    build_pit_stop_chunks, build_race_chunks,
    build_race_summary_chunk, embed_chunks, store_chunks
)

RACES_2023 = [
    "Bahrain", "Saudi Arabia", "Australia", "Azerbaijan", "Miami",
    "Emilia Romagna", "Monaco", "Spain", "Canada", "Austria",
    "Great Britain", "Hungary", "Belgium", "Netherlands", "Italy",
    "Singapore", "Japan", "Qatar", "United States", "Mexico",
    "Brazil", "Las Vegas", "Abu Dhabi",
]

RACES_2024 = [
    "Bahrain", "Saudi Arabia", "Australia", "Japan", "China",
    "Miami", "Emilia Romagna", "Monaco", "Canada", "Spain",
    "Austria", "Great Britain", "Hungary", "Belgium", "Netherlands",
    "Italy", "Azerbaijan", "Singapore", "United States", "Mexico",
    "Brazil", "Las Vegas", "Qatar", "Abu Dhabi",
]

RACES_2025 = [
    "Australia", "China", "Japan", "Bahrain", "Saudi Arabia",
    "Miami", "Emilia Romagna", "Monaco", "Spain", "Canada",
    "Austria", "Great Britain", "Belgium", "Hungary", "Netherlands",
    "Italy", "Azerbaijan", "Singapore", "United States", "Mexico",
    "Brazil", "Las Vegas", "Qatar", "Abu Dhabi",
]

SEASON_RACES = {
    2023: RACES_2023,
    2024: RACES_2024,
    2025: RACES_2025,
}

def ingest_season(season):
    race_names = SEASON_RACES.get(season)
    if not race_names:
        print(f"Unknown season: {season}")
        return

    all_chunks = []
    for race_name in race_names:
        print(f"\nProcessing {season} {race_name}...")
        try:
            session = load_race(season, race_name)
        except Exception as e:
            print(f"  Skipping {race_name}: {e}")
            continue

        all_chunks += build_lap_chunks(session, season)
        all_chunks += build_stint_chunks(session, season)
        all_chunks += build_pit_stop_chunks(session, season)
        all_chunks += build_race_chunks(session, season)
        all_chunks.append(build_race_summary_chunk(session, season))

        print(f"  → {len(all_chunks)} chunks so far")

    print(f"\nTotal chunks built for {season}: {len(all_chunks)}")
    all_chunks = embed_chunks(all_chunks)
    print("Embeddings generated.")
    store_chunks(all_chunks)
    print(f"Season {season} complete.\n")


if __name__ == "__main__":
    ingest_season(2023)
    ingest_season(2024)
    ingest_season(2025)
