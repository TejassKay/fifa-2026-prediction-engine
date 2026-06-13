import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
import joblib
import warnings
import os

warnings.filterwarnings('ignore')

def train_v2_production():
    print("Loading datasets for V2 Production Models...")
    base = "Dataset/"
    df_r = pd.read_csv(base + "results.csv")
    df_e = pd.read_csv(base + "eloratings.csv")
    
    df_r["date"] = pd.to_datetime(df_r["date"], format='mixed')
    df_e["elo_date"] = pd.to_datetime(df_e["date"], format='mixed')
    df_e_sorted = df_e.sort_values("elo_date").drop(columns=["date"])
    
    TEAM_NAME_MAP = {"Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "USA": "United States"}
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    df = pd.merge_asof(
        df_r.sort_values("date"),
        df_e_sorted.rename(columns={"team": "home_team", "rating": "home_elo", "elo_date": "date"}),
        on="date", by="home_team", direction="backward"
    )
    df = pd.merge_asof(
        df,
        df_e_sorted.rename(columns={"team": "away_team", "rating": "away_elo", "elo_date": "date"}),
        on="date", by="away_team", direction="backward"
    )
    
    df.dropna(subset=['home_elo', 'away_elo', 'home_score', 'away_score'], inplace=True)
    df['home_score'] = df['home_score'].astype(int)
    df['away_score'] = df['away_score'].astype(int)
    df['elo_diff'] = df['home_elo'] - df['away_elo']
    df['is_neutral'] = df['neutral'].astype(int)
    
    squad_feats = pd.read_csv("Study/Dataset/historical_squad_features.csv")
    squad_feats['snapshot_date'] = pd.to_datetime(squad_feats['snapshot_date'])
    
    df = pd.merge_asof(
        df, squad_feats.rename(columns={c: "home_"+c for c in squad_feats.columns if c != "snapshot_date" and c != "team"}).rename(columns={"team": "home_team", "snapshot_date": "date"}),
        on="date", by="home_team", direction="backward"
    )
    df = pd.merge_asof(
        df, squad_feats.rename(columns={c: "away_"+c for c in squad_feats.columns if c != "snapshot_date" and c != "team"}).rename(columns={"team": "away_team", "snapshot_date": "date"}),
        on="date", by="away_team", direction="backward"
    )
    intel_cols = [c for c in df.columns if "strength" in c or "value" in c or "caps" in c]
    df[intel_cols] = df[intel_cols].fillna(0)
    
    # Train on all available data (up to present)
    features = ['elo_diff', 'home_elo', 'away_elo', 'is_neutral', 'home_gk_strength', 'away_gk_strength', 'home_def_strength', 'away_def_strength', 'home_mid_strength', 'away_mid_strength', 'home_att_strength', 'away_att_strength']
    
    X = df[features]
    y_h = df['home_score']
    y_a = df['away_score']
    
    print("Training V2 Home CatBoost Regressor...")
    mod_h = CatBoostRegressor(loss_function='Poisson', iterations=100, depth=4, learning_rate=0.05, verbose=0)
    mod_h.fit(X, y_h)
    
    print("Training V2 Away CatBoost Regressor...")
    mod_a = CatBoostRegressor(loss_function='Poisson', iterations=100, depth=4, learning_rate=0.05, verbose=0)
    mod_a.fit(X, y_a)
    
    os.makedirs("models", exist_ok=True)
    mod_h.save_model("models/catboost_home.cbm")
    mod_a.save_model("models/catboost_away.cbm")
    print("Saved production CatBoost models to models/catboost_home.cbm and models/catboost_away.cbm!")

if __name__ == "__main__":
    train_v2_production()
