# Benchmark Study Tasks

## Phase 1: Model Benchmark
- [ ] Create `benchmark_models.py` to evaluate 7 algorithms: XGBoost, LightGBM, CatBoost, Random Forest, Extra Trees, Elastic Net, Ensemble.
- [ ] Run `benchmark_models.py` to determine the top-performing base algorithm.

## Phase 2: Feature Benchmark
- [ ] Create `benchmark_features.py` to evaluate the 5 feature sets on the winning algorithm.
- [ ] Implement historical roster approximation logic to extract positional squad strengths (GK, DEF, MID, ATT) without temporal leakage.
- [ ] Run `benchmark_features.py` to determine the optimal feature set.

## Phase 3: Deliverables
- [ ] Calculate comprehensive validation metrics across all models and feature sets.
- [ ] Compile final `advanced_studies_report.md` with ranking, failure analysis, and final deployment recommendation.
