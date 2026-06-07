import pandas as pd
import urllib.request
import json
import database

df = pd.read_csv("Dataset/world-cup-2026-schedule.csv")
# Only group stage
df = df[df["status"] == "confirmed_group_fixture"]

for _, row in df.iterrows():
    match_id = str(row['match_number'])
    ht = row['team_a']
    at = row['team_b']
    
    try:
        req = urllib.request.Request(
            "http://localhost:8000/api/predict/match", 
            data=json.dumps({"home_team": ht, "away_team": at}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
        
        prob_home = data['probabilities']['home_win']
        prob_draw = data['probabilities']['draw']
        prob_away = data['probabilities']['away_win']
        
        pred_winner = 'H'
        if prob_draw > prob_home and prob_draw > prob_away:
            pred_winner = 'D'
        elif prob_away > prob_home and prob_away > prob_draw:
            pred_winner = 'A'
            
        pred_home_score = int(round(data['expected_goals']['home']))
        pred_away_score = int(round(data['expected_goals']['away']))
        
        database.save_prediction(
            match_id=match_id,
            pred_home_score=pred_home_score,
            pred_away_score=pred_away_score,
            pred_winner=pred_winner,
            prob_home=prob_home,
            prob_draw=prob_draw,
            prob_away=prob_away
        )
    except Exception as e:
        print(f"Failed for match {match_id}: {e}")

print("Pre-populated predictions.")
