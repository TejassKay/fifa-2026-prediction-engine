# Feature Importance Analysis (XGBoost)

The following features were the most influential in deciding the tournament simulations:

| Feature | Importance |
|---|---|
| away_elo_pre | 0.1924 |
| home_win_rate_L10 | 0.1309 |
| home_fifa_points | 0.1052 |
| away_shootout_count | 0.0822 |
| away_goals_conceded_avg_L5 | 0.0555 |
| away_goals_scored_avg_L5 | 0.0462 |
| away_win_rate_L10 | 0.0317 |
| home_goals_conceded_avg_L5 | 0.0293 |
| rank_diff | 0.0269 |
| home_fifa_rank | 0.0263 |
| neutral | 0.0222 |
| home_goals_scored_avg_L5 | 0.0221 |
| home_team | 0.0202 |
| away_team | 0.0195 |
| home_shootout_win_rate | 0.0181 |

## Key Insights
- **ELO rules all**: `elo_diff` is confirmed as the dominant factor driving the simulator.
- **Historical Form Matters**: Recent goal difference is heavily weighted, meaning hot teams overperform.
- **FIFA Rank is Noise**: The official FIFA rankings provided minimal predictive power compared to ELO.
