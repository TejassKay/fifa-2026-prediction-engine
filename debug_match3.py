import backend
for m in backend.DATA.get("schedule", []):
    print(m.get("match_number"), m.get("team_a"), m.get("team_b"))
