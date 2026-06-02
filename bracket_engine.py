import numpy as np

def build_bracket(groups_data, lambda_lookup, champs):
    """
    groups_data is the structured_groups from DATA["structured_groups"]
    lambda_lookup is the expected goals dict for pairs
    champs is the Monte Carlo probabilities dataset
    """
    if not groups_data:
        return {}

    # 1. Extract 1st, 2nd, and 3rd place teams
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
            
    # Sort thirds by prob to get top 8
    thirds.sort(key=lambda x: x["prob"], reverse=True)
    best_thirds = thirds[:8]
    
    unassigned_thirds = list(best_thirds)
    def pop_third(allowed_groups):
        # greedy assignment
        for i, t in enumerate(unassigned_thirds):
            if t["group"] in allowed_groups:
                return unassigned_thirds.pop(i)["team"]
        if unassigned_thirds:
            return unassigned_thirds.pop(0)["team"]
        return "TBD"

    # Define the 16 R32 matches
    # We will order them such that M0 & M1 feed into R16 M0, etc.
    # L1 to L8:
    m_L1 = (firsts.get("A", "1A"), pop_third(["C", "E", "F", "H", "I"])) # M79
    m_L2 = (firsts.get("F", "1F"), seconds.get("C", "2C"))               # M76
    m_L3 = (firsts.get("E", "1E"), pop_third(["A", "B", "C", "D", "F"])) # M75
    m_L4 = (seconds.get("A", "2A"), seconds.get("B", "2B"))              # M73
    m_L5 = (firsts.get("I", "1I"), pop_third(["C", "D", "F", "G", "H"])) # M78
    m_L6 = (seconds.get("E", "2E"), seconds.get("I", "2I"))              # M77
    m_L7 = (firsts.get("G", "1G"), pop_third(["A", "E", "H", "I", "J"])) # M81
    m_L8 = (firsts.get("D", "1D"), pop_third(["B", "E", "F", "I", "J"])) # M82

    # R1 to R8:
    m_R1 = (firsts.get("B", "1B"), pop_third(["E", "F", "G", "I", "J"])) # M85
    m_R2 = (firsts.get("C", "1C"), seconds.get("F", "2F"))               # M74
    m_R3 = (firsts.get("H", "1H"), seconds.get("J", "2J"))               # M83
    m_R4 = (firsts.get("J", "1J"), seconds.get("H", "2H"))               # M87
    m_R5 = (firsts.get("K", "1K"), pop_third(["D", "E", "I", "J", "L"])) # M88
    m_R6 = (firsts.get("L", "1L"), pop_third(["E", "H", "I", "J", "K"])) # M80
    m_R7 = (seconds.get("K", "2K"), seconds.get("L", "2L"))              # M84
    m_R8 = (seconds.get("D", "2D"), seconds.get("G", "2G"))              # M86

    r32_matchups = [
        m_L1, m_L2, m_L3, m_L4, m_L5, m_L6, m_L7, m_L8,
        m_R1, m_R2, m_R3, m_R4, m_R5, m_R6, m_R7, m_R8
    ]
    
    probs_map = { t["team"]: t for t in champs }
    
    # 2. Simulate logic
    def simulate_match(t1, t2, round_key):
        if (t1, t2) in lambda_lookup:
            lam1, lam2 = lambda_lookup[(t1, t2)]
        elif (t2, t1) in lambda_lookup:
            lam2, lam1 = lambda_lookup[(t2, t1)]
        else:
            lam1, lam2 = 1.2, 1.2 # fallback
            
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
    for i, (t1, t2) in enumerate(r32_matchups):
        res = simulate_match(t1, t2, "round_of_16_probability")
        rounds["r32"].append({"id": i, **res})
        r16_teams.append(res["winner"])
        
    # Simulate R16
    qf_teams = []
    for i in range(0, 16, 2):
        res = simulate_match(r16_teams[i], r16_teams[i+1], "quarter_final_probability")
        rounds["r16"].append({"id": 16 + (i//2), **res})
        qf_teams.append(res["winner"])
        
    # Simulate QF
    sf_teams = []
    for i in range(0, 8, 2):
        res = simulate_match(qf_teams[i], qf_teams[i+1], "semi_final_probability")
        rounds["qf"].append({"id": 24 + (i//2), **res})
        sf_teams.append(res["winner"])
        
    # Simulate SF
    final_teams = []
    for i in range(0, 4, 2):
        res = simulate_match(sf_teams[i], sf_teams[i+1], "final_probability")
        rounds["sf"].append({"id": 28 + (i//2), **res})
        final_teams.append(res["winner"])
        
    # Simulate Final
    res = simulate_match(final_teams[0], final_teams[1], "champion_probability")
    rounds["final"].append({"id": 30, **res})
    
    rounds["champion"] = res["winner"]
    return rounds
