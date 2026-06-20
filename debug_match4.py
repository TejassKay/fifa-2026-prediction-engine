import backend
for i, m in enumerate(backend.DATA.get("schedule", [])):
    if i < 3:
        print(m.get("match_number"), m.get("team_a"), m.get("team_b"))
