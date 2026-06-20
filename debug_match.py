import backend

schedule = backend.DATA.get("schedule", [])
match = next((m for m in schedule if "Saudi Arabia" in [m.get("team_a"), m.get("team_b")]), None)
if match:
    mid = str(match.get("match_number"))
    print("Match ID:", mid)
    data = backend.get_match_details(mid)
    print("Home:", data.get("home_team"))
    print("Away:", data.get("away_team"))
    pred = data.get("prediction", {})
    stats = pred.get("team_stats", {})
    home_stats = stats.get("home")
    away_stats = stats.get("away")
    print("Home Stats:", home_stats)
    print("Away Stats:", away_stats)
else:
    print("No Saudi Arabia match found")
