import pdfplumber
import json
import re

def extract():
    pdf_path = "Dataset/SquadLists-English.pdf"
    out_path = "Dataset/squads.json"
    
    squads = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
                
            lines = text.split("\n")
            
            # Find team name
            team_name = ""
            country_code = ""
            for i, line in enumerate(lines):
                if "11 June 2026" in line and "19 July 2026" in line:
                    if i + 1 < len(lines):
                        team_line = lines[i+1]
                        if "(" in team_line and ")" in team_line:
                            team_name = team_line.split("(")[0].strip()
                            country_code = team_line.split("(")[1].split(")")[0].strip()
                        else:
                            team_name = team_line.strip()
                            country_code = "UNKNOWN"
                        break
                        
            if not team_name:
                continue
                
            # Find coach
            coach_name = "Unknown Coach"
            for line in lines:
                if line.startswith("Head coach"):
                    # Example: Head coach PETKOVIC Vladimir Vladimir PETKOVIĆ Switzerland
                    parts = line.replace("Head coach", "").strip().split()
                    if len(parts) >= 2:
                        coach_name = f"{parts[1]} {parts[0].capitalize()}"
                    break
            
            # Parse table
            tables = page.extract_tables()
            players = []
            if tables:
                table = tables[0]
                # Skip header
                for row in table[1:]:
                    if not row or not row[0]:
                        continue
                    
                    # Due to None columns in pdfplumber, let's filter them out
                    clean_row = [str(x).replace('\n', ' ').strip() for x in row if x is not None and str(x).strip() != '']
                    
                    if len(clean_row) >= 3:
                        pos = clean_row[1]
                        player_name = clean_row[2]
                        
                        dob = None
                        club = None
                        height = None
                        
                        # Find dob by regex
                        dob_idx = -1
                        for j, val in enumerate(clean_row):
                            if re.match(r'^\d{2}/\d{2}/\d{4}$', val):
                                dob_idx = j
                                dob = val
                                break
                                
                        if dob_idx != -1:
                            if dob_idx + 1 < len(clean_row):
                                club = clean_row[dob_idx + 1]
                            if dob_idx + 2 < len(clean_row):
                                height = clean_row[dob_idx + 2]
                                if not height.isdigit() and len(height) > 3:
                                    # Sometimes club is split or height is missing
                                    club = club + " " + height
                                    height = None
                        else:
                            # Fallback if no date found
                            dob = clean_row[-3] if len(clean_row) >= 4 else None
                            club = clean_row[-2] if len(clean_row) >= 3 else None
                            height = clean_row[-1] if len(clean_row) >= 2 else None
                            
                        players.append({
                            "name": player_name,
                            "position": pos,
                            "club": club,
                            "dob": dob,
                            "height": height
                        })
                        
            squads.append({
                "team": team_name,
                "country_code": country_code,
                "coach": coach_name,
                "players": players
            })
            
    with open(out_path, "w") as f:
        json.dump(squads, f, indent=2)
    print(f"Extracted {len(squads)} squads to {out_path}")

if __name__ == "__main__":
    extract()
