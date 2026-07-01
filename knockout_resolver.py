import pandas as pd
import database
import random

def get_standings():
    df_wc = pd.read_csv("Dataset/world-cup-2026-schedule.csv")
    completed = database.get_completed_matches()
    
    groups = df_wc[df_wc['status'] == 'confirmed_group_fixture'].groupby('group')
    group_teams = {name: set(g['team_a']).union(set(g['team_b'])) for name, g in groups}
    
    standings = {g: {t: {'pts':0, 'gd':0, 'gf':0, 'ga':0, 'played':0, 'w':0, 'd':0, 'l':0, 'yellow_cards':0, 'red_cards':0} for t in teams} for g, teams in group_teams.items()}
    
    import json
    
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
                    standings[g][ht]['w'] += 1
                    standings[g][at]['l'] += 1
                elif as_ > hs:
                    standings[g][at]['pts'] += 3
                    standings[g][at]['w'] += 1
                    standings[g][ht]['l'] += 1
                else:
                    standings[g][ht]['pts'] += 1
                    standings[g][at]['pts'] += 1
                    standings[g][ht]['d'] += 1
                    standings[g][at]['d'] += 1
                    
                try:
                    if m.get('cards'):
                        cards = json.loads(m['cards'])
                        for c in cards:
                            c_team = c.get('team')
                            c_type = c.get('type')
                            if c_team and c_team in standings[g]:
                                if c_type == 'yellow': standings[g][c_team]['yellow_cards'] += 1
                                elif c_type == 'red': standings[g][c_team]['red_cards'] += 1
                except Exception:
                    pass
                    
    return standings, group_teams, completed

import os
_fifa_rank_cache = {}

def get_fifa_rank(team_name):
    global _fifa_rank_cache
    if not _fifa_rank_cache:
        try:
            df_ranks = pd.read_csv("Dataset/fifa_mens_rank.csv")
            for _, row in df_ranks.iterrows():
                _fifa_rank_cache[row['team']] = int(row['rank'])
        except Exception:
            pass
    return _fifa_rank_cache.get(team_name, 999)

def get_fair_play_pts(stats):
    return -(stats.get('yellow_cards', 0) * 1 + stats.get('red_cards', 0) * 4)

def get_h2h_stats(team, tied_teams, completed_matches):
    h2h_pts = 0
    h2h_gd = 0
    h2h_gf = 0
    for m in completed_matches:
        if m['stage'] == 'Group Stage':
            ht, at = m['home_team'], m['away_team']
            if ht in tied_teams and at in tied_teams:
                hs, as_ = m['home_score'], m['away_score']
                if ht == team:
                    h2h_gf += hs
                    h2h_gd += (hs - as_)
                    if hs > as_: h2h_pts += 3
                    elif hs == as_: h2h_pts += 1
                elif at == team:
                    h2h_gf += as_
                    h2h_gd += (as_ - hs)
                    if as_ > hs: h2h_pts += 3
                    elif hs == as_: h2h_pts += 1
    return h2h_pts, h2h_gd, h2h_gf

def sort_tied_teams(teams_stats, completed_matches):
    # teams_stats is a dict of {team_name: stats}
    # Group teams by overall points
    from collections import defaultdict
    pts_groups = defaultdict(list)
    for team, stats in teams_stats.items():
        pts_groups[stats['pts']].append(team)
        
    sorted_teams = []
    # Sort points descending
    for pts in sorted(pts_groups.keys(), reverse=True):
        tied_teams = pts_groups[pts]
        
        if len(tied_teams) == 1:
            sorted_teams.append((tied_teams[0], teams_stats[tied_teams[0]]))
        else:
            # We have tied teams, sort them using Phase 1-4 tiebreakers
            def sort_key(team):
                stats = teams_stats[team]
                h2h_pts, h2h_gd, h2h_gf = get_h2h_stats(team, set(tied_teams), completed_matches)
                overall_gd = stats['gd']
                overall_gf = stats['gf']
                fair_play = get_fair_play_pts(stats)
                fifa_rank = get_fifa_rank(team)
                
                return (
                    h2h_pts,
                    h2h_gd,
                    h2h_gf,
                    overall_gd,
                    overall_gf,
                    fair_play,
                    -fifa_rank # Lower rank is better
                )
                
            # Sort the tied teams
            tied_sorted = sorted(tied_teams, key=sort_key, reverse=True)
            for t in tied_sorted:
                sorted_teams.append((t, teams_stats[t]))
                
    return sorted_teams

