export interface TeamPrediction {
  team: string;
  champion_prob: number;
  final_prob: number;
  semi_prob: number;
  quarter_prob: number;
  r16_prob: number;
  r32_prob: number;
}

export const championPredictions: TeamPrediction[] = [
  { team: "Argentina", champion_prob: 0.175, final_prob: 0.272, semi_prob: 0.41, quarter_prob: 0.58, r16_prob: 0.78, r32_prob: 0.95 },
  { team: "Spain", champion_prob: 0.134, final_prob: 0.225, semi_prob: 0.35, quarter_prob: 0.52, r16_prob: 0.72, r32_prob: 0.93 },
  { team: "France", champion_prob: 0.124, final_prob: 0.209, semi_prob: 0.33, quarter_prob: 0.49, r16_prob: 0.71, r32_prob: 0.94 },
  { team: "England", champion_prob: 0.095, final_prob: 0.172, semi_prob: 0.28, quarter_prob: 0.44, r16_prob: 0.65, r32_prob: 0.89 },
  { team: "Brazil", champion_prob: 0.087, final_prob: 0.160, semi_prob: 0.26, quarter_prob: 0.41, r16_prob: 0.62, r32_prob: 0.88 },
  { team: "Portugal", champion_prob: 0.059, final_prob: 0.121, semi_prob: 0.21, quarter_prob: 0.34, r16_prob: 0.55, r32_prob: 0.82 },
  { team: "Germany", champion_prob: 0.057, final_prob: 0.117, semi_prob: 0.20, quarter_prob: 0.33, r16_prob: 0.54, r32_prob: 0.81 },
  { team: "Netherlands", champion_prob: 0.055, final_prob: 0.114, semi_prob: 0.19, quarter_prob: 0.32, r16_prob: 0.52, r32_prob: 0.80 },
  { team: "Belgium", champion_prob: 0.039, final_prob: 0.088, semi_prob: 0.15, quarter_prob: 0.26, r16_prob: 0.45, r32_prob: 0.75 },
  { team: "Colombia", champion_prob: 0.031, final_prob: 0.073, semi_prob: 0.13, quarter_prob: 0.23, r16_prob: 0.41, r32_prob: 0.72 },
  { team: "Mexico", champion_prob: 0.011, final_prob: 0.035, semi_prob: 0.09, quarter_prob: 0.22, r16_prob: 0.45, r32_prob: 0.78 },
  { team: "Ecuador", champion_prob: 0.010, final_prob: 0.032, semi_prob: 0.08, quarter_prob: 0.21, r16_prob: 0.44, r32_prob: 0.77 },
  { team: "Senegal", champion_prob: 0.006, final_prob: 0.021, semi_prob: 0.06, quarter_prob: 0.16, r16_prob: 0.38, r32_prob: 0.65 },
  { team: "United States", champion_prob: 0.004, final_prob: 0.015, semi_prob: 0.05, quarter_prob: 0.14, r16_prob: 0.35, r32_prob: 0.62 }
];

export const featureImportances = [
  { feature: "elo_diff", importance: 0.42 },
  { feature: "away_elo_pre", importance: 0.15 },
  { feature: "home_elo_pre", importance: 0.14 },
  { feature: "away_goal_diff_avg_L10", importance: 0.08 },
  { feature: "home_goal_diff_avg_L10", importance: 0.07 },
  { feature: "rank_diff", importance: 0.04 },
  { feature: "h2h_avg_goals_home", importance: 0.03 },
  { feature: "h2h_avg_goals_away", importance: 0.03 },
  { feature: "home_win_rate_L10", importance: 0.02 },
  { feature: "away_win_rate_L10", importance: 0.02 }
];

export const backtestResults = [
  { year: 2014, xgb_brier: 0.53, elo_brier: 0.65, xgb_acc: 0.61, elo_acc: 0.44 },
  { year: 2018, xgb_brier: 0.51, elo_brier: 0.62, xgb_acc: 0.63, elo_acc: 0.41 },
  { year: 2022, xgb_brier: 0.49, elo_brier: 0.67, xgb_acc: 0.68, elo_acc: 0.43 },
];

export const generateMatchPrediction = (home: string, away: string) => {
  // Mock logic to generate pseudo-realistic numbers
  const homeFav = home.length > away.length;
  return {
    home_win: homeFav ? 0.55 : 0.20,
    draw: 0.25,
    away_win: homeFav ? 0.20 : 0.55,
    expected_goals: {
      home: homeFav ? 1.8 : 0.9,
      away: homeFav ? 0.9 : 1.8
    },
    top_scorelines: [
      { score: homeFav ? "2-1" : "1-2", prob: 0.12 },
      { score: homeFav ? "1-0" : "0-1", prob: 0.11 },
      { score: "1-1", prob: 0.10 },
      { score: homeFav ? "2-0" : "0-2", prob: 0.09 },
      { score: "0-0", prob: 0.07 }
    ]
  };
};

export const getTeamStats = (team: string) => {
  return {
    team,
    elo_rating: 1800 + Math.floor(Math.random() * 300),
    fifa_ranking: 1 + Math.floor(Math.random() * 30),
    recent_form: {
      goals_scored_L5: (1 + Math.random() * 2).toFixed(1),
      goals_conceded_L5: (Math.random() * 1.5).toFixed(1),
      win_rate_L10: (0.4 + Math.random() * 0.5).toFixed(2)
    }
  };
};
