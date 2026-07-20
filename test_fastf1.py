import fastf1

fastf1.Cache.enable_cache('cache')  # creates a local 'cache' folder, avoids re-downloading

session = fastf1.get_session(2024, 'Belgium', 'R')
session.load()

print(session.laps.head())
print(f"\nTotal laps recorded: {len(session.laps)}")