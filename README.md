# FIFA World Cup 2026 Prediction Engine

A production-grade, full-stack machine learning platform built to predict the outcome of the expanded 48-team FIFA World Cup 2026. This platform uses a custom **XGBoost Expected Goals (xG) model** coupled with a **100,000-run Monte Carlo simulation engine** to generate probabilistic forecasts for every team and match in the tournament.

The system features a **FastAPI** backend that computes and serves these probabilities with zero latency, an integrated **SQLite database** for rich player/squad data, and a highly interactive, cinematic **Next.js 15** frontend dashboard for visualizing tournament outcomes.

---

## 🌟 Key Features & Dashboard Modules

The frontend has evolved into a comprehensive football intelligence platform, featuring:
- **Tournament Overview**: Group Stage standings, animated Knockout Bracket, and Road to Glory tracking.
- **Stories & Stars**: 
  - **Intelligence Center**: Deep dive into team strengths, weaknesses, and tactical metrics.
  - **Golden Boot & Awards**: Probabilistic forecasts for individual player awards based on squad data.
  - **Squad Explorer**: Browse the 48-team rosters powered by our player database.
- **Predictions & Analytics**: 
  - **Match Predictor**: Simulate specific H2H matchups on the fly.
  - **Analytics & ML**: Detailed model interpretability using **SHAP** values to explain why the model favors certain teams.
  - **Odds History & Accuracy Center**: Track model performance against historical baseline odds.

---

## 🧠 How the Prediction Engine Works

The prediction engine relies on a pipeline that progresses from raw historical data and squad valuations all the way to probabilistic tournament simulations.

### 1. Feature Engineering & Player Data
We compiled decades of historical international match results, FIFA rankings, and ELO ratings, recently augmented with squad-level data:
- **ELO Ratings & FIFA Rankings**: Dynamic ratings updated after every historical match.
- **Recent Form**: Rolling averages for the last 5 and 10 matches (Goals, Win Rate, Goal Diff).
- **Squad Features**: Player valuations and domestic club performance aggregated to the national team level.

### 2. The XGBoost Expected Goals (xG) Model
Instead of simply predicting "Win, Lose, or Draw", we built two separate **XGBoost Regressors**:
- **Home Model**: Predicts the Expected Goals (xG) scored by the "Home" team.
- **Away Model**: Predicts the Expected Goals (xG) scored by the "Away" team.

*Note: We also evaluate Random Forest, LightGBM, and Poisson Regression baselines, but XGBoost drives the primary production engine. The model's decision-making is fully transparent via SHAP (SHapley Additive exPlanations) analysis.*

### 3. Poisson Distribution Match Simulation
Because soccer goals are rare, independent events, they perfectly fit a **Poisson Distribution**. The backend takes expected goals (e.g., $\lambda_{home} = 1.5, \lambda_{away} = 0.9$) and generates a bivariate probability matrix for every possible scoreline to calculate the exact percentage chance of a Home Win, Draw, or Away Win.

### 4. Monte Carlo Tournament Simulator
To predict the entire tournament, the system runs the entire 2026 World Cup **100,000 times**:
- Maps the 48 teams into their official 12 groups.
- Simulates every group stage match by drawing random scorelines weighted by the Poisson probabilities.
- Simulates knockout stages, including extra time and penalty shootouts (using historical shootout success rates).
- Tracks how far every team goes in each of the 100,000 parallel universes, producing final robust probabilities.

---

## 🏗️ Architecture

- **Database**: A SQLite database (`tournament.db`) handles structured queries for player rosters and squad stats.
- **Backend**: A Python FastAPI server. On startup, it pre-loads the Monte Carlo dataset, XGBoost models, and SQLite connections to serve dynamic data instantly.
- **Frontend**: A Next.js 15 App Router application built with Tailwind CSS v4, shadcn/ui, Recharts, Lucide Icons, and Framer Motion.

---

## 🚀 How to Run Locally

You must run both the Python Backend and the Next.js Frontend simultaneously.

### 1. Start the Backend
Open a terminal, activate your virtual environment, and start the FastAPI server:

```bash
# Navigate to the project root
cd /path/to/Fifa_WC_2026_predictor

# Activate the virtual environment
source venv/bin/activate

# Run the Uvicorn server on port 8000
uvicorn backend:app --reload
```

### 2. Start the Frontend
Open a **second** terminal, navigate to the frontend directory, and start the Next.js development server:

```bash
# Navigate to the frontend
cd /path/to/Fifa_WC_2026_predictor/frontend

# Install dependencies (if you haven't already)
npm install

# Start the dev server on port 3000
npm run dev
```

### 3. View the Application
Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Structure

- `frontend/` - Next.js React application.
- `Dataset/` - Raw historical CSV data (results, ELO, FIFA rankings).
- `docs/` - Markdown documentation on data audits, feature generation, and historical backtesting.
- `tournament.db` / `database.py` / `build_player_db.py` - Player and squad SQLite database infrastructure.
- `backend.py` - The FastAPI live web server.
- `monte_carlo_simulator.py` & `bracket_engine.py` - Tournament simulation and deterministic bracket generation logic.
- `feature_pipeline.py`, `wc_feature_generator.py`, `extract_squads.py` - Feature engineering pipelines.
- `model_training.py` & `model_tuning.py` - Scripts that train and tune the machine learning models.
- `shap_analysis.py` - Model interpretability and feature importance extraction.
- `historical_backtester.py` - Framework used to test the model's accuracy on past World Cups.
