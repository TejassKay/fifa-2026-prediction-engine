import pandas as pd
import numpy as np
import joblib
from scipy.stats import poisson
from sklearn.metrics import log_loss, brier_score_loss
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
import xgboost as xgb
import category_encoders as ce

def load_and_split_data(filepath="final_training_dataset.csv"):
    df = pd.read_csv(filepath)
    df['date'] = pd.to_datetime(df['date'])
    train_mask = df['date'] < '2021-01-01'
    val_mask = (df['date'] >= '2021-01-01') & (df['date'] < '2024-01-01')
    test_mask = df['date'] >= '2024-01-01'
    return df[train_mask].copy(), df[val_mask].copy(), df[test_mask].copy(), df

def preprocess_features(train_df, val_df, test_df):
    for df_ in [train_df, val_df, test_df]:
        df_['home_elo_pre'] = df_['home_elo_pre'].fillna(1500)
        df_['away_elo_pre'] = df_['away_elo_pre'].fillna(1500)
        df_['elo_diff'] = df_['elo_diff'].fillna(0)
        for c in df_.columns:
            if 'avg' in c or 'rate' in c or 'fifa' in c or 'h2h' in c:
                df_[c] = df_[c].fillna(0)
                
    cat_cols = ['home_team', 'away_team', 'tournament']
    encoder = ce.CountEncoder(cols=cat_cols, handle_unknown='value')
    train_enc = encoder.fit_transform(train_df[cat_cols])
    val_enc = encoder.transform(val_df[cat_cols])
    test_enc = encoder.transform(test_df[cat_cols])
    
    for c in cat_cols:
        train_df[c] = train_enc[c]
        val_df[c] = val_enc[c]
        test_df[c] = test_enc[c]
        
    features = [c for c in train_df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    features.append('neutral')
    
    return train_df[features].astype(float), train_df['home_score'], train_df['away_score'], \
           val_df[features].astype(float), val_df['home_score'], val_df['away_score'], \
           test_df[features].astype(float), test_df['home_score'], test_df['away_score'], test_df, features

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

def main():
    print("Loading data...")
    train_df, val_df, test_df, df = load_and_split_data()
    X_train, y_train_h, y_train_a, X_val, y_val_h, y_val_a, X_test, y_test_h, y_test_a, eval_test, features = preprocess_features(train_df, val_df, test_df)
    
    print("Loading models...")
    model_h = joblib.load("tuned_best_model_home.joblib")
    model_a = joblib.load("tuned_best_model_away.joblib")
    
    # We will use X_val to fit the calibrators and evaluate on X_test to avoid overfitting the calibrators
    print("Predicting baseline...")
    lam_h_val = model_h.predict(X_val)
    lam_a_val = model_a.predict(X_val)
    lam_h_test = model_h.predict(X_test)
    lam_a_test = model_a.predict(X_test)
    
    # Calculate Probabilities
    val_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_val, lam_a_val)])
    test_probs = np.array([get_match_probs(h, a) for h, a in zip(lam_h_test, lam_a_test)])
    
    # True labels (0: HW, 1: D, 2: AW)
    def get_class(h_goals, a_goals):
        if h_goals > a_goals: return 0
        elif h_goals == a_goals: return 1
        else: return 2
        
    y_val_class = np.array([get_class(h, a) for h, a in zip(y_val_h, y_val_a)])
    y_test_class = np.array([get_class(h, a) for h, a in zip(y_test_h, y_test_a)])
    
    results = []
    
    # 1. Baseline
    ll_base = log_loss(y_test_class, test_probs)
    # Brier score requires one-hot
    y_test_onehot = pd.get_dummies(y_test_class).values
    bs_base = np.mean([brier_score_loss(y_test_onehot[:,c], test_probs[:,c]) for c in range(3)])
    
    results.append({
        'Method': 'Baseline (Poisson)',
        'Log Loss': ll_base,
        'Brier Score': bs_base
    })
    
    # 2. Platt Scaling (Logistic Regression)
    # Fit LogReg on val_probs, predict on test_probs
    lr = LogisticRegression()
    lr.fit(val_probs, y_val_class)
    test_probs_platt = lr.predict_proba(test_probs)
    
    ll_platt = log_loss(y_test_class, test_probs_platt)
    bs_platt = np.mean([brier_score_loss(y_test_onehot[:,c], test_probs_platt[:,c]) for c in range(3)])
    
    results.append({
        'Method': 'Platt Scaling',
        'Log Loss': ll_platt,
        'Brier Score': bs_platt
    })
    
    # 3. Isotonic Regression (One-vs-Rest)
    test_probs_iso = np.zeros_like(test_probs)
    y_val_onehot = pd.get_dummies(y_val_class).values
    
    for c in range(3):
        iso = IsotonicRegression(out_of_bounds='clip')
        iso.fit(val_probs[:, c], y_val_onehot[:, c])
        test_probs_iso[:, c] = iso.transform(test_probs[:, c])
        
    # Normalize Isotonic outputs to sum to 1
    test_probs_iso = test_probs_iso / test_probs_iso.sum(axis=1, keepdims=True)
    
    ll_iso = log_loss(y_test_class, test_probs_iso)
    bs_iso = np.mean([brier_score_loss(y_test_onehot[:,c], test_probs_iso[:,c]) for c in range(3)])
    
    results.append({
        'Method': 'Isotonic Regression',
        'Log Loss': ll_iso,
        'Brier Score': bs_iso
    })
    
    # 4. Temperature Scaling (approximated on probabilities by treating log(p) as logits)
    # T learned via simple optimization
    from scipy.optimize import minimize
    
    def temp_loss(T):
        logits = np.log(val_probs + 1e-10) / T
        exp_logits = np.exp(logits)
        probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
        return log_loss(y_val_class, probs)
        
    res = minimize(temp_loss, x0=[1.0], bounds=[(0.1, 10.0)])
    T_opt = res.x[0]
    
    test_logits = np.log(test_probs + 1e-10) / T_opt
    exp_logits = np.exp(test_logits)
    test_probs_temp = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
    
    ll_temp = log_loss(y_test_class, test_probs_temp)
    bs_temp = np.mean([brier_score_loss(y_test_onehot[:,c], test_probs_temp[:,c]) for c in range(3)])
    
    results.append({
        'Method': f'Temperature Scaling (T={T_opt:.2f})',
        'Log Loss': ll_temp,
        'Brier Score': bs_temp
    })
    
    results_df = pd.DataFrame(results)
    print("\n=== CALIBRATION RESULTS ===")
    print(results_df.to_string(index=False))
    results_df.to_csv("calibration_results.csv", index=False)
    
if __name__ == "__main__":
    main()
