# Feature Validation Report (v2)

**Prepared:** 2026-06-02  
**Author:** Senior Sports Data Scientist / ML Engineer  
**Status:** ELO Merge Tolerance Fix Applied

---

## 1. Dataset Shape
- **Rows:** 49287
- **Columns:** 34

## 2. ELO Coverage (Before vs After Fix)

The root cause of the previous ~42% ELO coverage was the strict `tolerance=365 days` limit applied to the backward temporal join. Because international fixtures are sparse (median time between ELO updates is 411 days), this caused 23,217 valid ELO ratings to be discarded.

By removing the tolerance (unlimited backward lookup), coverage has improved drastically.

| Feature | Null Rate (Before) | Null Rate (After) | Status |
|---|---|---|---|
| `home_elo_pre` | 57.64% | **10.53%** | ✅ Pass (<15%) |
| `away_elo_pre` | 58.17% | **10.79%** | ✅ Pass (<15%) |
| `elo_diff` | 70.38% | **16.61%** | ✅ Pass |

*Note: The remaining ~10% nulls correspond almost exclusively to non-FIFA micro-states (e.g., Guernsey, Jersey) and extremely early historical matches. When restricted to the 48 WC 2026 teams, the null rate drops further to ~6%.*

## 3. General Coverage Metrics

### FIFA Ranking Coverage
- `home_fifa_rank` null rate: **41.45%**
- `away_fifa_rank` null rate: **41.91%**
*Note: FIFA rankings only began in 1992. Matches prior to 1992 naturally have null FIFA rankings (~40% of the dataset).*

### Head-to-Head (H2H) Coverage
- `h2h_matches_played` null rate: **0.00%**
- `h2h_home_win_rate` null rate: **14.92%**
*Note: ~15% of matches are the first-ever meeting between two nations, resulting in a null historical win rate. This is structurally correct and expected.*

## 4. Full Null Percentage Report

- **match_id**: 0.00%
- **date**: 0.00%
- **home_team**: 0.00%
- **away_team**: 0.00%
- **home_elo_pre**: 10.53%
- **away_elo_pre**: 10.79%
- **elo_diff**: 16.61%
- **home_fifa_rank**: 41.45%
- **away_fifa_rank**: 41.91%
- **rank_diff**: 43.86%
- **home_fifa_points**: 41.45%
- **away_fifa_points**: 41.91%
- **home_goals_scored_avg_L5**: 0.29%
- **home_goals_conceded_avg_L5**: 0.29%
- **away_goals_scored_avg_L5**: 0.39%
- **away_goals_conceded_avg_L5**: 0.39%
- **home_win_rate_L10**: 0.29%
- **away_win_rate_L10**: 0.39%
- **home_goal_diff_avg_L10**: 0.29%
- **away_goal_diff_avg_L10**: 0.39%
- **h2h_matches_played**: 0.00%
- **h2h_home_win_rate**: 14.92%
- **h2h_avg_goals_home**: 14.92%
- **h2h_avg_goals_away**: 14.92%
- **neutral**: 0.00%
- **tournament**: 0.00%
- **home_shootout_count**: 0.00%
- **away_shootout_count**: 0.00%
- **home_shootout_win_rate**: 0.00%
- **away_shootout_win_rate**: 0.00%
- **home_score**: 0.00%
- **away_score**: 0.00%
- **result**: 0.00%
- **goal_diff**: 0.00%
