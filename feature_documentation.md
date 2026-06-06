# Feature Pipeline Quality Report

## 1. Dataset Shape
- Rows: 49287
- Columns: 40

## 2. Null Percentages
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
- **home_avg_opponent_elo_last_5**: 3.49%
- **home_avg_opponent_fifa_rank_last_5**: 39.19%
- **home_weighted_goal_diff_last_5**: 3.49%
- **away_goals_scored_avg_L5**: 0.39%
- **away_goals_conceded_avg_L5**: 0.39%
- **away_avg_opponent_elo_last_5**: 3.61%
- **away_avg_opponent_fifa_rank_last_5**: 39.19%
- **away_weighted_goal_diff_last_5**: 3.61%
- **home_win_rate_L10**: 0.29%
- **home_goal_diff_avg_L10**: 0.29%
- **home_avg_opponent_elo_last_10**: 3.04%
- **home_avg_opponent_fifa_rank_last_10**: 39.09%
- **home_weighted_goal_diff_last_10**: 3.04%
- **away_win_rate_L10**: 0.39%
- **away_goal_diff_avg_L10**: 0.39%
- **away_avg_opponent_elo_last_10**: 3.21%
- **away_avg_opponent_fifa_rank_last_10**: 39.08%
- **away_weighted_goal_diff_last_10**: 3.21%
- **h2h_avg_goals_home**: 14.92%
- **h2h_avg_goals_away**: 14.92%
- **neutral**: 0.00%
- **tournament**: 0.00%
- **home_score**: 0.00%
- **away_score**: 0.00%
- **result**: 0.00%
- **goal_diff**: 0.00%

## 3. Feature Distributions (Numeric)
|                                     |         mean |        std |        min |          50% |      max |
|:------------------------------------|-------------:|-----------:|-----------:|-------------:|---------:|
| home_elo_pre                        | 1548.11      | 276.089    |     0      | 1565         | 2171     |
| away_elo_pre                        | 1538.21      | 281.596    |     0      | 1558         | 2167     |
| elo_diff                            |   12.9274    | 275.177    | -1276      |   14         | 1302     |
| home_fifa_rank                      |   76.4291    |  52.1393   |     1      |   69         |  211     |
| away_fifa_rank                      |   80.2408    |  52.9934   |     1      |   73         |  211     |
| rank_diff                           |   -4.20564   |  53.7697   |  -208      |   -5         |  208     |
| home_fifa_points                    |  649.368     | 507.789    |     0      |  547         | 2172     |
| away_fifa_points                    |  633.641     | 498.262    |     0      |  536         | 2172     |
| home_goals_scored_avg_L5            |    1.48563   |   0.898238 |     0      |    1.4       |   17     |
| home_goals_conceded_avg_L5          |    1.45462   |   1.00574  |     0      |    1.2       |   24     |
| home_avg_opponent_elo_last_5        | 1543.55      | 209.841    |   528      | 1551.8       | 2126     |
| home_avg_opponent_fifa_rank_last_5  |   79.1592    |  38.5014   |     2      |   73.6       |  209     |
| home_weighted_goal_diff_last_5      |   -0.184689  |   1.54807  |   -26.3267 |   -0.0452    |    9.258 |
| away_goals_scored_avg_L5            |    1.45756   |   0.887464 |     0      |    1.4       |   21     |
| away_goals_conceded_avg_L5          |    1.49654   |   1.05725  |     0      |    1.2       |   21     |
| away_avg_opponent_elo_last_5        | 1540.88      | 214.626    |   522      | 1549.4       | 2126     |
| away_avg_opponent_fifa_rank_last_5  |   80.3605    |  39.1663   |     1      |   75         |  210     |
| away_weighted_goal_diff_last_5      |   -0.244925  |   1.58325  |   -26.3267 |   -0.0785333 |   11.52  |
| home_win_rate_L10                   |    0.390632  |   0.202825 |     0      |    0.4       |    1     |
| home_goal_diff_avg_L10              |    0.025691  |   1.28767  |   -24      |    0.1       |   16     |
| home_avg_opponent_elo_last_10       | 1544.54      | 194.619    |   602      | 1550.2       | 2083     |
| home_avg_opponent_fifa_rank_last_10 |   78.9288    |  35.1848   |     3      |   73.8       |  208     |
| home_weighted_goal_diff_last_10     |   -0.200778  |   1.37803  |   -20.3596 |   -0.0687667 |   11.52  |
| away_win_rate_L10                   |    0.38083   |   0.202329 |     0      |    0.4       |    1     |
| away_goal_diff_avg_L10              |   -0.0472516 |   1.33026  |   -21      |    0.1       |   21     |
| away_avg_opponent_elo_last_10       | 1540.88      | 198.68     |   602      | 1546.32      | 2083     |
| away_avg_opponent_fifa_rank_last_10 |   80.3192    |  35.8665   |     1      |   75.1       |  207.667 |
| away_weighted_goal_diff_last_10     |   -0.261768  |   1.41155  |   -20.748  |   -0.1092    |    9.258 |
| h2h_avg_goals_home                  |    1.62641   |   1.22957  |     0      |    1.40885   |   30     |
| h2h_avg_goals_away                  |    1.58161   |   1.19193  |     0      |    1.33333   |   20.5   |
| home_score                          |    1.75734   |   1.7749   |     0      |    1         |   31     |
| away_score                          |    1.18248   |   1.40293  |     0      |    1         |   21     |
| goal_diff                           |    0.574857  |   2.41686  |   -21      |    0         |   31     |

## 4. Correlation with Target (goal_diff)
A higher absolute correlation indicates stronger predictive power.

|                                 |   goal_diff |
|:--------------------------------|------------:|
| rank_diff                       |   -0.596951 |
| elo_diff                        |    0.551292 |
| h2h_avg_goals_home              |    0.395477 |
| h2h_avg_goals_away              |   -0.372306 |
| away_goal_diff_avg_L10          |   -0.333291 |
| away_fifa_rank                  |    0.330981 |
| away_weighted_goal_diff_last_10 |   -0.314292 |
| home_goal_diff_avg_L10          |    0.293412 |
| away_goals_conceded_avg_L5      |    0.291454 |
| away_weighted_goal_diff_last_5  |   -0.288574 |
| away_elo_pre                    |   -0.276975 |
| home_weighted_goal_diff_last_10 |    0.262081 |
| home_fifa_rank                  |   -0.25255  |
| away_win_rate_L10               |   -0.249461 |
| home_weighted_goal_diff_last_5  |    0.245806 |
| home_goals_conceded_avg_L5      |   -0.241237 |
| home_elo_pre                    |    0.224249 |
| home_win_rate_L10               |    0.223093 |
| away_goals_scored_avg_L5        |   -0.179222 |
| home_goals_scored_avg_L5        |    0.177799 |

