import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.stats import poisson
from sklearn.metrics import log_loss, brier_score_loss
import category_encoders as ce
import warnings
warnings.filterwarnings('ignore')

def get_match_probs(lam_h, lam_a):
    lam_h = max(lam_h, 0.001)
    lam_a = max(lam_a, 0.001)
    hw, d, aw = 0.0, 0.0, 0.0
    for h in range(10):
        for a in range(10):
            p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
            if h > a: hw += p
            elif h == a: d += p
            else: aw += p
    total = hw + d + aw
    return hw/total, d/total, aw/total

def evaluate_probs(y_true_h, y_true_a, probs):
    y_class = np.array([0 if h > a else 1 if h == a else 2 for h, a in zip(y_true_h, y_true_a)])
    y_onehot = pd.get_dummies(y_class).reindex(columns=[0,1,2], fill_value=0).values
    ll = log_loss(y_class, probs, labels=[0,1,2])
    bs = np.mean([brier_score_loss(y_onehot[:,c], probs[:,c]) for c in range(3)])
    pred_class = np.argmax(probs, axis=1)
    winner_acc = np.mean(pred_class == y_class)
    return ll, bs, winner_acc

def safe_impute(df):
    df = df.copy()
    df['home_elo_pre'] = df['home_elo_pre'].fillna(1500)
    df['away_elo_pre'] = df['away_elo_pre'].fillna(1500)
    df['elo_diff'] = df['elo_diff'].fillna(0)
    for c in df.columns:
        if 'avg' in c or 'rate' in c or 'fifa' in c or 'h2h' in c:
            df[c] = df[c].fillna(0)
    return df

def simulate_tournament(df, encoder, features, train_end_date, tour_start_date, tour_end_date, champion, optuna_params):
    print(f"\n--- Simulating Tournament: {tour_start_date[:4]} ---")
    
    # 1. Train models prior to tournament
    train_mask = df['date'] < train_end_date
    train_df = df[train_mask].copy()
    train_df = safe_impute(train_df)
    
    cat_cols = ['home_team', 'away_team', 'tournament']
    train_enc = encoder.fit_transform(train_df[cat_cols])
    for c in cat_cols: train_df[c] = train_enc[c]
        
    X_train = train_df[features].astype(float)
    y_train_h = train_df['home_score']
    y_train_a = train_df['away_score']
    
    # Baseline
    base_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    base_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    base_h.fit(X_train, y_train_h)
    base_a.fit(X_train, y_train_a)
    
    # Gold Standard (Optuna + Recency)
    max_date = train_df['date'].max()
    days_diff = (max_date - train_df['date']).dt.days
    recency_weights = np.exp(-days_diff / 1000.0)
    
    gold_h = xgb.XGBRegressor(**optuna_params)
    gold_a = xgb.XGBRegressor(**optuna_params)
    gold_h.fit(X_train, y_train_h, sample_weight=recency_weights)
    gold_a.fit(X_train, y_train_a, sample_weight=recency_weights)
    
    # 2. Predict tournament matches
    tour_mask = (df['date'] >= tour_start_date) & (df['date'] <= tour_end_date) & (df['tournament'] == 'FIFA World Cup')
    tour_df = df[tour_mask].sort_values('date').copy()
    tour_df = safe_impute(tour_df)
    
    tour_enc = encoder.transform(tour_df[cat_cols])
    for c in cat_cols: tour_df[c] = tour_enc[c]
        
    X_tour = tour_df[features].astype(float)
    y_tour_h = tour_df['home_score'].values
    y_tour_a = tour_df['away_score'].values
    
    print(f"Tournament matches to simulate: {len(X_tour)}")
    
    # Baseline Eval
    lam_h_base = base_h.predict(X_tour)
    lam_a_base = base_a.predict(X_tour)
    base_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_base, lam_a_base)])
    b_ll, b_bs, b_wa = evaluate_probs(y_tour_h, y_tour_a, base_probs)
    
    # Gold Eval
    lam_h_gold = gold_h.predict(X_tour)
    lam_a_gold = gold_a.predict(X_tour)
    gold_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_gold, lam_a_gold)])
    g_ll, g_bs, g_wa = evaluate_probs(y_tour_h, y_tour_a, gold_probs)
    
    # Proxy Champion Quality
    # Find the final match and get the probability of the champion winning
    final_match_idx = len(tour_df) - 1
    final_row = tour_df.iloc[final_match_idx]
    base_prob_final = base_probs[final_match_idx]
    gold_prob_final = gold_probs[final_match_idx]
    
    champ_prob_base = 0.0
    champ_prob_gold = 0.0
    # Inverse map to get raw names
    # Wait, we count encoded the names. So we use the original row for names:
    h_team_encoded = final_row['home_team']
    # Actually we can just check if the team is home or away from original df
    original_tour_df = df[tour_mask].sort_values('date').copy()
    orig_final = original_tour_df.iloc[final_match_idx]
    
    if orig_final['home_team'] == champion:
        champ_prob_base = base_prob_final[0] # HW
        champ_prob_gold = gold_prob_final[0]
    elif orig_final['away_team'] == champion:
        champ_prob_base = base_prob_final[2] # AW
        champ_prob_gold = gold_prob_final[2]
        
    return {
        'Tournament': tour_start_date[:4],
        'Base LogLoss': b_ll, 'Gold LogLoss': g_ll,
        'Base Brier': b_bs, 'Gold Brier': g_bs,
        'Base WinAcc': b_wa, 'Gold WinAcc': g_wa,
        'Base ChampProb': champ_prob_base, 'Gold ChampProb': champ_prob_gold
    }

def main():
    df = pd.read_csv("final_training_dataset.csv")
    df['date'] = pd.to_datetime(df['date'])
    features = [c for c in df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    if 'neutral' not in features: features.append('neutral')
    
    encoder = ce.CountEncoder(cols=['home_team', 'away_team', 'tournament'], handle_unknown='value')
    
    optuna_params = {
        'objective': 'count:poisson',
        'n_estimators': 175,
        'learning_rate': 0.03854,
        'max_depth': 8,
        'min_child_weight': 4,
        'subsample': 0.718,
        'colsample_bytree': 0.665,
        'random_state': 42,
        'n_jobs': -1
    }
    
    results = []
    
    # World Cup 2018 (Train < June 2018, France wins)
    res_2018 = simulate_tournament(df, encoder, features, '2018-06-01', '2018-06-14', '2018-07-16', 'France', optuna_params)
    results.append(res_2018)
    
    # World Cup 2022 (Train < Nov 2022, Argentina wins)
    res_2022 = simulate_tournament(df, encoder, features, '2022-11-01', '2022-11-20', '2022-12-19', 'Argentina', optuna_params)
    results.append(res_2022)
    
    print("\n=== FINAL VALIDATION RESULTS ===")
    res_df = pd.DataFrame(results)
    print(res_df.to_string(index=False))
    res_df.to_csv("final_validation_results.csv", index=False)

if __name__ == '__main__':
    main()
