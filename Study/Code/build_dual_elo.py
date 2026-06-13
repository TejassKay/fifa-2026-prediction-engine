import pandas as pd
import numpy as np
import os
import tqdm

def build_dual_elo():
    df_r = pd.read_csv("../../Dataset/results.csv")
    df_r["date"] = pd.to_datetime(df_r["date"], format='mixed')
    df_r = df_r.sort_values("date").reset_index(drop=True)
    
    TEAM_NAME_MAP = {"Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "USA": "United States"}
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    # Initialize Ratings
    att_elo = {}
    def_elo = {}
    
    def get_rating(team, d):
        if team not in d:
            d[team] = 1500.0
        return d[team]
        
    records = []
    
    print("Replaying historical matches to build true Attack/Defense ELO...")
    
    K = 20
    # Base expected goals for neutral match evenly matched
    BASE_GOALS = 1.2
    
    for _, row in tqdm.tqdm(df_r.iterrows(), total=len(df_r)):
        date = row["date"]
        home = row["home_team"]
        away = row["away_team"]
        h_score = float(row["home_score"])
        a_score = float(row["away_score"])
        is_neutral = row["neutral"]
        
        # Get pre-match ratings
        h_att = get_rating(home, att_elo)
        h_def = get_rating(home, def_elo)
        a_att = get_rating(away, att_elo)
        a_def = get_rating(away, def_elo)
        
        # Save pre-match ratings for tracking
        records.append({
            "date": date,
            "team": home,
            "att_rating": h_att,
            "def_rating": h_def
        })
        records.append({
            "date": date,
            "team": away,
            "att_rating": a_att,
            "def_rating": a_def
        })
        
        # Calculate Expected Goals
        # Home advantage logic
        h_adv = 0.2 if not is_neutral else 0.0
        
        exp_h_goals = max(0.1, BASE_GOALS + h_adv + (h_att - a_def) / 200.0)
        exp_a_goals = max(0.1, BASE_GOALS + (a_att - h_def) / 200.0)
        
        # Update Ratings
        # Attack rewards scoring more than expected
        # Defense rewards conceding less than expected
        
        # We cap the max goal difference delta to prevent blowouts from destroying ratings
        h_diff = np.clip(h_score - exp_h_goals, -5, 5)
        a_diff = np.clip(a_score - exp_a_goals, -5, 5)
        
        # Home Updates
        att_elo[home] = h_att + K * h_diff
        def_elo[home] = h_def + K * (-a_diff)
        
        # Away Updates
        att_elo[away] = a_att + K * a_diff
        def_elo[away] = a_def + K * (-h_diff)

    df_elo = pd.DataFrame(records)
    # Drop duplicates so we keep only the latest rating per date
    df_elo = df_elo.drop_duplicates(subset=["date", "team"], keep="last")
    
    out_dir = "../../Dataset"
    df_elo.to_csv(f"{out_dir}/true_att_def_eloratings.csv", index=False)
    print(f"Saved true Attack/Defense ELOs to Dataset/true_att_def_eloratings.csv")

if __name__ == "__main__":
    build_dual_elo()
