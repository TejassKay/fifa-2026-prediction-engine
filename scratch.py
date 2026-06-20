import requests
import json

payload = {
    "match_id": "1",
    "home_score": "2",
    "away_score": "1",
    "winner": "H",
    "goal_scorers": [
        {"player_name": "", "minute": ""}
    ],
    "cards": []
}

try:
    r = requests.post('https://www.fifawc26hub.com/api/matches/record', json=payload)
    print(r.status_code)
    print(r.text)
except Exception as e:
    print(e)
