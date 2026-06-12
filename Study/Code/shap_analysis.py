import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt
import category_encoders as ce
import warnings
warnings.filterwarnings('ignore')

def get_feature_family(feat_name):
    if 'elo' in feat_name.lower():
        if 'opponent' in feat_name.lower() or 'weighted' in feat_name.lower():
            return 'Opponent-Strength'
        return 'ELO'
    if 'fifa' in feat_name.lower():
        if 'opponent' in feat_name.lower():
            return 'Opponent-Strength'
        return 'FIFA'
    if 'weighted_goal_diff' in feat_name.lower():
        return 'Opponent-Strength'
    if 'h2h' in feat_name.lower():
        return 'H2H'
    if 'shootout' in feat_name.lower():
        return 'Shootout'
    if any(x in feat_name.lower() for x in ['goals_scored', 'goals_conceded', 'win_rate', 'goal_diff_avg']):
        return 'Form'
    if feat_name in ['home_team', 'away_team', 'tournament', 'neutral']:
        return 'Context/Identity'
    return 'Other'

def preprocess_for_shap(filepath="final_training_dataset.csv"):
    df = pd.read_csv(filepath)
    df['date'] = pd.to_datetime(df['date'])
    
    # Fill missing values
    df['home_elo_pre'] = df['home_elo_pre'].fillna(1500)
    df['away_elo_pre'] = df['away_elo_pre'].fillna(1500)
    df['elo_diff'] = df['elo_diff'].fillna(0)
    df['home_fifa_rank'] = df['home_fifa_rank'].fillna(200)
    df['away_fifa_rank'] = df['away_fifa_rank'].fillna(200)
    df['rank_diff'] = df['rank_diff'].fillna(0)
    df['home_fifa_points'] = df['home_fifa_points'].fillna(0)
    df['away_fifa_points'] = df['away_fifa_points'].fillna(0)
    df['h2h_avg_goals_home'] = df['h2h_avg_goals_home'].fillna(0)
    df['h2h_avg_goals_away'] = df['h2h_avg_goals_away'].fillna(0)
    
    form_cols = [c for c in df.columns if 'avg' in c or 'rate' in c]
    for c in form_cols:
        if c in df.columns:
            df[c] = df[c].fillna(0)
            
    cat_cols = ['home_team', 'away_team', 'tournament']
    encoder = ce.CountEncoder(cols=cat_cols, handle_unknown='value')
    df_enc = encoder.fit_transform(df[cat_cols])
    for c in cat_cols:
        df[c] = df_enc[c]
        
    features = [c for c in df.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']]
    features.append('neutral')
    
    X = df[features].astype(float)
    return X

def analyze_model(model_name, model_path, X_sample):
    print(f"Loading {model_path}...")
    model = joblib.load(model_path)
    
    print(f"Calculating SHAP values for {model_name}...")
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)
    
    print(f"Saving summary plot for {model_name}...")
    plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_values, X_sample, plot_type="dot", show=False)
    plt.tight_layout()
    plt.savefig(f"shap_summary_{model_name.lower()}.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Calculate global importance
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    shap_df = pd.DataFrame({
        'Feature': X_sample.columns,
        'Mean_Abs_SHAP': mean_abs_shap,
        'Family': [get_feature_family(c) for c in X_sample.columns]
    }).sort_values('Mean_Abs_SHAP', ascending=False)
    
    total_shap = shap_df['Mean_Abs_SHAP'].sum()
    shap_df['Relative_Importance'] = shap_df['Mean_Abs_SHAP'] / total_shap
    
    shap_df.to_csv(f"shap_importance_{model_name.lower()}.csv", index=False)
    
    print(f"\n--- Top 15 Features ({model_name}) ---")
    print(shap_df.head(15).to_string(index=False))
    
    print(f"\n--- Family Contribution ({model_name}) ---")
    family_agg = shap_df.groupby('Family')['Relative_Importance'].sum().sort_values(ascending=False)
    print((family_agg * 100).round(2).astype(str) + '%')
    
    return shap_df

def main():
    X = preprocess_for_shap()
    # Sample 10,000 matches for SHAP analysis to keep it fast
    if len(X) > 10000:
        X_sample = X.sample(n=10000, random_state=42)
    else:
        X_sample = X
        
    home_shap_df = analyze_model('Home', "tuned_best_model_home.joblib", X_sample)
    away_shap_df = analyze_model('Away', "tuned_best_model_away.joblib", X_sample)

if __name__ == "__main__":
    main()
