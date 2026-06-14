import sys
import os
import pandas as pd
import numpy as np
import time
from collections import defaultdict
from sklearn.linear_model import LogisticRegression
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

sys.path.append(os.getcwd())

base = "Dataset/"
TEAM_NAME_MAP = {
    "Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "Ivory Coast": "Côte d'Ivoire",
    "Côte d’Ivoire": "Côte d'Ivoire", "Czech Republic": "Czechia", "South Korea": "Korea Republic",
    "Turkey": "Türkiye", "IR Iran": "Iran", "USA": "United States", "Cape Verde Islands": "Cabo Verde",
    "Curacao": "Curaçao", "FYR Macedonia": "North Macedonia", "Aotearoa New Zealand": "New Zealand",
    "Swaziland": "Eswatini", "Democratic Republic of Congo": "Congo DR", "China": "China PR",
    "Yugoslavia": "Serbia", "Czechoslovakia": "Czechia", "German DR": "Germany",
    "West Germany": "Germany", "Soviet Union": "Russia", "Serbia and Montenegro": "Serbia"
}

def load_data():
    print("Loading datasets...")
    df_games = pd.read_csv(base + "games.csv")
    df_games = df_games[df_games['competition_id'] == 'FIWC'].copy()
    df_games['date'] = pd.to_datetime(df_games['date'])
    df_games['home_club_name'] = df_games['home_club_name'].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_games['away_club_name'] = df_games['away_club_name'].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    df_apps = pd.read_csv(base + "appearances.csv")
    df_apps = df_apps[df_apps['competition_id'] == 'FIWC'].copy()
    
    df_players = pd.read_csv(base + "players.csv")
    df_players['international_caps'] = df_players['international_caps'].fillna(0)
    df_players['international_goals'] = df_players['international_goals'].fillna(0)
    
    df_vals = pd.read_csv(base + "player_valuations.csv")
    df_vals['date'] = pd.to_datetime(df_vals['date'])
    
    val_dict = defaultdict(list)
    for _, r in df_vals.iterrows():
        val_dict[r['player_id']].append((r['date'], r['market_value_in_eur']))
    for pid in val_dict:
        val_dict[pid].sort()
        
    return df_games, df_apps, df_players, val_dict

def get_player_value(val_dict, pid, match_date):
    if pid not in val_dict: return 50000
    vals = val_dict[pid]
    val = 50000
    for d, v in vals:
        if d < match_date:
            val = v
        else:
            break
    return val

def position_weight(pos, sub_pos):
    pos = str(pos).lower()
    sub_pos = str(sub_pos).lower()
    if 'forward' in pos or 'centre-forward' in sub_pos: return 1.0
    if 'winger' in sub_pos or 'second striker' in sub_pos: return 0.7
    if 'midfield' in pos: return 0.3
    if 'defender' in pos: return 0.05
    return 0.0

def build_player_features(df_games, df_apps, df_players, val_dict, actual_matches):
    print("Building player features...")
    
    player_lookup = df_players.set_index('player_id')
    
    X = []
    y = []
    meta = []
    
    for _, m in tqdm(actual_matches.iterrows(), total=len(actual_matches)):
        ht, at = m['home_team'], m['away_team']
        m_date = m['date']
        
        g = df_games[(df_games['date'] == m_date) & 
                     ((df_games['home_club_name'] == ht) | (df_games['away_club_name'] == at) | 
                      (df_games['home_club_name'] == at) | (df_games['away_club_name'] == ht))]
                      
        if len(g) == 0: continue
        g = g.iloc[0]
        game_id = g['game_id']
        
        apps = df_apps[df_apps['game_id'] == game_id]
        
        h_cid = g['home_club_id'] if g['home_club_name'] == ht else g['away_club_id']
        a_cid = g['away_club_id'] if g['away_club_name'] == at else g['home_club_id']
        
        for team_cid, team_name in [(h_cid, ht), (a_cid, at)]:
            t_apps = apps[apps['player_club_id'] == team_cid]
            if len(t_apps) == 0: continue
            
            # proxy starting XI
            t_apps = t_apps.sort_values('minutes_played', ascending=False).head(11)
            
            for _, app in t_apps.iterrows():
                pid = app['player_id']
                if pid not in player_lookup.index: continue
                
                p_info = player_lookup.loc[pid]
                val = get_player_value(val_dict, pid, m_date)
                
                caps = p_info['international_caps']
                goals = p_info['international_goals']
                goal_rate = goals / max(1, caps)
                pos_w = position_weight(p_info['position'], p_info['sub_position'])
                
                scored = 1 if app['goals'] > 0 else 0
                
                X.append({
                    'val': np.log1p(val),
                    'caps': caps,
                    'goals': goals,
                    'goal_rate': goal_rate,
                    'pos_w': pos_w
                })
                y.append(scored)
                meta.append({
                    'game_id': game_id,
                    'team': team_name,
                    'player_id': pid,
                    'player_name': app['player_name'],
                    'pos_w': pos_w,
                    'goals': goals,
                    'goal_rate': goal_rate,
                    'val': val,
                    'scored': scored
                })
        
    print(f"DEBUG: Found {len(X)} players across {len(actual_matches)} matches.")
    return pd.DataFrame(X), np.array(y), pd.DataFrame(meta)

