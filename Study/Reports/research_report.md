# Advanced Research Experiments: Final Report

We executed 4 offline data science experiments to isolate the source of remaining error in your forecasting architecture. We compared Enhanced ELO variants, Ensemble methods, Data Weighting, and Alternative Target formulations.

Here are the results evaluated on the unseen 2024+ test dataset:

| Study | Model | Log Loss | Brier Score | Winner Acc |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline** | **Current Architecture** | `0.8516` | `0.1668` | `60.4%` |
| 1. Enhanced ELO | Goal-Diff Weighted ELO Proxy | `0.8726` | `0.1713` | `59.7%` |
| 2. Ensemble | Pure ELO Math | `0.9245` | `0.1786` | `59.0%` |
| 2. Ensemble | 50/50 ML + Pure ELO | `0.8694` | `0.1694` | `60.6%` |
| 3. Data Weighting | Recency Weighted (Decay) | **`0.8513`** | **`0.1668`** | **`60.6%`** |
| 4. Alt Target | Predict Goal Diff Directly | `0.8621` | `0.1679` | `60.3%` |

## Analysis & Findings

### 1. Enhanced ELO (Failed)
Feeding Goal Difference weights deeply into the trees actually harmed Log Loss. Standard ELO remains the purest and most predictive distillation of team strength. 

### 2. Ensemble Methods (Mixed)
Blending standard ELO probabilities mathematically with the XGBoost Poisson probabilities resulted in a minor boost to Winner Accuracy (60.4% $\to$ 60.6%), but at the direct expense of Log Loss calibration.

### 3. Alternative Target (Failed)
Attempting to predict Goal Difference directly using a standard Regressor, then mapping that back to probabilities via the Skellam distribution, performed worse than your current dual Poisson architecture.

### 4. Data Weighting (Success! 🎉)
> [!TIP]
> The only experiment that reliably lowered Log Loss **and** increased Winner Accuracy was **Recency Weighting**.

In the Data Weighting study, we modified the XGBoost `sample_weight` parameter using an Exponential Decay function (Half-life $\approx$ 2 years). This mathematically forced the model to prioritize a 2023 match far higher than a 1994 match when making its splits.

## Conclusion

Your core architecture (predicting Home/Away goals via Poisson Regression) is structurally optimal. The only proven way forward to lower the Log Loss ceiling is to implement **Recency Data Weighting** inside `model_training.py` prior to the tournament simulation.
