import sqlite3
conn = sqlite3.connect("tournament.db")
try:
    conn.execute("ALTER TABLE matches ADD COLUMN status TEXT")
    print("Added status")
except Exception as e:
    print("Error:", e)
