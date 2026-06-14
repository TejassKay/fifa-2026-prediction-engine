from backend import load_data, get_champions

load_data()
champs = get_champions()
for c in champs[:5]:
    print(c["team"], c["champion_probability"], c.get("trend"), c.get("delta"))
