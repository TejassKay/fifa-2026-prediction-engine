const match = {
  goal_scorers: [
    { player_name: "Messi", minute: "45", is_penalty: false },
    { player_name: "Mbappe", minute: 80, is_penalty: true }
  ]
};

const filtered = match.goal_scorers;
const grouped = {};
filtered.forEach(s => {
  let key = s.player_name || "Unknown";
  if (s.is_own_goal) key += " (OG)";
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(s);
});

const res = Object.entries(grouped).map(([name, events]) => {
  const minutes = events.map(e => {
    let m = e.minute ? `${e.minute}'` : '';
    if (e.is_penalty) m += " P";
    return m;
  }).filter(m => m).join(", ");
  return `${name} ${minutes ? `(${minutes})` : ''}`;
});

console.log(res);
