import json
import pandas as pd
import numpy as np
from datetime import datetime
import unidecode

def normalize_name(name):
    if not isinstance(name, str):
        return ""
    # Remove accents and lowercase
    return unidecode.unidecode(name).lower().strip()

def match_player(squad_name, df_players):
    # Squad name is typically LAST First
    parts = squad_name.split(" ", 1)
    if len(parts) == 1:
        last = normalize_name(parts[0])
        first = ""
    else:
        last = normalize_name(parts[0])
        first = normalize_name(parts[1])
    
    # Try exact match on reversed name (First Last)
    first_last = f"{first} {last}".strip()
    last_first = f"{last} {first}".strip()
    
    # create normalized name col in df_players if not exists
    if 'norm_name' not in df_players.columns:
        df_players['norm_name'] = df_players['name'].apply(normalize_name)
        
    clean_squad = normalize_name(squad_name.replace(" JR", "").replace(" SR", ""))
    
    # Match 0: Clean squad exact match
    match = df_players[df_players['norm_name'] == clean_squad]
    if len(match) > 0:
        return match.sort_values('market_value_in_eur', ascending=False).iloc[0]
    
    # Match 1: Full name match
    match = df_players[df_players['norm_name'] == first_last]
    if len(match) > 0:
        return match.sort_values('market_value_in_eur', ascending=False).iloc[0]
        
    match = df_players[df_players['norm_name'] == last_first]
    if len(match) > 0:
        return match.sort_values('market_value_in_eur', ascending=False).iloc[0]

    # Match 1.5: No-space match (handles "SON Heungmin" vs "Heung-min Son")
    squad_nospace1 = f"{first}{last}".replace("-", "").replace(" ", "")
    squad_nospace2 = f"{last}{first}".replace("-", "").replace(" ", "")
    df_nospace = df_players['norm_name'].str.replace("-", "").str.replace(" ", "")
    
    match = df_players[(df_nospace == squad_nospace1) | (df_nospace == squad_nospace2)]
    if len(match) > 0:
        return match.sort_values('market_value_in_eur', ascending=False).iloc[0]

    # Helper for word boundary regex
    def word_match(word):
        return r'\b' + word + r'\b'

    # Match 2: Contains both first and last as exact words
    if first and last:
        match = df_players[df_players['norm_name'].str.contains(word_match(first), regex=True, na=False) & df_players['norm_name'].str.contains(word_match(last), regex=True, na=False)]
        if len(match) > 0:
            return match.sort_values('market_value_in_eur', ascending=False).iloc[0]
            
    # Fallback to loose word match using all words in clean_squad
    parts_clean = clean_squad.replace("-", " ").split()
    if len(parts_clean) > 0:
        # Require all words >= 3 chars to match
        sig_words = [w for w in parts_clean if len(w) >= 3]
        if sig_words:
            mask = pd.Series(True, index=df_players.index)
            for w in sig_words:
                mask = mask & df_players['norm_name'].str.contains(word_match(w), regex=True, na=False)
            match = df_players[mask]
            if len(match) > 0:
                return match.sort_values('market_value_in_eur', ascending=False).iloc[0]
                
    # Match 3: Just last name match as exact word
    if len(last) > 3: # Only do this for reasonably long last names to avoid matching everyone
        match = df_players[df_players['norm_name'].str.contains(word_match(last), regex=True, na=False)]
        if len(match) > 0:
            return match.sort_values('market_value_in_eur', ascending=False).iloc[0]

    return None

