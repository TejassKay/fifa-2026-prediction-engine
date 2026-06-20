from backend import MatchRecordRequest
payload = {
  "match_id": "11",
  "home_score": 2,
  "away_score": 0,
  "winner": "Mexico",
  "goal_scorers": [
    {
      "player_name": "QUINONES J.",
      "minute": "",
      "assist_by": "LIRA Erik"
    }
  ],
  "cards": []
}

try:
    req = MatchRecordRequest(**payload)
    print("Success")
except Exception as e:
    print("Error:", e)
