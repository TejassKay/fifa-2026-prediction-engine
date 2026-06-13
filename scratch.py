import database
database.init_db()
database.record_match('m1', 'Mexico', 'South Africa', 2, 0, 'Mexico', [{'player_name': 'Quinones Julian', 'team': 'Mexico'}, {'player_name': 'Jimenez Raul', 'team': 'Mexico'}], 'Group Stage', '2026-06-12')
database.record_match('m2', 'Korea Republic', 'Czechia', 2, 1, 'Korea Republic', [{'player_name': 'Hwang Inbeom', 'team': 'Korea Republic'}, {'player_name': 'Oh Hyeongyu', 'team': 'Korea Republic'}, {'player_name': 'Krejci Ladislav', 'team': 'Czechia'}], 'Group Stage', '2026-06-12')

database.save_odds_snapshot('1', {'Argentina': 0.189, 'Spain': 0.177, 'France': 0.114, 'England': 0.089, 'Brazil': 0.085, 'Portugal': 0.064, 'Netherlands': 0.046, 'Germany': 0.043, 'Colombia': 0.032, 'Belgium': 0.025})
database.save_odds_snapshot('2', {'Argentina': 0.175, 'Spain': 0.135, 'France': 0.126, 'England': 0.095, 'Brazil': 0.088, 'Portugal': 0.059, 'Germany': 0.056, 'Netherlands': 0.055, 'Belgium': 0.038, 'Colombia': 0.032})
print("Added dummy data!")
