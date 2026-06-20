import json
with open("Dataset/player_intelligence.json", "r") as f:
    players = json.load(f)

teams = set([p.get("team") for p in players.values()])
print("Côte d'Ivoire in teams?", "Côte d'Ivoire" in teams)
print("Ivory Coast in teams?", "Ivory Coast" in teams)
print("Côte d’Ivoire in teams?", "Côte d’Ivoire" in teams)
for t in teams:
    if "ivoire" in str(t).lower() or "ivory" in str(t).lower() or "cote" in str(t).lower():
        print("Found matching team:", t)
