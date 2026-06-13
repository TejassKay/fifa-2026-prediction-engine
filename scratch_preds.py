import database

# Match 1: m1 (Mexico vs South Africa)
# Real score was 2-0. We predict 2-1 (Correct Winner, wrong score).
database.save_prediction('m1', 2, 1, 'H', 0.60, 0.25, 0.15)

# Match 2: m2 (Korea vs Czechia)
# Real score was 2-1. We predict 1-1 (Missed Prediction).
# Let's actually make it a "Massive Upset" by predicting Czechia to win with high probability.
database.save_prediction('m2', 0, 2, 'A', 0.20, 0.20, 0.60)

print("Predictions added.")
