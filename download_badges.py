import json, os
from concurrent.futures import ThreadPoolExecutor
from duckduckgo_search import DDGS
import requests

os.makedirs("frontend/public/badges", exist_ok=True)
db = json.load(open('Dataset/player_intelligence.json'))
clubs = set([p.get('club') for p in db.values() if type(p)==dict and p.get('club')])

# Load known badges to avoid re-downloading
downloaded = set([f.replace('.png', '') for f in os.listdir("frontend/public/badges") if f.endswith('.png')])

def download_logo(club):
    if club == "Unknown" or club in downloaded: return
    clean_name = club.replace('(ESP)', '').replace('(ENG)', '').replace('(GER)', '').replace('(FRA)', '').replace('(ITA)', '').strip()
    file_path = f"frontend/public/badges/{club}.png"
    
    if os.path.exists(file_path): return

    try:
        # First try SportsDB
        res = requests.get(f"https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t={requests.utils.quote(cleanName)}").json()
        if res and res.get('teams') and res['teams'][0].get('strTeamBadge'):
            img_url = res['teams'][0]['strTeamBadge']
            img_data = requests.get(img_url, timeout=5).content
            with open(file_path, 'wb') as f: f.write(img_data)
            print(f"Downloaded {cleanName} from SportsDB")
            return
            
        # Fallback to duckduckgo
        results = DDGS().images(f"{cleanName} football club logo wikipedia transparent png", max_results=1)
        if results:
            img_url = results[0]['image']
            img_data = requests.get(img_url, timeout=5).content
            with open(file_path, 'wb') as f: f.write(img_data)
            print(f"Downloaded {cleanName} from DDG")
    except Exception as e:
        pass

# Run with 10 threads
print(f"Downloading badges for {len(clubs)} clubs...")
with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(download_logo, clubs)
print("Finished downloading badges!")
