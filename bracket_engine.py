import numpy as np

def build_bracket(groups_data, lambda_lookup, champs, live_schedule=None):
    """
    groups_data is the structured_groups from DATA["structured_groups"]
    lambda_lookup is the expected goals dict for pairs
    champs is the Monte Carlo probabilities dataset
    """
    if not groups_data:
        return {}
    if live_schedule is None:
        live_schedule = []

    # Extract 1st, 2nd, and 3rd place teams
    firsts = {}
    seconds = {}
    thirds = []
    
    for g in groups_data:
        grp = g["group"]
        teams = g["teams"]
        if len(teams) >= 3:
            firsts[grp] = teams[0]["team"]
            seconds[grp] = teams[1]["team"]
            thirds.append({"team": teams[2]["team"], "group": grp, "prob": teams[2]["prob"]})
            
    thirds.sort(key=lambda x: x["prob"], reverse=True)
    best_thirds = thirds[:8]
    
    unassigned_thirds = list(best_thirds)
    def pop_third(allowed_groups):
        for i, t in enumerate(unassigned_thirds):
            if t["group"] in allowed_groups:
                return unassigned_thirds.pop(i)["team"]
        if unassigned_thirds:
            return unassigned_thirds.pop(0)["team"]
        return "TBD"

    # Define the 16 R32 matches
    m_L1 = (firsts.get("A", "1A"), pop_third(["C", "E", "F", "H", "I"])) # M79
    m_L2 = (firsts.get("F", "1F"), seconds.get("C", "2C"))               # M76
    m_L3 = (firsts.get("E", "1E"), pop_third(["A", "B", "C", "D", "F"])) # M75
    m_L4 = (seconds.get("A", "2A"), seconds.get("B", "2B"))              # M73
    m_L5 = (firsts.get("I", "1I"), pop_third(["C", "D", "F", "G", "H"])) # M78
    m_L6 = (seconds.get("E", "2E"), seconds.get("I", "2I"))              # M77
    m_L7 = (firsts.get("G", "1G"), pop_third(["A", "E", "H", "I", "J"])) # M81
    m_L8 = (firsts.get("D", "1D"), pop_third(["B", "E", "F", "I", "J"])) # M82

    m_R1 = (firsts.get("B", "1B"), pop_third(["E", "F", "G", "I", "J"])) # M85
    m_R2 = (firsts.get("C", "1C"), seconds.get("F", "2F"))               # M74
    m_R3 = (firsts.get("H", "1H"), seconds.get("J", "2J"))               # M83
    m_R4 = (firsts.get("J", "1J"), seconds.get("H", "2H"))               # M87
    m_R5 = (firsts.get("K", "1K"), pop_third(["D", "E", "I", "J", "L"])) # M88
    m_R6 = (firsts.get("L", "1L"), pop_third(["E", "H", "I", "J", "K"])) # M80
    m_R7 = (seconds.get("K", "2K"), seconds.get("L", "2L"))              # M84
    m_R8 = (seconds.get("D", "2D"), seconds.get("G", "2G"))              # M86

    r32_mapping = {
        79: m_L1, 76: m_L2, 75: m_L3, 73: m_L4,
        78: m_L5, 77: m_L6, 81: m_L7, 82: m_L8,
        85: m_R1, 74: m_R2, 83: m_R3, 87: m_R4,
        88: m_R5, 80: m_R6, 84: m_R7, 86: m_R8
    }

    live_dict = {m['match_number']: m for m in live_schedule}
    
    def is_real_team(t):
        if not t: return False
        t_str = str(t)
        return not any(x in t_str for x in ["Winner", "Runner-up", "3rd Place", "TBD", "Match"])

    hybrid_r32 = []
    r32_order = [79, 76, 75, 73, 78, 77, 81, 82, 85, 74, 83, 87, 88, 80, 84, 86]
    
    for m_num in r32_order:
        pred_a, pred_b = r32_mapping[m_num]
        live_m = live_dict.get(m_num, {})
        live_a = live_m.get('team_a')
        live_b = live_m.get('team_b')
        
        final_a = live_a if is_real_team(live_a) else pred_a
        final_b = live_b if is_real_team(live_b) else pred_b
        
        hybrid_r32.append((final_a, final_b, m_num))

    probs_map = { t["team"]: t for t in champs }
    
    def simulate_match(t1, t2, round_key, match_number=None):
        live_m = live_dict.get(match_number, {}) if match_number else {}
        if live_m.get('status') == 'completed':
            live_a = live_m.get('team_a')
            live_winner = live_m.get('winner')
            # If the DB says home won, we use t1, else t2
            resolved_winner = t1 if live_winner == live_a else t2
            return {
                "winner": resolved_winner,
                "home": t1,
                "away": t2,
                "score_home": live_m.get('home_score', 0),
                "score_away": live_m.get('away_score', 0)
            }
            
        if (t1, t2) in lambda_lookup:
            lam1, lam2 = lambda_lookup[(t1, t2)]
        elif (t2, t1) in lambda_lookup:
            lam2, lam1 = lambda_lookup[(t2, t1)]
        else:
            lam1, lam2 = 1.2, 1.2
            
        p1 = probs_map.get(t1, {}).get(round_key, 0.0)
        p2 = probs_map.get(t2, {}).get(round_key, 0.0)
        
        lam1_f = float(lam1)
        lam2_f = float(lam2)
        
        if p1 >= p2:
            sh = max(lam1_f, lam2_f)
            sa = min(lam1_f, lam2_f)
            return {"winner": t1, "home": t1, "away": t2, "score_home": round(sh, 1), "score_away": round(sa, 1)}
        else:
            sh = min(lam1_f, lam2_f)
            sa = max(lam1_f, lam2_f)
            return {"winner": t2, "home": t1, "away": t2, "score_home": round(sh, 1), "score_away": round(sa, 1)}

    rounds = {"r32": [], "r16": [], "qf": [], "sf": [], "final": []}
    
    # Simulate R32
    r16_teams = []
    for i, (t1, t2, m_num) in enumerate(hybrid_r32):
        res = simulate_match(t1, t2, "round_of_16_probability", m_num)
        rounds["r32"].append({"id": i, **res})
        r16_teams.append(res["winner"])
        
    # Simulate R16
    r16_order = [89, 90, 91, 92, 93, 94, 95, 96]
    qf_teams = []
    for i in range(0, 16, 2):
        m_num = r16_order[i//2]
        res = simulate_match(r16_teams[i], r16_teams[i+1], "quarter_final_probability", m_num)
        rounds["r16"].append({"id": 16 + (i//2), **res})
        qf_teams.append(res["winner"])
        
    # Simulate QF
    qf_order = [97, 98, 99, 100]
    sf_teams = []
    for i in range(0, 8, 2):
        m_num = qf_order[i//2]
        res = simulate_match(qf_teams[i], qf_teams[i+1], "semi_final_probability", m_num)
        rounds["qf"].append({"id": 24 + (i//2), **res})
        sf_teams.append(res["winner"])
        
    # Simulate SF
    sf_order = [101, 102]
    final_teams = []
    for i in range(0, 4, 2):
        m_num = sf_order[i//2]
        res = simulate_match(sf_teams[i], sf_teams[i+1], "final_probability", m_num)
        rounds["sf"].append({"id": 28 + (i//2), **res})
        final_teams.append(res["winner"])
        
    # Simulate Final
    res = simulate_match(final_teams[0], final_teams[1], "champion_probability", 104)
    rounds["final"].append({"id": 30, **res})
    
    rounds["champion"] = res["winner"]
    return rounds
