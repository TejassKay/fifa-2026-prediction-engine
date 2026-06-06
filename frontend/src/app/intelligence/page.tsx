"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getFlagUrl } from "@/lib/flags";
import { Trophy, Radio } from "lucide-react";

export default function IntelligenceCenter() {
  const [upsets, setUpsets] = useState<any[]>([]);
  const [finals, setFinals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/api/intelligence/upsets").then(res => res.json()),
      fetch("http://localhost:8000/api/intelligence/finals").then(res => res.json())
    ]).then(([uData, fData]) => {
      setUpsets(uData.slice(0, 3));     // Top 3 Alerts
      setFinals(fData.slice(0, 4));     // Top 4 Finals
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 md:p-8 flex items-center justify-center">
        <span className="text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Initializing Inference Engine...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans pb-32">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* LIVE SIMULATION ENGINE STATUS HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center gap-4 mb-8 bg-black/40 border border-white/5 p-4 rounded-2xl w-fit backdrop-blur-md shadow-xl"
        >
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-emerald-500 animate-pulse drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <h1 className="text-emerald-400 font-black uppercase tracking-widest text-sm font-heading">Live Simulation Engine Status</h1>
          </div>
          <div className="flex items-center gap-4 md:border-l md:border-white/10 md:pl-4">
            <span className="text-xs font-mono text-neutral-400 bg-white/5 px-2 py-1 rounded">10,000 Iterations</span>
            <span className="text-xs font-mono text-neutral-400 bg-white/5 px-2 py-1 rounded">Active</span>
          </div>
        </motion.div>

        {/* RESTRUCTURED GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT/CENTER COLUMN: Finals (Col-span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* MASSIVE FINAL PANEL - Hero Element */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-10 md:p-16 relative overflow-hidden group border border-indigo-400/40 bg-indigo-900/30 flex flex-col justify-center min-h-[450px] shadow-[0_0_40px_rgba(79,70,229,0.2)] rounded-[2.5rem]"
            >
              <div className="absolute top-0 right-0 p-4 text-indigo-400/10 text-[14rem] font-black italic leading-none pointer-events-none select-none">1</div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
              
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300 mb-10 z-10 flex items-center gap-2">
                <Trophy className="w-5 h-5"/> Predicted Final Matchup
              </h3>
              
              {finals[0] && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 z-10 relative">
                  {/* Team A */}
                  <div className="flex flex-col items-center gap-4 w-1/3">
                     <img src={getFlagUrl(finals[0].team_a)} className="w-32 md:w-48 h-20 md:h-28 object-cover rounded-xl shadow-2xl border border-white/10 group-hover:border-indigo-400/50 transition-colors" />
                     <span className="text-2xl md:text-4xl font-black uppercase tracking-wider text-center font-heading">{finals[0].team_a}</span>
                  </div>

                  {/* SVG Radial Prob */}
                  <div className="flex flex-col items-center w-1/3">
                    <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                       <svg className="absolute inset-0 w-full h-full -rotate-90">
                         <circle cx="72" cy="72" r="56" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                         <circle 
                            cx="72" cy="72" r="56" stroke="#818cf8" strokeWidth="6" fill="none" strokeDasharray="351.8" 
                            strokeDashoffset={351.8 - (finals[0].probability * 351.8)} strokeLinecap="round" 
                            className="drop-shadow-[0_0_15px_rgba(99,102,241,0.9)]" 
                            style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                         />
                       </svg>
                       <span className="text-4xl font-black text-indigo-300 drop-shadow-md">{(finals[0].probability * 100).toFixed(1)}%</span>
                    </div>
                    <span className="text-xs text-indigo-200/50 font-bold uppercase tracking-widest text-center">Mathematical Likelihood</span>
                  </div>

                  {/* Team B */}
                  <div className="flex flex-col items-center gap-4 w-1/3">
                     <img src={getFlagUrl(finals[0].team_b)} className="w-32 md:w-48 h-20 md:h-28 object-cover rounded-xl shadow-2xl border border-white/10 group-hover:border-indigo-400/50 transition-colors" />
                     <span className="text-2xl md:text-4xl font-black uppercase tracking-wider text-center font-heading">{finals[0].team_b}</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* OTHER FINALS - Diminished */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black/60 p-8 rounded-3xl"
            >
               <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-6">Next Most Probable Matchups</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {finals.slice(1, 4).map((f, i) => (
                   <div key={i} className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-2xl group">
                      <div className="text-[10px] font-bold text-neutral-600 mb-4 bg-white/5 px-2 py-1 rounded">Rank #{i + 2}</div>
                      
                      <div className="flex items-center gap-4 w-full justify-between mb-4">
                         <div className="flex flex-col items-center gap-2 w-[40%]">
                           <img src={getFlagUrl(f.team_a)} className="w-8 h-5 object-cover rounded opacity-70" />
                           <span className="font-bold uppercase text-[10px] truncate w-full text-center tracking-widest text-neutral-400">{f.team_a}</span>
                         </div>
                         <span className="text-[10px] font-bold text-neutral-700 italic">VS</span>
                         <div className="flex flex-col items-center gap-2 w-[40%]">
                           <img src={getFlagUrl(f.team_b)} className="w-8 h-5 object-cover rounded opacity-70" />
                           <span className="font-bold uppercase text-[10px] truncate w-full text-center tracking-widest text-neutral-400">{f.team_b}</span>
                         </div>
                      </div>
                      
                      <div className="w-full flex flex-col items-center pt-4 border-t border-white/5">
                        <span className="font-mono text-neutral-300 font-bold text-sm">{(f.probability * 100).toFixed(1)}%</span>
                      </div>
                   </div>
                 ))}
               </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Alerts (Col-span 4) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">High Risk Alerts</h3>
            
            {upsets.map((upset, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (idx * 0.1) }}
                className="bg-black/60 p-6 md:p-8 rounded-3xl flex flex-col justify-center relative overflow-hidden"
              >
                <div className="flex items-center gap-4 mb-6 w-full justify-between">
                  <div className="flex flex-col items-start w-[40%]">
                    <span className="text-lg font-black text-white uppercase truncate w-full">{upset.underdog}</span>
                    <span className="text-[9px] text-rose-500/70 font-bold tracking-widest">UNDERDOG</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-700 italic">VS</span>
                  <div className="flex flex-col items-end w-[40%]">
                    <span className="text-lg font-black text-neutral-400 uppercase truncate w-full text-right">{upset.favorite}</span>
                    <span className="text-[9px] text-neutral-600 font-bold tracking-widest text-right">FAVORITE</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* SVG Gauge */}
                  <div className="relative w-24 h-24 flex shrink-0 items-center justify-center">
                       <svg className="absolute inset-0 w-full h-full -rotate-90">
                         <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                         <circle 
                            cx="48" cy="48" r="38" stroke="#f43f5e" strokeWidth="6" fill="none" strokeDasharray="238.7" 
                            strokeDashoffset={238.7 - (upset.upset_prob * 238.7)} strokeLinecap="round" 
                            style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                         />
                       </svg>
                       <div className="flex flex-col items-center">
                         <span className="text-xl font-black text-rose-500">{(upset.upset_prob * 100).toFixed(1)}%</span>
                       </div>
                  </div>
                  
                  <p className="text-[11px] font-medium text-neutral-500 italic leading-snug">"{upset.reason}"</p>
                </div>
              </motion.div>
            ))}
            
            {upsets.length === 0 && (
              <div className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest pl-2">No active alerts.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
