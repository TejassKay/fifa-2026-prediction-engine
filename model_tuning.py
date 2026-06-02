import pandas as pd
import numpy as np
import optuna
import time
from scipy.stats import poisson
import joblib

# Models
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

# Metrics
from sklearn.metrics import mean_absolute_error, mean_squared_error, accuracy_score, mean_poisson_deviance
import category_encoders as ce

optuna.logging.set_verbosity(optuna.logging.WARNING)

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
    
    return train_df, val_df, test_df, df

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

def preprocess_features(train_df, val_df, test_df):
    train_df = handle_missing_values(train_df)
    val_df = handle_missing_values(val_df)
    test_df = handle_missing_values(test_df)
    
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
    
    X_train = train_df[features].astype(float)
    y_train_h = train_df['home_score']
    y_train_a = train_df['away_score']
    
    X_val = val_df[features].astype(float)
    y_val_h = val_df['home_score']
    y_val_a = val_df['away_score']
    
    X_test = test_df[features].astype(float)
    y_test_h = test_df['home_score']
    y_test_a = test_df['away_score']
    
    eval_test = test_df[['home_score', 'away_score', 'result', 'goal_diff']].copy()
    
    # Combined train+val for final refitting
    X_train_full = pd.concat([X_train, X_val])
    y_train_h_full = pd.concat([y_train_h, y_val_h])
    y_train_a_full = pd.concat([y_train_a, y_val_a])
    
    data = {
        'X_train': X_train, 'y_train_h': y_train_h, 'y_train_a': y_train_a,
        'X_val': X_val, 'y_val_h': y_val_h, 'y_val_a': y_val_a,
        'X_test': X_test, 'y_test_h': y_test_h, 'y_test_a': y_test_a,
        'X_train_full': X_train_full, 'y_train_h_full': y_train_h_full, 'y_train_a_full': y_train_a_full,
        'eval_test': eval_test, 'features': features
    }
    return data

def get_match_outcome(h_goals, a_goals):
    if h_goals > a_goals: return 'H'
    elif h_goals < a_goals: return 'A'
    else: return 'D'

def calc_poisson_bivariate_probs(lam_h, lam_a):
    lam_h = max(lam_h, 0.01)
    lam_a = max(lam_a, 0.01)
    
    prob_h_win, prob_a_win, prob_draw = 0.0, 0.0, 0.0
    
    for h in range(15):
        for a in range(15):
            p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
            if h > a: prob_h_win += p
            elif h < a: prob_a_win += p
            else: prob_draw += p
            
    return prob_h_win, prob_draw, prob_a_win

