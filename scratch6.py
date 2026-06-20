from backend import app, MatchRequest, predict_match
req = MatchRequest(home_team="Mexico", away_team="South Africa")
try:
    res = predict_match(req)
    print("Success")
except Exception as e:
    print("Error:", e)
