import fastf1
import pandas as pd
import psycopg2
import os
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from psycopg2.extras import execute_values

fastf1.Cache.enable_cache('cache')

def load_race(season, race_name):
    session = fastf1.get_session(season, race_name, 'R')
    session.load(telemetry=False, weather=True, messages=True)
    return session

def build_lap_chunks(session, season):
    chunks = []
    laps = session.laps
    event_name = session.event['EventName']

    for _, lap in laps.iterrows():
        if pd.isna(lap['LapTime']):
            continue

        driver = lap['Driver']
        lap_number = int(lap['LapNumber'])
        lap_time = str(lap['LapTime'])[10:-3]
        position = int(lap['Position']) if not pd.isna(lap['Position']) else None
        compound = lap['Compound'] if pd.notna(lap['Compound']) else 'unknown'
        tyre_life = int(lap['TyreLife']) if not pd.isna(lap['TyreLife']) else None
        track_status = lap['TrackStatus'] if pd.notna(lap['TrackStatus']) else '1'

        text = (
            f"On lap {lap_number} of the {season} {event_name}, {driver} was running "
            f"in P{position} with a lap time of {lap_time}, on {compound} tires "
            f"({tyre_life} laps old). Track status code: {track_status}."
        )

        chunks.append({
            "chunk_type": "lap",
            "season": season,
            "race": event_name,
            "driver": driver,
            "content": text,
            "metadata": {
                "lap_number": lap_number,
                "position": position,
                "compound": compound,
                "tyre_life": tyre_life,
            }
        })

    return chunks


def build_stint_chunks(session, season):
    chunks = []
    laps = session.laps
    event_name = session.event['EventName']

    grouped = laps.dropna(subset=['LapTime']).groupby(['Driver', 'Stint'])

    for (driver, stint_num), stint_laps in grouped:
        if len(stint_laps) < 2:
            continue

        stint_laps = stint_laps.sort_values('LapNumber')

        start_lap = int(stint_laps['LapNumber'].iloc[0])
        end_lap = int(stint_laps['LapNumber'].iloc[-1])
        lap_count = len(stint_laps)
        compound = stint_laps['Compound'].iloc[0]

        lap_times_seconds = stint_laps['LapTime'].dt.total_seconds()
        avg_lap_time_sec = lap_times_seconds.mean()

        first_lap_time = lap_times_seconds.iloc[0]
        last_lap_time = lap_times_seconds.iloc[-1]
        degradation = last_lap_time - first_lap_time
        degradation_per_lap = degradation / (lap_count - 1)

        avg_lap_time_str = f"{int(avg_lap_time_sec // 60)}:{avg_lap_time_sec % 60:06.3f}"

        if degradation_per_lap > 0.05:
            degradation_desc = f"dropping by roughly {degradation_per_lap:.2f} seconds per lap over the stint"
        elif degradation_per_lap < -0.05:
            degradation_desc = f"improving by roughly {abs(degradation_per_lap):.2f} seconds per lap over the stint"
        else:
            degradation_desc = "remaining fairly consistent over the stint"

        text = (
            f"In the {season} {event_name}, {driver} ran a stint on {compound} tires "
            f"from lap {start_lap} to lap {end_lap} ({lap_count} laps). Average lap time "
            f"was {avg_lap_time_str}, with pace {degradation_desc}."
        )

        chunks.append({
            "chunk_type": "stint",
            "season": season,
            "race": event_name,
            "driver": driver,
            "content": text,
            "metadata": {
                "stint_number": int(stint_num),
                "compound": compound,
                "start_lap": start_lap,
                "end_lap": end_lap,
                "lap_count": lap_count,
                "avg_lap_time_sec": round(avg_lap_time_sec, 3),
                "degradation_per_lap_sec": round(degradation_per_lap, 3),
            }
        })

    return chunks

def build_pit_stop_chunks(session, season):
    chunks = []
    laps = session.laps
    event_name = session.event['EventName']

    for driver in laps['Driver'].unique():
        driver_laps = laps[laps['Driver'] == driver].dropna(subset=['LapTime']).sort_values('LapNumber')
        stints = driver_laps['Stint'].unique()

        for i in range(len(stints) - 1):
            current_stint = stints[i]
            next_stint = stints[i + 1]

            current_stint_laps = driver_laps[driver_laps['Stint'] == current_stint]
            next_stint_laps = driver_laps[driver_laps['Stint'] == next_stint]

            if current_stint_laps.empty or next_stint_laps.empty:
                continue

            pit_lap = int(current_stint_laps['LapNumber'].iloc[-1])
            compound_before = current_stint_laps['Compound'].iloc[-1]
            compound_after = next_stint_laps['Compound'].iloc[0]

            if compound_before == compound_after:
                text = (
                    f"{driver} pitted on lap {pit_lap} of the {season} {event_name}, "
                    f"taking a fresh set of {compound_after} tires."
                )
            else:
                text = (
                    f"{driver} pitted on lap {pit_lap} of the {season} {event_name}, "
                    f"changing from {compound_before} to {compound_after} tires."
                )

            chunks.append({
                "chunk_type": "pit_stop",
                "season": season,
                "race": event_name,
                "driver": driver,
                "content": text,
                "metadata": {
                    "lap_number": pit_lap,
                    "compound_before": compound_before,
                    "compound_after": compound_after,
                }
            })

    return chunks

