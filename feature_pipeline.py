import pandas as pd
import numpy as np

base = "Dataset/"

# ---------------------------------------------------------
# Phase 1: Canonical Team Name Registry
# ---------------------------------------------------------
TEAM_NAME_MAP = {
    # results.csv aliases -> canonical
    "Cape Verde":                  "Cabo Verde",
    "DR Congo":                    "Congo DR",
    "Ivory Coast":                 "Côte d'Ivoire",
    "Côte d’Ivoire":               "Côte d'Ivoire",
    "Czech Republic":              "Czechia",
    "South Korea":                 "Korea Republic",
    "Turkey":                      "Türkiye",

    # fifa_mens_rank.csv aliases -> canonical
    "IR Iran":                     "Iran",
    "USA":                         "United States",
    "Cape Verde Islands":          "Cabo Verde",
    "Curacao":                     "Curaçao",
    "FYR Macedonia":               "North Macedonia",
    "Congo DR":                    "Congo DR",
    "Aotearoa New Zealand":        "New Zealand",
    "Swaziland":                   "Eswatini",
    "Czechia":                     "Czechia",

    # eloratings.csv aliases -> canonical (after NBSP stripping)
    "Democratic Republic of Congo": "Congo DR",
    "China":                        "China PR",

    # Historical dead-team mappings
    "Yugoslavia":                  "Serbia",
    "Czechoslovakia":              "Czechia",
    "German DR":                   "Germany",
    "West Germany":                "Germany",
    "Soviet Union":                "Russia",
    "Serbia and Montenegro":       "Serbia",
}

print("Loading datasets...")
df_r = pd.read_csv(base + "results.csv")
df_e = pd.read_csv(base + "eloratings.csv")
df_f = pd.read_csv(base + "fifa_mens_rank.csv")
df_s = pd.read_csv(base + "shootouts.csv")

# ---------------------------------------------------------
# Phase 2: Date Normalisation & Name Mapping
# ---------------------------------------------------------
print("Normalising dates and mapping team names...")
# Results
df_r["date"] = pd.to_datetime(df_r["date"], format="%Y-%m-%d")
df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))

