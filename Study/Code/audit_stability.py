import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
from scipy.stats import poisson
import warnings

warnings.filterwarnings('ignore')

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
    
    squad_feats = pd.read_csv("../../Study/Dataset/historical_squad_features.csv")
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
    return df

def run_stability_audit():
    print("Executing Phase 2 Stability Audit (Variance Check)...")
    df = load_data_with_features()
    
    wc18_mask = (df['date'] >= '2018-06-14') & (df['date'] <= '2018-07-15') & (df['tournament'] == 'FIFA World Cup')
    wc22_mask = (df['date'] >= '2022-11-20') & (df['date'] <= '2022-12-18') & (df['tournament'] == 'FIFA World Cup')
    modern_mask = (df['date'] >= '2023-01-01')
    
    holdout = pd.concat([df[wc18_mask], df[wc22_mask], df[modern_mask]])
    df_train = df[~(wc18_mask | wc22_mask | modern_mask)].tail(10000)
    
    features = ['elo_diff', 'home_elo', 'away_elo', 'is_neutral', 'home_gk_strength', 'away_gk_strength', 'home_def_strength', 'away_def_strength', 'home_mid_strength', 'away_mid_strength', 'home_att_strength', 'away_att_strength']
    
    X_train = df_train[features]
    y_h_train = df_train['home_score']
    y_a_train = df_train['away_score']
    X_test = holdout[features]
    
    logloss_results = []
    
    print("\n--- SEED VARIANCE TEST ---")
    seeds = [42, 7, 99, 123, 1024]
    
    for seed in seeds:
        print(f"Training Seed {seed}...")
        mod_h = CatBoostRegressor(loss_function='Poisson', iterations=100, depth=4, learning_rate=0.05, random_seed=seed, verbose=0)
        mod_a = CatBoostRegressor(loss_function='Poisson', iterations=100, depth=4, learning_rate=0.05, random_seed=seed, verbose=0)
        
        mod_h.fit(X_train, y_h_train)
        mod_a.fit(X_train, y_a_train)
        
        lam_h = np.clip(mod_h.predict(X_test), 0.01, 10)
        lam_a = np.clip(mod_a.predict(X_test), 0.01, 10)
        
        logloss_sum = 0
        for i, (_, row) in enumerate(holdout.iterrows()):
            h_true = row['home_score']
            a_true = row['away_score']
            true_out = 0 if h_true > a_true else (1 if h_true == a_true else 2)
            
            p_matrix = np.zeros((10, 10))
            for x in range(10):
                for y in range(10):
                    p_matrix[x, y] = poisson.pmf(x, lam_h[i]) * poisson.pmf(y, lam_a[i])
            p_matrix /= p_matrix.sum()
            
            probs = [np.tril(p_matrix, -1).sum(), np.trace(p_matrix), np.triu(p_matrix, 1).sum()]
            epsilon = 1e-15
            p_true = max(epsilon, min(1-epsilon, probs[true_out]))
            logloss_sum += -np.log(p_true)
            
        ll = logloss_sum / len(holdout)
        print(f"Seed {seed} Log Loss: {ll:.4f}")
        logloss_results.append(ll)
        
    avg_ll = np.mean(logloss_results)
    std_ll = np.std(logloss_results)
    print("\n--- STABILITY CONCLUSION ---")
    print(f"Average Log Loss: {avg_ll:.4f}")
    print(f"Standard Deviation: {std_ll:.5f}")
    if std_ll < 0.005:
        print("✅ PASS: The performance gains are highly stable and robust to initializations.")
    else:
        print("❌ FAIL: High variance indicates the model is unstable or overfitting.")

if __name__ == "__main__":
    run_stability_audit()
