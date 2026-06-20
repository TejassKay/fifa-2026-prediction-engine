import pandas as pd
df = pd.read_csv("world_cup_2026_features.csv")
print("Features Teams:", df['home_team'].unique()[:5])
print("Is Côte d'Ivoire in features?", "Côte d'Ivoire" in df['home_team'].values)
print("Is Ivory Coast in features?", "Ivory Coast" in df['home_team'].values)
