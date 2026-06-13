import database
database.save_odds_snapshot('pre_tournament', {'Argentina': 0.189, 'Spain': 0.177, 'France': 0.114, 'England': 0.089, 'Brazil': 0.085, 'Portugal': 0.064, 'Netherlands': 0.046, 'Germany': 0.043, 'Colombia': 0.032, 'Belgium': 0.025, 'Mexico': 0.015, 'Korea Republic': 0.012, 'South Africa': 0.005, 'Czechia': 0.008})
database.save_odds_snapshot('m1', {'Argentina': 0.185, 'Spain': 0.170, 'France': 0.114, 'England': 0.089, 'Brazil': 0.085, 'Portugal': 0.064, 'Netherlands': 0.046, 'Germany': 0.043, 'Colombia': 0.032, 'Belgium': 0.025, 'Mexico': 0.014, 'Korea Republic': 0.012, 'South Africa': 0.005, 'Czechia': 0.008})
database.save_odds_snapshot('m2', {'Argentina': 0.175, 'Spain': 0.135, 'France': 0.126, 'England': 0.095, 'Brazil': 0.088, 'Portugal': 0.059, 'Germany': 0.056, 'Netherlands': 0.055, 'Belgium': 0.038, 'Colombia': 0.032, 'Mexico': 0.014, 'Korea Republic': 0.016, 'South Africa': 0.005, 'Czechia': 0.009})

# delete the wrong ones
import sqlite3
conn = sqlite3.connect('tournament.db')
c = conn.cursor()
c.execute("DELETE FROM odds_history WHERE match_id IN ('1', '2')")
conn.commit()
conn.close()

print("Fixed odds history IDs")
