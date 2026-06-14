import sys
import os
import pandas as pd
import numpy as np
import joblib
import time
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, brier_score_loss, accuracy_score
from scipy.stats import poisson
from tqdm import tqdm
from collections import defaultdict
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

def calc_bivariate_probs(lam_h, lam_a):
    prob_h, prob_d, prob_a = 0.0, 0.0, 0.0
    for h in range(12):
        for a in range(12):
            p = poisson.pmf(h, lam_h) * poisson.pmf(a, lam_a)
            if h > a: prob_h += p
            elif h < a: prob_a += p
            else: prob_d += p
    return prob_h, prob_d, prob_a

def rps(probs, outcome_idx):
    cum_probs = np.cumsum(probs)
    cum_outcomes = np.cumsum([1 if i == outcome_idx else 0 for i in range(3)])
    return np.sum((cum_probs[:-1] - cum_outcomes[:-1])**2) / 2.0

def load_transfermarkt_data():
    print("Loading TM data...")
    df_games = pd.read_csv(base + "games.csv")
    df_games = df_games[df_games['competition_id'] == 'FIWC'].copy()
    df_games['date'] = pd.to_datetime(df_games['date'])
    df_games['home_club_name'] = df_games['home_club_name'].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_games['away_club_name'] = df_games['away_club_name'].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    df_apps = pd.read_csv(base + "appearances.csv")
    df_apps = df_apps[df_apps['competition_id'] == 'FIWC'].copy()
    
    df_vals = pd.read_csv(base + "player_valuations.csv")
    df_vals['date'] = pd.to_datetime(df_vals['date'])
    
    val_dict = defaultdict(list)
    for _, r in df_vals.iterrows():
        val_dict[r['player_id']].append((r['date'], r['market_value_in_eur']))
    for pid in val_dict:
        val_dict[pid].sort()
        
    return df_games, df_apps, val_dict

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

def extract_tournament_state(df_games, df_apps, val_dict, actual_matches, start_date):
    # We maintain state across the tournament
    player_fatigue = defaultdict(int)
    team_last_xi = {}
    
    features = []
    
    for i, m in actual_matches.iterrows():
        ht, at = m['home_team'], m['away_team']
        m_date = m['date']
        
        # Find game_id
        g = df_games[(df_games['date'] == m_date) & 
                     ((df_games['home_club_name'] == ht) | (df_games['away_club_name'] == at) | 
                      (df_games['home_club_name'] == at) | (df_games['away_club_name'] == ht))]
                      
        if len(g) == 0:
            # Fallback if names mismatch slightly, just return 0s
            h_val = a_val = 50000 * 11
            h_fat = a_fat = 0
            h_cont = a_cont = 1.0
        else:
            g = g.iloc[0]
            game_id = g['game_id']
            
            apps = df_apps[df_apps['game_id'] == game_id]
            
            # Since club_ids can be confusing, we just split by who the player played for. 
            # We can map by identifying the home_club_id and away_club_id
            h_cid = g['home_club_id'] if g['home_club_name'] == ht else g['away_club_id']
            a_cid = g['away_club_id'] if g['away_club_name'] == at else g['home_club_id']
            
            h_apps = apps[apps['player_current_club_id'] == h_cid]
            a_apps = apps[apps['player_current_club_id'] == a_cid]
            
            h_players = h_apps['player_id'].tolist()
            a_players = a_apps['player_id'].tolist()
            
            h_val = sum(get_player_value(val_dict, p, m_date) for p in h_players)
            a_val = sum(get_player_value(val_dict, p, m_date) for p in a_players)
            
            h_fat = np.mean([player_fatigue[p] for p in h_players]) if len(h_players)>0 else 0
            a_fat = np.mean([player_fatigue[p] for p in a_players]) if len(a_players)>0 else 0
            
            h_cont = len(set(h_players).intersection(team_last_xi.get(ht, set()))) / len(h_players) if len(h_players)>0 else 1.0
            a_cont = len(set(a_players).intersection(team_last_xi.get(at, set()))) / len(a_players) if len(a_players)>0 else 1.0
            
            team_last_xi[ht] = set(h_players)
            team_last_xi[at] = set(a_players)
            
            for _, app in h_apps.iterrows(): player_fatigue[app['player_id']] += app['minutes_played']
            for _, app in a_apps.iterrows(): player_fatigue[app['player_id']] += app['minutes_played']
            
        features.append({
            'home_val': h_val, 'away_val': a_val, 'val_diff': h_val - a_val,
            'home_fatigue': h_fat, 'away_fatigue': a_fat, 'fatigue_diff': h_fat - a_fat,
            'home_cont': h_cont, 'away_cont': a_cont, 'cont_diff': h_cont - a_cont
        })
        
    return pd.DataFrame(features)

