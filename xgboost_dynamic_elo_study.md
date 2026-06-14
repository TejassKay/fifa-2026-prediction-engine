# Conclusive Study: XGBoost + Dynamic Elo

## Part 1: Match-Level Accuracy (XGBoost)
- **Static XGBoost:** Brier: 0.5211 | LogLoss: 0.8961 | Accuracy: 62.5%
- **Dynamic XGBoost:** Brier: 0.5229 | LogLoss: 0.8989 | Accuracy: 62.0%

- **Group Stage Static:** Brier: 0.5119 | LogLoss: 0.8857 | Acc: 63.9%
- **Group Stage Dynamic:** Brier: 0.5147 | LogLoss: 0.8900 | Acc: 63.2%
- **Knockout Stage Static:** Brier: 0.5486 | LogLoss: 0.9273 | Acc: 58.3%
- **Knockout Stage Dynamic:** Brier: 0.5472 | LogLoss: 0.9254 | Acc: 58.3%

## Part 2: Monte Carlo Tournament Winners (N=1000)
### World Cup 2014 (Winner: Germany)
- Probability of Germany winning under **Static**: 21.3%
- Probability of Germany winning under **Dynamic**: 22.7%

### World Cup 2018 (Winner: France)
- Probability of France winning under **Static**: 8.6%
- Probability of France winning under **Dynamic**: 7.5%

### World Cup 2022 (Winner: Argentina)
- Probability of Argentina winning under **Static**: 15.3%
- Probability of Argentina winning under **Dynamic**: 15.3%

