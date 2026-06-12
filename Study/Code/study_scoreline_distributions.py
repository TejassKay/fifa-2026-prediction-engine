import pandas as pd
import numpy as np
import xgboost as xgb
from scipy.stats import poisson
from sklearn.metrics import log_loss, brier_score_loss
import category_encoders as ce
import warnings
warnings.filterwarnings('ignore')

def rps_score(probs, true_class):
    # Ranked Probability Score for 3 outcomes (Home, Draw, Away)
    # Cumulative sum of probabilities
    cum_probs = np.cumsum(probs, axis=1)
    
    y_onehot = pd.get_dummies(true_class).reindex(columns=[0,1,2], fill_value=0).values
    cum_true = np.cumsum(y_onehot, axis=1)
    
    rps = np.mean(np.sum((cum_probs - cum_true)**2, axis=1)) / (3 - 1)
    return rps

def get_indep_probs(lam_h, lam_a):
    mat = np.zeros((10, 10))
    for h in range(10):
        for a in range(10):
            mat[h, a] = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
    return mat / np.sum(mat)

def get_dc_probs(lam_h, lam_a, rho=-0.13):
    mat = np.zeros((10, 10))
    for h in range(10):
        for a in range(10):
            p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
            adj = 1.0
            if h == 0 and a == 0:
                adj = 1 - (lam_h * lam_a * rho)
            elif h == 0 and a == 1:
                adj = 1 + (lam_h * rho)
            elif h == 1 and a == 0:
                adj = 1 + (lam_a * rho)
            elif h == 1 and a == 1:
                adj = 1 - rho
            
            adj = max(0.001, adj)
            mat[h, a] = p * adj
    return mat / np.sum(mat)

import math

def get_bp_probs(lam_h, lam_a, lam_3=0.15):
    mat = np.zeros((10, 10))
    lam_h_adj = max(0.001, lam_h - lam_3)
    lam_a_adj = max(0.001, lam_a - lam_3)
    
    for h in range(10):
        for a in range(10):
            p_val = 0
            for i in range(min(h, a) + 1):
                part1 = np.exp(-lam_3) * (lam_3**i) / math.factorial(i)
                part2 = poisson.pmf(h-i, lam_h_adj)
                part3 = poisson.pmf(a-i, lam_a_adj)
                p_val += part1 * part2 * part3
            mat[h, a] = p_val
    return mat / np.sum(mat)

def get_zip_probs(lam_h, lam_a, pi=0.06):
    mat = np.zeros((10, 10))
    for h in range(10):
        for a in range(10):
            p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
            if h == 0 and a == 0:
                mat[h, a] = pi + (1-pi)*p
            else:
                mat[h, a] = (1-pi)*p
    return mat / np.sum(mat)

def evaluate_distribution(dist_func, lam_h_arr, lam_a_arr, y_true_h, y_true_a, kwargs={}):
    probs_3way = []
    exact_acc_list = []
    acc_0_0 = []
    acc_1_0 = []
    acc_1_1 = []
    
    for lh, la, yh, ya in zip(lam_h_arr, lam_a_arr, y_true_h, y_true_a):
        mat = dist_func(lh, la, **kwargs)
        
        hw = np.sum(np.tril(mat, -1))
        d = np.sum(np.diag(mat))
        aw = np.sum(np.triu(mat, 1))
        probs_3way.append([hw, d, aw])
        
        # Exact scoreline
        pred_h, pred_a = np.unravel_index(np.argmax(mat), mat.shape)
        exact_acc_list.append((pred_h == yh) and (pred_a == ya))
        
        # Specific scoreline accuracies
        if yh == 0 and ya == 0: acc_0_0.append((pred_h == 0) and (pred_a == 0))
        elif yh == 1 and ya == 0: acc_1_0.append((pred_h == 1) and (pred_a == 0))
        elif yh == 1 and ya == 1: acc_1_1.append((pred_h == 1) and (pred_a == 1))
            
    probs_3way = np.array(probs_3way)
    y_class = np.array([0 if h > a else 1 if h == a else 2 for h, a in zip(y_true_h, y_true_a)])
    
    ll = log_loss(y_class, probs_3way, labels=[0,1,2])
    rps = rps_score(probs_3way, y_class)
    
    y_onehot = pd.get_dummies(y_class).reindex(columns=[0,1,2], fill_value=0).values
    bs = np.mean([brier_score_loss(y_onehot[:,c], probs_3way[:,c]) for c in range(3)])
    
    pred_class = np.argmax(probs_3way, axis=1)
    wa = np.mean(pred_class == y_class)
    exact_acc = np.mean(exact_acc_list)
    
    a00 = np.mean(acc_0_0) if acc_0_0 else 0
    a10 = np.mean(acc_1_0) if acc_1_0 else 0
    a11 = np.mean(acc_1_1) if acc_1_1 else 0
    
    return exact_acc, rps, ll, wa, bs, a00, a10, a11