def resolve_standings():
    df_wc = pd.read_csv("Dataset/world-cup-2026-schedule.csv")
    completed = database.get_completed_matches()
    
    standings, group_teams, completed_group_matches = get_standings()
                    
    # 3. Resolve Placements
    resolved = {}
    thirds = []
    groups_finished = 0
    
    for g, teams_stats in standings.items():
        # Each team plays 3 matches -> 12 total "played" increments per group
        if sum(t['played'] for t in teams_stats.values()) == 12:
            groups_finished += 1
            sorted_teams = sort_tied_teams(teams_stats, completed_group_matches)
            resolved[f"Group {g} Winner"] = sorted_teams[0][0]
            resolved[f"Group {g} Runner-up"] = sorted_teams[1][0]
            thirds.append({'team': sorted_teams[2][0], 'group': g, 'pts': sorted_teams[2][1]['pts'], 'gd': sorted_teams[2][1]['gd'], 'gf': sorted_teams[2][1]['gf']})
            
    if groups_finished == len(group_teams):
        # All 12 groups finished. Best 8 thirds advance.
        thirds.sort(key=lambda x: (x['pts'], x['gd'], x['gf']), reverse=True)
        best_thirds = [t['team'] for t in thirds[:8]]
        
        tba_thirds = [
            "Group A/B/C/D/F 3rd Place",
            "Group C/D/F/G/H 3rd Place",
            "Group C/E/F/H/I 3rd Place",
            "Group E/H/I/J/K 3rd Place",
            "Group B/E/F/I/J 3rd Place",
            "Group A/E/H/I/J 3rd Place",
            "Group E/F/G/I/J 3rd Place",
            "Group D/E/I/J/L 3rd Place"
        ]
        
        # Hardcode user overrides
        user_overrides = {
            "Group A/E/H/I/J 3rd Place": "I", # M82: Senegal
            "Group D/E/I/J/L 3rd Place": "L", # M87: Ghana
            "Group E/F/G/I/J 3rd Place": "J", # M85: Algeria
            "Group E/H/I/J/K 3rd Place": "K", # M80: Congo
            "Group A/B/C/D/F 3rd Place": "D"  # M74: Paraguay
        }
        
        group_to_team = {t['group']: t['team'] for t in thirds}
        unassigned_thirds = best_thirds.copy()
        
        for tba_str, grp in user_overrides.items():
            if grp in group_to_team:
                team_name = group_to_team[grp]
                resolved[tba_str] = team_name
                tba_thirds.remove(tba_str)
                if team_name in unassigned_thirds:
                    unassigned_thirds.remove(team_name)
                    
        # Assign the rest sequentially (fallback)
        for i, tba_str in enumerate(tba_thirds):
            if i < len(unassigned_thirds):
                resolved[tba_str] = unassigned_thirds[i]
                
    # 4. Resolve further knockouts (e.g. "Winner Match 73")
    completed_lookup = {str(m['match_id']): m['winner'] for m in completed}
    
    for _, row in df_wc.iterrows():
        mid = str(row['match_number'])
        if mid in completed_lookup:
            winner_char = completed_lookup[mid] # 'H' or 'A' or 'D'
            
            ta = row['team_a']
            tb = row['team_b']
            
            if ta in resolved:
                ta = resolved[ta]
            if tb in resolved:
                tb = resolved[tb]
                
            actual_winner = ta if winner_char == 'H' else tb
            actual_loser = tb if winner_char == 'H' else ta
            
            resolved[f"Match {mid} Winner"] = actual_winner
            resolved[f"Match {mid} Loser"] = actual_loser
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
            
        if tb in resolved:
            m_dict['team_b'] = resolved[tb]
            
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
            
            # Add goal_scorers
            gs = c_match.get('goal_scorers')
            if gs:
                import json
                try:
                    m_dict['goal_scorers'] = json.loads(gs)
                except Exception:
                    m_dict['goal_scorers'] = []
            
        live_schedule.append(m_dict)
        
    return live_schedule

if __name__ == "__main__":
    schedule = resolve_standings()
    print("Resolved live schedule length:", len(schedule))
