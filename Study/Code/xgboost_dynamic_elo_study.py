import sys
import os
import pandas as pd
import numpy as np
import joblib
import time
from scipy.stats import poisson
from sklearn.metrics import log_loss, brier_score_loss, accuracy_score
import category_encoders as ce
from tqdm import tqdm

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
    2014: {"start": "2014-06-12", "end": "2014-07-13", "winner": "Germany"},
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

def resolve_group(standings):
    standings.sort(key=lambda x: (x['pts'], x['gd'], x['gf'], np.random.random()), reverse=True)
    return standings

def main():
    start_time = time.time()
    from Study.Code.historical_backtester import generate_frozen_features, infer_groups
    
    df_r = pd.read_csv(base + "results.csv")
    df_r["date"] = pd.to_datetime(df_r["date"])
    df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    model_h = joblib.load("tuned_best_model_home.joblib")
    model_a = joblib.load("tuned_best_model_away.joblib")
    
    df_train_full = pd.read_csv("final_training_dataset.csv")
    features_ord = [c for c in df_train_full.columns if c not in ['match_id', 'date', 'home_score', 'away_score', 'result', 'goal_diff', 'neutral']] + ['neutral']
    
    K = 60
    all_metrics = []
    mc_results = {}
    
    for year, meta in TOURNAMENTS.items():
        print(f"\n======================================")
        print(f"Running XGBoost Dynamic Study for WC {year}...")
        
        start_date = meta['start']
        end_date = meta['end']
        
        actual_matches = df_r[(df_r['tournament'] == 'FIFA World Cup') & (df_r['date'] >= start_date) & (df_r['date'] <= end_date)].sort_values('date')
        
        lam_lkp, shoot_lkp, df_pred_raw = generate_frozen_features(start_date, actual_matches)
        
        groups = infer_groups(actual_matches)
        all_teams = [t for g in groups.values() for t in g]
        
        # Build static_elo
        df_e = pd.read_csv(base + "eloratings.csv")
        df_e["team"] = df_e["team"].str.replace("\xa0", " ", regex=False).map(lambda x: TEAM_NAME_MAP.get(x, x))
        df_e["elo_date"] = pd.to_datetime(df_e["date"], format="mixed", dayfirst=False)
        static_elo = {}
        for t in all_teams:
            t_elo = df_e[(df_e['team'] == t) & (df_e['elo_date'] < pd.to_datetime(start_date))].sort_values("elo_date")
            static_elo[t] = t_elo.iloc[-1]['rating'] if len(t_elo) > 0 else 1500
            
        dynamic_elo = dict(static_elo)
        
        teams_list = list(set(actual_matches["home_team"].unique()).union(set(actual_matches["away_team"].unique())))
        matchups = [(t1, t2) for t1 in teams_list for t2 in teams_list if t1 != t2]
        
        # Base rows dict mapping (ht, at) string tuple to df_pred_raw row
        base_rows = {}
        for i, row in df_pred_raw.iterrows():
            ht, at = matchups[i]
            base_rows[(ht, at)] = row.copy()
            
        match_idx = 0
        for _, m in actual_matches.iterrows():
            ht, at = m['home_team'], m['away_team']
            hg, ag = m['home_score'], m['away_score']
            
            if hg > ag: outcome = [1, 0, 0]; w_h = 1; w_a = 0
            elif hg < ag: outcome = [0, 0, 1]; w_h = 0; w_a = 1
            else: outcome = [0, 1, 0]; w_h = 0.5; w_a = 0.5
            
            is_knockout = match_idx >= 48
            match_idx += 1
            
            lam_h_static, lam_a_static = lam_lkp[(ht, at)]
            s_pred = list(calc_bivariate_probs(lam_h_static, lam_a_static))
            
            t_row = base_rows[(ht, at)].copy()
            t_row['home_elo_pre'] = dynamic_elo[ht]
            t_row['away_elo_pre'] = dynamic_elo[at]
            t_row['elo_diff'] = dynamic_elo[ht] - dynamic_elo[at]
            
            x_single = pd.DataFrame([t_row])[features_ord].astype(float)
            lam_h_dyn = max(0.01, float(model_h.predict(x_single)[0]))
            lam_a_dyn = max(0.01, float(model_a.predict(x_single)[0]))
            
            d_pred = list(calc_bivariate_probs(lam_h_dyn, lam_a_dyn))
                
            # Metrics
            s_brier = np.sum((np.array(s_pred) - outcome)**2)
            d_brier = np.sum((np.array(d_pred) - outcome)**2)
            
            s_logloss = -np.sum(np.array(outcome) * np.log(np.array(s_pred) + 1e-15))
            d_logloss = -np.sum(np.array(outcome) * np.log(np.array(d_pred) + 1e-15))
            
            s_acc = 1 if np.argmax(s_pred) == np.argmax(outcome) else 0
            d_acc = 1 if np.argmax(d_pred) == np.argmax(outcome) else 0
            
            all_metrics.append({
                'year': year, 'stage': 'Knockout' if is_knockout else 'Group',
                's_brier': s_brier, 'd_brier': d_brier,
                's_ll': s_logloss, 'd_ll': d_logloss,
                's_acc': s_acc, 'd_acc': d_acc
            })
            
            # Dynamic Update (using ELO probability formula for the update magnitude)
            p_home_elo = 1 / (1 + 10 ** ((dynamic_elo[at] - dynamic_elo[ht]) / 400))
            p_away_elo = 1 - p_home_elo
            dynamic_elo[ht] += K * (w_h - p_home_elo)
            dynamic_elo[at] += K * (w_a - p_away_elo)
            
        # ---------------------------------------------------------
        # PART 2: MONTE CARLO SIMULATION
        # ---------------------------------------------------------
        N_SIMS = 1000
        print(f"Running {N_SIMS} Monte Carlo sims for {year} (Static vs Dynamic XGBoost)...")
        
        s_agg = {t: 0 for t in all_teams}
        d_agg = {t: 0 for t in all_teams}
        
        # Precompute the base rows for every matchup to make MC fast
        base_rows = {}
        for ht in all_teams:
            for at in all_teams:
                if ht == at: continue
                for idx, r in df_pred_raw.iterrows():
                    if abs(r['home_elo_pre'] - static_elo[ht]) < 1 and abs(r['away_elo_pre'] - static_elo[at]) < 1:
                        base_rows[(ht, at)] = r.copy()
                        break
        
        def play_match_static(ht, at, is_ko=False):
            lam_h, lam_a = lam_lkp[(ht, at)]
            hg = np.random.poisson(lam_h)
            ag = np.random.poisson(lam_a)
            if hg > ag: return ht, hg, ag
            if ag > hg: return at, hg, ag
            if is_ko:
                hge = np.random.poisson(lam_h / 3.0)
                age = np.random.poisson(lam_a / 3.0)
                if hge > age: return ht, hg, ag
                if age > hge: return at, hg, ag
                w = ht if np.random.random() < shoot_lkp[(ht, at)] else at
                return w, hg, ag
            return "DRAW", hg, ag
            
        def play_match_dynamic(ht, at, current_elo, is_ko=False):
            t_row = base_rows.get((ht, at))
            if t_row is None:
                lam_h, lam_a = lam_lkp[(ht, at)]
            else:
                t_row['home_elo_pre'] = current_elo[ht]
                t_row['away_elo_pre'] = current_elo[at]
                t_row['elo_diff'] = current_elo[ht] - current_elo[at]
                x_single = pd.DataFrame([t_row])[features_ord].astype(float)
                lam_h = max(0.01, float(model_h.predict(x_single)[0]))
                lam_a = max(0.01, float(model_a.predict(x_single)[0]))
                
            hg = np.random.poisson(lam_h)
            ag = np.random.poisson(lam_a)
            
            if hg > ag: w = ht; w_h, w_a = 1, 0
            elif ag > hg: w = at; w_h, w_a = 0, 1
            else:
                w = "DRAW"; w_h, w_a = 0.5, 0.5
                if is_ko:
                    hge = np.random.poisson(lam_h / 3.0)
                    age = np.random.poisson(lam_a / 3.0)
                    if hge > age: w = ht
                    elif age > hge: w = at
                    else: w = ht if np.random.random() < shoot_lkp[(ht, at)] else at
                    
            p_home_elo = 1 / (1 + 10 ** ((current_elo[at] - current_elo[ht]) / 400))
            current_elo[ht] += K * (w_h - p_home_elo)
            current_elo[at] += K * (w_a - (1 - p_home_elo))
            
            return w, hg, ag
            
        # Run Static Sims
        for _ in tqdm(range(N_SIMS), desc="Static MC"):
            group_standings = {g: [{'team': t, 'pts':0, 'gd':0, 'gf':0} for t in teams] for g, teams in groups.items()}
            t_dict = {t: next(s for s in group_standings[g] if s['team'] == t) for g in groups for t in groups[g]}
            
            for g, teams in groups.items():
                for i in range(len(teams)):
                    for j in range(i+1, len(teams)):
                        ht, at = teams[i], teams[j]
                        w, hg, ag = play_match_static(ht, at)
                        t_dict[ht]['gf']+=hg; t_dict[ht]['gd']+=(hg-ag)
                        t_dict[at]['gf']+=ag; t_dict[at]['gd']+=(ag-hg)
                        if w == ht: t_dict[ht]['pts']+=3
                        elif w == at: t_dict[at]['pts']+=3
                        else: t_dict[ht]['pts']+=1; t_dict[at]['pts']+=1
            
            g_winners, g_runners = {}, {}
            for g, st in group_standings.items():
                st = resolve_group(st)
                g_winners[g] = st[0]['team']
                g_runners[g] = st[1]['team']
                
            r16 = [(g_winners['A'], g_runners['B']), (g_winners['C'], g_runners['D']), (g_winners['E'], g_runners['F']), (g_winners['G'], g_runners['H']),
                   (g_winners['B'], g_runners['A']), (g_winners['D'], g_runners['C']), (g_winners['F'], g_runners['E']), (g_winners['H'], g_runners['G'])]
                   
            qf_teams = [play_match_static(ht, at, True)[0] for ht, at in r16]
            qf = [(qf_teams[0], qf_teams[1]), (qf_teams[2], qf_teams[3]), (qf_teams[4], qf_teams[5]), (qf_teams[6], qf_teams[7])]
            sf_teams = [play_match_static(ht, at, True)[0] for ht, at in qf]
            sf = [(sf_teams[0], sf_teams[1]), (sf_teams[2], sf_teams[3])]
            final_teams = [play_match_static(ht, at, True)[0] for ht, at in sf]
            champ = play_match_static(final_teams[0], final_teams[1], True)[0]
            s_agg[champ] += 1

        # Run Dynamic Sims
        for _ in tqdm(range(N_SIMS), desc="Dynamic MC"):
            sim_elo = dict(static_elo)
            group_standings = {g: [{'team': t, 'pts':0, 'gd':0, 'gf':0} for t in teams] for g, teams in groups.items()}
            t_dict = {t: next(s for s in group_standings[g] if s['team'] == t) for g in groups for t in groups[g]}
            
            for g, teams in groups.items():
                for i in range(len(teams)):
                    for j in range(i+1, len(teams)):
                        ht, at = teams[i], teams[j]
                        w, hg, ag = play_match_dynamic(ht, at, sim_elo)
                        t_dict[ht]['gf']+=hg; t_dict[ht]['gd']+=(hg-ag)
                        t_dict[at]['gf']+=ag; t_dict[at]['gd']+=(ag-hg)
                        if w == ht: t_dict[ht]['pts']+=3
                        elif w == at: t_dict[at]['pts']+=3
                        else: t_dict[ht]['pts']+=1; t_dict[at]['pts']+=1
            
            g_winners, g_runners = {}, {}
            for g, st in group_standings.items():
                st = resolve_group(st)
                g_winners[g] = st[0]['team']
                g_runners[g] = st[1]['team']
                
            r16 = [(g_winners['A'], g_runners['B']), (g_winners['C'], g_runners['D']), (g_winners['E'], g_runners['F']), (g_winners['G'], g_runners['H']),
                   (g_winners['B'], g_runners['A']), (g_winners['D'], g_runners['C']), (g_winners['F'], g_runners['E']), (g_winners['H'], g_runners['G'])]
                   
            qf_teams = [play_match_dynamic(ht, at, sim_elo, True)[0] for ht, at in r16]
            qf = [(qf_teams[0], qf_teams[1]), (qf_teams[2], qf_teams[3]), (qf_teams[4], qf_teams[5]), (qf_teams[6], qf_teams[7])]
            sf_teams = [play_match_dynamic(ht, at, sim_elo, True)[0] for ht, at in qf]
            sf = [(sf_teams[0], sf_teams[1]), (sf_teams[2], sf_teams[3])]
            final_teams = [play_match_dynamic(ht, at, sim_elo, True)[0] for ht, at in sf]
            champ = play_match_dynamic(final_teams[0], final_teams[1], sim_elo, True)[0]
            d_agg[champ] += 1
            
        mc_results[year] = {
            'static': s_agg,
            'dynamic': d_agg,
            'actual_winner': meta['winner']
        }
        
    # Generate Output
    df_metrics = pd.DataFrame(all_metrics)
    
    md = "# Conclusive Study: XGBoost + Dynamic Elo\n\n"
    
    md += "## Part 1: Match-Level Accuracy (XGBoost)\n"
    avg_s_brier = df_metrics['s_brier'].mean()
    avg_d_brier = df_metrics['d_brier'].mean()
    avg_s_ll = df_metrics['s_ll'].mean()
    avg_d_ll = df_metrics['d_ll'].mean()
    avg_s_acc = df_metrics['s_acc'].mean()
    avg_d_acc = df_metrics['d_acc'].mean()
    
    md += f"- **Static XGBoost:** Brier: {avg_s_brier:.4f} | LogLoss: {avg_s_ll:.4f} | Accuracy: {avg_s_acc:.1%}\n"
    md += f"- **Dynamic XGBoost:** Brier: {avg_d_brier:.4f} | LogLoss: {avg_d_ll:.4f} | Accuracy: {avg_d_acc:.1%}\n\n"
    
    group = df_metrics[df_metrics['stage'] == 'Group']
    ko = df_metrics[df_metrics['stage'] == 'Knockout']
    md += f"- **Group Stage Static:** Brier: {group['s_brier'].mean():.4f} | LogLoss: {group['s_ll'].mean():.4f} | Acc: {group['s_acc'].mean():.1%}\n"
    md += f"- **Group Stage Dynamic:** Brier: {group['d_brier'].mean():.4f} | LogLoss: {group['d_ll'].mean():.4f} | Acc: {group['d_acc'].mean():.1%}\n"
    md += f"- **Knockout Stage Static:** Brier: {ko['s_brier'].mean():.4f} | LogLoss: {ko['s_ll'].mean():.4f} | Acc: {ko['s_acc'].mean():.1%}\n"
    md += f"- **Knockout Stage Dynamic:** Brier: {ko['d_brier'].mean():.4f} | LogLoss: {ko['d_ll'].mean():.4f} | Acc: {ko['d_acc'].mean():.1%}\n\n"
    
    md += "## Part 2: Monte Carlo Tournament Winners (N=1000)\n"
    for year, res in mc_results.items():
        actual = res['actual_winner']
        md += f"### World Cup {year} (Winner: {actual})\n"
        
        s_prob = res['static'].get(actual, 0) / 1000.0
        d_prob = res['dynamic'].get(actual, 0) / 1000.0
        
        md += f"- Probability of {actual} winning under **Static**: {s_prob:.1%}\n"
        md += f"- Probability of {actual} winning under **Dynamic**: {d_prob:.1%}\n\n"
        
    with open("xgboost_dynamic_elo_study.md", "w") as f:
        f.write(md)
        
    print(f"Study completed in {time.time() - start_time:.1f}s")

if __name__ == "__main__":
    main()
