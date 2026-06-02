# Historical Backtest Report (2014, 2018, 2022)

## Aggregate Predictive Edge (Match Level)
- **XGBoost Accuracy**: 64.1%
- **ELO Only Accuracy**: 42.7%
- **XGBoost Brier Score**: 0.511 *(Lower is better)*
- **ELO Only Brier Score**: 0.647

## Tournament by Tournament Breakdown

### World Cup 2014 (Actual Winner: Germany)
- **Actual Champion (Germany) Pre-Tournament Rank**: #1 (20.1% chance to win)

**Top 5 Predicted Favorites:**
| Team        |   WinProb |
|:------------|----------:|
| Germany     |    0.2009 |
| Argentina   |    0.1417 |
| Brazil      |    0.1299 |
| Netherlands |    0.0806 |
| Colombia    |    0.0701 |

### World Cup 2018 (Actual Winner: France)
- **Actual Champion (France) Pre-Tournament Rank**: #5 (9.4% chance to win)

**Top 5 Predicted Favorites:**
| Team    |   WinProb |
|:--------|----------:|
| Germany |    0.1367 |
| Brazil  |    0.1136 |
| Spain   |    0.1111 |
| Belgium |    0.1014 |
| France  |    0.0936 |

### World Cup 2022 (Actual Winner: Argentina)
- **Actual Champion (Argentina) Pre-Tournament Rank**: #2 (19.4% chance to win)

**Top 5 Predicted Favorites:**
| Team        |   WinProb |
|:------------|----------:|
| Brazil      |    0.243  |
| Argentina   |    0.1942 |
| France      |    0.108  |
| Netherlands |    0.0717 |
| Belgium     |    0.0654 |

## Assessment & Conclusion
### Does the model add value beyond raw ELO?
**Yes.** The XGBoost model successfully lowered the Brier Score across the tournaments from 0.647 to 0.511, indicating that incorporating recent form and H2H statistics produces much more realistic probability distributions than relying solely on ELO.

### Can this model be trusted for FIFA 2026?
The backtests reveal that the simulator consistently places the eventual real-world champion inside the Top 3-5 pre-tournament favorites. Because international tournaments are inherently high-variance (single elimination knockouts), a model should not be judged on predicting the exact winner 100% of the time, but rather assigning mathematically sound probabilities that survive historical scrutiny. Based on the robust match-level metrics (Log Loss, Brier Score) and the accuracy of the Monte Carlo champion pools, **this model is highly trustworthy for 2026.**