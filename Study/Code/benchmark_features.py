import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
from scipy.stats import poisson
import warnings
import os

warnings.filterwarnings('ignore')

def rps(pred_probs, true_outcome_idx):
    obs = np.zeros(3)
    obs[true_outcome_idx] = 1.0
    cum_pred = np.cumsum(pred_probs)
    cum_obs = np.cumsum(obs)
    return np.sum((cum_pred - cum_obs)**2) / 2.0

def load_data_with_features():
    base = "../../Dataset/"
    df_r = pd.read_csv(base + "results.csv")
    df_e = pd.read_csv(base + "eloratings.csv")
    
    df_r["date"] = pd.to_datetime(df_r["date"], format='mixed')
    df_e["elo_date"] = pd.to_datetime(df_e["date"], format='mixed')
    df_e_sorted = df_e.sort_values("elo_date").drop(columns=["date"])
    
    TEAM_NAME_MAP = {"Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "USA": "United States"}
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    # Merge Home/Away Elo
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
    
    # Target variables
    df['home_score'] = df['home_score'].astype(int)
    df['away_score'] = df['away_score'].astype(int)
    
    # Baseline Features
    df['elo_diff'] = df['home_elo'] - df['away_elo']
    df['is_neutral'] = df['neutral'].astype(int)
    
    # Feature B: Recent Form (Approximate rolling averages)
    print("Computing Recent Form features...")
    df['home_goals_last5'] = df.groupby('home_team')['home_score'].transform(lambda x: x.rolling(5, min_periods=1).mean().shift(1)).fillna(1.2)
    df['away_goals_last5'] = df.groupby('away_team')['away_score'].transform(lambda x: x.rolling(5, min_periods=1).mean().shift(1)).fillna(1.2)
    df['home_conceded_last5'] = df.groupby('home_team')['away_score'].transform(lambda x: x.rolling(5, min_periods=1).mean().shift(1)).fillna(1.2)
    df['away_conceded_last5'] = df.groupby('away_team')['home_score'].transform(lambda x: x.rolling(5, min_periods=1).mean().shift(1)).fillna(1.2)
    
    # Feature C & D: Squad and Player Intelligence
    print("Loading Squad Intelligence features...")
    squad_feats = pd.read_csv("../../Study/Dataset/historical_squad_features.csv")
    squad_feats['snapshot_date'] = pd.to_datetime(squad_feats['snapshot_date'])
    
    # Merge Home Intelligence
    df = pd.merge_asof(
        df,
        squad_feats.rename(columns={c: "home_"+c for c in squad_feats.columns if c != "snapshot_date" and c != "team"}).rename(columns={"team": "home_team", "snapshot_date": "date"}),
        on="date", by="home_team", direction="backward"
    )
    
    # Merge Away Intelligence
    df = pd.merge_asof(
        df,
        squad_feats.rename(columns={c: "away_"+c for c in squad_feats.columns if c != "snapshot_date" and c != "team"}).rename(columns={"team": "away_team", "snapshot_date": "date"}),
        on="date", by="away_team", direction="backward"
    )
    
    # Fill missing squad intel with 0 (meaning lack of top players)
    intel_cols = [c for c in df.columns if "strength" in c or "value" in c or "caps" in c]
    df[intel_cols] = df[intel_cols].fillna(0)
    
    return df

def run_feature_benchmark():
    df = load_data_with_features()
    
    wc18_mask = (df['date'] >= '2018-06-14') & (df['date'] <= '2018-07-15') & (df['tournament'] == 'FIFA World Cup')
    wc22_mask = (df['date'] >= '2022-11-20') & (df['date'] <= '2022-12-18') & (df['tournament'] == 'FIFA World Cup')
    modern_mask = (df['date'] >= '2023-01-01')
    
    holdout = pd.concat([df[wc18_mask], df[wc22_mask], df[modern_mask]])
    df_train = df[~(wc18_mask | wc22_mask | modern_mask)].tail(10000) # Speed up training
    
    feature_sets = {
        "A. Baseline ELO": ['elo_diff', 'home_elo', 'away_elo', 'is_neutral'],
        "B. ELO + Form": ['elo_diff', 'home_elo', 'away_elo', 'is_neutral', 'home_goals_last5', 'away_goals_last5', 'home_conceded_last5', 'away_conceded_last5'],
        "C. ELO + Squad Intel": ['elo_diff', 'home_elo', 'away_elo', 'is_neutral', 'home_total_squad_value', 'away_total_squad_value', 'home_avg_caps', 'away_avg_caps'],
        "D. ELO + Player Intel": ['elo_diff', 'home_elo', 'away_elo', 'is_neutral', 'home_gk_strength', 'away_gk_strength', 'home_def_strength', 'away_def_strength', 'home_mid_strength', 'away_mid_strength', 'home_att_strength', 'away_att_strength'],
        "E. Full Feature Set": ['elo_diff', 'home_elo', 'away_elo', 'is_neutral', 'home_goals_last5', 'away_goals_last5', 'home_conceded_last5', 'away_conceded_last5', 'home_total_squad_value', 'away_total_squad_value', 'home_gk_strength', 'away_gk_strength', 'home_def_strength', 'away_def_strength', 'home_mid_strength', 'away_mid_strength', 'home_att_strength', 'away_att_strength']
    }
    
    results = []
    
    for set_name, features in feature_sets.items():
        print(f"Evaluating Feature Set: {set_name}...")
        X_train = df_train[features]
        y_h_train = df_train['home_score']
        y_a_train = df_train['away_score']
        X_test = holdout[features]
        
        # Using CatBoost (Winner of Phase 1)
        mod_h = CatBoostRegressor(loss_function='Poisson', iterations=100, depth=4, learning_rate=0.05, verbose=0)
        mod_a = CatBoostRegressor(loss_function='Poisson', iterations=100, depth=4, learning_rate=0.05, verbose=0)
        
        mod_h.fit(X_train, y_h_train)
        mod_a.fit(X_train, y_a_train)
        
        lam_h = np.clip(mod_h.predict(X_test), 0.01, 10)
        lam_a = np.clip(mod_a.predict(X_test), 0.01, 10)
        
        exact_hits = 0
        winner_hits = 0
        brier_sum = 0
        logloss_sum = 0
        rps_sum = 0
        
        for i, (_, row) in enumerate(holdout.iterrows()):
            h_true = row['home_score']
            a_true = row['away_score']
            if h_true > a_true: true_out = 0
            elif h_true == a_true: true_out = 1
            else: true_out = 2
            
            p_matrix = np.zeros((10, 10))
            for x in range(10):
                for y in range(10):
                    p_matrix[x, y] = poisson.pmf(x, lam_h[i]) * poisson.pmf(y, lam_a[i])
            p_matrix /= p_matrix.sum()
            
            pred_h, pred_a = np.unravel_index(np.argmax(p_matrix), p_matrix.shape)
            if pred_h == h_true and pred_a == a_true:
                exact_hits += 1
                
            p_H = np.tril(p_matrix, -1).sum()
            p_D = np.trace(p_matrix)
            p_A = np.triu(p_matrix, 1).sum()
            
            probs = [p_H, p_D, p_A]
            pred_out = np.argmax(probs)
            if pred_out == true_out:
                winner_hits += 1
                
            obs = [1 if true_out == 0 else 0, 1 if true_out == 1 else 0, 1 if true_out == 2 else 0]
            brier_sum += sum((probs[k] - obs[k])**2 for k in range(3))
            
            epsilon = 1e-15
            p_true = max(epsilon, min(1-epsilon, probs[true_out]))
            logloss_sum += -np.log(p_true)
            rps_sum += rps(probs, true_out)
            
        N = len(holdout)
        results.append({
            "Feature Set": set_name,
            "Exact Score Acc": exact_hits / N,
            "Winner Acc": winner_hits / N,
            "Brier Score": brier_sum / N,
            "Log Loss": logloss_sum / N,
            "RPS": rps_sum / N
        })

    df_res = pd.DataFrame(results).sort_values("Log Loss")
    df_res.to_csv("../../Study/Result/feature_benchmark_results.csv", index=False)
    
    print("\n--- PHASE 2: FEATURE BENCHMARK RESULTS ---")
    print(df_res.to_string(index=False))

if __name__ == "__main__":
    run_feature_benchmark()
