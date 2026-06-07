export const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api`;

export async function fetchChampions() {
  const res = await fetch(`${API_BASE}/predictions/champion`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTeamStats(team: string) {
  const res = await fetch(`${API_BASE}/teams/${encodeURIComponent(team)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchMatchPrediction(home: string, away: string) {
  const res = await fetch(`${API_BASE}/predict/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ home_team: home, away_team: away })
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) return { feature_importances: [], backtest_results: [] };
  return res.json();
}

export async function fetchGroups() {
  const res = await fetch(`${API_BASE}/groups`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchBracket() {
  const res = await fetch(`${API_BASE}/bracket`);
  if (!res.ok) return [];
  return res.json();
}
