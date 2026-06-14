import sys
import os
import pandas as pd
import numpy as np
import joblib
import time
from scipy.stats import poisson, gamma
from sklearn.metrics import log_loss, brier_score_loss, accuracy_score
import category_encoders as ce
from tqdm import tqdm
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

sys.path.append(os.getcwd())

base = "Dataset/"
TEAM_NAME_MAP = {
    "Cape Verde": "Cabo Verde", "DR Congo": "Congo DR", "Ivory Coast": "Côte d'Ivoire",
    "Côte d’Ivoire": "Côte d'Ivoire",
    "Czech Republic": "Czechia", "South Korea": "Korea Republic", "Turkey": "Türkiye",
    "IR Iran": "Iran", "USA": "United States", "Cape Verde Islands": "Cabo Verde",
    "Curacao": "Curaçao", "FYR Macedonia": "North Macedonia", "Aotearoa New Zealand": "New Zealand",
    "Swaziland": "Eswatini", "Democratic Republic of Congo": "Congo DR", "China": "China PR",
    "Yugoslavia": "Serbia", "Czechoslovakia": "Czechia", "German DR": "Germany",
    "West Germany": "Germany", "Soviet Union": "Russia", "Serbia and Montenegro": "Serbia"
}

TOURNAMENTS = {
    2018: {"start": "2018-06-14", "end": "2018-07-15", "winner": "France"},
    2022: {"start": "2022-11-20", "end": "2022-12-18", "winner": "Argentina"}
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
    # Ranked Probability Score for 3 outcomes (Home, Draw, Away)
    cum_probs = np.cumsum(probs)
    cum_outcomes = np.cumsum([1 if i == outcome_idx else 0 for i in range(3)])
    return np.sum((cum_probs[:-1] - cum_outcomes[:-1])**2) / 2.0

def main():
    start_time = time.time()
    from Study.Code.historical_backtester import generate_frozen_features
    
    df_r = pd.read_csv(base + "results.csv")
    df_r["date"] = pd.to_datetime(df_r["date"])
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    model_h = joblib.load("tuned_best_model_home.joblib")
    model_a = joblib.load("tuned_best_model_away.joblib")
    
    df_train_full = pd.read_csv("final_training_dataset.csv")
    features_ord = [c for c in df_train_full.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']] + ['neutral']
    
    K = 60 # Elo K-factor
    
    all_metrics = []
    
    for year, meta in TOURNAMENTS.items():
        print(f"\n======================================")
        print(f"Running Adaptation Benchmark for WC {year}...")
        
        start_date = meta['start']
        end_date = meta['end']
        
        actual_matches = df_r[(df_r['tournament'] == 'FIFA World Cup') & (df_r['date'] >= start_date) & (df_r['date'] <= end_date)].sort_values('date')
        lam_lkp, shoot_lkp, df_pred_raw = generate_frozen_features(start_date, actual_matches)
        
        teams_list = list(set(actual_matches["home_team"].unique()).union(set(actual_matches["away_team"].unique())))
        matchups = [(t1, t2) for t1 in teams_list for t2 in teams_list if t1 != t2]
        
        base_rows = {}
        for i, row in df_pred_raw.iterrows():
            ht, at = matchups[i]
            base_rows[(ht, at)] = row.copy()
            
        # STATE TRACKERS
        
        # Candidate A: Daily Real World Updates
        cand_a_elo = {t: base_rows[(t, [x for x in teams_list if x!=t][0])]['home_elo_pre'] for t in teams_list}
        cand_a_stats = {t: {
            'L5_gf': base_rows[(t, [x for x in teams_list if x!=t][0])]['home_goals_scored_avg_L5'] * 5,
            'L5_ga': base_rows[(t, [x for x in teams_list if x!=t][0])]['home_goals_conceded_avg_L5'] * 5,
            'L10_w': base_rows[(t, [x for x in teams_list if x!=t][0])]['home_win_rate_L10'] * 10
        } for t in teams_list}
        
        # Candidate B: Tournament Form (Goals, Conceded)
        cand_b_tform = {t: {'gf': 0, 'ga': 0, 'matches': 0} for t in teams_list}
        
        # Candidate C: Tournament ELO
        cand_c_elo = {t: cand_a_elo[t] for t in teams_list}
        
        # Candidate D & E: xG & Defensive Stability
        cand_d_xg = {t: {'goals': 0, 'xg': 0, 'ga': 0, 'xga': 0, 'matches': 0} for t in teams_list}
        
        # Candidate G: Bayesian Prior Updates
        # Beta governs how strongly we weight the prior. Alpha = lambda * beta
        bayesian_beta = 5.0 # Prior is worth 5 matches of evidence
        cand_g_alpha = {t: {'attack': 0.0, 'defense': 0.0} for t in teams_list}
        cand_g_beta = {t: bayesian_beta for t in teams_list}
        for t in teams_list:
            # Initialize prior means using an average baseline lambda across all possible matchups
            lams = [lam_lkp[(t, a)][0] for a in teams_list if t!=a]
            xga = [lam_lkp[(h, t)][0] for h in teams_list if t!=h]
            cand_g_alpha[t]['attack'] = np.mean(lams) * bayesian_beta
            cand_g_alpha[t]['defense'] = np.mean(xga) * bayesian_beta
            
        # Candidate H: Momentum Multiplier
        cand_h_mom = {t: 1.0 for t in teams_list}
        
        match_idx = 0
        for _, m in tqdm(actual_matches.iterrows(), total=64):
            ht, at = m['home_team'], m['away_team']
            hg, ag = m['home_score'], m['away_score']
            
            if hg > ag: outcome_idx = 0; outcome = [1,0,0]; w_h=1; w_a=0
            elif hg < ag: outcome_idx = 2; outcome = [0,0,1]; w_h=0; w_a=1
            else: outcome_idx = 1; outcome = [0,1,0]; w_h=0.5; w_a=0.5
            
            is_knockout = match_idx >= 48
            match_idx += 1
            
            t_row = base_rows[(ht, at)].copy()
            x_single = pd.DataFrame([t_row])[features_ord].astype(float)
            
            # -------------------------------------------------------------
            # PREDICTIONS
            # -------------------------------------------------------------
            
            # Baseline
            lam_h_base, lam_a_base = lam_lkp[(ht, at)]
            prob_base = list(calc_bivariate_probs(lam_h_base, lam_a_base))
            
            # Candidate A: Daily Real World
            r_A = t_row.copy()
            r_A['home_elo_pre'] = cand_a_elo[ht]; r_A['away_elo_pre'] = cand_a_elo[at]
            r_A['elo_diff'] = cand_a_elo[ht] - cand_a_elo[at]
            r_A['home_goals_scored_avg_L5'] = cand_a_stats[ht]['L5_gf'] / 5.0
            r_A['away_goals_scored_avg_L5'] = cand_a_stats[at]['L5_gf'] / 5.0
            r_A['home_win_rate_L10'] = cand_a_stats[ht]['L10_w'] / 10.0
            r_A['away_win_rate_L10'] = cand_a_stats[at]['L10_w'] / 10.0
            lam_h_A = max(0.01, float(model_h.predict(pd.DataFrame([r_A])[features_ord].astype(float))[0]))
            lam_a_A = max(0.01, float(model_a.predict(pd.DataFrame([r_A])[features_ord].astype(float))[0]))
            prob_A = list(calc_bivariate_probs(lam_h_A, lam_a_A))
            
            # Candidate B: Tournament Form (Blend 80% Static / 20% Tournament Form)
            r_B = t_row.copy()
            if cand_b_tform[ht]['matches'] > 0:
                h_tgf = cand_b_tform[ht]['gf'] / cand_b_tform[ht]['matches']
                r_B['home_goals_scored_avg_L5'] = 0.8 * r_B['home_goals_scored_avg_L5'] + 0.2 * h_tgf
            if cand_b_tform[at]['matches'] > 0:
                a_tgf = cand_b_tform[at]['gf'] / cand_b_tform[at]['matches']
                r_B['away_goals_scored_avg_L5'] = 0.8 * r_B['away_goals_scored_avg_L5'] + 0.2 * a_tgf
            lam_h_B = max(0.01, float(model_h.predict(pd.DataFrame([r_B])[features_ord].astype(float))[0]))
            lam_a_B = max(0.01, float(model_a.predict(pd.DataFrame([r_B])[features_ord].astype(float))[0]))
            prob_B = list(calc_bivariate_probs(lam_h_B, lam_a_B))
            
            # Candidate C: Tournament ELO (Blend 70% Global / 30% Tournament)
            r_C = t_row.copy()
            r_C['home_elo_pre'] = 0.7 * r_C['home_elo_pre'] + 0.3 * cand_c_elo[ht]
            r_C['away_elo_pre'] = 0.7 * r_C['away_elo_pre'] + 0.3 * cand_c_elo[at]
            r_C['elo_diff'] = r_C['home_elo_pre'] - r_C['away_elo_pre']
            lam_h_C = max(0.01, float(model_h.predict(pd.DataFrame([r_C])[features_ord].astype(float))[0]))
            lam_a_C = max(0.01, float(model_a.predict(pd.DataFrame([r_C])[features_ord].astype(float))[0]))
            prob_C = list(calc_bivariate_probs(lam_h_C, lam_a_C))
            
            # Candidate D & E: xG & Defensive Overperformance (Modifier to Lambda)
            h_xg_idx = (cand_d_xg[ht]['goals'] / cand_d_xg[ht]['xg']) if cand_d_xg[ht]['xg'] > 0 else 1.0
            a_xg_idx = (cand_d_xg[at]['goals'] / cand_d_xg[at]['xg']) if cand_d_xg[at]['xg'] > 0 else 1.0
            # Dampen the index so it doesn't explode
            h_xg_idx = min(1.2, max(0.8, h_xg_idx))
            a_xg_idx = min(1.2, max(0.8, a_xg_idx))
            lam_h_D = lam_h_base * h_xg_idx
            lam_a_D = lam_a_base * a_xg_idx
            prob_D = list(calc_bivariate_probs(lam_h_D, lam_a_D))
            
            # Candidate F: Dynamic Feature Weighting (Increases as tournament goes on)
            weight = 0.2 if not is_knockout else (0.4 if match_idx > 56 else 0.3)
            r_F = t_row.copy()
            if cand_b_tform[ht]['matches'] > 0:
                r_F['home_goals_scored_avg_L5'] = (1-weight) * r_F['home_goals_scored_avg_L5'] + weight * (cand_b_tform[ht]['gf'] / cand_b_tform[ht]['matches'])
            if cand_b_tform[at]['matches'] > 0:
                r_F['away_goals_scored_avg_L5'] = (1-weight) * r_F['away_goals_scored_avg_L5'] + weight * (cand_b_tform[at]['gf'] / cand_b_tform[at]['matches'])
            lam_h_F = max(0.01, float(model_h.predict(pd.DataFrame([r_F])[features_ord].astype(float))[0]))
            lam_a_F = max(0.01, float(model_a.predict(pd.DataFrame([r_F])[features_ord].astype(float))[0]))
            prob_F = list(calc_bivariate_probs(lam_h_F, lam_a_F))
            
            # Candidate G: Bayesian
            # Posterior mean = alpha / beta. We blend baseline and posterior.
            h_post_att = cand_g_alpha[ht]['attack'] / cand_g_beta[ht]
            a_post_def = cand_g_alpha[at]['defense'] / cand_g_beta[at]
            a_post_att = cand_g_alpha[at]['attack'] / cand_g_beta[at]
            h_post_def = cand_g_alpha[ht]['defense'] / cand_g_beta[ht]
            
            lam_h_G = (h_post_att + a_post_def) / 2.0
            lam_a_G = (a_post_att + h_post_def) / 2.0
            prob_G = list(calc_bivariate_probs(lam_h_G, lam_a_G))
            
            # Candidate H: Momentum Multiplier
            lam_h_H = lam_h_base * cand_h_mom[ht]
            lam_a_H = lam_a_base * cand_h_mom[at]
            prob_H = list(calc_bivariate_probs(lam_h_H, lam_a_H))
            
            # -------------------------------------------------------------
            # METRICS RECORDING
            # -------------------------------------------------------------
            def record(name, probs):
                try:
                    ll = log_loss([outcome], [probs], labels=[[1,0,0],[0,1,0],[0,0,1]])
                except:
                    # In case of exact 0 or 1 probs causing issues
                    ll = -np.sum(np.array(outcome) * np.log(np.array(probs) + 1e-15))
                    
                all_metrics.append({
                    'year': year, 'stage': 'Knockout' if is_knockout else 'Group',
                    'candidate': name,
                    'll': ll,
                    'brier_mc': np.sum((np.array(probs) - np.array(outcome))**2),
                    'rps': rps(probs, outcome_idx),
                    'acc': 1 if np.argmax(probs) == outcome_idx else 0
                })
                
            record('Baseline', prob_base)
            record('A_Daily_RW', prob_A)
            record('B_Tourn_Form', prob_B)
            record('C_Tourn_Elo', prob_C)
            record('D_xG_Mod', prob_D)
            record('F_Dyn_Weight', prob_F)
            record('G_Bayesian', prob_G)
            record('H_Momentum', prob_H)
            
            # -------------------------------------------------------------
            # STATE UPDATES (LEARNING)
            # -------------------------------------------------------------
            # Cand A
            p_home_elo = 1 / (1 + 10 ** ((cand_a_elo[at] - cand_a_elo[ht]) / 400))
            cand_a_elo[ht] += K * (w_h - p_home_elo)
            cand_a_elo[at] += K * (w_a - (1 - p_home_elo))
            cand_a_stats[ht]['L5_gf'] = cand_a_stats[ht]['L5_gf'] * 0.8 + hg
            cand_a_stats[at]['L5_gf'] = cand_a_stats[at]['L5_gf'] * 0.8 + ag
            cand_a_stats[ht]['L5_ga'] = cand_a_stats[ht]['L5_ga'] * 0.8 + ag
            cand_a_stats[at]['L5_ga'] = cand_a_stats[at]['L5_ga'] * 0.8 + hg
            cand_a_stats[ht]['L10_w'] = cand_a_stats[ht]['L10_w'] * 0.9 + w_h
            cand_a_stats[at]['L10_w'] = cand_a_stats[at]['L10_w'] * 0.9 + w_a
            
            # Cand B
            cand_b_tform[ht]['gf'] += hg; cand_b_tform[ht]['ga'] += ag; cand_b_tform[ht]['matches'] += 1
            cand_b_tform[at]['gf'] += ag; cand_b_tform[at]['ga'] += hg; cand_b_tform[at]['matches'] += 1
            
            # Cand C
            p_c_elo = 1 / (1 + 10 ** ((cand_c_elo[at] - cand_c_elo[ht]) / 400))
            cand_c_elo[ht] += K * (w_h - p_c_elo)
            cand_c_elo[at] += K * (w_a - (1 - p_c_elo))
            
            # Cand D
            cand_d_xg[ht]['goals'] += hg; cand_d_xg[ht]['xg'] += lam_h_base
            cand_d_xg[at]['goals'] += ag; cand_d_xg[at]['xg'] += lam_a_base
            
            # Cand G (Bayesian)
            cand_g_alpha[ht]['attack'] += hg
            cand_g_alpha[at]['defense'] += hg
            cand_g_alpha[at]['attack'] += ag
            cand_g_alpha[ht]['defense'] += ag
            cand_g_beta[ht] += 1
            cand_g_beta[at] += 1
            
            # Cand H (Momentum)
            if hg > lam_h_base + 0.5: cand_h_mom[ht] = min(1.10, cand_h_mom[ht] + 0.02)
            elif hg < lam_h_base - 0.5: cand_h_mom[ht] = max(0.90, cand_h_mom[ht] - 0.02)
            if ag > lam_a_base + 0.5: cand_h_mom[at] = min(1.10, cand_h_mom[at] + 0.02)
            elif ag < lam_a_base - 0.5: cand_h_mom[at] = max(0.90, cand_h_mom[at] - 0.02)

    df_res = pd.DataFrame(all_metrics)
    summary = df_res.groupby('candidate').agg({
        'brier_mc': 'mean',
        'll': 'mean',
        'rps': 'mean',
        'acc': 'mean'
    }).reset_index().sort_values('brier_mc')
    
    print("\n========= OVERALL METRICS =========")
    print(summary.to_string(index=False))
    
    md = "# Final Tournament Adaptation Benchmark Study\n\n"
    md += "## Aggregate Predictive Edge (Match Level)\n\n"
    md += summary.to_markdown(index=False) + "\n\n"
    
    md += "## Analysis & Verdict\n"
    baseline_brier = summary[summary['candidate'] == 'Baseline']['brier_mc'].values[0]
    best_cand = summary.iloc[0]
    
    if best_cand['candidate'] != 'Baseline' and best_cand['brier_mc'] < baseline_brier - 0.005:
        md += f"**Verdict:** {best_cand['candidate']} successfully broke the baseline ceiling and should be deployed to production.\n"
    else:
        md += "**Verdict:** None of the adaptive candidates robustly outperformed the frozen baseline. The baseline architecture remains the strongest mathematical approach, proving that attempting to 'learn' from the noise of a 7-match tournament leads to overfitting rather than true signal extraction.\n"

    with open("tournament_benchmark_results.md", "w") as f:
        f.write(md)
        
    print(f"\nCompleted in {time.time() - start_time:.1f}s")

if __name__ == "__main__":
    main()
