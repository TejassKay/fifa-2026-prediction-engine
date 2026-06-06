"use client";

import { useEffect, useState } from "react";
import { fetchGroups } from "@/lib/api";
import { motion } from "framer-motion";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchGroups();
      setGroups(data);
      setLoading(false);
    }
    load();
  }, []);

  const generateSparkline = (prob: number, elo: number) => {
    const seed = (prob * 100) + (elo % 100);
    const y1 = 8 + Math.sin(seed) * 2;
    const y2 = 6 + Math.cos(seed * 2) * 3;
    const y3 = 4 + Math.sin(seed * 3) * 2;
    const y4 = 10 - (prob * 8); // Higher probability ends higher up

    return `M 0 ${y1} C 8 ${y2}, 16 ${y3}, 24 ${y4} L 30 ${y4}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-12 flex h-[50vh] items-center justify-center">
        <span className="text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Assigning 48 teams to groups...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 font-heading uppercase">Group Stage View</h1>
        <p className="text-neutral-400 max-w-3xl text-lg font-medium">
          Tournament schedule mapped to our XGBoost Monte Carlo simulation. Displays ELO rating and the probability of advancing to the Round of 32 for all 48 teams across 12 groups.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((g, index) => (
          <motion.div 
            key={g.group} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden group/card border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
              {/* Subtle ambient light per group */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              
              <h2 className="text-2xl font-black uppercase font-heading mb-6 text-white tracking-widest flex items-center justify-between relative z-10">
                <span>Group {g.group}</span>
                {(() => {
                  const elos = g.teams.map((t: any) => t.elo);
                  const avgElo = elos.reduce((a: number, b: number) => a + b, 0) / elos.length;
                  const spread = Math.max(...elos) - Math.min(...elos);
                  
                  let diffLabel = "Balanced";
                  let diffColor = "text-neutral-400";
                  
                  if (avgElo >= 1800 || (avgElo >= 1750 && spread <= 250)) { 
                    diffLabel = "Group of Death"; 
                    diffColor = "text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)] animate-pulse"; 
                  }
                  else if (avgElo >= 1720) { 
                    diffLabel = "Heavyweight"; 
                    diffColor = "text-orange-400"; 
                  }
                  else if (spread <= 200 && avgElo >= 1600) { 
                    diffLabel = "Bloodbath"; 
                    diffColor = "text-yellow-400"; 
                  }
                  else if (spread >= 400) { 
                    diffLabel = "Top-Heavy"; 
                    diffColor = "text-cyan-400"; 
                  }
                  else if (avgElo < 1620) { 
                    diffLabel = "Favorable Draw"; 
                    diffColor = "text-emerald-400"; 
                  }
                  
                  return <span className={`text-[10px] font-black uppercase tracking-widest ${diffColor}`}>{diffLabel}</span>;
                })()}
              </h2>
              
              <div className="flex flex-col gap-3 relative z-10">
                {/* Headers */}
                <div className="flex items-center justify-between px-3 text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">
                  <span>Team</span>
                  <div className="flex gap-4 w-1/2 justify-end">
                    <span className="w-8 text-right">ELO</span>
                    <span className="w-[70px] text-right">Adv %</span>
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
                      {/* Flag-colored Hover Background & Border Glow */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none`} />
                      <div className={`absolute inset-0 border border-white/0 group-hover:border-white/20 rounded-xl transition-colors duration-300 pointer-events-none`} />
                      
                      <div className="relative z-10 flex items-center gap-3 w-1/2">
                        <span className={`text-sm font-black w-3 shrink-0 ${i < 2 ? 'text-emerald-400' : 'text-neutral-600'}`}>{i + 1}</span>
                        <img src={getFlagUrl(t.team)} className="w-8 h-5 object-cover rounded shadow-sm border border-white/10 shrink-0" />
                        <span className="font-bold text-white uppercase tracking-wide text-[11px] leading-tight break-words whitespace-normal max-w-[90px]">{t.team}</span>
                      </div>
                      
                      {/* Right: ELO and Advance % */}
                      <div className="relative z-10 flex items-center justify-end gap-3 w-1/2">
                        <span className="text-sm font-mono text-neutral-400 w-8 text-right">{Math.round(t.elo)}</span>
                        
                        <div className="flex items-center gap-2 w-[70px] justify-end">
                          <div className="flex flex-col items-end justify-center">
                            <span className={`font-mono font-bold text-[11px] ${t.prob > 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {(t.prob * 100).toFixed(1)}%
                            </span>
                            {/* Inline Sparkline */}
                            <svg width="30" height="12" className="mt-[2px] opacity-50 group-hover:opacity-100 transition-opacity">
                              <path 
                                d={generateSparkline(t.prob, t.elo)} 
                                fill="none" 
                                stroke={t.prob > 0.5 ? "#34d399" : "#fb7185"} 
                                strokeWidth="1.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="drop-shadow-sm"
                              />
                            </svg>
                          </div>
                        </div>
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
