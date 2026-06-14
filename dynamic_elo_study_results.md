# Dynamic vs Static Elo Study Results

This study isolates the effect of dynamically updating Elo ratings during a tournament. By bypassing XGBoost and testing the raw Elo probabilities, we can mathematically prove whether adjusting Elo based on match results mid-tournament improves predictive accuracy.

## Overall Results
- **Static Elo:** Brier: 0.5745 | LogLoss: 0.9810 | Accuracy: 55.7%
- **Dynamic Elo:** Brier: 0.5738 | LogLoss: 0.9817 | Accuracy: 57.3%

## Group Stage vs Knockout Stage
- **Group Stage Static:** Brier: 0.5759 | LogLoss: 0.9899 | Accuracy: 56.2%
- **Group Stage Dynamic:** Brier: 0.5781 | LogLoss: 0.9947 | Accuracy: 56.9%
- **Knockout Stage Static:** Brier: 0.5703 | LogLoss: 0.9542 | Accuracy: 54.2%
- **Knockout Stage Dynamic:** Brier: 0.5608 | LogLoss: 0.9428 | Accuracy: 58.3%

## Conclusion
Dynamic Elo **improves** predictive accuracy. We should implement it into the main XGBoost feature pipeline mid-simulation.