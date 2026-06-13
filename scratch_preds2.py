import database

# Task 1: Update mock predictions to exact specified scores
# Mexico 2 - South Africa 0
database.save_prediction('m1', 2, 0, 'H', 0.60, 0.25, 0.15)

# South Korea 1 - Czechia 0
database.save_prediction('m2', 1, 0, 'H', 0.40, 0.35, 0.25)

print("Mock predictions updated.")