def main():
    print("Starting Final Challenger Study...")
    from Study.Code.historical_backtester import generate_frozen_features
    
    df_r = pd.read_csv(base + "results.csv")
    df_r["date"] = pd.to_datetime(df_r["date"])
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    df_games, df_apps, val_dict = load_transfermarkt_data()
    
    model_h = joblib.load("tuned_best_model_home.joblib")
    model_a = joblib.load("tuned_best_model_away.joblib")
    
    # ---------------------------------------------------------
    # TRAIN LOGISTIC REGRESSION ON WC 2014
    # ---------------------------------------------------------
    print("Training Tournament State Model on WC 2014...")
    m2014 = df_r[(df_r['tournament'] == 'FIFA World Cup') & (df_r['date'] >= '2014-06-12') & (df_r['date'] <= '2014-07-13')].sort_values('date')
    f2014 = extract_tournament_state(df_games, df_apps, val_dict, m2014, '2014-06-12')
    
    X_train = f2014[['val_diff', 'fatigue_diff', 'cont_diff']]
    y_train = []
    for _, m in m2014.iterrows():
        if m['home_score'] > m['away_score']: y_train.append(0)
        elif m['home_score'] < m['away_score']: y_train.append(2)
        else: y_train.append(1)
        
    lr = LogisticRegression(C=0.1, max_iter=500)
    lr.fit(X_train, y_train)
    
    # ---------------------------------------------------------
    # TEST ON WC 2018 AND 2022
    # ---------------------------------------------------------
    TOURNAMENTS = {
        2018: {"start": "2018-06-14", "end": "2018-07-15", "winner": "France"},
        2022: {"start": "2022-11-20", "end": "2022-12-18", "winner": "Argentina"}
    }
    
    all_metrics = []
    
    for year, meta in TOURNAMENTS.items():
        print(f"\nEvaluating WC {year}...")
        start_date = meta['start']
        end_date = meta['end']
        
        actual_matches = df_r[(df_r['tournament'] == 'FIFA World Cup') & (df_r['date'] >= start_date) & (df_r['date'] <= end_date)].sort_values('date')
        lam_lkp, shoot_lkp, _ = generate_frozen_features(start_date, actual_matches)
        
        f_test = extract_tournament_state(df_games, df_apps, val_dict, actual_matches, start_date)
        X_test = f_test[['val_diff', 'fatigue_diff', 'cont_diff']]
        lr_probs = lr.predict_proba(X_test)
        
        match_idx = 0
        for i, m in actual_matches.iterrows():
            ht, at = m['home_team'], m['away_team']
            hg, ag = m['home_score'], m['away_score']
            
            if hg > ag: outcome_idx = 0; outcome = [1,0,0]
            elif hg < ag: outcome_idx = 2; outcome = [0,0,1]
            else: outcome_idx = 1; outcome = [0,1,0]
            
            lam_h, lam_a = lam_lkp[(ht, at)]
            prob_base = list(calc_bivariate_probs(lam_h, lam_a))
            
            prob_lr = lr_probs[match_idx]
            
            # Blend 80% Baseline, 20% LR
            prob_blend = [0.8 * prob_base[0] + 0.2 * prob_lr[0],
                          0.8 * prob_base[1] + 0.2 * prob_lr[1],
                          0.8 * prob_base[2] + 0.2 * prob_lr[2]]
            
            def record(name, probs):
                try:
                    ll = log_loss([outcome], [probs], labels=[[1,0,0],[0,1,0],[0,0,1]])
                except:
                    ll = -np.sum(np.array(outcome) * np.log(np.array(probs) + 1e-15))
                    
                all_metrics.append({
                    'year': year,
                    'candidate': name,
                    'll': ll,
                    'brier_mc': np.sum((np.array(probs) - np.array(outcome))**2),
                    'rps': rps(probs, outcome_idx),
                    'acc': 1 if np.argmax(probs) == outcome_idx else 0
                })
                
            record('Baseline', prob_base)
            record('Isolation (LR Only)', prob_lr)
            record('Blended Model', prob_blend)
            
            match_idx += 1
            
    df_res = pd.DataFrame(all_metrics)
    summary = df_res.groupby('candidate').agg({
        'brier_mc': 'mean',
        'll': 'mean',
        'rps': 'mean',
        'acc': 'mean'
    }).reset_index().sort_values('brier_mc')
    
    print("\n========= OVERALL METRICS =========")
    print(summary.to_string(index=False))
    
    md = "# Final Challenger Study: Tournament State Intelligence\n\n"
    md += "## Aggregate Predictive Edge (Match Level)\n\n"
    md += summary.to_markdown(index=False) + "\n\n"
    md += "## Findings\n"
    md += "If the blended model outperforms the baseline by a >0.005 margin in Brier Score, then Tournament State Features contain genuine predictive signal. If it fails, our Elo-driven architecture has mathematically hit the performance ceiling for international tournaments."

    with open("tournament_state_results.md", "w") as f:
        f.write(md)
        
    print("Study Complete.")

if __name__ == '__main__':
    main()
