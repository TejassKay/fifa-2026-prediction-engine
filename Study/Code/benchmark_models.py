import pandas as pd
import numpy as np
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostRegressor
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.linear_model import PoissonRegressor
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

def load_data():
    base = "../../Dataset/"
    df_r = pd.read_csv(base + "results.csv")
    df_e = pd.read_csv(base + "eloratings.csv")
    
    df_r["date"] = pd.to_datetime(df_r["date"], format='mixed')
    df_e["elo_date"] = pd.to_datetime(df_e["date"], format='mixed')
    df_e_sorted = df_e.sort_values("elo_date").drop(columns=["date"])
    
    TEAM_NAME_MAP = {"Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "USA": "United States"}
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    # Merge Home Elo
    df = pd.merge_asof(
        df_r.sort_values("date"),
        df_e_sorted.rename(columns={"team": "home_team", "rating": "home_elo", "elo_date": "date"}),
        on="date", by="home_team", direction="backward"
    )
    # Merge Away Elo
    df = pd.merge_asof(
        df,
        df_e_sorted.rename(columns={"team": "away_team", "rating": "away_elo", "elo_date": "date"}),
        on="date", by="away_team", direction="backward"
    )
    
    df.dropna(subset=['home_elo', 'away_elo', 'home_score', 'away_score'], inplace=True)
    
    # Baseline Features
    df['elo_diff'] = df['home_elo'] - df['away_elo']
    df['is_neutral'] = df['neutral'].astype(int)
    
    # Target variables
    df['home_score'] = df['home_score'].astype(int)
    df['away_score'] = df['away_score'].astype(int)
    
    return df

def run_model_benchmark():
    print("Loading Baseline Data...")
    df = load_data()
    
    wc18_mask = (df['date'] >= '2018-06-14') & (df['date'] <= '2018-07-15') & (df['tournament'] == 'FIFA World Cup')
    wc22_mask = (df['date'] >= '2022-11-20') & (df['date'] <= '2022-12-18') & (df['tournament'] == 'FIFA World Cup')
    modern_mask = (df['date'] >= '2023-01-01')
    
    holdout = pd.concat([df[wc18_mask], df[wc22_mask], df[modern_mask]])
    df_train = df[~(wc18_mask | wc22_mask | modern_mask)]
    
    features = ['elo_diff', 'home_elo', 'away_elo', 'is_neutral']
    X_train = df_train[features]
    y_h_train = df_train['home_score']
    y_a_train = df_train['away_score']
    
    X_test = holdout[features]
    
    models = {
        "XGBoost": (
            xgb.XGBRegressor(objective='count:poisson', n_estimators=50, max_depth=3, learning_rate=0.1),
            xgb.XGBRegressor(objective='count:poisson', n_estimators=50, max_depth=3, learning_rate=0.1)
        ),
        "LightGBM": (
            lgb.LGBMRegressor(objective='poisson', n_estimators=50, max_depth=3, learning_rate=0.1, verbose=-1),
            lgb.LGBMRegressor(objective='poisson', n_estimators=50, max_depth=3, learning_rate=0.1, verbose=-1)
        ),
        "CatBoost": (
            CatBoostRegressor(loss_function='Poisson', iterations=50, depth=3, learning_rate=0.1, verbose=0),
            CatBoostRegressor(loss_function='Poisson', iterations=50, depth=3, learning_rate=0.1, verbose=0)
        ),
        "Random Forest": (
            RandomForestRegressor(n_estimators=50, max_depth=5, min_samples_split=10),
            RandomForestRegressor(n_estimators=50, max_depth=5, min_samples_split=10)
        ),
        "Extra Trees": (
            ExtraTreesRegressor(n_estimators=50, max_depth=5, min_samples_split=10),
            ExtraTreesRegressor(n_estimators=50, max_depth=5, min_samples_split=10)
        ),
        "Elastic Net (Poisson)": (
            PoissonRegressor(alpha=0.1, max_iter=300),
            PoissonRegressor(alpha=0.1, max_iter=300)
        )
    }
    
    predictions = {}
    results = []
    
    for name, (mod_h, mod_a) in models.items():
        print(f"Training {name}...")
        mod_h.fit(X_train, y_h_train)
        mod_a.fit(X_train, y_a_train)
        
        lam_h = np.clip(mod_h.predict(X_test), 0.01, 10)
        lam_a = np.clip(mod_a.predict(X_test), 0.01, 10)
        predictions[name] = (lam_h, lam_a)
        
    # Ensemble (Average of XGBoost, LightGBM, CatBoost)
    print("Calculating Ensemble...")
    ens_h = (predictions["XGBoost"][0] + predictions["LightGBM"][0] + predictions["CatBoost"][0]) / 3.0
    ens_a = (predictions["XGBoost"][1] + predictions["LightGBM"][1] + predictions["CatBoost"][1]) / 3.0
    predictions["Ensemble"] = (ens_h, ens_a)
    
    print("Evaluating metrics on Holdout sets...")
    
    for name, (lam_h, lam_a) in predictions.items():
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
            "Model": name,
            "Exact Score Acc": exact_hits / N,
            "Winner Acc": winner_hits / N,
            "Brier Score": brier_sum / N,
            "Log Loss": logloss_sum / N,
            "RPS": rps_sum / N
        })

    df_res = pd.DataFrame(results).sort_values("Log Loss")
    
    if not os.path.exists("../../Study/Result"):
        os.makedirs("../../Study/Result", exist_ok=True)
        
    df_res.to_csv("../../Study/Result/model_benchmark_results.csv", index=False)
    
    print("\n--- PHASE 1: MODEL BENCHMARK RESULTS ---")
    print(df_res.to_string(index=False))

if __name__ == "__main__":
    run_model_benchmark()
