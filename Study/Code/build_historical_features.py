import pandas as pd
import numpy as np
import os
from datetime import timedelta
import warnings

warnings.filterwarnings('ignore')

def build_features():
    print("Loading raw Transfermarkt data...")
    base = "../../Dataset/"
    
    print("Loading players and valuations...")
    df_p = pd.read_csv(base + "players.csv", usecols=["player_id", "country_of_citizenship", "position"])
    df_v = pd.read_csv(base + "player_valuations.csv", usecols=["player_id", "date", "market_value_in_eur"])
    df_v["date"] = pd.to_datetime(df_v["date"], format='mixed')
    
    TEAM_NAME_MAP = {"Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "USA": "United States"}
    df_p["country_of_citizenship"] = df_p["country_of_citizenship"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    snapshots = [
        ("2018-06-01", "2018-06-14"), # WC 2018
        ("2022-11-01", "2022-11-20"), # WC 2022
        ("2024-06-01", "2024-06-14")  # Euro 2024 (Modern Holdout Proxy)
    ]
    
    all_squad_features = []
    
    for snap_date_str, _ in snapshots:
        print(f"Building Squad Snapshot for {snap_date_str}...")
        snap_date = pd.to_datetime(snap_date_str)
        
        # Get latest valuation for ALL players BEFORE the snapshot date
        v_hist = df_v[df_v["date"] <= snap_date]
        latest_v = v_hist.sort_values("date").drop_duplicates("player_id", keep="last")
        
        # Merge with players to get country and position
        pool = latest_v.merge(df_p, on="player_id", how="inner").fillna(0)
        
        # For each country, select the top 23 players by Market Value to approximate the final roster
        rosters = pool.sort_values(["country_of_citizenship", "market_value_in_eur"], ascending=[True, False])
        rosters = rosters.groupby("country_of_citizenship").head(23)
        
        # Now compute positional strengths
        for team, roster in rosters.groupby("country_of_citizenship"):
            gk = roster[roster["position"] == "Goalkeeper"]
            defenders = roster[roster["position"] == "Defender"]
            mid = roster[roster["position"] == "Midfield"]
            att = roster[roster["position"] == "Attack"]
            
            gk_str = gk["market_value_in_eur"].max() if len(gk) > 0 else 0
            def_str = defenders.nlargest(4, "market_value_in_eur")["market_value_in_eur"].mean() if len(defenders) > 0 else 0
            mid_str = mid.nlargest(4, "market_value_in_eur")["market_value_in_eur"].mean() if len(mid) > 0 else 0
            att_str = att.nlargest(3, "market_value_in_eur")["market_value_in_eur"].mean() if len(att) > 0 else 0
            
            all_squad_features.append({
                "team": team,
                "snapshot_date": snap_date_str,
                "total_squad_value": roster["market_value_in_eur"].sum(),
                "top_xi_value": roster.nlargest(11, "market_value_in_eur")["market_value_in_eur"].sum(),
                "avg_caps": 0, # Cannot compute historically accurately
                "gk_strength": gk_str,
                "def_strength": def_str,
                "mid_strength": mid_str,
                "att_strength": att_str
            })
            
    df_squad_feats = pd.DataFrame(all_squad_features)
    out_dir = "../../Study/Dataset"
    os.makedirs(out_dir, exist_ok=True)
    df_squad_feats.to_csv(f"{out_dir}/historical_squad_features.csv", index=False)
    print("Historical Squad Features Generated!")

if __name__ == "__main__":
    build_features()
