import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.stats import poisson, skellam
from sklearn.metrics import log_loss, brier_score_loss
import category_encoders as ce
import time

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

def load_data():
    df = pd.read_csv("final_training_dataset.csv")
    df['date'] = pd.to_datetime(df['date'])
    
    # Impute
    df['home_elo_pre'] = df['home_elo_pre'].fillna(1500)
    df['away_elo_pre'] = df['away_elo_pre'].fillna(1500)
    df['elo_diff'] = df['elo_diff'].fillna(0)
    for c in df.columns:
        if 'avg' in c or 'rate' in c or 'fifa' in c or 'h2h' in c:
            df[c] = df[c].fillna(0)
            
    # Train / Test split
    train_mask = df['date'] < '2024-01-01'
    test_mask = df['date'] >= '2024-01-01'
    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()
    
    cat_cols = ['home_team', 'away_team', 'tournament']
    encoder = ce.CountEncoder(cols=cat_cols, handle_unknown='value')
    train_enc = encoder.fit_transform(train_df[cat_cols])
    test_enc = encoder.transform(test_df[cat_cols])
    
    for c in cat_cols:
        train_df[c] = train_enc[c]
        test_df[c] = test_enc[c]
        
    features = [c for c in train_df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    if 'neutral' not in features: features.append('neutral')
    
    X_train = train_df[features].astype(float)
    y_train_h = train_df['home_score'].values
    y_train_a = train_df['away_score'].values
    y_train_gd = train_df['goal_diff'].values
    
    X_test = test_df[features].astype(float)
    y_test_h = test_df['home_score'].values
    y_test_a = test_df['away_score'].values
    
    return train_df, test_df, X_train, y_train_h, y_train_a, y_train_gd, X_test, y_test_h, y_test_a, features

def main():
    print("Loading data...")
    train_df, test_df, X_train, y_train_h, y_train_a, y_train_gd, X_test, y_test_h, y_test_a, features = load_data()
    
    results = []
    
    # --- 0. BASELINE ---
    print("Training Baseline...")
    base_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    base_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    base_h.fit(X_train, y_train_h)
    base_a.fit(X_train, y_train_a)
    
    lam_h_test = base_h.predict(X_test)
    lam_a_test = base_a.predict(X_test)
    base_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_test, lam_a_test)])
    
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, base_probs)
    results.append({'Study': 'Baseline', 'Model': 'Current Architecture', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    # --- 1. ENHANCED ELO PROXY ---
    print("Running Enhanced ELO Proxy Study...")
    # Train using ONLY weighted goal diff + ELO to simulate goal-diff weighted ELO
    proxy_features = ['home_elo_pre', 'away_elo_pre', 'elo_diff', 'home_weighted_goal_diff_last_10', 'away_weighted_goal_diff_last_10', 'tournament']
    elo_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    elo_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    elo_h.fit(X_train[proxy_features], y_train_h)
    elo_a.fit(X_train[proxy_features], y_train_a)
    
    lam_h_elo = elo_h.predict(X_test[proxy_features])
    lam_a_elo = elo_a.predict(X_test[proxy_features])
    elo_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_elo, lam_a_elo)])
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, elo_probs)
    results.append({'Study': '1. Enhanced ELO', 'Model': 'Goal-Diff Weighted ELO Proxy', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    # --- 2. ENSEMBLE STUDY ---
    print("Running Ensemble Study...")
    # Pure statistical ELO Probability: P(Win) = 1 / (1 + 10^(-diff/400))
    # We will estimate Draw probability roughly as 25% near 0 diff, tapering off.
    pure_elo_probs = []
    for diff in X_test['elo_diff']:
        p_hw = 1 / (1 + 10**(-diff / 400.0))
        p_aw = 1 - p_hw
        # Make room for draw:
        p_draw = 0.25 * np.exp(-abs(diff) / 300.0)
        p_hw_adj = p_hw * (1 - p_draw)
        p_aw_adj = p_aw * (1 - p_draw)
        pure_elo_probs.append([p_hw_adj, p_draw, p_aw_adj])
    pure_elo_probs = np.array(pure_elo_probs)
    
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, pure_elo_probs)
    results.append({'Study': '2. Ensemble', 'Model': 'Pure ELO Math', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    blended_probs = (base_probs * 0.5) + (pure_elo_probs * 0.5)
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, blended_probs)
    results.append({'Study': '2. Ensemble', 'Model': '50/50 ML + Pure ELO', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    # --- 3. DATA WEIGHTING STUDY ---
    print("Running Data Weighting Study...")
    # Weight by date (exponential decay) and tournament
    from datetime import datetime
    max_date = train_df['date'].max()
    days_diff = (max_date - train_df['date']).dt.days
    recency_weight = np.exp(-days_diff / 1000.0) # Halflife ~ 2 years
    
    tourn_weight = train_df['tournament'].map(lambda x: 3.0 if x == train_df['tournament'].value_counts().index[0] else 1.0) # Give highest count (Friendlies or WC?) actually let's just weight 'FIFA World Cup' 
    # Actually 'tournament' is count encoded. So we do it directly from train_df raw? No we don't have raw here.
    # Let's just use recency weight for now as proxy.
    
    weights = recency_weight.values
    w_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    w_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    w_h.fit(X_train, y_train_h, sample_weight=weights)
    w_a.fit(X_train, y_train_a, sample_weight=weights)
    
    lam_h_w = w_h.predict(X_test)
    lam_a_w = w_a.predict(X_test)
    w_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_w, lam_a_w)])
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, w_probs)
    results.append({'Study': '3. Data Weighting', 'Model': 'Recency Weighted (Decay)', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    # --- 4. ALTERNATIVE TARGET STUDY ---
    print("Running Alternative Target Study...")
    # Predict Goal Diff directly using reg:squarederror
    gd_model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    gd_model.fit(X_train, y_train_gd)
    pred_gd = gd_model.predict(X_test)
    
    # Map predicted GD to win probs using Skellam
    # If lambda_H - lambda_A = predicted_gd. We assume lam_H + lam_A = 2.5 (avg goals)
    alt_probs = []
    for pgd in pred_gd:
        lam_h = (2.5 + pgd) / 2
        lam_a = (2.5 - pgd) / 2
        lam_h = max(lam_h, 0.01)
        lam_a = max(lam_a, 0.01)
        
        hw, d, aw = 0.0, 0.0, 0.0
        for h in range(10):
            for a in range(10):
                p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
                if h > a: hw += p
                elif h == a: d += p
                else: aw += p
        tot = hw + d + aw
        alt_probs.append([hw/tot, d/tot, aw/tot])
    alt_probs = np.array(alt_probs)
    
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, alt_probs)
    results.append({'Study': '4. Alt Target', 'Model': 'Predict Goal Diff Directly', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    # --- OUTPUT ---
    res_df = pd.DataFrame(results)
    print("\n=== EXPERIMENTAL RESULTS ===")
    print(res_df.to_string(index=False))
    res_df.to_csv("research_studies_results.csv", index=False)

if __name__ == '__main__':
    main()
