# FIFA 2026 Prediction Dashboard

This is the Next.js 15 frontend dashboard for the FIFA 2026 Monte Carlo Prediction Engine.

## Tech Stack
- Next.js 15 (App Router)
- Tailwind CSS v4
- shadcn/ui
- Recharts
- Framer Motion

## Getting Started

First, run the development server:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture & Integration

Currently, the frontend is powered by a robust mock data layer (`src/lib/mock-data.ts`) containing the exact outputs from the Python Monte Carlo simulator runs (e.g., Argentina, Spain, France probabilities).

To wire this up to a live Python backend (like FastAPI or Flask), please refer to the `api_contract.md` file in the root directory. This document outlines the exact JSON payloads that the frontend expects.

## Features
- **Dashboard**: High-level overview of the tournament champion probabilities.
- **Team Explorer**: Deep dive into individual team ELO ratings, recent form, and progression probabilities.
- **Match Predictor**: Interactive UI to simulate the 90-minute Expected Goals (xG) and Win/Draw/Loss probabilities between any two teams.
- **Analytics**: Visualization of XGBoost feature importances and historical backtest metrics (Brier Score vs ELO Baseline).
