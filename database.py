import sqlite3
import json
import os
from contextlib import contextmanager

DB_PATH = "tournament.db"

_pg_pool = None

def init_pool(db_url):
    global _pg_pool
    if _pg_pool is None:
        import psycopg2.pool
        
        # If using Supabase Pooler, force Transaction Mode (port 6543) instead of Session Mode (port 5432)
        if "pooler.supabase.com" in db_url and ":5432" in db_url:
            db_url = db_url.replace(":5432", ":6543")
            
        _pg_pool = psycopg2.pool.ThreadedConnectionPool(minconn=1, maxconn=3, dsn=db_url)

@contextmanager
def get_connection():
    db_url = os.environ.get("DATABASE_URL")
    if db_url and (db_url.startswith("postgres://") or db_url.startswith("postgresql://")):
        init_pool(db_url)
        conn = _pg_pool.getconn()
        try:
            yield conn, "postgres"
        finally:
            _pg_pool.putconn(conn)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn, "sqlite"
        finally:
            conn.close()

def execute_write(query, params=None):
    with get_connection() as (conn, db_type):
        c = conn.cursor()
        try:
            if db_type == "postgres" and params:
                query = query.replace("?", "%s")
            if params:
                c.execute(query, params)
            else:
                c.execute(query)
            conn.commit()
        finally:
            c.close()

def execute_read(query, params=None):
    with get_connection() as (conn, db_type):
        if db_type == "postgres":
            import psycopg2.extras
            c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        else:
            c = conn.cursor()
            
        try:
            if db_type == "postgres" and params:
                query = query.replace("?", "%s")
                
            if params:
                c.execute(query, params)
            else:
                c.execute(query)
            rows = c.fetchall()
            return [dict(r) for r in rows]
        finally:
            c.close()

def init_db():
    execute_write('''
        CREATE TABLE IF NOT EXISTS matches (
            match_id TEXT PRIMARY KEY,
            home_team TEXT,
            away_team TEXT,
            home_score INTEGER,
            away_score INTEGER,
            winner TEXT,
            goal_scorers TEXT,
            stage TEXT,
            date TEXT,
            status TEXT
        )
    ''')
    
    execute_write('''
        CREATE TABLE IF NOT EXISTS predictions (
            match_id TEXT PRIMARY KEY,
            pred_home_score INTEGER,
            pred_away_score INTEGER,
            pred_winner TEXT,
            pred_prob_home REAL,
            pred_prob_draw REAL,
            pred_prob_away REAL
        )
    ''')
    
    execute_write('''
        CREATE TABLE IF NOT EXISTS odds_history (
            match_id TEXT,
            team TEXT,
            champion_prob REAL,
            PRIMARY KEY (match_id, team)
        )
    ''')

def record_match(match_id, home_team, away_team, home_score, away_score, winner, goal_scorers, stage, date):
    scorers_json = json.dumps(goal_scorers)
    execute_write('''
        INSERT INTO matches (match_id, home_team, away_team, home_score, away_score, winner, goal_scorers, stage, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(match_id) DO UPDATE SET
            home_score=excluded.home_score,
            away_score=excluded.away_score,
            winner=excluded.winner,
            goal_scorers=excluded.goal_scorers,
            status=excluded.status
    ''', (str(match_id), home_team, away_team, home_score, away_score, winner, scorers_json, stage, date, 'completed'))

def save_prediction(match_id, pred_home_score, pred_away_score, pred_winner, prob_home, prob_draw, prob_away):
    execute_write('''
        INSERT INTO predictions (match_id, pred_home_score, pred_away_score, pred_winner, pred_prob_home, pred_prob_draw, pred_prob_away)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(match_id) DO UPDATE SET
            pred_home_score=excluded.pred_home_score,
            pred_away_score=excluded.pred_away_score,
            pred_winner=excluded.pred_winner,
            pred_prob_home=excluded.pred_prob_home,
            pred_prob_draw=excluded.pred_prob_draw,
            pred_prob_away=excluded.pred_prob_away
    ''', (str(match_id), pred_home_score, pred_away_score, pred_winner, prob_home, prob_draw, prob_away))

def get_completed_matches():
    return execute_read("SELECT * FROM matches WHERE status='completed'")

def get_predictions():
    rows = execute_read("SELECT * FROM predictions")
    return {str(r['match_id']): r for r in rows}

def delete_match(match_id):
    execute_write("DELETE FROM matches WHERE match_id=?", (str(match_id),))

def save_odds_snapshot(match_id, odds_dict):
    with get_connection() as (conn, db_type):
        c = conn.cursor()
        try:
            query = '''
                INSERT INTO odds_history (match_id, team, champion_prob)
                VALUES (?, ?, ?)
                ON CONFLICT(match_id, team) DO UPDATE SET
                    champion_prob=excluded.champion_prob
            '''
            if db_type == 'postgres':
                query = query.replace('?', '%s')
                
            for team, prob in odds_dict.items():
                c.execute(query, (str(match_id), team, prob))
            conn.commit()
        finally:
            c.close()

def get_odds_history():
    rows = execute_read("SELECT * FROM odds_history")
    history = {}
    for r in rows:
        m_id = str(r['match_id'])
        if m_id not in history:
            history[m_id] = {}
        history[m_id][r['team']] = r['champion_prob']
    return history

if __name__ == '__main__':
    init_db()
    print("Database initialized.")
