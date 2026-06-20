from backend import MatchRecordRequest
payload = {
  "match_id": "11",
  "home_score": 2,
  "away_score": 0,
  "winner": "Mexico",
  "goal_scorers": [
    {
      "player_name": "QUINONES J.",
      "minute": "9",
      "assist_by": "LIRA Erik",
      "is_own_goal": False
    },
    {
      "player_name": "JIMENEZ Ra",
      "minute": "67",
      "assist_by": "ALVARADO",
      "is_own_goal": False
    }
  ],
  "cards": []
}

try:
    req = MatchRecordRequest(**payload)
    print("Success")
except Exception as e:
    print("Error:", e)
