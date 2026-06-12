"use client";

import { useEffect, useState } from "react";
import { fetchGroups } from "@/lib/api";
import { motion } from "framer-motion";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'forecast' | 'standings'>('forecast');

  useEffect(() => {
    async function load() {
      const data = await fetchGroups();
      setGroups(data);
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/standings`);
        if (res.ok) {
          const s = await res.json();
          setStandings(s);
        }
      } catch (e) {}

      setLoading(false);
    }
    load();
  }, []);

  const generateSparkline = (prob: number, elo: number) => {
    const seed = (prob * 100) + (elo % 100);
    const y1 = 8 + Math.sin(seed) * 2;
    const y2 = 6 + Math.cos(seed * 2) * 3;
    const y3 = 4 + Math.sin(seed * 3) * 2;
    const y4 = 10 - (prob * 8); 

    return `M 0 ${y1} C 8 ${y2}, 16 ${y3}, 24 ${y4} L 30 ${y4}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-12 flex h-[50vh] items-center justify-center">
        <span className="text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Assigning 48 teams to groups...</span>
      </div>
    );
  }

  // Merge the data for the active view
  const activeData = groups.map(g => {
    const sGroup = standings.find(s => s.group === g.group);
    
    // Sort logic depends on view mode
    let sortedTeams = [...g.teams];
    if (viewMode === 'standings' && sGroup) {
      sortedTeams = sGroup.teams.map((st: any) => {
        const t = g.teams.find((t: any) => t.team === st.team) || {};
        return { ...t, ...st };
      });
      // It's already sorted by points, gd, gf from backend
    } else {
      sortedTeams.sort((a, b) => b.prob - a.prob);
    }

    return {
      group: g.group,
      teams: sortedTeams,
      isStandingsLoaded: !!sGroup
    };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 font-heading uppercase">Group Stage View</h1>
            <p className="text-neutral-400 max-w-2xl text-lg font-medium">
              Tournament schedule mapped to our XGBoost Monte Carlo simulation. Displays ELO rating and the probability of advancing to the Round of 32 for all 48 teams across 12 groups.
            </p>
          </div>

          <div className="flex bg-neutral-900 rounded-full p-1 border border-white/10 shrink-0 h-[46px]">
            <button 
              onClick={() => setViewMode('forecast')}
              className={`px-6 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'forecast' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
            >
              Forecasts
            </button>
            <button 
              onClick={() => setViewMode('standings')}
              className={`px-6 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'standings' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
            >
              Standings
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeData.map((g, index) => (
          <motion.div 
            key={g.group} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden group/card border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              
              <h2 className="text-2xl font-black uppercase font-heading mb-6 text-white tracking-widest flex items-center justify-between relative z-10">
                <span>Group {g.group}</span>
                {(() => {
                  const elos = g.teams.map((t: any) => t.elo || 1500);
                  const avgElo = elos.reduce((a: number, b: number) => a + b, 0) / elos.length;
                  const spread = Math.max(...elos) - Math.min(...elos);
                  
                  let diffLabel = "Balanced";
                  let diffColor = "text-neutral-400";
                  
                  if (avgElo >= 1800 || (avgElo >= 1750 && spread <= 250)) { diffLabel = "Group of Death"; diffColor = "text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)] animate-pulse"; }
                  else if (avgElo >= 1720) { diffLabel = "Heavyweight"; diffColor = "text-orange-400"; }
                  else if (spread <= 200 && avgElo >= 1600) { diffLabel = "Bloodbath"; diffColor = "text-yellow-400"; }
                  else if (spread >= 400) { diffLabel = "Top-Heavy"; diffColor = "text-cyan-400"; }
                  else if (avgElo < 1620) { diffLabel = "Favorable Draw"; diffColor = "text-emerald-400"; }
                  
                  return <span className={`text-[10px] font-black uppercase tracking-widest ${diffColor}`}>{diffLabel}</span>;
                })()}
              </h2>
              
              <div className="flex flex-col gap-3 relative z-10">
                {/* Headers */}
                <div className="flex items-center justify-between px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                  <span className={viewMode === 'standings' ? 'w-[20%]' : ''}>Team</span>
                  <div className={`flex ${viewMode === 'forecast' ? 'justify-end gap-1' : 'justify-between flex-1 pl-4'}`}>
                    {viewMode === 'forecast' ? (
                      <>
                        <span className="w-10 text-right">ELO</span>
                        <span className="w-[60px] text-right">Adv %</span>
                      </>
                    ) : (
                      <>
                        <span className="w-6 text-center text-xs">MP</span>
                        <span className="w-6 text-center text-xs hidden lg:block">W</span>
                        <span className="w-6 text-center text-xs hidden lg:block">D</span>
                        <span className="w-6 text-center text-xs hidden lg:block">L</span>
                        <span className="w-8 text-center text-xs">GD</span>
                        <span className="w-8 text-center text-xs text-white">Pts</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Team Rows */}
                {g.teams.map((t: any, i: number) => {
                  const gradient = getFlagGradientByName(t.team);
                  return (
                    <div 
                      key={t.team} 
                      className="group relative flex items-center justify-between p-3 rounded-xl overflow-hidden cursor-pointer border border-transparent transition-all duration-300"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none`} />
                      <div className={`absolute inset-0 border border-white/0 group-hover:border-white/20 rounded-xl transition-colors duration-300 pointer-events-none`} />
                      
                      <div className={`relative z-10 flex items-center gap-3 pr-2 ${viewMode === 'forecast' ? 'w-[45%]' : 'w-[20%]'}`}>
                        <span className={`text-xs font-black w-3 shrink-0 ${i < 2 ? 'text-emerald-400' : 'text-neutral-600'}`}>{i + 1}</span>
                        <img src={getFlagUrl(t.team)} className={`${viewMode === 'forecast' ? 'w-6 h-4' : 'w-8 h-6'} object-cover rounded shadow-sm border border-white/10 shrink-0`} />
                        {viewMode === 'forecast' && (
                          <span className="font-bold text-white uppercase tracking-wide text-[10px] leading-tight break-words whitespace-normal">{t.team}</span>
                        )}
                      </div>
                      
                      {/* Right Side Stats */}
                      <div className={`relative z-10 flex items-center ${viewMode === 'forecast' ? 'justify-end gap-1 w-[55%]' : 'justify-between flex-1 pl-4'}`}>
                        {viewMode === 'forecast' ? (
                          <>
                            <span className="text-xs font-mono text-neutral-400 w-10 text-right">{Math.round(t.elo || 0)}</span>
                            <div className="flex flex-col items-end justify-center w-[60px]">
                              <span className={`font-mono font-bold text-[10px] ${(t.prob || 0) > 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {((t.prob || 0) * 100).toFixed(1)}%
                              </span>
                              <svg width="24" height="10" className="mt-[2px] opacity-50 group-hover:opacity-100 transition-opacity">
                                <path d={generateSparkline(t.prob || 0, t.elo || 0)} fill="none" stroke={(t.prob || 0) > 0.5 ? "#34d399" : "#fb7185"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-mono text-neutral-400 w-6 text-center">{t.played ?? 0}</span>
                            <span className="text-xs font-mono text-neutral-500 w-6 text-center hidden lg:block">{t.w ?? 0}</span>
                            <span className="text-xs font-mono text-neutral-500 w-6 text-center hidden lg:block">{t.d ?? 0}</span>
                            <span className="text-xs font-mono text-neutral-500 w-6 text-center hidden lg:block">{t.l ?? 0}</span>
                            <span className="text-sm font-mono text-neutral-300 w-8 text-center">{((t.gd ?? 0) > 0 ? '+' : '') + (t.gd ?? 0)}</span>
                            <span className="text-base font-black text-white w-8 text-center">{t.pts ?? 0}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
