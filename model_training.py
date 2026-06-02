import pandas as pd
import numpy as np
import time
from scipy.stats import poisson
import joblib

# ML models
from sklearn.linear_model import PoissonRegressor
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

# Preprocessing & Evaluation
from sklearn.metrics import mean_absolute_error, mean_squared_error, accuracy_score
import category_encoders as ce

def load_and_split_data(filepath="final_training_dataset.csv"):
    df = pd.read_csv(filepath)
    df['date'] = pd.to_datetime(df['date'])
    
    # Chronological Split
    train_mask = df['date'] < '2021-01-01'
    val_mask = (df['date'] >= '2021-01-01') & (df['date'] < '2024-01-01')
    test_mask = df['date'] >= '2024-01-01'
    
    train_df = df[train_mask].copy()
    val_df = df[val_mask].copy()
    test_df = df[test_mask].copy()
    
    print(f"Train: {len(train_df)} rows")
    print(f"Validation: {len(val_df)} rows")
    print(f"Test: {len(test_df)} rows")
    
    return train_df, val_df, test_df, df

def handle_missing_values(df):
    df = df.copy()
    # Impute ELO
    df['home_elo_pre'] = df['home_elo_pre'].fillna(1500)
    df['away_elo_pre'] = df['away_elo_pre'].fillna(1500)
    df['elo_diff'] = df['elo_diff'].fillna(0)
    
    # Impute FIFA Rankings
    df['home_fifa_rank'] = df['home_fifa_rank'].fillna(200)
    df['away_fifa_rank'] = df['away_fifa_rank'].fillna(200)
    df['rank_diff'] = df['rank_diff'].fillna(0)
    df['home_fifa_points'] = df['home_fifa_points'].fillna(0)
    df['away_fifa_points'] = df['away_fifa_points'].fillna(0)
    
    # Impute H2H
    df['h2h_matches_played'] = df['h2h_matches_played'].fillna(0)
    df['h2h_home_win_rate'] = df['h2h_home_win_rate'].fillna(0)
    df['h2h_avg_goals_home'] = df['h2h_avg_goals_home'].fillna(0)
    df['h2h_avg_goals_away'] = df['h2h_avg_goals_away'].fillna(0)
    
    # Impute Form (L5, L10)
    form_cols = [c for c in df.columns if 'avg' in c or 'rate' in c]
    for c in form_cols:
        if c in df.columns:
            df[c] = df[c].fillna(0)
            
    return df

