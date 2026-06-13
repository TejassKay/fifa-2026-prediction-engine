"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity } from "lucide-react";

export default function OddsHistoryPage() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/stats/odds-history`)
      .then(r => r.json())
      .then(d => {
        const formatted = [];
        const allTeams = new Set<string>();
        
        for (const item of d) {
          const match_id = item.match_id;
          const odds = item.odds;
          const entry: any = { match_id };
          for (const [team, prob] of Object.entries(odds as any)) {
            entry[team] = prob;
            allTeams.add(team);
          }
          formatted.push(entry);
        }
        
        const lastSnapshot: any = formatted[formatted.length - 1] || {};
        const topTeams = Array.from(allTeams)
          .sort((a, b) => (lastSnapshot[b] || 0) - (lastSnapshot[a] || 0))
          .slice(0, 10);
          
        setTeams(topTeams);
        setHistoryData(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs tracking-widest uppercase mb-2">
              <Activity className="w-4 h-4" /> Trajectory
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
              Championship Odds History
            </h1>
            <p className="text-neutral-400 text-lg font-medium mt-2">
              Track the probability of winning the World Cup for the top 10 contenders after every match.
            </p>
          </div>
        </header>

        <div className="glass-panel p-6 h-[600px] w-full">
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="match_id" stroke="#525252" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                <YAxis stroke="#525252" tick={{ fill: '#a3a3a3', fontSize: 12 }} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value: any) => [`${(Number(value) * 100).toFixed(1)}%`]}
                  labelStyle={{ display: 'none' }}
                  itemSorter={(item) => -(item.value as number)}
                />
                <Legend iconType="circle" />
                {teams.map((team, i) => (
                  <Line 
                    key={team} 
                    type="monotone" 
                    dataKey={team} 
                    stroke={colors[i % colors.length]} 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              No odds history available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
