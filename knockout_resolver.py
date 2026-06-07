import pandas as pd
import database
import random

def resolve_standings():
    df_wc = pd.read_csv("Dataset/world-cup-2026-schedule.csv")
    completed = database.get_completed_matches()
    
    # 1. Determine group structures
    groups = df_wc[df_wc['status'] == 'confirmed_group_fixture'].groupby('group')
    group_teams = {name: set(g['team_a']).union(set(g['team_b'])) for name, g in groups}
    
    standings = {g: {t: {'pts':0, 'gd':0, 'gf':0, 'ga':0, 'played':0} for t in teams} for g, teams in group_teams.items()}
    
    # 2. Add completed match results
    for m in completed:
        if m['stage'] == 'Group Stage':
            ht, at = m['home_team'], m['away_team']
            hs, as_ = m['home_score'], m['away_score']
            
            g = None
            for grp, teams in group_teams.items():
                if ht in teams:
                    g = grp
                    break
            
            if g:
                standings[g][ht]['gf'] += hs
                standings[g][ht]['ga'] += as_
                standings[g][ht]['gd'] += (hs - as_)
                standings[g][ht]['played'] += 1
                
                standings[g][at]['gf'] += as_
                standings[g][at]['ga'] += hs
                standings[g][at]['gd'] += (as_ - hs)
                standings[g][at]['played'] += 1
                
                if hs > as_:
                    standings[g][ht]['pts'] += 3
                elif as_ > hs:
                    standings[g][at]['pts'] += 3
                else:
                    standings[g][ht]['pts'] += 1
                    standings[g][at]['pts'] += 1
                    
    # 3. Resolve Placements
    resolved = {}
    thirds = []
    groups_finished = 0
    
    for g, teams_stats in standings.items():
        # Each team plays 3 matches -> 12 total "played" increments per group
        if sum(t['played'] for t in teams_stats.values()) == 12:
            groups_finished += 1
            sorted_teams = sorted(teams_stats.items(), key=lambda x: (x[1]['pts'], x[1]['gd'], x[1]['gf']), reverse=True)
            resolved[f"Group {g} Winner"] = sorted_teams[0][0]
            resolved[f"Group {g} Runner-up"] = sorted_teams[1][0]
            thirds.append({'team': sorted_teams[2][0], 'pts': sorted_teams[2][1]['pts'], 'gd': sorted_teams[2][1]['gd'], 'gf': sorted_teams[2][1]['gf']})
            
    if groups_finished == len(group_teams):
        # All 12 groups finished. Best 8 thirds advance.
        thirds.sort(key=lambda x: (x['pts'], x['gd'], x['gf']), reverse=True)
        best_thirds = [t['team'] for t in thirds[:8]]
        
        # Simplified third place assignment
        tba_thirds = ["Group A/B/C/D/F 3rd Place", "Group C/D/F/G/H 3rd Place", "Group C/D/E/F/I/J 3rd Place", 
                     "Group E/F/G/H/I/J 3rd Place", "Group A/B/C/D/E/F 3rd Place", "Group G/H/I/J/K/L 3rd Place",
                     "Group E/F/G/H/I/L 3rd Place", "Group A/B/C/D/K/L 3rd Place"]
        
        for i, tba_str in enumerate(tba_thirds):
            if i < len(best_thirds):
                resolved[tba_str] = best_thirds[i]
                
    # 4. Resolve further knockouts (e.g. "Winner Match 73")
    completed_lookup = {str(m['match_id']): m['winner'] for m in completed}
    
    for _, row in df_wc.iterrows():
        mid = str(row['match_number'])
        if mid in completed_lookup:
            winner_char = completed_lookup[mid] # 'H' or 'A' or 'D'
            actual_winner = row['team_a'] if winner_char == 'H' else row['team_b']
            resolved[f"Winner Match {mid}"] = actual_winner
            
    completed_details = {str(m['match_id']): m for m in completed}
    
    # 5. Build live schedule
    df_wc = df_wc.fillna("")
    
    live_schedule = []
    for _, row in df_wc.iterrows():
        m_dict = row.to_dict()
        
        # Replace if resolved
        ta = m_dict.get('team_a')
        tb = m_dict.get('team_b')
        
        if ta in resolved:
            m_dict['team_a'] = resolved[ta]
        elif ta and isinstance(ta, str) and ta.startswith("Winner Match"):
            m_dict['team_a'] = resolved.get(ta, ta)
            
        if tb in resolved:
            m_dict['team_b'] = resolved[tb]
        elif tb and isinstance(tb, str) and tb.startswith("Winner Match"):
            m_dict['team_b'] = resolved.get(tb, tb)
            
        # Update status if completed
        mid = str(m_dict['match_number'])
        if mid in completed_details:
            m_dict['status'] = 'completed'
            c_match = completed_details[mid]
            m_dict['home_score'] = c_match.get('home_score')
            m_dict['away_score'] = c_match.get('away_score')
            winner_char = c_match.get('winner')
            if winner_char == 'H':
                m_dict['winner'] = m_dict['team_a']
            elif winner_char == 'A':
                m_dict['winner'] = m_dict['team_b']
            else:
                m_dict['winner'] = "Draw"
            
        live_schedule.append(m_dict)
        
    return live_schedule

if __name__ == "__main__":
    schedule = resolve_standings()
    print("Resolved live schedule length:", len(schedule))
