import pandas as pd
import numpy as np
from datetime import datetime

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

def generate_squad_features():
    print("Loading player data...")
    df_players = pd.read_csv("Dataset/players.csv")
    
    # Map country names
    df_players["team"] = df_players["country_of_citizenship"].map(lambda x: TEAM_NAME_MAP.get(x, x))
    
    # Calculate age
    df_players["date_of_birth"] = pd.to_datetime(df_players["date_of_birth"], errors='coerce')
    # Use 2026 as the base year for age since it's the 2026 World Cup
    df_players["age"] = (pd.to_datetime("2026-06-01") - df_players["date_of_birth"]).dt.days / 365.25
    
    # Fill missing values
    df_players["market_value_in_eur"] = df_players["market_value_in_eur"].fillna(0)
    df_players["international_caps"] = df_players["international_caps"].fillna(0)
    
    # Star power: > 40M EUR
    df_players["is_star"] = (df_players["market_value_in_eur"] >= 40000000).astype(int)
    
    # Aggregate to team level
    print("Aggregating to team level...")
    squad_stats = df_players.groupby("team").agg(
        squad_market_value=("market_value_in_eur", "sum"),
        experience_index=("international_caps", "sum"),
        avg_squad_age=("age", "mean"),
        star_power=("is_star", "sum")
    ).reset_index()
    
    # Form Score from appearances
    try:
        print("Processing appearances for form score...")
        df_app = pd.read_csv("Dataset/appearances.csv")
        df_app["date"] = pd.to_datetime(df_app["date"])
        # Consider only appearances since 2023 for "form"
        df_app_recent = df_app[df_app["date"] >= "2023-01-01"]
        
        # Merge player citizenship
        df_app_recent = pd.merge(df_app_recent, df_players[["player_id", "team"]], on="player_id", how="left")
        
        # Form = Total minutes played by squad players in recent club games
        form_stats = df_app_recent.groupby("team").agg(
            squad_form_minutes=("minutes_played", "sum")
        ).reset_index()
        
        squad_stats = pd.merge(squad_stats, form_stats, on="team", how="left")
        squad_stats["squad_form_minutes"] = squad_stats["squad_form_minutes"].fillna(0)
    except Exception as e:
        print("Could not load/process appearances:", e)
        squad_stats["squad_form_minutes"] = 0
        
    squad_stats.to_csv("squad_features.csv", index=False)
    print("Saved squad_features.csv")
    
    # Now merge into final_training_dataset.csv to create the ablation copy
    print("Merging into training dataset...")
    df_train = pd.read_csv("final_training_dataset.csv")
    
    df_train = pd.merge(df_train, squad_stats.rename(columns={
        "team": "home_team",
        "squad_market_value": "home_squad_market_value",
        "experience_index": "home_experience_index",
        "avg_squad_age": "home_avg_squad_age",
        "star_power": "home_star_power",
        "squad_form_minutes": "home_squad_form_minutes"
    }), on="home_team", how="left")
    
    df_train = pd.merge(df_train, squad_stats.rename(columns={
        "team": "away_team",
        "squad_market_value": "away_squad_market_value",
        "experience_index": "away_experience_index",
        "avg_squad_age": "away_avg_squad_age",
        "star_power": "away_star_power",
        "squad_form_minutes": "away_squad_form_minutes"
    }), on="away_team", how="left")
    
    # Fill NAs for teams with no player data
    for col in ["home_squad_market_value", "home_experience_index", "home_star_power", "home_squad_form_minutes",
                "away_squad_market_value", "away_experience_index", "away_star_power", "away_squad_form_minutes"]:
        df_train[col] = df_train[col].fillna(0)
        
    # Age NA fill with global average ~27
    df_train["home_avg_squad_age"] = df_train["home_avg_squad_age"].fillna(27.0)
    df_train["away_avg_squad_age"] = df_train["away_avg_squad_age"].fillna(27.0)
    
    df_train.to_csv("final_training_dataset_with_squads.csv", index=False)
    print("Saved final_training_dataset_with_squads.csv")

if __name__ == "__main__":
    generate_squad_features()
