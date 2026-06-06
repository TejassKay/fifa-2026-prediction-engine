import pandas as pd
import numpy as np
import time
from scipy.stats import poisson
from xgboost import XGBRegressor
from sklearn.metrics import accuracy_score, log_loss, brier_score_loss
import category_encoders as ce

def load_data(filepath="final_training_dataset.csv"):
    df = pd.read_csv(filepath)
    df['date'] = pd.to_datetime(df['date'])
    
    # Chronological Split
    train_mask = df['date'] < '2024-01-01'
    test_mask = df['date'] >= '2024-01-01'
    
    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()
    
    return train_df, test_df

def handle_missing_values(df):
    df = df.copy()
    df['home_elo_pre'] = df['home_elo_pre'].fillna(1500)
    df['away_elo_pre'] = df['away_elo_pre'].fillna(1500)
    df['elo_diff'] = df['elo_diff'].fillna(0)
    df['home_fifa_rank'] = df['home_fifa_rank'].fillna(200)
    df['away_fifa_rank'] = df['away_fifa_rank'].fillna(200)
    df['rank_diff'] = df['rank_diff'].fillna(0)
    df['home_fifa_points'] = df['home_fifa_points'].fillna(0)
    df['away_fifa_points'] = df['away_fifa_points'].fillna(0)
    df['h2h_matches_played'] = df['h2h_matches_played'].fillna(0)
    df['h2h_home_win_rate'] = df['h2h_home_win_rate'].fillna(0)
    df['h2h_avg_goals_home'] = df['h2h_avg_goals_home'].fillna(0)
    df['h2h_avg_goals_away'] = df['h2h_avg_goals_away'].fillna(0)
    form_cols = [c for c in df.columns if 'avg' in c or 'rate' in c]
    for c in form_cols:
        if c in df.columns:
            df[c] = df[c].fillna(0)
    return df

