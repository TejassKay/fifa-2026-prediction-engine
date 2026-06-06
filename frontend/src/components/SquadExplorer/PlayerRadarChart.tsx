"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export default function PlayerRadarChart({ player, teamColor = "#3b82f6" }: { player: any, teamColor?: string }) {
  // Generate pseudo-stats based on position if true attributes aren't explicitly available
  const getStats = () => {
    const pos = player.position || 'MF';
    let base = { pace: 70, shooting: 60, passing: 70, dribbling: 70, defending: 60, physical: 65 };
    
    if (pos === 'FW') base = { pace: 85, shooting: 88, passing: 70, dribbling: 82, defending: 40, physical: 75 };
    if (pos === 'MF') base = { pace: 75, shooting: 75, passing: 85, dribbling: 80, defending: 70, physical: 75 };
    if (pos === 'DF') base = { pace: 75, shooting: 40, passing: 70, dribbling: 60, defending: 88, physical: 85 };
    if (pos === 'GK') base = { pace: 50, shooting: 20, passing: 65, dribbling: 40, defending: 85, physical: 80 };

    // Add some variance based on name to make it unique per player
    const variance = player.name ? (player.name.length % 15) - 7 : 0;
    
    return [
      { subject: 'PAC', A: Math.min(99, Math.max(1, base.pace + variance)), fullMark: 100 },
      { subject: 'SHO', A: Math.min(99, Math.max(1, base.shooting + variance)), fullMark: 100 },
      { subject: 'PAS', A: Math.min(99, Math.max(1, base.passing + variance)), fullMark: 100 },
      { subject: 'DRI', A: Math.min(99, Math.max(1, base.dribbling + variance)), fullMark: 100 },
      { subject: 'DEF', A: Math.min(99, Math.max(1, base.defending + variance)), fullMark: 100 },
      { subject: 'PHY', A: Math.min(99, Math.max(1, base.physical + variance)), fullMark: 100 },
    ];
  };

  const data = getStats();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid stroke="#ffffff20" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 11, fontWeight: 'bold' }} />
        <Radar name="Player" dataKey="A" stroke={teamColor} fill={teamColor} fillOpacity={0.4} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
