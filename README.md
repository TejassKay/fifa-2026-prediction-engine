# FIFA World Cup 2026 Prediction Engine

A production-grade, full-stack machine learning platform built to predict the outcome of the expanded 48-team FIFA World Cup 2026. This platform uses a custom **XGBoost Expected Goals (xG) model** coupled with a **100,000-run Monte Carlo simulation engine** to generate probabilistic forecasts for every team and match in the tournament.

The system features a **FastAPI** backend that computes and serves these probabilities with zero latency, and a highly interactive, cinematic **Next.js 15** frontend dashboard for visualizing the tournament outcomes.

---

## 🧠 How the Model Works

The prediction engine relies on a pipeline that progresses from raw historical data all the way to probabilistic tournament simulations.

### 1. Feature Engineering (`wc_feature_generator.py`)
We compiled decades of historical international match results, FIFA rankings, and ELO ratings. For every historical match, the engine computes pre-match features:
- **ELO Ratings**: A dynamic rating system that updates after every match, rewarding teams for beating strong opponents and punishing them for losing to weak ones.
- **FIFA Rankings**: Official FIFA point differentials.
- **Recent Form**: Rolling averages for the last 5 matches (Goals Scored, Goals Conceded) and last 10 matches (Win Rate, Goal Difference).
- **Head-to-Head**: Historical match records between the two specific teams playing.
- **Tournament Context**: Flags for whether the match is a friendly, a qualifier, or a major tournament (where teams try harder).

### 2. The XGBoost Expected Goals (xG) Model (`model_tuning.py`)
Instead of simply predicting "Win, Lose, or Draw", we built two separate **XGBoost Regressors**:
- **Home Model**: Predicts the Expected Goals (xG) scored by the "Home" team (`tuned_best_model_home.joblib`).
- **Away Model**: Predicts the Expected Goals (xG) scored by the "Away" team (`tuned_best_model_away.joblib`).

These models learned the complex, non-linear relationships between ELO differences, recent attacking form, and defensive solidity to output a continuous decimal value (e.g., France is expected to score 2.1 goals against Brazil).

### 3. Poisson Distribution Match Simulation
Because soccer goals are rare, independent events, they perfectly fit a **Poisson Distribution**. 
When two teams play, the backend takes their expected goals (e.g., $\lambda_{home} = 1.5, \lambda_{away} = 0.9$) and generates a bivariate probability matrix for every possible scoreline (1-0, 0-0, 3-2, etc.). By summing these probabilities, we calculate the exact percentage chance of a Home Win, Draw, or Away Win.

### 4. Monte Carlo Tournament Simulator (`monte_carlo_simulator.py`)
To predict the entire tournament, the system runs the entire 2026 World Cup **100,000 times**:
- It maps the 48 teams into their official 12 groups.
- It simulates every group stage match by drawing random scorelines weighted by the Poisson probabilities.
- It calculates group standings, goal differences, and advances the top 32 teams.
- It simulates the knockout stages, including extra time and penalty shootouts (using historical shootout success rates).
- It tracks how far every team goes in each of the 100,000 parallel universes, producing the final robust probabilities you see on the Dashboard (e.g., Argentina winning 17.5% of the time).

---

## 🏗️ Architecture

- **Backend (`backend.py`)**: A Python FastAPI server. On startup, it pre-loads the Monte Carlo dataset and the XGBoost prediction matrix into memory. This allows it to serve dynamic Group Stage and Knockout Bracket structures instantly.
- **Frontend (`frontend/`)**: A Next.js 15 App Router application built with Tailwind CSS v4, shadcn/ui, Recharts, and Framer Motion. It fetches data from the backend and renders highly interactive radar charts, animated bracket trees, and live match predictor panels.

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
- `docs/` - Extensive markdown documentation on data audits, feature generation, and historical backtesting.
- `backend.py` - The FastAPI live web server.
- `bracket_engine.py` - Deterministic FIFA 2026 bracket generation logic.
- `monte_carlo_simulator.py` - The engine that runs 100,000 tournament simulations.
- `feature_pipeline.py` & `wc_feature_generator.py` - Scripts for engineering machine learning features from raw CSVs.
- `model_training.py` & `model_tuning.py` - Scripts that train and tune the XGBoost models.
- `historical_backtester.py` - Framework used to test the model's accuracy on the 2014, 2018, and 2022 World Cups.
