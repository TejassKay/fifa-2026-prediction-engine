import os
import json
import pandas as pd
from database import get_connection

def fix_knockout_draw_predictions():
    # Load the CSV schedule to know which matches are knockouts
    try:
        schedule = pd.read_csv("Dataset/world-cup-2026-schedule.csv")
        knockout_matches = schedule[schedule["stage"] != "Group Stage"]["match_number"].astype(str).tolist()
    except Exception as e:
        print(f"Error loading schedule: {e}")
        return

    with get_connection() as (conn, db_type):
        c = conn.cursor()
        
        try:
            # Get all predictions
            c.execute("SELECT match_id, pred_prob_home, pred_prob_draw, pred_prob_away, pred_winner FROM predictions")
            preds = c.fetchall()
            
            updates = 0
            for row in preds:
                # row structure depends on db_type (could be dict-like or tuple)
                if db_type == "postgres":
                    m_id = row['match_id']
                    p_home = row['pred_prob_home']
                    p_draw = row['pred_prob_draw']
                    p_away = row['pred_prob_away']
                    winner = row['pred_winner']
                else:
                    m_id = row['match_id']
                    p_home = row['pred_prob_home']
                    p_draw = row['pred_prob_draw']
                    p_away = row['pred_prob_away']
                    winner = row['pred_winner']
                
                if str(m_id) in knockout_matches and winner == 'D':
                    new_winner = 'H' if p_home >= p_away else 'A'
                    
                    if db_type == "postgres":
                        c.execute("UPDATE predictions SET pred_winner = %s WHERE match_id = %s", (new_winner, m_id))
                    else:
                        c.execute("UPDATE predictions SET pred_winner = ? WHERE match_id = ?", (new_winner, m_id))
                    
                    updates += 1
                    print(f"Fixed Match {m_id}: Changed winner from 'D' to '{new_winner}'")
            
            conn.commit()
            print(f"Total historical knockout draw predictions fixed: {updates}")
            
        except Exception as e:
            print(f"Error fixing predictions: {e}")
            conn.rollback()
        finally:
            c.close()

if __name__ == "__main__":
    fix_knockout_draw_predictions()
