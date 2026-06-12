import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.stats import poisson
from sklearn.metrics import log_loss, brier_score_loss
import category_encoders as ce
from sklearn.base import clone

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

def evaluate_predictions(y_true_h, y_true_a, lam_h, lam_a):
    # Probs
    probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h, lam_a)])
    
    # Class labels: 0: HW, 1: D, 2: AW
    y_class = np.array([0 if h > a else 1 if h == a else 2 for h, a in zip(y_true_h, y_true_a)])
    y_onehot = pd.get_dummies(y_class).reindex(columns=[0,1,2], fill_value=0).values
    
    # Log loss & Brier
    ll = log_loss(y_class, probs, labels=[0,1,2])
    bs = np.mean([brier_score_loss(y_onehot[:,c], probs[:,c]) for c in range(3)])
    
    # Accuracy
    pred_class = np.argmax(probs, axis=1)
    winner_acc = np.mean(pred_class == y_class)
    
    # Exact Score
    pred_h_rounded = np.round(lam_h)
    pred_a_rounded = np.round(lam_a)
    exact_acc = np.mean((pred_h_rounded == y_true_h) & (pred_a_rounded == y_true_a))
    
    return ll, bs, winner_acc, exact_acc

def safe_impute(df):
    df = df.copy()
    df['home_elo_pre'] = df['home_elo_pre'].fillna(1500)
    df['away_elo_pre'] = df['away_elo_pre'].fillna(1500)
    df['elo_diff'] = df['elo_diff'].fillna(0)
    for c in df.columns:
        if 'avg' in c or 'rate' in c or 'fifa' in c or 'h2h' in c:
            df[c] = df[c].fillna(0)
    return df

def simulate_tournament(df, encoder, features, train_end_date, tour_start_date, tour_end_date):
    print(f"\n--- Simulating Tournament: {tour_start_date[:4]} ---")
    df['date'] = pd.to_datetime(df['date'])
    
    # 1. Bulk train models prior to tournament
    train_mask = df['date'] < train_end_date
    train_df = df[train_mask].copy()
    train_df = safe_impute(train_df)
    
    cat_cols = ['home_team', 'away_team', 'tournament']
    train_enc = encoder.fit_transform(train_df[cat_cols])
    for c in cat_cols: train_df[c] = train_enc[c]
        
    X_train = train_df[features].astype(float)
    y_train_h = train_df['home_score']
    y_train_a = train_df['away_score']
    
    static_model_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    static_model_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    
    print("Training initial static models...")
    static_model_h.fit(X_train, y_train_h)
    static_model_a.fit(X_train, y_train_a)
    
    # Online models are clones that start fully trained
    online_model_h = clone(static_model_h)
    online_model_a = clone(static_model_a)
    online_model_h.fit(X_train, y_train_h)
    online_model_a.fit(X_train, y_train_a)
    
    # 2. Tournament matches chronologically
    tour_mask = (df['date'] >= tour_start_date) & (df['date'] <= tour_end_date) & (df['tournament'] == 'FIFA World Cup')
    tour_df = df[tour_mask].sort_values('date').copy()
    tour_df = safe_impute(tour_df)
    
    tour_enc = encoder.transform(tour_df[cat_cols])
    for c in cat_cols: tour_df[c] = tour_enc[c]
        
    X_tour = tour_df[features].astype(float)
    y_tour_h = tour_df['home_score'].values
    y_tour_a = tour_df['away_score'].values
    
    print(f"Tournament matches to simulate: {len(X_tour)}")
    
    # Arrays to store predictions
    lam_h_static, lam_a_static = [], []
    lam_h_online, lam_a_online = [], []
    
    for i in range(len(X_tour)):
        X_match = X_tour.iloc[[i]]
        yh = y_tour_h[i]
        ya = y_tour_a[i]
        
        # Predict Static
        lam_h_static.append(static_model_h.predict(X_match)[0])
        lam_a_static.append(static_model_a.predict(X_match)[0])
        
        # Predict Online
        lam_h_online.append(online_model_h.predict(X_match)[0])
        lam_a_online.append(online_model_a.predict(X_match)[0])
        
        # Online Learning Update!
        # XGBoost allows incremental training by passing xgb_model to fit.
        # But for scikit-learn API, you can't just pass xgb_model to fit if it's already fitted normally.
        # Actually, XGBRegressor in sklearn API allows it:
        online_model_h.fit(X_match, [yh], xgb_model=online_model_h.get_booster())
        online_model_a.fit(X_match, [ya], xgb_model=online_model_a.get_booster())
        
    # Evaluate
    print("Evaluating Static Model...")
    s_ll, s_bs, s_wa, s_ea = evaluate_predictions(y_tour_h, y_tour_a, lam_h_static, lam_a_static)
    
    print("Evaluating Online Model...")
    o_ll, o_bs, o_wa, o_ea = evaluate_predictions(y_tour_h, y_tour_a, lam_h_online, lam_a_online)
    
    return {
        'Tournament': tour_start_date[:4],
        'Static_LogLoss': s_ll, 'Online_LogLoss': o_ll,
        'Static_Brier': s_bs, 'Online_Brier': o_bs,
        'Static_WinAcc': s_wa, 'Online_WinAcc': o_wa,
        'Static_ExactAcc': s_ea, 'Online_ExactAcc': o_ea
    }

def main():
    df = pd.read_csv("final_training_dataset.csv")
    features = [c for c in df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    if 'neutral' not in features: features.append('neutral')
    
    encoder = ce.CountEncoder(cols=['home_team', 'away_team', 'tournament'], handle_unknown='value')
    
    results = []
    
    # World Cup 2018 (Train < June 2018)
    res_2018 = simulate_tournament(df, encoder, features, '2018-06-01', '2018-06-14', '2018-07-16')
    results.append(res_2018)
    
    # World Cup 2022 (Train < Nov 2022)
    res_2022 = simulate_tournament(df, encoder, features, '2022-11-01', '2022-11-20', '2022-12-19')
    results.append(res_2022)
    
    print("\n=== FINAL BACKTEST RESULTS ===")
    res_df = pd.DataFrame(results)
    print(res_df.to_string(index=False))
    res_df.to_csv("online_learning_results.csv", index=False)

if __name__ == '__main__':
    main()