# ELO
df_e["team"] = df_e["team"].str.replace("\xa0", " ", regex=False)
df_e["team"] = df_e["team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_e["elo_date"] = pd.to_datetime(df_e["date"], format="mixed", dayfirst=False)
df_e_clean = df_e[["elo_date", "team", "rating"]].sort_values("elo_date")

# FIFA Rank
df_f["rank_date"] = pd.to_datetime(
    df_f["date"].astype(str) + "-" + df_f["semester"].map({1: "01-01", 2: "07-01"}),
    format="%Y-%m-%d"
)
df_f["team"] = df_f["team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_rank = df_f[["rank_date", "team", "rank", "total.points"]].sort_values("rank_date")
df_rank = df_rank.drop_duplicates(subset=["rank_date", "team"])

# Shootouts
df_s["date"] = pd.to_datetime(df_s["date"], format="%Y-%m-%d")
df_s["home_team"] = df_s["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_s["away_team"] = df_s["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))

# ---------------------------------------------------------
# Phase 3: Base Match Table
# ---------------------------------------------------------
print("Building base match table...")
# Remove WC 2026 unplayed fixtures
df_base = df_r[df_r["date"] < "2026-06-11"].copy()

# Keep only scored matches to be safe
df_base = df_base.dropna(subset=["home_score", "away_score"])

# Optional: filter to relevant tournaments, but to keep robust H2H and form we can keep all
# and then filter the FINAL dataset to relevant tournaments if desired.
# For this script we will keep all historical matches but just ensure the target columns exist.

# Add target variables
df_base["result"] = np.where(df_base["home_score"] > df_base["away_score"], "H",
                             np.where(df_base["home_score"] < df_base["away_score"], "A", "D"))
df_base["goal_diff"] = df_base["home_score"] - df_base["away_score"]
df_base["match_id"] = df_base["date"].dt.strftime("%Y-%m-%d") + "__" + df_base["home_team"] + "__" + df_base["away_team"]

# Ensure sorted by date for all subsequent asof joins
df_base = df_base.sort_values("date").reset_index(drop=True)

# ---------------------------------------------------------
# Phase 4: ELO Join (Pre-Match)
# ---------------------------------------------------------
print("Joining ELO ratings...")
def get_elo_asof(df_matches, df_elo, team_col, new_col):
    result = pd.merge_asof(
        df_matches,
        df_elo.rename(columns={"team": team_col, "rating": new_col, "elo_date": "date"}),
        on="date",
        by=team_col,
        direction="backward",
    )
    return result

df_base = get_elo_asof(df_base, df_e_clean, "home_team", "home_elo_pre")
df_base = get_elo_asof(df_base, df_e_clean, "away_team", "away_elo_pre")
df_base["elo_diff"] = df_base["home_elo_pre"] - df_base["away_elo_pre"]

# ---------------------------------------------------------
# Phase 5: FIFA Ranking Join (Pre-Match)
# ---------------------------------------------------------
print("Joining FIFA rankings...")
df_base = pd.merge_asof(
    df_base,
    df_rank.rename(columns={"team": "home_team", "rank": "home_fifa_rank",
                             "total.points": "home_fifa_points", "rank_date": "date"}),
    on="date",
    by="home_team",
    direction="backward",
    tolerance=pd.Timedelta("730 days"), # up to 2 years back
)
df_base = pd.merge_asof(
    df_base,
    df_rank.rename(columns={"team": "away_team", "rank": "away_fifa_rank",
                             "total.points": "away_fifa_points", "rank_date": "date"}),
    on="date",
    by="away_team",
    direction="backward",
    tolerance=pd.Timedelta("730 days"),
)
df_base["rank_diff"] = df_base["home_fifa_rank"] - df_base["away_fifa_rank"]

# ---------------------------------------------------------
# Phase 6: Shootout Statistics Join
# ---------------------------------------------------------
print("Joining Shootout statistics...")
df_s["won"] = (df_s["winner"] == df_s["home_team"]).astype(int)
shootout_records = pd.concat([
    df_s[["date","home_team","winner"]].rename(columns={"home_team":"team"}).assign(
        won=lambda x: (x["winner"] == x["team"]).astype(int)
    ),
    df_s[["date","away_team","winner"]].rename(columns={"away_team":"team"}).assign(
        won=lambda x: (x["winner"] == x["team"]).astype(int)
    )
]).sort_values("date")

shootout_stats = (
    shootout_records
    .groupby("team")
    .apply(lambda g: g.assign(
        shootout_total_prior=g["won"].expanding().count().shift(1).fillna(0),
        shootout_win_rate_prior=g["won"].expanding().mean().shift(1).fillna(0.0),
    ), include_groups=False)
    .reset_index()
)[["date","team","shootout_total_prior","shootout_win_rate_prior"]]
shootout_stats = shootout_stats.sort_values("date")

df_base = pd.merge_asof(
    df_base,
    shootout_stats.rename(columns={"team": "home_team",
                                    "shootout_total_prior": "home_shootout_count",
                                    "shootout_win_rate_prior": "home_shootout_win_rate"}),
    on="date", by="home_team", direction="backward"
)
df_base = pd.merge_asof(
    df_base,
    shootout_stats.rename(columns={"team": "away_team",
                                    "shootout_total_prior": "away_shootout_count",
                                    "shootout_win_rate_prior": "away_shootout_win_rate"}),
    on="date", by="away_team", direction="backward"
)
df_base["home_shootout_count"] = df_base["home_shootout_count"].fillna(0)
df_base["away_shootout_count"] = df_base["away_shootout_count"].fillna(0)
df_base["home_shootout_win_rate"] = df_base["home_shootout_win_rate"].fillna(0)
df_base["away_shootout_win_rate"] = df_base["away_shootout_win_rate"].fillna(0)


# ---------------------------------------------------------
# Phase 7: Rolling Team Form and Head-to-Head
# ---------------------------------------------------------
print("Computing rolling form features...")

# Create a long format dataframe of all team appearances to calculate rolling stats
team_matches = pd.concat([
    df_base[["date", "match_id", "home_team", "home_score", "away_score", "away_elo_pre", "away_fifa_rank"]].rename(
        columns={"home_team": "team", "home_score": "scored", "away_score": "conceded", "away_elo_pre": "opponent_elo", "away_fifa_rank": "opponent_fifa_rank"}
    ).assign(is_home=1),
    df_base[["date", "match_id", "away_team", "away_score", "home_score", "home_elo_pre", "home_fifa_rank"]].rename(
        columns={"away_team": "team", "away_score": "scored", "home_score": "conceded", "home_elo_pre": "opponent_elo", "home_fifa_rank": "opponent_fifa_rank"}
    ).assign(is_home=0)
]).sort_values("date").reset_index(drop=True)

team_matches["goal_diff"] = team_matches["scored"] - team_matches["conceded"]
team_matches["win"] = (team_matches["scored"] > team_matches["conceded"]).astype(int)
team_matches["weighted_goal_diff"] = team_matches["goal_diff"] * (team_matches["opponent_elo"] / 1500.0)

# Group by team and calculate rolling windows shifted by 1 to prevent leakage
def get_rolling_stats(g):
    g = g.sort_values("date")
    
    # L5 Stats
    g["goals_scored_avg_L5"] = g["scored"].rolling(5, min_periods=1).mean().shift(1)
    g["goals_conceded_avg_L5"] = g["conceded"].rolling(5, min_periods=1).mean().shift(1)
    g["avg_opponent_elo_last_5"] = g["opponent_elo"].rolling(5, min_periods=1).mean().shift(1)
    g["avg_opponent_fifa_rank_last_5"] = g["opponent_fifa_rank"].rolling(5, min_periods=1).mean().shift(1)
    g["weighted_goal_diff_last_5"] = g["weighted_goal_diff"].rolling(5, min_periods=1).mean().shift(1)
    
    # L10 Stats
    g["win_rate_L10"] = g["win"].rolling(10, min_periods=1).mean().shift(1)
    g["goal_diff_avg_L10"] = g["goal_diff"].rolling(10, min_periods=1).mean().shift(1)
    g["avg_opponent_elo_last_10"] = g["opponent_elo"].rolling(10, min_periods=1).mean().shift(1)
    g["avg_opponent_fifa_rank_last_10"] = g["opponent_fifa_rank"].rolling(10, min_periods=1).mean().shift(1)
    g["weighted_goal_diff_last_10"] = g["weighted_goal_diff"].rolling(10, min_periods=1).mean().shift(1)
    
    return g

team_rolling = team_matches.groupby("team", group_keys=False).apply(get_rolling_stats)

# Merge back into df_base for home team
df_base = df_base.merge(
    team_rolling[team_rolling["is_home"] == 1][["match_id", "goals_scored_avg_L5", "goals_conceded_avg_L5", "avg_opponent_elo_last_5", "avg_opponent_fifa_rank_last_5", "weighted_goal_diff_last_5", "win_rate_L10", "goal_diff_avg_L10", "avg_opponent_elo_last_10", "avg_opponent_fifa_rank_last_10", "weighted_goal_diff_last_10"]]
    .rename(columns={
        "goals_scored_avg_L5": "home_goals_scored_avg_L5",
        "goals_conceded_avg_L5": "home_goals_conceded_avg_L5",
        "avg_opponent_elo_last_5": "home_avg_opponent_elo_last_5",
        "avg_opponent_fifa_rank_last_5": "home_avg_opponent_fifa_rank_last_5",
        "weighted_goal_diff_last_5": "home_weighted_goal_diff_last_5",
        "win_rate_L10": "home_win_rate_L10",
        "goal_diff_avg_L10": "home_goal_diff_avg_L10",
        "avg_opponent_elo_last_10": "home_avg_opponent_elo_last_10",
        "avg_opponent_fifa_rank_last_10": "home_avg_opponent_fifa_rank_last_10",
        "weighted_goal_diff_last_10": "home_weighted_goal_diff_last_10"
    }),
    on="match_id", how="left"
)

# Merge back into df_base for away team
df_base = df_base.merge(
    team_rolling[team_rolling["is_home"] == 0][["match_id", "goals_scored_avg_L5", "goals_conceded_avg_L5", "avg_opponent_elo_last_5", "avg_opponent_fifa_rank_last_5", "weighted_goal_diff_last_5", "win_rate_L10", "goal_diff_avg_L10", "avg_opponent_elo_last_10", "avg_opponent_fifa_rank_last_10", "weighted_goal_diff_last_10"]]
    .rename(columns={
        "goals_scored_avg_L5": "away_goals_scored_avg_L5",
        "goals_conceded_avg_L5": "away_goals_conceded_avg_L5",
        "avg_opponent_elo_last_5": "away_avg_opponent_elo_last_5",
        "avg_opponent_fifa_rank_last_5": "away_avg_opponent_fifa_rank_last_5",
        "weighted_goal_diff_last_5": "away_weighted_goal_diff_last_5",
        "win_rate_L10": "away_win_rate_L10",
        "goal_diff_avg_L10": "away_goal_diff_avg_L10",
        "avg_opponent_elo_last_10": "away_avg_opponent_elo_last_10",
        "avg_opponent_fifa_rank_last_10": "away_avg_opponent_fifa_rank_last_10",
        "weighted_goal_diff_last_10": "away_weighted_goal_diff_last_10"
    }),
    on="match_id", how="left"
)

print("Computing Head-to-Head features...")
# To prevent leakage, we do an expanding mean shifted by 1 for each team pair.
# Sort teams alphabetically to create a unique pair ID regardless of home/away
df_base["team_pair"] = df_base.apply(lambda r: tuple(sorted([r["home_team"], r["away_team"]])), axis=1)

def get_h2h_stats(g):
    g = g.sort_values("date")
    g["h2h_matches_played"] = np.arange(len(g)) # expanding count shift 1 is just arange
    
    # We need to express H2H stats relative to the home_team of the current row
    # So we calculate absolute stats for team[0] and then flip if home_team != team[0]
    team0 = g.name[0]
    
    # Did team0 win?
    team0_win = ((g["home_team"] == team0) & (g["home_score"] > g["away_score"])) | \
                ((g["away_team"] == team0) & (g["away_score"] > g["home_score"]))
    team0_win = team0_win.astype(int)
    
    # Team0 goals
    team0_goals = np.where(g["home_team"] == team0, g["home_score"], g["away_score"])
    team1_goals = np.where(g["home_team"] != team0, g["home_score"], g["away_score"])
    
    team0_win_rate = team0_win.expanding().mean().shift(1)
    team0_goals_avg = pd.Series(team0_goals).expanding().mean().shift(1)
    team1_goals_avg = pd.Series(team1_goals).expanding().mean().shift(1)
    
    # Now map back to home and away
    is_home_team0 = g["home_team"] == team0
    g["h2h_home_win_rate"] = np.where(is_home_team0, team0_win_rate, 1 - team0_win_rate - ((team0_goals == team1_goals).expanding().mean().shift(1)))
    # above line is slightly imprecise for draws, let's just compute home win rate directly by expanding shifted wins
    
    # Let's do it simpler, expanding sum of home team wins / expanding sum of matches played
    # This is tricky because home/away swaps.
    
    return g

# Let's use a simpler loop for H2H to guarantee no leakage
h2h_stats = []
pair_history = {}

for idx, row in df_base.iterrows():
    pair = row["team_pair"]
    ht = row["home_team"]
    
    if pair not in pair_history:
        h2h_stats.append((0, np.nan, np.nan, np.nan))
        pair_history[pair] = []
    else:
        history = pair_history[pair]
        played = len(history)
        # Calculate stats for current home team
        ht_wins = sum(1 for h in history if (h['home']==ht and h['h_score']>h['a_score']) or (h['away']==ht and h['a_score']>h['h_score']))
        ht_goals = sum(h['h_score'] if h['home']==ht else h['a_score'] for h in history)
        at_goals = sum(h['a_score'] if h['home']==ht else h['h_score'] for h in history)
        
        h2h_stats.append((
            played,
            ht_wins / played if played > 0 else np.nan,
            ht_goals / played if played > 0 else np.nan,
            at_goals / played if played > 0 else np.nan
        ))
        
    pair_history[pair].append({
        'home': row["home_team"],
        'away': row["away_team"],
        'h_score': row["home_score"],
        'a_score': row["away_score"]
    })

df_base[["h2h_matches_played", "h2h_home_win_rate", "h2h_avg_goals_home", "h2h_avg_goals_away"]] = pd.DataFrame(h2h_stats, index=df_base.index)

# ---------------------------------------------------------
# Filter and Save Final Output
# ---------------------------------------------------------
print("Selecting final features...")

features_required = [
    "match_id",
    "date",
    "home_team",
    "away_team",
    
    "home_elo_pre",
    "away_elo_pre",
    "elo_diff",
    "home_fifa_rank",
    "away_fifa_rank",
    "rank_diff",
    "home_fifa_points",
    "away_fifa_points",
    
    "home_goals_scored_avg_L5",
    "home_goals_conceded_avg_L5",
    "home_avg_opponent_elo_last_5",
    "home_avg_opponent_fifa_rank_last_5",
    "home_weighted_goal_diff_last_5",
    "away_goals_scored_avg_L5",
    "away_goals_conceded_avg_L5",
    "away_avg_opponent_elo_last_5",
    "away_avg_opponent_fifa_rank_last_5",
    "away_weighted_goal_diff_last_5",
    
    "home_win_rate_L10",
    "home_goal_diff_avg_L10",
    "home_avg_opponent_elo_last_10",
    "home_avg_opponent_fifa_rank_last_10",
    "home_weighted_goal_diff_last_10",
    "away_win_rate_L10",
    "away_goal_diff_avg_L10",
    "away_avg_opponent_elo_last_10",
    "away_avg_opponent_fifa_rank_last_10",
    "away_weighted_goal_diff_last_10",
    
    "h2h_avg_goals_home",
    "h2h_avg_goals_away",
    
    "neutral",
    "tournament",
    
    "home_score",
    "away_score",
    "result",
    "goal_diff"
]

final_df = df_base[features_required].copy()

# Sort by date
final_df = final_df.sort_values("date").reset_index(drop=True)

# Save to CSV
print("Saving final_training_dataset.csv...")
final_df.to_csv("final_training_dataset.csv", index=False)

# ---------------------------------------------------------
# Feature Documentation & Validation Report
# ---------------------------------------------------------
print("Generating Feature Documentation Report...")
with open("feature_documentation.md", "w") as f:
    f.write("# Feature Pipeline Quality Report\n\n")
    
    f.write("## 1. Dataset Shape\n")
    f.write(f"- Rows: {len(final_df)}\n")
    f.write(f"- Columns: {len(final_df.columns)}\n\n")
    
    f.write("## 2. Null Percentages\n")
    nulls = final_df.isnull().mean() * 100
    for col, val in nulls.items():
        f.write(f"- **{col}**: {val:.2f}%\n")
    f.write("\n")
    
    f.write("## 3. Feature Distributions (Numeric)\n")
    numeric_cols = final_df.select_dtypes(include=[np.number]).columns
    desc = final_df[numeric_cols].describe().T
    f.write(desc[["mean", "std", "min", "50%", "max"]].to_markdown())
    f.write("\n\n")
    
    f.write("## 4. Correlation with Target (goal_diff)\n")
    f.write("A higher absolute correlation indicates stronger predictive power.\n\n")
    # Exclude leakage targets
    corr_cols = [c for c in numeric_cols if c not in ["home_score", "away_score", "goal_diff"]]
    corr = final_df[corr_cols + ["goal_diff"]].corr()["goal_diff"].drop("goal_diff").sort_values(ascending=False, key=abs)
    f.write(corr.head(20).to_frame().to_markdown())
    f.write("\n\n")

print("Pipeline execution complete.")
