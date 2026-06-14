from backend import load_data, predict_match, MatchRequest, DATA

load_data()
req = MatchRequest(home_team="Argentina", away_team="Saudi Arabia")
pred = predict_match(req)
print(pred["probabilities"])
print(pred["top_scorelines"])
