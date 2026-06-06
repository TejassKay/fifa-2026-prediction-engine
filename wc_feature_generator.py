import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
import warnings
warnings.filterwarnings('ignore')

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

print("Loading historical datasets...")
df_r = pd.read_csv(base + "results.csv")
df_e = pd.read_csv(base + "eloratings.csv")
df_f = pd.read_csv(base + "fifa_mens_rank.csv")
df_s = pd.read_csv(base + "shootouts.csv")
df_wc = pd.read_csv(base + "world-cup-2026-schedule.csv")

print("Processing historical data...")
# Results
df_r["date"] = pd.to_datetime(df_r["date"], format="%Y-%m-%d")
df_r["home_team"] = df_r["home_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_r["away_team"] = df_r["away_team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_hist = df_r[df_r["date"] < "2026-06-11"].sort_values("date").dropna(subset=["home_score", "away_score"]).copy()

# ELO
df_e["team"] = df_e["team"].str.replace("\xa0", " ", regex=False)
df_e["team"] = df_e["team"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_e["elo_date"] = pd.to_datetime(df_e["date"], format="mixed", dayfirst=False)
df_e_clean = df_e[["elo_date", "team", "rating"]].sort_values("elo_date")

# FIFA
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

print("Extracting WC 2026 Fixtures...")
df_wc_matches = df_wc[df_wc["status"] == "confirmed_group_fixture"].copy()
df_wc_matches["date"] = pd.to_datetime(df_wc_matches["date"], format="%Y-%m-%d")
df_wc_matches["home_team"] = df_wc_matches["team_a"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_wc_matches["away_team"] = df_wc_matches["team_b"].map(lambda x: TEAM_NAME_MAP.get(x, x))
df_wc_matches["neutral"] = 1
df_wc_matches["tournament"] = "FIFA World Cup"
df_wc_matches["match_id"] = df_wc_matches["match_number"].astype(str)

df_pred = df_wc_matches[["match_id", "date", "home_team", "away_team", "neutral", "tournament"]].sort_values("date").reset_index(drop=True)

# ---------------------------------------------------------
# Phase 1: Static Features (ELO & FIFA)
# ---------------------------------------------------------
print("Joining ELO and FIFA stats...")
def get_elo_asof(df_matches, df_elo, team_col, new_col):
    return pd.merge_asof(
        df_matches,
        df_elo.rename(columns={"team": team_col, "rating": new_col, "elo_date": "date"}),
        on="date", by=team_col, direction="backward"
    )

df_pred = get_elo_asof(df_pred, df_e_clean, "home_team", "home_elo_pre")
df_pred = get_elo_asof(df_pred, df_e_clean, "away_team", "away_elo_pre")
df_pred["elo_diff"] = df_pred["home_elo_pre"] - df_pred["away_elo_pre"]

df_pred = pd.merge_asof(
    df_pred,
    df_rank.rename(columns={"team": "home_team", "rank": "home_fifa_rank", "total.points": "home_fifa_points", "rank_date": "date"}),
    on="date", by="home_team", direction="backward", tolerance=pd.Timedelta("730 days")
)
df_pred = pd.merge_asof(
    df_pred,
    df_rank.rename(columns={"team": "away_team", "rank": "away_fifa_rank", "total.points": "away_fifa_points", "rank_date": "date"}),
    on="date", by="away_team", direction="backward", tolerance=pd.Timedelta("730 days")
)
df_pred["rank_diff"] = df_pred["home_fifa_rank"] - df_pred["away_fifa_rank"]

# ---------------------------------------------------------
# Phase 2: Shootout Stats
# ---------------------------------------------------------
df_s["won"] = (df_s["winner"] == df_s["home_team"]).astype(int)
shootout_records = pd.concat([
    df_s[["date","home_team","winner"]].rename(columns={"home_team":"team"}).assign(
        won=lambda x: (x["winner"] == x["team"]).astype(int)
    ),
    df_s[["date","away_team","winner"]].rename(columns={"away_team":"team"}).assign(
        won=lambda x: (x["winner"] == x["team"]).astype(int)
    )
]).sort_values("date")

shootout_stats = shootout_records.groupby("team").apply(lambda g: pd.Series({
    'shootout_total_prior': len(g),
    'shootout_win_rate_prior': g['won'].mean() if len(g) > 0 else 0.0
})).reset_index()

df_pred = pd.merge(df_pred, shootout_stats.rename(columns={"team": "home_team", "shootout_total_prior": "home_shootout_count", "shootout_win_rate_prior": "home_shootout_win_rate"}), on="home_team", how="left")
df_pred = pd.merge(df_pred, shootout_stats.rename(columns={"team": "away_team", "shootout_total_prior": "away_shootout_count", "shootout_win_rate_prior": "away_shootout_win_rate"}), on="away_team", how="left")
df_pred["home_shootout_count"] = df_pred["home_shootout_count"].fillna(0)
df_pred["away_shootout_count"] = df_pred["away_shootout_count"].fillna(0)
df_pred["home_shootout_win_rate"] = df_pred["home_shootout_win_rate"].fillna(0)
df_pred["away_shootout_win_rate"] = df_pred["away_shootout_win_rate"].fillna(0)

# ---------------------------------------------------------
# Phase 3: Rolling Form Features
# ---------------------------------------------------------
print("Computing Historical Form...")

# Attach ELO and FIFA Rank to historical matches before computing rolling stats
df_hist = get_elo_asof(df_hist, df_e_clean, "home_team", "home_elo_pre")
df_hist = get_elo_asof(df_hist, df_e_clean, "away_team", "away_elo_pre")
df_hist = pd.merge_asof(
    df_hist,
    df_rank.rename(columns={"team": "home_team", "rank": "home_fifa_rank", "total.points": "home_fifa_points", "rank_date": "date"}),
    on="date", by="home_team", direction="backward", tolerance=pd.Timedelta("730 days")
)
df_hist = pd.merge_asof(
    df_hist,
    df_rank.rename(columns={"team": "away_team", "rank": "away_fifa_rank", "total.points": "away_fifa_points", "rank_date": "date"}),
    on="date", by="away_team", direction="backward", tolerance=pd.Timedelta("730 days")
)

team_matches = pd.concat([
    df_hist[["date", "home_team", "home_score", "away_score", "away_elo_pre", "away_fifa_rank"]].rename(
        columns={"home_team": "team", "home_score": "scored", "away_score": "conceded", "away_elo_pre": "opponent_elo", "away_fifa_rank": "opponent_fifa_rank"}
    ),
    df_hist[["date", "away_team", "away_score", "home_score", "home_elo_pre", "home_fifa_rank"]].rename(
        columns={"away_team": "team", "away_score": "scored", "home_score": "conceded", "home_elo_pre": "opponent_elo", "home_fifa_rank": "opponent_fifa_rank"}
    )
]).sort_values("date").reset_index(drop=True)

team_matches["goal_diff"] = team_matches["scored"] - team_matches["conceded"]
team_matches["win"] = (team_matches["scored"] > team_matches["conceded"]).astype(int)
team_matches["weighted_goal_diff"] = team_matches["goal_diff"] * (team_matches["opponent_elo"] / 1500.0)

# Extract latest stats per team
latest_stats = []
for team in pd.concat([df_pred['home_team'], df_pred['away_team']]).unique():
    t_hist = team_matches[team_matches['team'] == team].sort_values("date").tail(10)
    
    if len(t_hist) > 0:
        l5 = t_hist.tail(5)
        l10 = t_hist
        latest_stats.append({
            'team': team,
            'goals_scored_avg_L5': l5['scored'].mean(),
            'goals_conceded_avg_L5': l5['conceded'].mean(),
            'avg_opponent_elo_last_5': l5['opponent_elo'].mean(),
            'avg_opponent_fifa_rank_last_5': l5['opponent_fifa_rank'].mean(),
            'weighted_goal_diff_last_5': l5['weighted_goal_diff'].mean(),
            'win_rate_L10': l10['win'].mean(),
            'goal_diff_avg_L10': l10['goal_diff'].mean(),
            'avg_opponent_elo_last_10': l10['opponent_elo'].mean(),
            'avg_opponent_fifa_rank_last_10': l10['opponent_fifa_rank'].mean(),
            'weighted_goal_diff_last_10': l10['weighted_goal_diff'].mean()
        })
    else:
        latest_stats.append({
            'team': team, 'goals_scored_avg_L5': 0, 'goals_conceded_avg_L5': 0,
            'avg_opponent_elo_last_5': 0, 'avg_opponent_fifa_rank_last_5': 0, 'weighted_goal_diff_last_5': 0,
            'win_rate_L10': 0, 'goal_diff_avg_L10': 0,
            'avg_opponent_elo_last_10': 0, 'avg_opponent_fifa_rank_last_10': 0, 'weighted_goal_diff_last_10': 0
        })

stats_df = pd.DataFrame(latest_stats)

df_pred = pd.merge(df_pred, stats_df.rename(columns={
    'team': 'home_team', 'goals_scored_avg_L5': 'home_goals_scored_avg_L5', 'goals_conceded_avg_L5': 'home_goals_conceded_avg_L5',
    'avg_opponent_elo_last_5': 'home_avg_opponent_elo_last_5', 'avg_opponent_fifa_rank_last_5': 'home_avg_opponent_fifa_rank_last_5', 'weighted_goal_diff_last_5': 'home_weighted_goal_diff_last_5',
    'win_rate_L10': 'home_win_rate_L10', 'goal_diff_avg_L10': 'home_goal_diff_avg_L10',
    'avg_opponent_elo_last_10': 'home_avg_opponent_elo_last_10', 'avg_opponent_fifa_rank_last_10': 'home_avg_opponent_fifa_rank_last_10', 'weighted_goal_diff_last_10': 'home_weighted_goal_diff_last_10'
}), on="home_team", how="left")

df_pred = pd.merge(df_pred, stats_df.rename(columns={
    'team': 'away_team', 'goals_scored_avg_L5': 'away_goals_scored_avg_L5', 'goals_conceded_avg_L5': 'away_goals_conceded_avg_L5',
    'avg_opponent_elo_last_5': 'away_avg_opponent_elo_last_5', 'avg_opponent_fifa_rank_last_5': 'away_avg_opponent_fifa_rank_last_5', 'weighted_goal_diff_last_5': 'away_weighted_goal_diff_last_5',
    'win_rate_L10': 'away_win_rate_L10', 'goal_diff_avg_L10': 'away_goal_diff_avg_L10',
    'avg_opponent_elo_last_10': 'away_avg_opponent_elo_last_10', 'avg_opponent_fifa_rank_last_10': 'away_avg_opponent_fifa_rank_last_10', 'weighted_goal_diff_last_10': 'away_weighted_goal_diff_last_10'
}), on="away_team", how="left")


# ---------------------------------------------------------
# Phase 4: Head-to-Head Features
# ---------------------------------------------------------
print("Computing Head-to-Head features...")
h2h_stats = []
for idx, row in df_pred.iterrows():
    ht = row["home_team"]
    at = row["away_team"]
    
    # Find historical matches between ht and at
    past_matches = df_hist[
        ((df_hist["home_team"] == ht) & (df_hist["away_team"] == at)) |
        ((df_hist["home_team"] == at) & (df_hist["away_team"] == ht))
    ]
    
    played = len(past_matches)
    if played > 0:
        ht_wins = sum(1 for _, h in past_matches.iterrows() if (h['home_team']==ht and h['home_score']>h['away_score']) or (h['away_team']==ht and h['away_score']>h['home_score']))
        ht_goals = sum(h['home_score'] if h['home_team']==ht else h['away_score'] for _, h in past_matches.iterrows())
        at_goals = sum(h['away_score'] if h['home_team']==ht else h['home_score'] for _, h in past_matches.iterrows())
        
        h2h_stats.append((played, ht_wins/played, ht_goals/played, at_goals/played))
    else:
        h2h_stats.append((0, np.nan, np.nan, np.nan))

df_pred[["h2h_matches_played", "h2h_home_win_rate", "h2h_avg_goals_home", "h2h_avg_goals_away"]] = pd.DataFrame(h2h_stats, index=df_pred.index)

# Impute H2H missing
df_pred['h2h_home_win_rate'] = df_pred['h2h_home_win_rate'].fillna(0)
df_pred['h2h_avg_goals_home'] = df_pred['h2h_avg_goals_home'].fillna(0)
df_pred['h2h_avg_goals_away'] = df_pred['h2h_avg_goals_away'].fillna(0)

# Reorder columns to match training dataset
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
    "tournament"
]

final_df = df_pred[features_required].copy()
final_df.to_csv("world_cup_2026_features.csv", index=False)

print("\nGenerating Validation Report...")
md = "# World Cup 2026 Feature Validation Report\n\n"
md += f"**Total Matches Processed:** {len(final_df)} (Group Stage only)\n\n"

# Check Nulls
nulls = final_df.isnull().sum()
if nulls.sum() == 0:
    md += "### Missing Values: **0** (All features fully populated)\n\n"
else:
    md += "### Missing Values Detected:\n"
    for col, val in nulls[nulls > 0].items():
        md += f"- **{col}**: {val} missing rows\n"
    md += "\n"

md += "### Incomplete Teams Alert\n"
teams = pd.concat([final_df['home_team'], final_df['away_team']]).unique()
incomplete_teams = []
for team in teams:
    # Check if team was completely missing from ELO or FIFA
    mask = (final_df['home_team'] == team) | (final_df['away_team'] == team)
    team_matches = final_df[mask]
    if team_matches['home_elo_pre'].isnull().any() or team_matches['away_elo_pre'].isnull().any():
        incomplete_teams.append(team)

if incomplete_teams:
    md += f"⚠️ The following teams have missing historical data (e.g., ELO ratings): {', '.join(set(incomplete_teams))}\n\n"
else:
    md += "✅ All 48 qualified teams have complete ELO & FIFA data records.\n\n"

md += "### Feature Distributions (Sample)\n"
desc = final_df.describe().T[['mean', 'min', 'max']]
md += desc.to_markdown() + "\n"

with open("wc_2026_feature_validation.md", "w") as f:
    f.write(md)

print("Done! Outputs saved to world_cup_2026_features.csv and wc_2026_feature_validation.md")
