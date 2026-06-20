# Final Challenger Study: Tournament Strength Adaptation

This study evaluates if dynamic team strength updates during a tournament improve predictions over the static Baseline.

## 2018 World Cup Results

| Model | Log Loss (↓) | Brier (↓) | RPS (↓) | Winner Acc (↑) | Exact Score (↑) |
|-------|--------------|-----------|---------|----------------|-----------------|
| **Baseline** | 0.8728 | 0.5100 | 0.1749 | 60.9% | 17.2% |
| **Challenger_A** | 0.8778 | 0.5143 | 0.1766 | 60.9% | 15.6% |
| **Challenger_B** | 0.8717 | 0.5099 | 0.1750 | 64.1% | 15.6% |
| **Challenger_C** | 0.8728 | 0.5104 | 0.1750 | 60.9% | 15.6% |
| **Challenger_D** | 0.8787 | 0.5151 | 0.1770 | 60.9% | 14.1% |
| **Challenger_E** | 0.8772 | 0.5140 | 0.1763 | 60.9% | 12.5% |

## 2022 World Cup Results

| Model | Log Loss (↓) | Brier (↓) | RPS (↓) | Winner Acc (↑) | Exact Score (↑) |
|-------|--------------|-----------|---------|----------------|-----------------|
| **Baseline** | 0.9465 | 0.5494 | 0.1898 | 59.4% | 9.4% |
| **Challenger_A** | 0.9678 | 0.5636 | 0.1964 | 57.8% | 9.4% |
| **Challenger_B** | 0.9879 | 0.5771 | 0.2032 | 53.1% | 7.8% |
| **Challenger_C** | 0.9472 | 0.5501 | 0.1900 | 59.4% | 9.4% |
| **Challenger_D** | 0.9682 | 0.5641 | 0.1965 | 59.4% | 9.4% |
| **Challenger_E** | 0.9627 | 0.5603 | 0.1945 | 59.4% | 10.9% |