def evaluate_models(meta, lr_model):
    print("Evaluating models...")
    
    results = []
    
    # Group by game and team
    for (game_id, team), group in meta.groupby(['game_id', 'team']):
        # If no one scored on this team in this game, we skip? 
        # Actually, accuracy means: did the top predicted player score?
        # If the team scored 0 goals, the top predicted player didn't score. That's a correct failure.
        # But maybe we only care about accuracy WHEN the team scored? No, evaluate across all matches.
        
        # Calculate feature arrays for LR prediction
        X_group = pd.DataFrame({
            'val': np.log1p(group['val']),
            'caps': group['caps'] if 'caps' in group else 0, # Need caps in meta
            'goals': group['goals'],
            'goal_rate': group['goal_rate'],
            'pos_w': group['pos_w']
        })
        # Wait, caps wasn't added to meta. Let's fix that below.
        
        # We will re-generate X_group properly inside the main loop for LR.
        pass

def main():
    df_games, df_apps, df_players, val_dict = load_data()
    
    df_r = pd.read_csv(base + "results.csv")
    df_r["date"] = pd.to_datetime(df_r["date"])
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    print("Extracting WC 2014 Training Data...")
    m2014 = df_r[(df_r['tournament'] == 'FIFA World Cup') & (df_r['date'] >= '2014-06-12') & (df_r['date'] <= '2014-07-13')].sort_values('date')
    X_train, y_train, _ = build_player_features(df_games, df_apps, df_players, val_dict, m2014)
    
    print("Training Logistic Regression Model (Model F)...")
    lr = LogisticRegression(max_iter=1000, class_weight='balanced')
    lr.fit(X_train, y_train)
    
    print("\nFeature Importances (Logistic Regression):")
    for col, coef in zip(X_train.columns, lr.coef_[0]):
        print(f"{col}: {coef:.4f}")
        
    print("\nExtracting WC 2018 & 2022 Testing Data...")
    mTest = df_r[(df_r['tournament'] == 'FIFA World Cup') & (df_r['date'] >= '2018-06-14')].sort_values('date')
    X_test, y_test, meta_test = build_player_features(df_games, df_apps, df_players, val_dict, mTest)
    
    meta_test['caps'] = X_test['caps']
    meta_test['prob_lr'] = lr.predict_proba(X_test)[:, 1]
    
    # Models:
    # A: Random Attacker (pos_w == 1.0 or 0.7)
    # B: Top Hist Scorer (goals)
    # C: Market Value (val)
    # D: Goals / App (goal_rate)
    # E: Position Weighted (pos_w * goals? Or just pos_w) -> let's rank by pos_w + goals
    # F: LR Model (prob_lr)
    
    def score_top_n(group, sort_col, n, random_attacker=False):
        if random_attacker:
            # Filter attackers
            attackers = group[group['pos_w'] >= 0.7]
            if len(attackers) == 0: attackers = group
            top_n = attackers.sample(min(n, len(attackers)), random_state=42)
        else:
            top_n = group.sort_values(sort_col, ascending=False).head(n)
        
        # Did any of top_n score?
        return 1 if top_n['scored'].sum() > 0 else 0

    results = {
        'A_Random': {'t1':[], 't3':[], 't5':[]},
        'B_TopScorer': {'t1':[], 't3':[], 't5':[]},
        'C_MarketVal': {'t1':[], 't3':[], 't5':[]},
        'D_GoalRate': {'t1':[], 't3':[], 't5':[]},
        'E_PosWeight': {'t1':[], 't3':[], 't5':[]},
        'F_Hybrid_LR': {'t1':[], 't3':[], 't5':[]}
    }
    
    meta_test['pos_weighted_goals'] = meta_test['pos_w'] * 100 + meta_test['goals']
    
    # We only evaluate matches/teams where AT LEAST ONE goal was scored. 
    # Because if a team scores 0 goals, all models "fail" top-1, which just measures team strength.
    # The prompt asks: "Did the #1 predicted scorer actually score?"
    # If the team was shut out, predicting a scorer is impossible. We should evaluate conditional on the team scoring >= 1 goal.
    
    valid_groups = 0
    for (game_id, team), group in meta_test.groupby(['game_id', 'team']):
        if group['scored'].sum() == 0:
            continue # Team didn't score, skip evaluation
            
        valid_groups += 1
        
        results['A_Random']['t1'].append(score_top_n(group, '', 1, True))
        results['A_Random']['t3'].append(score_top_n(group, '', 3, True))
        results['A_Random']['t5'].append(score_top_n(group, '', 5, True))
        
        results['B_TopScorer']['t1'].append(score_top_n(group, 'goals', 1))
        results['B_TopScorer']['t3'].append(score_top_n(group, 'goals', 3))
        results['B_TopScorer']['t5'].append(score_top_n(group, 'goals', 5))
        
        results['C_MarketVal']['t1'].append(score_top_n(group, 'val', 1))
        results['C_MarketVal']['t3'].append(score_top_n(group, 'val', 3))
        results['C_MarketVal']['t5'].append(score_top_n(group, 'val', 5))
        
        results['D_GoalRate']['t1'].append(score_top_n(group, 'goal_rate', 1))
        results['D_GoalRate']['t3'].append(score_top_n(group, 'goal_rate', 3))
        results['D_GoalRate']['t5'].append(score_top_n(group, 'goal_rate', 5))
        
        results['E_PosWeight']['t1'].append(score_top_n(group, 'pos_weighted_goals', 1))
        results['E_PosWeight']['t3'].append(score_top_n(group, 'pos_weighted_goals', 3))
        results['E_PosWeight']['t5'].append(score_top_n(group, 'pos_weighted_goals', 5))
        
        results['F_Hybrid_LR']['t1'].append(score_top_n(group, 'prob_lr', 1))
        results['F_Hybrid_LR']['t3'].append(score_top_n(group, 'prob_lr', 3))
        results['F_Hybrid_LR']['t5'].append(score_top_n(group, 'prob_lr', 5))

    print(f"\nEvaluated on {valid_groups} team-matches where >= 1 goal was scored.")
    
    res_rows = []
    for model, metrics in results.items():
        res_rows.append({
            'Model': model,
            'Top-1 Acc': np.mean(metrics['t1']),
            'Top-3 Acc': np.mean(metrics['t3']),
            'Top-5 Acc': np.mean(metrics['t5'])
        })
        
    df_res = pd.DataFrame(res_rows).sort_values('Top-3 Acc', ascending=False)
    print("\n========= GOAL SCORER ACCURACY =========")
    print(df_res.to_string(index=False))
    
    md = "# Final Research Study: Goal Scorer Prediction\n\n"
    md += "## Predictive Accuracy (Conditional on Team Scoring)\n\n"
    md += df_res.to_markdown(index=False) + "\n\n"
    
    md += "## Feature Importance (Model F)\n"
    for col, coef in zip(X_train.columns, lr.coef_[0]):
        md += f"- **{col}**: {coef:.4f}\n"
        
    md += "\n## Production Verdict\n"
    best_t3 = df_res.iloc[0]['Top-3 Acc']
    baseline_t3 = df_res[df_res['Model'] == 'B_TopScorer']['Top-3 Acc'].values[0]
    
    md += f"The best model achieved a Top-3 Accuracy of {best_t3:.1%}. "
    if best_t3 > baseline_t3 + 0.05 and best_t3 > 0.70:
        md += "This meets the threshold for production deployment. The accuracy is sufficiently high to provide meaningful user value."
    else:
        md += "This **fails** the production threshold. Either the accuracy is too low to be reliable, or it does not meaningfully outperform the simple heuristic of selecting the top historical scorer."
        
    with open("goal_scorer_results.md", "w") as f:
        f.write(md)
    print("\nStudy complete.")

if __name__ == '__main__':
    main()