def evaluate_predictions(y_test_h, y_test_a, pred_h, pred_a, eval_test):
    h_mae = mean_absolute_error(y_test_h, pred_h)
    h_rmse = np.sqrt(mean_squared_error(y_test_h, pred_h))
    
    a_mae = mean_absolute_error(y_test_a, pred_a)
    a_rmse = np.sqrt(mean_squared_error(y_test_a, pred_a))
    
    pred_h_rounded = np.round(pred_h)
    pred_a_rounded = np.round(pred_a)
    
    true_outcomes = eval_test['result']
    pred_outcomes = [get_match_outcome(h, a) for h, a in zip(pred_h_rounded, pred_a_rounded)]
    
    acc = accuracy_score(true_outcomes, pred_outcomes)
    
    win_mask = np.array(true_outcomes) != 'D'
    draw_mask = np.array(true_outcomes) == 'D'
    
    win_acc = accuracy_score(np.array(true_outcomes)[win_mask], np.array(pred_outcomes)[win_mask]) if sum(win_mask) > 0 else 0
    draw_acc = accuracy_score(np.array(true_outcomes)[draw_mask], np.array(pred_outcomes)[draw_mask]) if sum(draw_mask) > 0 else 0
    
    exact_score = np.mean((y_test_h == pred_h_rounded) & (y_test_a == pred_a_rounded))
    
    true_gd = eval_test['goal_diff']
    pred_gd = pred_h_rounded - pred_a_rounded
    gd_acc = np.mean(true_gd == pred_gd)
    
    # Calibration Metrics
    top_3_hits = 0
    scoreline_calibration = 0.0
    brier_score = 0.0
    
    for i in range(len(pred_h)):
        lam_h = max(pred_h[i], 0.01)
        lam_a = max(pred_a[i], 0.01)
        
        true_h = int(y_test_h.iloc[i])
        true_a = int(y_test_a.iloc[i])
        true_out = true_outcomes.iloc[i]
        
        # Scoreline Probabilities
        probs = {}
        for h in range(15):
            for a in range(15):
                p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
                probs[(h, a)] = p
        
        # 1. Exact Score Probability
        actual_score_prob = poisson.pmf(true_h, lam_h) * poisson.pmf(true_a, lam_a)
        scoreline_calibration += actual_score_prob
        
        # 2. Top 3 Score
        sorted_scores = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        top_3 = [s[0] for s in sorted_scores[:3]]
        if (true_h, true_a) in top_3:
            top_3_hits += 1
            
        # 3. Probability Calibration (Brier Score for outcomes)
        prob_h_win, prob_draw, prob_a_win = calc_poisson_bivariate_probs(lam_h, lam_a)
        target_h_win = 1.0 if true_out == 'H' else 0.0
        target_draw = 1.0 if true_out == 'D' else 0.0
        target_a_win = 1.0 if true_out == 'A' else 0.0
        
        # Brier score = sum of squared differences between probabilities and binary outcomes
        b_score_i = ((prob_h_win - target_h_win)**2 + (prob_draw - target_draw)**2 + (prob_a_win - target_a_win)**2) / 3.0
        brier_score += b_score_i
            
    top_3_acc = top_3_hits / len(pred_h)
    avg_scoreline_prob = scoreline_calibration / len(pred_h)
    avg_brier_score = brier_score / len(pred_h)
    
    return {
        'H_MAE': h_mae, 'H_RMSE': h_rmse,
        'A_MAE': a_mae, 'A_RMSE': a_rmse,
        'Winner_Acc': win_acc, 'Draw_Acc': draw_acc, 'Overall_Acc': acc,
        'Exact_Score_Acc': exact_score, 'GD_Acc': gd_acc, 'Top_3_Acc': top_3_acc,
        'Avg_Actual_Score_Prob': avg_scoreline_prob,
        'Outcome_Brier_Score': avg_brier_score
    }

# Optuna Objectives
def create_rf_objective(target, d):
    def objective(trial):
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 50, 200),
            'max_depth': trial.suggest_int('max_depth', 3, 10),
            'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
            'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10),
            'random_state': 42,
            'n_jobs': -1
        }
        model = RandomForestRegressor(**params)
        model.fit(d['X_train'], d[f'y_train_{target}'])
        preds = model.predict(d['X_val'])
        return mean_absolute_error(d[f'y_val_{target}'], preds)
    return objective

def create_xgb_objective(target, d):
    def objective(trial):
        params = {
            'objective': 'count:poisson',
            'n_estimators': trial.suggest_int('n_estimators', 50, 300),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2, log=True),
            'max_depth': trial.suggest_int('max_depth', 3, 8),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'random_state': 42,
            'n_jobs': -1
        }
        model = XGBRegressor(**params)
        model.fit(d['X_train'], d[f'y_train_{target}'])
        preds = model.predict(d['X_val'])
        # Prevent zero predictions for poisson deviance
        preds = np.clip(preds, 1e-6, None)
        return mean_poisson_deviance(d[f'y_val_{target}'], preds)
    return objective