def build_race_chunks(session, season):
    chunks = []
    laps = session.laps
    event_name = session.event['EventName']
    results = session.results

    for _, row in results.iterrows():
        driver = row['Abbreviation']
        final_position = int(row['Position']) if not pd.isna(row['Position']) else None
        grid_position = int(row['GridPosition']) if not pd.isna(row['GridPosition']) else None
        points = row['Points']
        status = row['Status']

        # Build tire strategy sequence from this driver's stints
        driver_laps = laps[laps['Driver'] == driver].dropna(subset=['Compound']).sort_values('LapNumber')
        stint_compounds = driver_laps.groupby('Stint')['Compound'].first().tolist()
        strategy_sequence = " → ".join(stint_compounds) if stint_compounds else "unknown"
        pit_stop_count = max(len(stint_compounds) - 1, 0)


        text = (
    f"{driver} finished the {season} {event_name} in "
    f"{'P' + str(final_position) if final_position else 'an unclassified position'}, "
    f"starting from P{grid_position} on the grid, scoring {points} points. "
    f"Race status: {status}. Tire strategy: {strategy_sequence}. "
    f"Total pit stops: {pit_stop_count}."
)

        chunks.append({
            "chunk_type": "race",
            "season": season,
            "race": event_name,
            "driver": driver,
            "content": text,
            "metadata": {
                "final_position": final_position,
                "grid_position": grid_position,
                "points": points,
                "status": status,
                "strategy_sequence": strategy_sequence,
                "pit_stop_count": pit_stop_count,
            }
        })

    return chunks

def build_race_summary_chunk(session, season):
    event_name = session.event['EventName']
    results = session.results.sort_values('Position')

    winner = results.iloc[0]['Abbreviation']
    podium_2 = results.iloc[1]['Abbreviation']
    podium_3 = results.iloc[2]['Abbreviation']

    # Weather summary
    weather = session.weather_data
    avg_track_temp = weather['TrackTemp'].mean()
    was_rain = weather['Rainfall'].any()
    weather_summary = (
        f"{'wet' if was_rain else 'dry'} conditions, "
        f"average track temperature {avg_track_temp:.1f}°C"
    )

    # Incident summary from race control messages
    messages = session.race_control_messages
    safety_car_msgs = messages[messages['Message'].str.contains('SAFETY CAR', case=False, na=False)]
    incident_summary = (
        f"There were {len(safety_car_msgs)} safety-car-related race control messages during the session."
        if len(safety_car_msgs) > 0
        else "No safety car periods were recorded."
    )

    text = (
        f"The {season} {event_name} was won by {winner}, with {podium_2} in P2 "
        f"and {podium_3} in P3. Weather conditions: {weather_summary}. {incident_summary}"
    )

    return {
        "chunk_type": "race_summary",
        "season": season,
        "race": event_name,
        "driver": None,
        "content": text,
        "metadata": {
            "winner": winner,
            "podium_2": podium_2,
            "podium_3": podium_3,
            "avg_track_temp": round(float(avg_track_temp), 1),
            "was_rain": bool(was_rain),
            "safety_car_message_count": len(safety_car_msgs),
        }
    }


def embed_chunks(chunks):
    model = SentenceTransformer('all-MiniLM-L6-v2')  # 384-dim, matches our pgvector column
    texts = [c["content"] for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=64)

    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding.tolist()  # numpy array → plain list for DB insertion

    return chunks

load_dotenv()

def store_chunks(chunks):
    conn = psycopg2.connect(os.getenv("PITWALL_DB_URL"))
    cur = conn.cursor()

    rows = [
        (
            c["chunk_type"],
            c["season"],
            c["race"],
            c["driver"],
            c["content"],
            c["embedding"],
            psycopg2.extras.Json(c["metadata"]),
        )
        for c in chunks
    ]

    execute_values(
        cur,
        """
        INSERT INTO pitwall_chunks (chunk_type, season, race, driver, content, embedding, metadata)
        VALUES %s
        """,
        rows,
        template="(%s, %s, %s, %s, %s, %s, %s)"
    )

    conn.commit()
    cur.close()
    conn.close()
    print(f"Stored {len(chunks)} chunks in pgvector.")

if __name__ == "__main__":
    session = load_race(2024, "Belgium")

    all_chunks = []
    all_chunks += build_lap_chunks(session, 2024)
    all_chunks += build_stint_chunks(session, 2024)
    all_chunks += build_pit_stop_chunks(session, 2024)
    all_chunks += build_race_chunks(session, 2024)
    all_chunks.append(build_race_summary_chunk(session, 2024))

    print(f"\nTotal chunks built: {len(all_chunks)}")

    all_chunks = embed_chunks(all_chunks)
    print("Embeddings generated.")

    store_chunks(all_chunks)