def safe_impute(df):
    df = df.copy()
    df['home_elo_pre'] = df['home_elo_pre'].fillna(1500)
    df['away_elo_pre'] = df['away_elo_pre'].fillna(1500)
    df['elo_diff'] = df['elo_diff'].fillna(0)
    for c in df.columns:
        if 'avg' in c or 'rate' in c or 'fifa' in c or 'h2h' in c:
            df[c] = df[c].fillna(0)
    return df

def run_study(name, df, encoder, features, train_mask, test_mask):
    print(f"\n--- Running Study on: {name} ---")
    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()
    
    cat_cols = ['home_team', 'away_team', 'tournament']
    train_enc = encoder.fit_transform(train_df[cat_cols])
    test_enc = encoder.transform(test_df[cat_cols])
    for c in cat_cols: 
        train_df[c] = train_enc[c]
        test_df[c] = test_enc[c]
        
    X_train = train_df[features].astype(float)
    y_train_h = train_df['home_score']
    y_train_a = train_df['away_score']
    
    X_test = test_df[features].astype(float)
    y_test_h = test_df['home_score'].values
    y_test_a = test_df['away_score'].values
    
    # Baseline Current Prod Architecture
    m_h = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    m_a = xgb.XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
    m_h.fit(X_train, y_train_h)
    m_a.fit(X_train, y_train_a)
    
    lam_h = m_h.predict(X_test)
    lam_a = m_a.predict(X_test)
    
    # 1. Independent Poisson
    print("Evaluating Independent Poisson...")
    e_indep = evaluate_distribution(get_indep_probs, lam_h, lam_a, y_test_h, y_test_a)
    
    # 2. Dixon-Coles
    print("Evaluating Dixon-Coles...")
    e_dc = evaluate_distribution(get_dc_probs, lam_h, lam_a, y_test_h, y_test_a, {'rho': -0.13})
    
    # 3. Bivariate Poisson
    print("Evaluating Bivariate Poisson...")
    e_bp = evaluate_distribution(get_bp_probs, lam_h, lam_a, y_test_h, y_test_a, {'lam_3': 0.15})
    
    # 4. ZIP
    print("Evaluating ZIP...")
    e_zip = evaluate_distribution(get_zip_probs, lam_h, lam_a, y_test_h, y_test_a, {'pi': 0.05})
    
    def format_res(name, evals):
        return {
            'Dataset': name,
            'Exact Acc': evals[0], 'RPS': evals[1], 'Log Loss': evals[2], 
            'Win Acc': evals[3], 'Brier': evals[4], 
            '0-0 Acc': evals[5], '1-0 Acc': evals[6], '1-1 Acc': evals[7]
        }
        
    return [
        {'Model': 'Independent Poisson', **format_res(name, e_indep)},
        {'Model': 'Dixon-Coles', **format_res(name, e_dc)},
        {'Model': 'Bivariate Poisson', **format_res(name, e_bp)},
        {'Model': 'Zero-Inflated Poisson', **format_res(name, e_zip)}
    ]

def main():
    df = pd.read_csv("final_training_dataset.csv")
    df['date'] = pd.to_datetime(df['date'])
    df = safe_impute(df)
    
    features = [c for c in df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    if 'neutral' not in features: features.append('neutral')
    encoder = ce.CountEncoder(cols=['home_team', 'away_team', 'tournament'], handle_unknown='value')
    
    results = []
    
    # World Cup 2018 (Train < June 2018, Test WC 2018)
    tr_18 = df['date'] < '2018-06-01'
    te_18 = (df['date'] >= '2018-06-14') & (df['date'] <= '2018-07-16') & (df['tournament'] == 'FIFA World Cup')
    results.extend(run_study('World Cup 2018', df, encoder, features, tr_18, te_18))
    
    # World Cup 2022 (Train < Nov 2022, Test WC 2022)
    tr_22 = df['date'] < '2022-11-01'
    te_22 = (df['date'] >= '2022-11-20') & (df['date'] <= '2022-12-19') & (df['tournament'] == 'FIFA World Cup')
    results.extend(run_study('World Cup 2022', df, encoder, features, tr_22, te_22))
    
    # Modern Holdout (Train < 2024, Test 2024+)
    tr_mod = df['date'] < '2024-01-01'
    te_mod = df['date'] >= '2024-01-01'
    results.extend(run_study('Modern Holdout 2024+', df, encoder, features, tr_mod, te_mod))
    
    print("\n=== FINAL SCORELINE STUDY RESULTS ===")
    res_df = pd.DataFrame(results)
    # Group by model and aggregate mean
    agg_df = res_df.groupby('Model').mean(numeric_only=True).reset_index()
    print("--- MEAN ACROSS ALL DATASETS ---")
    print(agg_df.to_string(index=False))
    
    res_df.to_csv("scoreline_study_results.csv", index=False)

if __name__ == '__main__':
    main()