def get_base_features(train_df):
    cat_cols = ['home_team', 'away_team', 'tournament']
    encoder = ce.CountEncoder(cols=cat_cols, handle_unknown='value')
    train_enc = encoder.fit_transform(train_df[cat_cols])
    
    base_features = [c for c in train_df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    base_features.append('neutral')
    return base_features, encoder

def filter_features(features, condition):
    if condition == 'A_Full':
        return features
    elif condition == 'B_No_H2H':
        return [f for f in features if not f.startswith('h2h_')]
    elif condition == 'C_No_FIFA':
        return [f for f in features if 'fifa' not in f and f != 'rank_diff']
    elif condition == 'D_No_Shootouts':
        return [f for f in features if 'shootout' not in f]
    elif condition == 'E_No_Form':
        # Form features are typically those containing 'avg' or 'win_rate' EXCEPT h2h and shootout (which have their own ablations, but let's exclude all form)
        return [f for f in features if not (('avg' in f or 'rate' in f) and 'h2h' not in f and 'shootout' not in f)]
    elif condition == 'F_ELO_Only':
        return ['home_elo_pre', 'away_elo_pre', 'elo_diff', 'home_team', 'away_team', 'tournament', 'neutral']
    return features

def evaluate_probabilistic(y_test_h, y_test_a, pred_h, pred_a, eval_test):
    true_outcomes = eval_test['result'].values # 'H', 'D', 'A'
    
    y_true_matrix = []
    y_pred_matrix = []
    
    winner_hits = 0
    exact_score_hits = 0
    
    for i in range(len(pred_h)):
        lam_h = max(pred_h[i], 0.01)
        lam_a = max(pred_a[i], 0.01)
        
        true_h = y_test_h.iloc[i]
        true_a = y_test_a.iloc[i]
        true_res = true_outcomes[i]
        
        # Calculate probabilities up to 10 goals
        prob_h_win, prob_draw, prob_a_win = 0.0, 0.0, 0.0
        max_prob = -1
        pred_exact_score = (0, 0)
        
        for h in range(10):
            for a in range(10):
                p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
                if h > a: prob_h_win += p
                elif h == a: prob_draw += p
                else: prob_a_win += p
                
                if p > max_prob:
                    max_prob = p
                    pred_exact_score = (h, a)
                    
        # Normalize just in case (truncation up to 10 goals is usually ~0.9999)
        total_p = prob_h_win + prob_draw + prob_a_win
        prob_h_win /= total_p
        prob_draw /= total_p
        prob_a_win /= total_p
        
        # Exact score match
        if pred_exact_score == (true_h, true_a):
            exact_score_hits += 1
            
        # Predicted outcome based on highest probability
        predicted_outcome = 'H'
        if prob_draw > prob_h_win and prob_draw > prob_a_win: predicted_outcome = 'D'
        elif prob_a_win > prob_h_win and prob_a_win > prob_draw: predicted_outcome = 'A'
        
        if predicted_outcome == true_res:
            winner_hits += 1
            
        # True array [H, D, A]
        true_arr = [1 if true_res == 'H' else 0, 1 if true_res == 'D' else 0, 1 if true_res == 'A' else 0]
        pred_arr = [prob_h_win, prob_draw, prob_a_win]
        
        y_true_matrix.append(true_arr)
        y_pred_matrix.append(pred_arr)
        
    y_true_matrix = np.array(y_true_matrix)
    y_pred_matrix = np.array(y_pred_matrix)
    
    # Calculate metrics
    winner_acc = winner_hits / len(pred_h)
    exact_acc = exact_score_hits / len(pred_h)
    
    # Log loss (sklearn accepts matrices)
    ll = log_loss(y_true_matrix, y_pred_matrix)
    
    # Brier Score (custom formula for multiclass: 1/N * sum((y_pred - y_true)^2))
    brier = np.mean(np.sum((y_pred_matrix - y_true_matrix)**2, axis=1))
    
    return {
        'Winner_Acc': winner_acc,
        'Exact_Score_Acc': exact_acc,
        'Brier_Score': brier,
        'Log_Loss': ll
    }

def main():
    print("Loading data...")
    train_df, test_df = load_data()
    train_df = handle_missing_values(train_df)
    test_df = handle_missing_values(test_df)
    
    base_features, encoder = get_base_features(train_df)
    
    cat_cols = ['home_team', 'away_team', 'tournament']
    train_df[cat_cols] = encoder.transform(train_df[cat_cols])
    test_df[cat_cols] = encoder.transform(test_df[cat_cols])
    
    y_train_h = train_df['home_score']
    y_train_a = train_df['away_score']
    y_test_h = test_df['home_score']
    y_test_a = test_df['away_score']
    eval_test = test_df[['home_score', 'away_score', 'result', 'goal_diff']].copy()
    
    conditions = ['A_Full', 'B_No_H2H', 'C_No_FIFA', 'D_No_Shootouts', 'E_No_Form', 'F_ELO_Only']
    results = {}
    
    for cond in conditions:
        print(f"\nEvaluating Condition: {cond}")
        feats = filter_features(base_features, cond)
        print(f"Features used: {len(feats)}")
        
        X_train = train_df[feats].astype(float)
        X_test = test_df[feats].astype(float)
        
        model_h = XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
        model_a = XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1)
        
        start = time.time()
        model_h.fit(X_train, y_train_h)
        model_a.fit(X_train, y_train_a)
        
        pred_h = model_h.predict(X_test)
        pred_a = model_a.predict(X_test)
        
        metrics = evaluate_probabilistic(y_test_h, y_test_a, pred_h, pred_a, eval_test)
        metrics['Time_s'] = time.time() - start
        
        results[cond] = metrics
        print(f"[{cond}] Log Loss: {metrics['Log_Loss']:.4f} | Brier: {metrics['Brier_Score']:.4f} | WinAcc: {metrics['Winner_Acc']:.4f}")

    df_res = pd.DataFrame(results).T
    # Rank by Log Loss (lower is better)
    df_res = df_res.sort_values(by='Log_Loss')
    
    print("\n\n=== FEATURE ABLATION RESULTS (Ranked by Log Loss) ===")
    print(df_res.round(4).to_string())
    df_res.to_csv("ablation_results.csv")
    
if __name__ == "__main__":
    main()