def preprocess_features(train_df, val_df, test_df):
    train_df = handle_missing_values(train_df)
    val_df = handle_missing_values(val_df)
    test_df = handle_missing_values(test_df)
    
    cat_cols = ['home_team', 'away_team', 'tournament']
    
    # We will use Target Encoding based on home_score and away_score separately,
    # but to simplify and avoid target leakage, let's just use CountEncoder (frequency) 
    # for teams and tournaments. It captures the popularity/frequency of the team.
    # Alternatively, we encode using ELO difference (TargetEncoder)
    
    # Let's use CountEncoder to be safe and avoid target leakage between home/away models
    encoder = ce.CountEncoder(cols=cat_cols, handle_unknown='value')
    train_enc = encoder.fit_transform(train_df[cat_cols])
    val_enc = encoder.transform(val_df[cat_cols])
    test_enc = encoder.transform(test_df[cat_cols])
    
    for c in cat_cols:
        train_df[c] = train_enc[c]
        val_df[c] = val_enc[c]
        test_df[c] = test_enc[c]
        
    features = [c for c in train_df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    # Include neutral flag
    features.append('neutral')
    
    X_train = train_df[features].astype(float)
    y_train_h = train_df['home_score']
    y_train_a = train_df['away_score']
    
    X_val = val_df[features].astype(float)
    y_val_h = val_df['home_score']
    y_val_a = val_df['away_score']
    
    X_test = test_df[features].astype(float)
    y_test_h = test_df['home_score']
    y_test_a = test_df['away_score']
    
    # Also return true results for evaluation
    eval_test = test_df[['home_score', 'away_score', 'result', 'goal_diff']].copy()
    
    return X_train, y_train_h, y_train_a, X_val, y_val_h, y_val_a, X_test, y_test_h, y_test_a, eval_test, features

def get_match_outcome(h_goals, a_goals):
    if h_goals > a_goals: return 'H'
    elif h_goals < a_goals: return 'A'
    else: return 'D'

def evaluate_predictions(y_test_h, y_test_a, pred_h, pred_a, eval_test):
    # Regression metrics
    h_mae = mean_absolute_error(y_test_h, pred_h)
    h_rmse = np.sqrt(mean_squared_error(y_test_h, pred_h))
    
    a_mae = mean_absolute_error(y_test_a, pred_a)
    a_rmse = np.sqrt(mean_squared_error(y_test_a, pred_a))
    
    # Outcome metrics (Round to nearest integer for outcome prediction)
    pred_h_rounded = np.round(pred_h)
    pred_a_rounded = np.round(pred_a)
    
    true_outcomes = eval_test['result']
    pred_outcomes = [get_match_outcome(h, a) for h, a in zip(pred_h_rounded, pred_a_rounded)]
    
    acc = accuracy_score(true_outcomes, pred_outcomes)
    
    # Winner vs Draw accuracy
    true_wins = [1 if o in ['H', 'A'] else 0 for o in true_outcomes]
    pred_wins = [1 if o in ['H', 'A'] else 0 for o in pred_outcomes]
    
    true_draws = [1 if o == 'D' else 0 for o in true_outcomes]
    pred_draws = [1 if o == 'D' else 0 for o in pred_outcomes]
    
    # Masks
    win_mask = np.array(true_outcomes) != 'D'
    draw_mask = np.array(true_outcomes) == 'D'
    
    win_acc = accuracy_score(np.array(true_outcomes)[win_mask], np.array(pred_outcomes)[win_mask]) if sum(win_mask) > 0 else 0
    draw_acc = accuracy_score(np.array(true_outcomes)[draw_mask], np.array(pred_outcomes)[draw_mask]) if sum(draw_mask) > 0 else 0
    
    # Exact Score
    exact_score = np.mean((y_test_h == pred_h_rounded) & (y_test_a == pred_a_rounded))
    
    # Goal Difference
    true_gd = eval_test['goal_diff']
    pred_gd = pred_h_rounded - pred_a_rounded
    gd_acc = np.mean(true_gd == pred_gd)
    
    # Top 3 Scores Probability using Poisson
    # Probability of score (x, y) is poisson.pmf(x, pred_h) * poisson.pmf(y, pred_a)
    top_3_hits = 0
    for i in range(len(pred_h)):
        lam_h = max(pred_h[i], 0.01) # Avoid lambda=0
        lam_a = max(pred_a[i], 0.01)
        
        true_h = y_test_h.iloc[i]
        true_a = y_test_a.iloc[i]
        
        # Calculate probabilities for scores up to 10-10
        probs = {}
        for h in range(10):
            for a in range(10):
                p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
                probs[(h, a)] = p
        
        # Sort by prob
        sorted_scores = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        top_3 = [s[0] for s in sorted_scores[:3]]
        
        if (true_h, true_a) in top_3:
            top_3_hits += 1
            
    top_3_acc = top_3_hits / len(pred_h)
    
    return {
        'H_MAE': h_mae, 'H_RMSE': h_rmse,
        'A_MAE': a_mae, 'A_RMSE': a_rmse,
        'Winner_Acc': win_acc, 'Draw_Acc': draw_acc, 'Overall_Acc': acc,
        'Exact_Score_Acc': exact_score, 'GD_Acc': gd_acc, 'Top_3_Acc': top_3_acc
    }

def main():
    train_df, val_df, test_df, df = load_and_split_data()
    X_train, y_train_h, y_train_a, X_val, y_val_h, y_val_a, X_test, y_test_h, y_test_a, eval_test, features = preprocess_features(train_df, val_df, test_df)
    
    models = {
        'Poisson Regression': PoissonRegressor(max_iter=1000),
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        'XGBoost': XGBRegressor(objective='count:poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1),
        'LightGBM': LGBMRegressor(objective='poisson', n_estimators=200, learning_rate=0.05, max_depth=5, random_state=42, n_jobs=-1, verbose=-1)
    }
    
    results = {}
    fitted_models = {}
    
    print("\nTraining models...")
    for name, model_cls in models.items():
        print(f"Training {name}...")
        start = time.time()
        
        from sklearn.base import clone
        model_h = clone(model_cls)
        model_a = clone(model_cls)
        
        # Train
        model_h.fit(X_train, y_train_h)
        model_a.fit(X_train, y_train_a)
        
        # Predict on Test
        pred_h = model_h.predict(X_test)
        pred_a = model_a.predict(X_test)
        
        metrics = evaluate_predictions(y_test_h, y_test_a, pred_h, pred_a, eval_test)
        metrics['Time_s'] = time.time() - start
        
        results[name] = metrics
        fitted_models[name] = (model_h, model_a)
        
        print(f"{name} completed in {metrics['Time_s']:.1f}s - Overall Acc: {metrics['Overall_Acc']:.4f}")
        
    results_df = pd.DataFrame(results).T
    print("\n=== FINAL RESULTS ===")
    print(results_df.round(4).to_string())
    
    results_df.to_csv("model_evaluation_metrics.csv")
    
    # Determine best model based on Overall_Acc + Exact_Score_Acc
    results_df['Composite_Score'] = results_df['Overall_Acc'] + (results_df['Exact_Score_Acc'] * 0.5)
    best_model_name = results_df['Composite_Score'].idxmax()
    print(f"\nBest Model: {best_model_name}")
    
    # Feature Importance for best model
    best_h, best_a = fitted_models[best_model_name]
    
    # Handle feature importance if tree-based
    if hasattr(best_h, 'feature_importances_'):
        feat_imp_h = pd.Series(best_h.feature_importances_, index=features).sort_values(ascending=False)
        feat_imp_a = pd.Series(best_a.feature_importances_, index=features).sort_values(ascending=False)
        
        print("\nTop 10 Features (Home Model):")
        print(feat_imp_h.head(10).to_string())
        
        # Save feature importances
        feat_imp_h.to_csv("feature_importance_home.csv")
        feat_imp_a.to_csv("feature_importance_away.csv")
    elif hasattr(best_h, 'coef_'):
        # Linear models
        feat_imp_h = pd.Series(np.abs(best_h.coef_), index=features).sort_values(ascending=False)
        print("\nTop 10 Features (Home Model - Absolute Coefs):")
        print(feat_imp_h.head(10).to_string())
        
    
    print("\nSaving best model...")
    joblib.dump(best_h, "best_model_home.joblib")
    joblib.dump(best_a, "best_model_away.joblib")
    print("Done!")

if __name__ == "__main__":
    main()
