# API Contract: FIFA 2026 Prediction Dashboard

This document outlines the JSON data structures expected by the frontend. Currently, these are fulfilled via static mock data (`src/lib/mock-data.ts`), but they serve as the contract for the future Python FastAPI/Flask backend.

## 1. Top Level Predictions

### `GET /api/predictions/champion`
Returns the aggregated Monte Carlo results for all 48 teams.

```json
[
  {
    "team": "Argentina",
    "champion_prob": 0.175,
    "final_prob": 0.272,
    "semi_prob": 0.380,
    "quarter_prob": 0.520,
    "r16_prob": 0.750,
    "r32_prob": 0.950
  },
  ...
]
```

## 2. Team Stats & Features

### `GET /api/teams/:id`
Returns pre-tournament statistics and feature values for a specific team.

```json
{
  "team": "Argentina",
  "group": "Group A",
  "elo_rating": 2171,
  "fifa_ranking": 1,
  "recent_form": {
    "goals_scored_L5": 2.8,
    "goals_conceded_L5": 0.4,
    "win_rate_L10": 0.90
  }
}
```

## 3. Match Predictor

### `POST /api/predict/match`
Predicts the outcome of a match between any two teams.

**Request:**
```json
{
  "home_team": "Spain",
  "away_team": "France"
}
```

**Response:**
```json
{
  "expected_goals": {
    "home": 1.45,
    "away": 1.30
  },
  "probabilities": {
    "home_win": 0.42,
    "draw": 0.25,
    "away_win": 0.33
  },
  "top_scorelines": [
    {"score": "1-1", "prob": 0.12},
    {"score": "1-0", "prob": 0.10},
    {"score": "2-1", "prob": 0.08},
    {"score": "0-1", "prob": 0.08},
    {"score": "0-0", "prob": 0.06}
  ]
}
```

## 4. Group Stage Standings

### `GET /api/groups`
Returns predicted standings and qualification probabilities for all 12 groups.

```json
{
  "Group A": [
    {
      "team": "Argentina",
      "expected_points": 7.5,
      "expected_gd": 5.2,
      "advance_prob": 0.98
    },
    ...
  ]
}
```
