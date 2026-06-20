import backend
schedule = backend.DATA.get("schedule", [])
for m in schedule:
    if "uruguay" in str(m.get("team_a")).lower() or "uruguay" in str(m.get("team_b")).lower():
        print(m.get("match_number"), m.get("team_a"), m.get("team_b"))
