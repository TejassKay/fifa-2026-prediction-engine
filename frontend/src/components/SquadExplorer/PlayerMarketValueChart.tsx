"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

const formatEuroTooltip = (value: number) => {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
  return `€${value}`;
};

export default function PlayerMarketValueChart({ historicalValues = [], historicalDates = [], teamColor = "#3b82f6" }) {
  if (!historicalValues || historicalValues.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 uppercase font-bold tracking-widest">No historical data</div>;
  }

  const data = historicalValues.map((val: number, i: number) => ({
    name: historicalDates[i] || `Point ${i}`,
    value: val
  }));

  // Define a gradient ID unique to the team color to avoid overlaps
  const gradientId = `colorValue_${teamColor.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={teamColor} stopOpacity={0.4} />
            <stop offset="95%" stopColor={teamColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        {/* Hide YAxis but allow it to scale the chart */}
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip 
          formatter={(value: any) => [formatEuroTooltip(Number(value) || 0), "Market Value"]} 
          labelStyle={{ color: '#000' }}
          contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
          itemStyle={{ color: teamColor, fontWeight: 'bold' }}
        />
        <Area type="monotone" dataKey="value" stroke={teamColor} strokeWidth={3} fillOpacity={1} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
