import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
from scipy.stats import poisson

def generate_csv():
    # 1. Load Data
    df_wc = pd.read_csv("Dataset/world-cup-2026-schedule.csv")
    gs_matches = df_wc[(df_wc["status"] == "confirmed_group_fixture") | (df_wc["stage"] == "Group Stage")].copy()
    
    TEAM_NAME_MAP = {"Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "USA": "United States"}
    gs_matches["home_team"] = gs_matches["team_a"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    gs_matches["away_team"] = gs_matches["team_b"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    # ELO mappings
    df_e = pd.read_csv("Dataset/eloratings.csv")
    df_e["date"] = pd.to_datetime(df_e["date"], format='mixed')
    df_e = df_e.sort_values("date").drop_duplicates("team", keep="last")
    elo_dict = dict(zip(df_e["team"], df_e["rating"]))
    
    # 2. Positional Intelligence
    df_p = pd.read_csv("Dataset/players.csv", usecols=["player_id", "country_of_citizenship", "position"])
    df_v = pd.read_csv("Dataset/player_valuations.csv", usecols=["player_id", "date", "market_value_in_eur"])
    df_p["country_of_citizenship"] = df_p["country_of_citizenship"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    df_v["date"] = pd.to_datetime(df_v["date"], format='mixed')
    latest_v = df_v.sort_values("date").drop_duplicates("player_id", keep="last")
    pool = latest_v.merge(df_p, on="player_id", how="inner").fillna(0)
    
    rosters = pool.sort_values(["country_of_citizenship", "market_value_in_eur"], ascending=[True, False])
    rosters = rosters.groupby("country_of_citizenship").head(23)
    
    squad_intel = []
    for team, roster in rosters.groupby("country_of_citizenship"):
        gk = roster[roster["position"] == "Goalkeeper"]
        defenders = roster[roster["position"] == "Defender"]
        mid = roster[roster["position"] == "Midfield"]
        att = roster[roster["position"] == "Attack"]
        squad_intel.append({
            "team": team,
            "gk_strength": gk["market_value_in_eur"].max() if len(gk) > 0 else 0,
            "def_strength": defenders.nlargest(4, "market_value_in_eur")["market_value_in_eur"].mean() if len(defenders) > 0 else 0,
            "mid_strength": mid.nlargest(4, "market_value_in_eur")["market_value_in_eur"].mean() if len(mid) > 0 else 0,
            "att_strength": att.nlargest(3, "market_value_in_eur")["market_value_in_eur"].mean() if len(att) > 0 else 0
        })
    df_intel = pd.DataFrame(squad_intel)
    
    # 3. Assemble Features
    rows = []
    for i, m in gs_matches.iterrows():
        ht = m["home_team"]
        at = m["away_team"]
        h_elo = elo_dict.get(ht, 1500)
        a_elo = elo_dict.get(at, 1500)
        
        h_intel = df_intel[df_intel["team"] == ht].to_dict(orient="records")
        a_intel = df_intel[df_intel["team"] == at].to_dict(orient="records")
        hi = h_intel[0] if h_intel else {"gk_strength":0, "def_strength":0, "mid_strength":0, "att_strength":0}
        ai = a_intel[0] if a_intel else {"gk_strength":0, "def_strength":0, "mid_strength":0, "att_strength":0}
        
        rows.append({
            "match_id": m.get("match_number"),
            "home_team": ht,
            "away_team": at,
            "elo_diff": h_elo - a_elo,
            "home_elo": h_elo,
            "away_elo": a_elo,
            "is_neutral": 1,
            "home_gk_strength": hi["gk_strength"],
            "away_gk_strength": ai["gk_strength"],
            "home_def_strength": hi["def_strength"],
            "away_def_strength": ai["def_strength"],
            "home_mid_strength": hi["mid_strength"],
            "away_mid_strength": ai["mid_strength"],
            "home_att_strength": hi["att_strength"],
            "away_att_strength": ai["att_strength"]
        })
    
    df_pred = pd.DataFrame(rows)
    features = ['elo_diff', 'home_elo', 'away_elo', 'is_neutral', 'home_gk_strength', 'away_gk_strength', 'home_def_strength', 'away_def_strength', 'home_mid_strength', 'away_mid_strength', 'home_att_strength', 'away_att_strength']
    X = df_pred[features].astype(float)
    
    # 4. Predict
    cb_h = CatBoostRegressor()
    cb_a = CatBoostRegressor()
    cb_h.load_model("models/catboost_home.cbm")
    cb_a.load_model("models/catboost_away.cbm")
    
    lam_h = np.maximum(cb_h.predict(X), 0.01)
    lam_a = np.maximum(cb_a.predict(X), 0.01)
    
    # 5. Extract Scorelines
    results = []
    for i in range(len(df_pred)):
        lh, la = lam_h[i], lam_a[i]
        
        prob_h, prob_d, prob_a = 0.0, 0.0, 0.0
        scorelines = []
        for h in range(8):
            for a in range(8):
                p = poisson.pmf(h, lh) * poisson.pmf(a, la)
                scorelines.append({"score": f"{h}-{a}", "prob": float(p)})
                if h > a: prob_h += p
                elif h < a: prob_a += p
                else: prob_d += p
                
        scorelines = sorted(scorelines, key=lambda x: x["prob"], reverse=True)[:5]
        top_score = scorelines[0]["score"].split("-")
        
        if prob_h > prob_a and prob_h > prob_d:
            winner = "H"
        elif prob_a > prob_h and prob_a > prob_d:
            winner = "A"
        else:
            winner = "D"
            
        results.append({
            "match_id": df_pred.iloc[i]["match_id"],
            "home_team": df_pred.iloc[i]["home_team"],
            "away_team": df_pred.iloc[i]["away_team"],
            "catboost_lambda_home": round(lh, 4),
            "catboost_lambda_away": round(la, 4),
            "catboost_top_scoreline": scorelines[0]["score"],
            "catboost_pred_winner": winner,
            "catboost_prob_home": round(float(prob_h), 4),
            "catboost_prob_draw": round(float(prob_d), 4),
            "catboost_prob_away": round(float(prob_a), 4)
        })
        
    df_results = pd.DataFrame(results)
    out_path = "Study/Result/catboost_v2_study_predictions.csv"
    df_results.to_csv(out_path, index=False)
    print(f"Study predictions saved to {out_path}")

if __name__ == "__main__":
    generate_csv()