def main():
    print("Loading datasets...")
    df_players = pd.read_csv("Dataset/players.csv")
    df_appearances = pd.read_csv("Dataset/appearances.csv")
    df_valuations = pd.read_csv("Dataset/player_valuations.csv")
    
    with open("Dataset/squads.json", "r") as f:
        squads = json.load(f)
        
    # We only care about appearances from recent seasons to save time, or we can use all for total stats.
    # We need: Total Goals, Total Assists, Mins, Last 5, Last 10
    
    # Make sure date is datetime
    df_appearances['date'] = pd.to_datetime(df_appearances['date'])
    df_valuations['date'] = pd.to_datetime(df_valuations['date'])
    
    # Group by player_id
    app_gb = df_appearances.sort_values('date', ascending=False).groupby('player_id')
    val_gb = df_valuations.sort_values('date').groupby('player_id')
    
    intelligence_db = {}
    
    matched_count = 0
    total_count = 0
    
    df_players['norm_name'] = df_players['name'].apply(normalize_name)
    
    print("Processing squads...")
    for team in squads:
        team_name = team['team']
        for player in team['players']:
            total_count += 1
            squad_name = player.get('name', '')
            if not squad_name:
                continue
            
            p_row = match_player(squad_name, df_players)
            if p_row is None:
                continue
                
            matched_count += 1
            pid = p_row['player_id']
            
            # Base stats
            stats = {
                "id": int(pid),
                "name": squad_name,
                "tm_name": p_row['name'],
                "team": team_name,
                "position": player['position'],
                "club": player['club'],
                "dob": player['dob'],
                "height": player['height'],
                "image_url": str(p_row['image_url']) if pd.notna(p_row['image_url']) else "",
                "international_caps": int(p_row['international_caps']) if pd.notna(p_row['international_caps']) else 0,
                "international_goals": int(p_row['international_goals']) if pd.notna(p_row['international_goals']) else 0,
                "market_value": float(p_row['market_value_in_eur']) if pd.notna(p_row['market_value_in_eur']) else 0,
                "highest_market_value": float(p_row['highest_market_value_in_eur']) if pd.notna(p_row['highest_market_value_in_eur']) else 0,
            }
            
            # Appearance stats
            if pid in app_gb.groups:
                p_apps = app_gb.get_group(pid)
                
                total_goals = int(p_apps['goals'].sum())
                total_assists = int(p_apps['assists'].sum())
                total_mins = int(p_apps['minutes_played'].sum())
                
                # L5 and L10
                l5 = p_apps.head(5)
                l10 = p_apps.head(10)
                
                stats["total_goals"] = total_goals
                stats["total_assists"] = total_assists
                stats["total_minutes"] = total_mins
                stats["goals_per_90"] = (total_goals / total_mins * 90) if total_mins > 0 else 0
                stats["assists_per_90"] = (total_assists / total_mins * 90) if total_mins > 0 else 0
                
                stats["l5_goals"] = int(l5['goals'].sum())
                stats["l5_assists"] = int(l5['assists'].sum())
                stats["l5_minutes"] = int(l5['minutes_played'].sum())
                
                stats["l10_goals"] = int(l10['goals'].sum())
                stats["l10_assists"] = int(l10['assists'].sum())
                stats["l10_minutes"] = int(l10['minutes_played'].sum())
                stats["l10_contributions"] = stats["l10_goals"] + stats["l10_assists"]
                
                # Form Score (0-100)
                # Form based on contributions in L10 + L5 weighting + minutes played weighting
                contribution_score = min(stats["l10_contributions"] * 10, 50) 
                recency_score = min(stats["l5_goals"] * 15 + stats["l5_assists"] * 10, 30)
                minutes_score = min(stats["l10_minutes"] / 900 * 20, 20)
                stats["form_score"] = contribution_score + recency_score + minutes_score
                
            else:
                stats["total_goals"] = 0
                stats["total_assists"] = 0
                stats["total_minutes"] = 0
                stats["goals_per_90"] = 0
                stats["assists_per_90"] = 0
                stats["l5_goals"] = 0
                stats["l5_assists"] = 0
                stats["l5_minutes"] = 0
                stats["l10_goals"] = 0
                stats["l10_assists"] = 0
                stats["l10_contributions"] = 0
                stats["form_score"] = 0
                
            # MVP Score = Form Score + Int Goals Weight + Market Value Weight
            mv_score = min(stats["market_value"] / 50000000 * 30, 30)
            int_score = min(stats["international_goals"] * 1.5, 20)
            stats["mvp_score"] = stats["form_score"] * 0.5 + mv_score + int_score
            
            # Historical Valuations Trend
            if pid in val_gb.groups:
                p_vals = val_gb.get_group(pid)
                recent_vals = p_vals.tail(12) # last 12 points
                stats["historical_values"] = [int(v) for v in recent_vals['market_value_in_eur'].tolist() if pd.notna(v)]
                stats["historical_dates"] = recent_vals['date'].dt.strftime('%Y').tolist()
            else:
                stats["historical_values"] = []
                stats["historical_dates"] = []
            
            intelligence_db[squad_name] = stats
            
    print(f"Matched {matched_count}/{total_count} players.")
    
    with open("Dataset/player_intelligence.json", "w") as f:
        json.dump(intelligence_db, f, indent=2)
        
    print("Saved to Dataset/player_intelligence.json")

if __name__ == "__main__":
    main()
