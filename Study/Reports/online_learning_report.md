# Online Learning Historical Backtest

We executed a rigorous offline validation framework via `online_learning_backtest.py` to simulate how your models would have performed if deployed during the 2018 and 2022 World Cups. 

We compared two models:
1. **Static Model:** Trained on all data prior to the tournament, then frozen.
2. **Online Model:** Identical to the Static Model initially, but incrementally retrained (`.fit()`) after *every single match* throughout the tournament.

## Final Results

### World Cup 2018
| Metric | Static Model | Online Learning Model | Winner |
| :--- | :--- | :--- | :--- |
| **Log Loss** | **0.948** | 1.265 | Static |
| **Brier Score** | **0.187** | 0.256 | Static |
| **Winner Accuracy** | **56.3%** | 35.9% | Static |
| **Exact Score Accuracy**| **15.6%** | 9.4% | Static |

### World Cup 2022
| Metric | Static Model | Online Learning Model | Winner |
| :--- | :--- | :--- | :--- |
| **Log Loss** | **1.005** | 1.360 | Static |
| **Brier Score** | **0.197** | 0.279 | Static |
| **Winner Accuracy** | **56.3%** | 28.1% | Static |
| **Exact Score Accuracy**| **7.8%** | 7.8% | Tie |

## Analysis: Why did Online Learning Fail?

> [!WARNING]
> Online Learning caused a **catastrophic drop** in performance across every single metric. Winner Accuracy dropped from a respectable 56% down to a coin-flip 28%.

This failure stems from the mathematical architecture of **XGBoost**. 
Unlike a true Neural Network that learns via smooth, gradual gradient descent over time, XGBoost is an ensemble of decision trees. When we pass a single match (e.g., Saudi Arabia beating Argentina 2-1) into `.fit(xgb_model=current_model)`, the algorithm is forced to aggressively grow/update trees to accommodate that specific result. 

Because the sample size of the update is literally $N=1$, the model **violently overfits to the noise of the latest match**. It forgets the thousands of matches it learned from over the past decade ("Catastrophic Forgetting"), causing its future predictions to become highly erratic and deeply uncalibrated.

## Final Recommendation

> [!CAUTION]
> **Do NOT deploy Online Learning to production.** 

The current Static Model, which relies on your dynamically shifting ELO ratings to adapt to mid-tournament form, is vastly superior. The underlying XGBoost trees should remain frozen during the tournament, allowing the ELO inputs to shoulder the burden of tracking momentum.
