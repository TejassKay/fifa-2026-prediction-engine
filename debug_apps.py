import pandas as pd
df_a = pd.read_csv('Dataset/appearances.csv')
fiwc = df_a[df_a['competition_id'] == 'FIWC']
print(f"Total FIWC apps: {len(fiwc)}")
if len(fiwc) > 0:
    print(fiwc['date'].min(), fiwc['date'].max())
