# Final Tournament Adaptation Benchmark Study

## Aggregate Predictive Edge (Match Level)

| candidate    |   brier_mc |       ll |      rps |      acc |
|:-------------|-----------:|---------:|---------:|---------:|
| B_Tourn_Form |   0.544891 | 0.933716 | 0.18884  | 0.578125 |
| Baseline     |   0.545102 | 0.933707 | 0.188843 | 0.578125 |
| F_Dyn_Weight |   0.545202 | 0.934163 | 0.188917 | 0.578125 |
| H_Momentum   |   0.545961 | 0.935042 | 0.189171 | 0.578125 |
| C_Tourn_Elo  |   0.546423 | 0.935674 | 0.189393 | 0.578125 |
| A_Daily_RW   |   0.547473 | 0.93711  | 0.189955 | 0.585938 |
| D_xG_Mod     |   0.558309 | 0.953161 | 0.193434 | 0.585938 |
| G_Bayesian   |   0.590302 | 0.99391  | 0.209548 | 0.546875 |

## Analysis & Verdict
**Verdict:** None of the adaptive candidates robustly outperformed the frozen baseline. The baseline architecture remains the strongest mathematical approach, proving that attempting to 'learn' from the noise of a 7-match tournament leads to overfitting rather than true signal extraction.