def create_lgb_objective(target, d):
    def objective(trial):
        params = {
            'objective': 'poisson',
            'n_estimators': trial.suggest_int('n_estimators', 50, 300),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2, log=True),
            'num_leaves': trial.suggest_int('num_leaves', 10, 60),
            'max_depth': trial.suggest_int('max_depth', 3, 8),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'feature_fraction': trial.suggest_float('feature_fraction', 0.6, 1.0),
            'random_state': 42,
            'n_jobs': -1,
            'verbose': -1
        }
        model = LGBMRegressor(**params)
        model.fit(d['X_train'], d[f'y_train_{target}'])
        preds = model.predict(d['X_val'])
        preds = np.clip(preds, 1e-6, None)
        return mean_poisson_deviance(d[f'y_val_{target}'], preds)
    return objective

def tune_and_evaluate(name, obj_h, obj_a, cls, d, n_trials=30):
    print(f"\n--- Tuning {name} ---")
    start = time.time()
    
    study_h = optuna.create_study(direction='minimize')
    study_h.optimize(obj_h, n_trials=n_trials)
    
    study_a = optuna.create_study(direction='minimize')
    study_a.optimize(obj_a, n_trials=n_trials)
    
    print(f"Tuning {name} finished in {time.time() - start:.1f}s")
    print(f"Best H params: {study_h.best_params}")
    print(f"Best A params: {study_a.best_params}")
    
    # Train final models on train+val
    params_h = study_h.best_params
    params_a = study_a.best_params
    
    if name == 'XGBoost':
        params_h['objective'] = 'count:poisson'
        params_a['objective'] = 'count:poisson'
    elif name == 'LightGBM':
        params_h['objective'] = 'poisson'
        params_h['verbose'] = -1
        params_a['objective'] = 'poisson'
        params_a['verbose'] = -1
        
    params_h['random_state'] = 42
    params_a['random_state'] = 42
    
    model_h = cls(**params_h)
    model_a = cls(**params_a)
    
    model_h.fit(d['X_train_full'], d['y_train_h_full'])
    model_a.fit(d['X_train_full'], d['y_train_a_full'])
    
    pred_h = model_h.predict(d['X_test'])
    pred_a = model_a.predict(d['X_test'])
    
    metrics = evaluate_predictions(d['y_test_h'], d['y_test_a'], pred_h, pred_a, d['eval_test'])
    return metrics, (model_h, model_a)

def main():
    train_df, val_df, test_df, df = load_and_split_data()
    d = preprocess_features(train_df, val_df, test_df)
    
    results = {}
    fitted_models = {}
    
    models = [
        ('Random Forest', create_rf_objective, RandomForestRegressor),
        ('XGBoost', create_xgb_objective, XGBRegressor),
        ('LightGBM', create_lgb_objective, LGBMRegressor)
    ]
    
    for name, obj_creator, cls in models:
        metrics, (mod_h, mod_a) = tune_and_evaluate(
            name, 
            obj_creator('h', d), 
            obj_creator('a', d), 
            cls, d, n_trials=20
        )
        results[name] = metrics
        fitted_models[name] = (mod_h, mod_a)
        
    results_df = pd.DataFrame(results).T
    print("\n=== TUNED FINAL RESULTS ===")
    print(results_df.round(4).to_string())
    
    results_df.to_csv("tuned_model_evaluation.csv")
    
    # We want a model with high overall accuracy, low MAE, high Avg Actual Score Prob, and low Brier Score.
    # Brier Score: lower is better (0 is perfect)
    # Outcome: Let's pick based on Avg_Actual_Score_Prob (calibration realism)
    best_model_name = results_df['Avg_Actual_Score_Prob'].idxmax()
    print(f"\nBest Model for Monte Carlo: {best_model_name}")
    
    best_h, best_a = fitted_models[best_model_name]
    
    print("\nSaving best tuned model...")
    joblib.dump(best_h, "tuned_best_model_home.joblib")
    joblib.dump(best_a, "tuned_best_model_away.joblib")
    print("Done!")

if __name__ == "__main__":
    main()
