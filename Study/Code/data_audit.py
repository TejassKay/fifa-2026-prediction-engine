import pandas as pd
import json

base = "Dataset/"

def audit_dataset():
    print("=== DATA AUDIT ===")
    
    # 1. Appearances
    df_apps = pd.read_csv(base + "appearances.csv")
    print(f"\n[appearances.csv]")
    print(f"Total Rows: {len(df_apps)}")
    print(f"Columns: {list(df_apps.columns)}")
    print(f"Competitions: {df_apps['competition_id'].nunique()} unique comps")
    print(f"Total Goals Recorded: {df_apps['goals'].sum()}")
    print(f"Missing Values:\n{df_apps.isna().sum()}")
    
    # 2. Players
    df_players = pd.read_csv(base + "players.csv")
    print(f"\n[players.csv]")
    print(f"Total Players: {len(df_players)}")
    print(f"Columns: {list(df_players.columns)}")
    print(f"Missing Values:\n{df_players.isna().sum()}")
    
    # 3. Games
    df_games = pd.read_csv(base + "games.csv")
    print(f"\n[games.csv]")
    print(f"Total Games: {len(df_games)}")
    print(f"National Team Comps: {len(df_games[df_games['competition_type'] == 'national_team_competition'])}")
    
    # 4. Player Valuations
    df_vals = pd.read_csv(base + "player_valuations.csv")
    print(f"\n[player_valuations.csv]")
    print(f"Total Valuations: {len(df_vals)}")

if __name__ == '__main__':
    audit_dataset()
