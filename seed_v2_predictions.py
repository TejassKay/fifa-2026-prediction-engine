import sys
import pandas as pd
from backend import load_data, predict_match, MatchRequest, DATA
import database

def run_seed():
    load_data()
    schedule = DATA.get("schedule", [])
    gs_matches = [m for m in schedule if m.get("status") == "confirmed_group_fixture" or m.get("stage") == "Group Stage"]
    count = 0
    for m in gs_matches:
        req = MatchRequest(home_team=m['team_a'], away_team=m['team_b'])
        pred = predict_match(req)
        top_score = pred["top_scorelines"][0]["score"].split("-")
        probs = pred["probabilities"]
        
        if probs["home_win"] > probs["away_win"] and probs["home_win"] > probs["draw"]:
            pred_winner = "H"
        elif probs["away_win"] > probs["home_win"] and probs["away_win"] > probs["draw"]:
            pred_winner = "A"
        else:
            pred_winner = "D"
            
        database.save_prediction(
            str(m['match_number']),
            int(top_score[0]),
            int(top_score[1]),
            pred_winner,
            probs["home_win"],
            probs["draw"],
            probs["away_win"]
        )
        count += 1
    print(f"Successfully re-seeded {count} V2 predictions into tournament.db!")

if __name__ == "__main__":
    run_seed()
