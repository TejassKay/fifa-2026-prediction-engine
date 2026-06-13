import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.stats import poisson

def rps(pred_probs, true_outcome_idx):
    obs = np.zeros(3)
    obs[true_outcome_idx] = 1.0
    cum_pred = np.cumsum(pred_probs)
    cum_obs = np.cumsum(obs)
    return np.sum((cum_pred - cum_obs)**2) / 2.0

def evaluate_models():
    base = "../../Dataset/"
    df_r = pd.read_csv(base + "results.csv")
    df_e = pd.read_csv(base + "true_att_def_eloratings.csv")
    
    df_r["date"] = pd.to_datetime(df_r["date"], format='mixed')
    df_e["elo_date"] = pd.to_datetime(df_e["date"], format='mixed')
    df_e = df_e.sort_values("elo_date").drop(columns=["date"])
    
    TEAM_NAME_MAP = {"Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "USA": "United States"}
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    # Merge Home True Elo
    df = pd.merge_asof(
        df_r.sort_values("date"),
        df_e.rename(columns={"team": "home_team", "att_rating": "home_att_elo", "def_rating": "home_def_elo", "elo_date": "date"}),
        on="date", by="home_team", direction="backward"
    )
    
    # Merge Away True Elo
    df = pd.merge_asof(
        df,
        df_e.rename(columns={"team": "away_team", "att_rating": "away_att_elo", "def_rating": "away_def_elo", "elo_date": "date"}),
        on="date", by="away_team", direction="backward"
    )
    
    df.dropna(subset=['home_att_elo', 'away_att_elo', 'home_score', 'away_score'], inplace=True)
    
    # Feature Engineering (Production identical)
    df['att_def_diff_home'] = df['home_att_elo'] - df['away_def_elo']
    df['att_def_diff_away'] = df['away_att_elo'] - df['home_def_elo']
    df['is_neutral'] = df['neutral'].astype(int)
    
    # Target variables
    df['home_score'] = df['home_score'].astype(int)
    df['away_score'] = df['away_score'].astype(int)
    
    # Create Holdouts
    wc18_mask = (df['date'] >= '2018-06-14') & (df['date'] <= '2018-07-15') & (df['tournament'] == 'FIFA World Cup')
    wc22_mask = (df['date'] >= '2022-11-20') & (df['date'] <= '2022-12-18') & (df['tournament'] == 'FIFA World Cup')
    modern_mask = (df['date'] >= '2023-01-01')
    
    df_wc18 = df[wc18_mask]
    df_wc22 = df[wc22_mask]
    df_modern = df[modern_mask]
    
    train_mask = ~(wc18_mask | wc22_mask | modern_mask)
    df_train = df[train_mask]
    
    features = ['att_def_diff_home', 'att_def_diff_away', 'is_neutral']
    
    print("Training True Attack/Defense ELO Models...")
    X_train = df_train[features]
    y_h_train = df_train['home_score']
    y_a_train = df_train['away_score']
    
    xgb_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=100, max_depth=4, learning_rate=0.05)
    xgb_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=100, max_depth=4, learning_rate=0.05)
    
    xgb_h.fit(X_train, y_h_train)
    xgb_a.fit(X_train, y_a_train)
    
    holdout = pd.concat([df_wc18, df_wc22, df_modern])
    X_test = holdout[features]
    lam_h = xgb_h.predict(X_test)
    lam_a = xgb_a.predict(X_test)
    
    exact_hits = 0
    brier_sum = 0
    rps_sum = 0
    logloss_sum = 0
    winner_hits = 0
    
    print("Evaluating Validation Metrics on Holdouts...")
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
    
    # Save the true models for production promotion
    joblib = __import__('joblib')
    joblib.dump(xgb_h, "true_att_def_model_home.joblib")
    joblib.dump(xgb_a, "true_att_def_model_away.joblib")
    
    print("\n--- TRUE ATTACK/DEFENSE ELO VALIDATION RESULTS ---")
    print(f"Exact Score Acc: {exact_hits / N:.4f}")
    print(f"Winner Acc:      {winner_hits / N:.4f}")
    print(f"Brier Score:     {brier_sum / N:.4f}")
    print(f"Log Loss:        {logloss_sum / N:.4f}")
    print(f"RPS:             {rps_sum / N:.4f}")
    
    # Mock Baseline for comparison in output since we already proved it in script 1
    print("\n--- COMPARISON TO BASELINE ---")
    print("Baseline Exact Acc: 0.1453 | True Att/Def Exact Acc:", f"{exact_hits / N:.4f}")
    print("Baseline Log Loss:  0.8648 | True Att/Def Log Loss:", f"{logloss_sum / N:.4f}")

if __name__ == "__main__":
    evaluate_models()
