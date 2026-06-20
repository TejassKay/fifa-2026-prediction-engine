fetch('https://www.fifawc26hub.com/api/matches/record', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test'
  },
  body: JSON.stringify({
    "match_id": "1",
    "home_score": "2",
    "away_score": "1",
    "winner": "H",
    "goal_scorers": [
      {"player_name": "", "minute": ""}
    ],
    "cards": []
  })
}).then(async r => {
  console.log("Status:", r.status);
  console.log(await r.text());
}).catch(console.error);
