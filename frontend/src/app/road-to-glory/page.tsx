"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";

export default function RoadToGloryPage() {
  const [champions, setChampions] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/predictions/champion")
      .then(res => res.json())
      .then(data => {
        setChampions(data);
        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => b.champion_probability - a.champion_probability);
          setSelectedTeam(sorted[0].team);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetch(`http://localhost:8000/api/teams/${selectedTeam}`)
        .then(res => res.json())
        .then(data => setTeamStats(data))
        .catch(err => console.error(err));
    }
  }, [selectedTeam]);

  const teamData = champions.find(c => c.team === selectedTeam);
  const gradient = getFlagGradientByName(selectedTeam);

  const stages = [
    { key: "round_of_32_probability", label: "Round of 32" },
    { key: "round_of_16_probability", label: "Round of 16" },
    { key: "quarter_final_probability", label: "Quarter Finals" },
    { key: "semi_final_probability", label: "Semi Finals" },
    { key: "final_probability", label: "Final" },
    { key: "champion_probability", label: "Champion" }
  ];

  // Calculate Exact Finishes
  const exactFinishes = stages.map((s, i) => {
    const current = teamData ? teamData[s.key] || 0 : 0;
    const next = teamData && i < stages.length - 1 ? teamData[stages[i+1].key] || 0 : 0;
    return Math.max(0, current - next);
  });

  const maxExactVal = Math.max(...exactFinishes);
  const maxExactIdx = exactFinishes.indexOf(maxExactVal);

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-32">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase font-heading">
            Road To Glory
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-medium mt-2">
            Select a nation to view their predicted progression through the tournament.
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {[...Array(6)].map((_, i) => (
               <Skeleton key={i} className="h-40 w-full rounded-xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            <div className={`glass-panel p-6 md:p-10 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-20 pointer-events-none transition-all duration-500`} />
              
              <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-2 flex items-center gap-4 font-heading drop-shadow-md">
                    <img src={getFlagUrl(selectedTeam)} alt={selectedTeam || ""} className="w-16 h-10 object-cover rounded shadow-lg border border-white/20" />
                    {selectedTeam}
                  </h2>
                  <p className="text-gray-300 max-w-xl font-medium">
                    Monte Carlo simulations determining the likelihood of reaching each tournament stage based on squad ELO, recent form, and bracket paths.
                  </p>
                </div>
                
                <select 
                  value={selectedTeam || ""}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="bg-black/50 backdrop-blur-md border border-white/20 text-white font-bold py-3 px-4 rounded-xl outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 w-full md:w-64 uppercase tracking-wide cursor-pointer transition-colors shadow-xl"
                >
                  {champions.map(c => (
                    <option key={c.team} value={c.team} className="bg-[#111] text-white">{c.team}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team Stats Section */}
            {teamStats && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-5 gap-4"
              >
                <div className="glass-panel p-5 text-center">
                  <div className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-1">FIFA Rank</div>
                  <div className="text-3xl font-black text-white">#{teamStats.fifa_ranking}</div>
                </div>
                <div className="glass-panel p-5 text-center">
                  <div className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-1">ELO Rating</div>
                  <div className="text-3xl font-black text-white">{Math.round(teamStats.elo_rating)}</div>
                </div>
                <div className="glass-panel p-5 text-center border-emerald-500/30 bg-emerald-500/5">
                  <div className="text-xs text-emerald-500 font-bold tracking-widest uppercase mb-1">Win Rate (L10)</div>
                  <div className="text-3xl font-black text-emerald-400">{(teamStats.recent_form.win_rate_L10 * 100).toFixed(0)}%</div>
                </div>
                <div className="glass-panel p-5 text-center">
                  <div className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-1">Goals For (L5)</div>
                  <div className="text-3xl font-black text-white">{teamStats.recent_form.goals_scored_L5.toFixed(1)}</div>
                </div>
                <div className="glass-panel p-5 text-center border-rose-500/30 bg-rose-500/5">
                  <div className="text-xs text-rose-500 font-bold tracking-widest uppercase mb-1">Goals Agst (L5)</div>
                  <div className="text-3xl font-black text-rose-400">{teamStats.recent_form.goals_conceded_L5.toFixed(1)}</div>
                </div>
              </motion.div>
            )}

            {/* Horizontal Timeline Layout */}
            <AnimatePresence mode="wait">
              {teamData && (
                <motion.div
                  key={teamData.team}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative mt-16 pt-8 pb-12 w-full flex flex-col md:flex-row items-center justify-between gap-6 md:gap-2"
                >
                  {/* Background Timeline Connector (Desktop only) */}
                  <div className="hidden md:block absolute top-[40%] left-[8%] right-[8%] h-1 bg-white/5 rounded-full z-0 pointer-events-none shadow-inner" />

                  {stages.map((stage, index) => {
                    const prob = teamData[stage.key] || 0;
                    const percentage = (prob * 100).toFixed(1);
                    const isMostProbable = index === maxExactIdx;
                    const isDimmed = prob < 0.1;
                    
                    // SVG Circle Math
                    const radius = 45;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (prob * circumference);

                    return (
                      <motion.div 
                        key={stage.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative z-10 flex flex-col items-center transition-all duration-500 ${isDimmed ? 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0' : 'opacity-100'}`}
                      >
                        {/* The Node */}
                        <div 
                          className={`relative flex items-center justify-center w-32 h-32 rounded-full glass-panel mb-4 transition-all duration-300 ${
                            isMostProbable 
                              ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)] scale-110 bg-cyan-900/20' 
                              : 'border-white/10 hover:border-white/30 hover:scale-105'
                          }`}
                        >
                          {/* SVG Progress Ring */}
                          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-md">
                            <circle 
                              cx="64" cy="64" r={radius} 
                              stroke="rgba(255,255,255,0.05)" 
                              strokeWidth="8" fill="none" 
                            />
                            <motion.circle 
                              cx="64" cy="64" r={radius} 
                              stroke={isMostProbable ? '#22d3ee' : '#10b981'} 
                              strokeWidth="8" fill="none" 
                              strokeLinecap="round"
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset }}
                              transition={{ duration: 1.5, delay: 0.2 + (index * 0.1), ease: "easeOut" }}
                              style={{ strokeDasharray: circumference }}
                              className={isMostProbable ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : ""}
                            />
                          </svg>

                          <div className="text-center">
                            <div className={`text-lg md:text-xl font-black ${isMostProbable ? 'text-cyan-400 drop-shadow-md' : 'text-white'}`}>
                              {percentage}%
                            </div>
                          </div>
                        </div>

                        {/* Label */}
                        <div className="text-center">
                          <h3 className={`text-sm md:text-base font-bold uppercase tracking-widest ${isMostProbable ? 'text-cyan-400' : 'text-neutral-400'}`}>
                            {stage.label}
                          </h3>
                          {isMostProbable && (
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mt-1 block">Most Probable Finish</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
