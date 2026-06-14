from backend import load_data, get_upcoming_fixtures
load_data()
fixtures = get_upcoming_fixtures()
for f in fixtures:
    print(f"{f['home_team']} vs {f['away_team']}")
    print(f"Lambdas: {f['prediction']['expected_goals']}")
    print(f"Top Scorelines: {[s['score'] for s in f['prediction']['top_scorelines']]}")
    print("---")
