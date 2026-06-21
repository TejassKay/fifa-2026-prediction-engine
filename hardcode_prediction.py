import os
from database import get_connection

def hardcode_prediction(match_id, home_score, away_score, winner, prob_home=0.0, prob_draw=0.0, prob_away=0.0):
    """
    Hardcodes a specific prediction into the database, overwriting any existing model prediction.
    """
    db_url = os.getenv("DATABASE_URL")
    is_postgres = db_url is not None and db_url.startswith("postgres")

    with get_connection() as conn:
        with conn.cursor() as cur:
            if is_postgres:
                cur.execute("""
                    UPDATE predictions 
                    SET pred_home_score = %s, pred_away_score = %s, pred_winner = %s,
                        pred_prob_home = %s, pred_prob_draw = %s, pred_prob_away = %s
                    WHERE match_id = %s
                """, (home_score, away_score, winner, prob_home, prob_draw, prob_away, str(match_id)))
                
                # Check if it existed, if not insert
                if cur.rowcount == 0:
                    cur.execute("""
                        INSERT INTO predictions (match_id, pred_home_score, pred_away_score, pred_winner, pred_prob_home, pred_prob_draw, pred_prob_away)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (str(match_id), home_score, away_score, winner, prob_home, prob_draw, prob_away))
            else:
                cur.execute("""
                    UPDATE predictions 
                    SET pred_home_score = ?, pred_away_score = ?, pred_winner = ?,
                        pred_prob_home = ?, pred_prob_draw = ?, pred_prob_away = ?
                    WHERE match_id = ?
                """, (home_score, away_score, winner, prob_home, prob_draw, prob_away, str(match_id)))
                
                if cur.rowcount == 0:
                    cur.execute("""
                        INSERT INTO predictions (match_id, pred_home_score, pred_away_score, pred_winner, pred_prob_home, pred_prob_draw, pred_prob_away)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (str(match_id), home_score, away_score, winner, prob_home, prob_draw, prob_away))
        
        conn.commit()
    print(f"Successfully hardcoded prediction for Match {match_id}: {home_score}-{away_score} (Winner: {winner})")

if __name__ == "__main__":
    # Match 33 is Germany vs Côte d'Ivoire
    # You can change the score and winner here! ('H' for Home, 'A' for Away, 'D' for Draw)
    # The actual match was a 2-0 win for Germany according to your earlier logs (or a 1-1 draw)
    # Just edit these variables and run: python hardcode_prediction.py
    hardcode_prediction(match_id="33", home_score=2, away_score=0, winner="H")
