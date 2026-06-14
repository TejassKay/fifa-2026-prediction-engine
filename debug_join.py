import pandas as pd
df_r = pd.read_csv('Dataset/results.csv')
df_g = pd.read_csv('Dataset/games.csv')
df_r['date'] = pd.to_datetime(df_r['date'])
df_g['date'] = pd.to_datetime(df_g['date'])
m2014 = df_r[(df_r['tournament'] == 'FIFA World Cup') & (df_r['date'].dt.year == 2014)]
g2014 = df_g[(df_g['competition_id'] == 'FIWC') & (df_g['date'].dt.year == 2014)]
m_names = set(m2014['home_team']).union(set(m2014['away_team']))
g_names = set(g2014['home_club_name']).union(set(g2014['away_club_name']))
print("In m2014 but not g2014:", m_names - g_names)
print("In g2014 but not m2014:", g_names - m_names)
