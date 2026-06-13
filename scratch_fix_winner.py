import sqlite3

conn = sqlite3.connect('tournament.db')
c = conn.cursor()

c.execute("UPDATE matches SET winner = 'H' WHERE match_id IN ('m1', 'm2')")
conn.commit()
conn.close()

print("Fixed winner format in database.")
