import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.stats import poisson
from sklearn.metrics import log_loss, brier_score_loss
import category_encoders as ce
import optuna
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
            
    # Need the raw tournament column before encoding
    raw_tournaments = df['tournament'].copy()
            
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
    
    X_test = test_df[features].astype(float)
    y_test_h = test_df['home_score'].values
    y_test_a = test_df['away_score'].values
    
    return train_df, test_df, raw_tournaments, X_train, y_train_h, y_train_a, X_test, y_test_h, y_test_a, features

def main():
    print("Loading data...")
    train_df, test_df, raw_tournaments, X_train, y_train_h, y_train_a, X_test, y_test_h, y_test_a, features = load_data()
    
    results = []
    
    # Generate Baseline Weights (Recency Only)
    max_date = train_df['date'].max()
    days_diff = (max_date - train_df['date']).dt.days
    recency_weights = np.exp(-days_diff / 1000.0)
    
    # 0. Recency Weighted Baseline
    print("Training Recency Weighted Baseline...")
    base_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    base_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    base_h.fit(X_train, y_train_h, sample_weight=recency_weights)
    base_a.fit(X_train, y_train_a, sample_weight=recency_weights)
    
    lam_h_test = base_h.predict(X_test)
    lam_a_test = base_a.predict(X_test)
    base_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_test, lam_a_test)])
    
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, base_probs)
    results.append({'Study': 'Baseline', 'Model': 'Recency Only (0.8513)', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    # Generate Tournament Weights
    tourn_map = {
        'FIFA World Cup': 5.0,
        'FIFA World Cup qualification': 3.0,
        'UEFA Euro': 3.0,
        'Copa América': 3.0,
        'African Cup of Nations': 3.0,
        'AFC Asian Cup': 3.0,
        'UEFA Nations League': 2.0,
        'CONCACAF Nations League': 2.0,
        'Friendly': 0.5
    }
    
    t_weights_raw = raw_tournaments[train_df.index].map(lambda x: tourn_map.get(x, 1.0))
    combined_weights = recency_weights * t_weights_raw
    
    # 1. Tournament + Recency Weighting
    print("Training Tournament + Recency Weighted Model...")
    t_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    t_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    t_h.fit(X_train, y_train_h, sample_weight=combined_weights)
    t_a.fit(X_train, y_train_a, sample_weight=combined_weights)
    
    lam_h_t = t_h.predict(X_test)
    lam_a_t = t_a.predict(X_test)
    t_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_t, lam_a_t)])
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, t_probs)
    results.append({'Study': '1. Tournament Weighting', 'Model': 'Recency + Tournament Multipliers', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    # 2. Optuna Hyperparameter Optimization
    print("Running Optuna Optimization (50 Trials)...")
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    
    def objective(trial):
        params = {
            'objective': 'count:poisson',
            'n_estimators': trial.suggest_int('n_estimators', 100, 300),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2),
            'max_depth': trial.suggest_int('max_depth', 3, 8),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
            'random_state': 42,
            'n_jobs': -1
        }
        
        # Split train into train/val
        split_idx = int(len(X_train) * 0.8)
        X_tr, y_tr_h, y_tr_a, w_tr = X_train.iloc[:split_idx], y_train_h[:split_idx], y_train_a[:split_idx], recency_weights.iloc[:split_idx]
        X_v, y_v_h, y_v_a = X_train.iloc[split_idx:], y_train_h[split_idx:], y_train_a[split_idx:]
        
        m_h = xgb.XGBRegressor(**params)
        m_a = xgb.XGBRegressor(**params)
        m_h.fit(X_tr, y_tr_h, sample_weight=w_tr)
        m_a.fit(X_tr, y_tr_a, sample_weight=w_tr)
        
        lam_h_v = m_h.predict(X_v)
        lam_a_v = m_a.predict(X_v)
        probs_v = np.array([get_match_probs(h, a) for h, a in zip(lam_h_v, lam_a_v)])
        
        ll_v, _, _ = evaluate_probs(y_v_h, y_v_a, probs_v)
        return ll_v
        
    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=50)
    
    best_params = study.best_params
    print(f"Optuna Best Params: {best_params}")
    
    best_params['objective'] = 'count:poisson'
    best_params['random_state'] = 42
    best_params['n_jobs'] = -1
    
    opt_h = xgb.XGBRegressor(**best_params)
    opt_a = xgb.XGBRegressor(**best_params)
    opt_h.fit(X_train, y_train_h, sample_weight=recency_weights)
    opt_a.fit(X_train, y_train_a, sample_weight=recency_weights)
    
    lam_h_opt = opt_h.predict(X_test)
    lam_a_opt = opt_a.predict(X_test)
    opt_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_opt, lam_a_opt)])
    ll, bs, wa = evaluate_probs(y_test_h, y_test_a, opt_probs)
    results.append({'Study': '2. Optuna Tuning', 'Model': 'Bayesian Hyperparams (Recency)', 'Log Loss': ll, 'Brier Score': bs, 'Winner Acc': wa})
    
    res_df = pd.DataFrame(results)
    print("\n=== ADVANCED STUDIES RESULTS ===")
    print(res_df.to_string(index=False))
    res_df.to_csv("optuna_studies_results.csv", index=False)

if __name__ == '__main__':
    main()
