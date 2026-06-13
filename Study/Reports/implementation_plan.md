# Final Comprehensive Benchmark Study

This is the ultimate benchmark to determine if we have truly reached the performance ceiling with the `Dynamic ELO → Dual XGBoost → Independent Poisson` baseline, or if an advanced model (LightGBM, CatBoost, Ensemble) paired with deeply engineered positional/squad features can dethrone it.

## User Review Required

> [!WARNING]
> Please review the detailed multi-phase methodology below.
> Because building historical squad intelligence (Phase 2) requires processing massive Transfermarkt datasets (`appearances.csv`, `player_valuations.csv`) strictly by historical date to prevent temporal leakage, this will be an intensive data-engineering pipeline.
> **Is the proposed strategy for deriving historical Positional Squad Strengths acceptable?**

---

## Open Questions

> [!IMPORTANT]
> **Historical Squad Composition**
> We do not have explicit historical roster lists for the 2018 and 2022 World Cups in `squads.json`. To construct the "ELO + Player Intelligence Features" for the backtest, I plan to approximate historical rosters by finding all players who made an appearance for a national team in `appearances.csv` in the 12 months leading up to the World Cup, and taking the top 23 most valuable/capped players at that exact point in time. 
> *Is this historically-approximated roster logic acceptable for Phase 2 validation?*

---

## Phase 1: Model Benchmark (Algorithm Shootout)
I will construct `Study/Code/benchmark_models.py` to evaluate 7 candidate algorithms using identical baseline features (ELO differences, Home Advantage, Neutral Venue).
1. XGBoost (Production Baseline)
2. LightGBM
3. CatBoost
4. Random Forest
5. Extra Trees
6. Elastic Net Regression
7. Ensemble (Average of XGBoost, LightGBM, CatBoost)

**Evaluation**: Exact Score Acc, Winner Acc, Log Loss, Brier, RPS on WC 2018, WC 2022, and Modern Holdout.

---

## Phase 2: Feature Benchmark (The Intelligence Layer)
Taking the Top 2 models from Phase 1, I will test 5 progressive feature sets in `Study/Code/benchmark_features.py`:
- **A. Baseline ELO**: Standard ELO differences.
- **B. ELO + Recent Form**: Adding Goals Scored/Conceded in last 5 matches, Win Rate in last 10.
- **C. ELO + Squad Intel**: Total Squad Market Value, Average Age, Top XI Value.
- **D. ELO + Player Intel**: **(Crucial Step)** I will engineer positional features:
  - `GK_strength`: Valuation/quality of top Goalkeeper.
  - `DEF_strength`: Average value/caps of defensive unit.
  - `MID_strength`: Midfield engine metrics.
  - `ATT_strength`: Striker/Winger scoring form and valuation.
- **E. Full Feature Set**: All of the above combined.

---

## Phase 3: Validation & Auditing
- **Leakage Audit**: Ensure all player valuations (`player_valuations.csv`) strictly use dates *prior* to the match date.
- **Overfitting Check**: Compare Train vs Holdout calibration.
- **Metrics Generation**: Calculate rigorous Log Loss, Brier, and RPS matrix for all candidates.

## Deliverables
I will output an extensive `advanced_studies_report.md` artifact detailing the rankings, statistical significance, and a final, definitive answer to the ultimate question: *Should we replace the production engine?*
