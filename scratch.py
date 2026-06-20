import json

with open("data/schedule.json") as f:
    data = json.load(f)
    print("Match 1 time_local:", data[0].get("time_local"))

