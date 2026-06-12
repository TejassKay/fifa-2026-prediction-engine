"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";
import { Users, Search, Trophy, Lightbulb } from "lucide-react";
import MatchCenter from "@/components/MatchCenter";

export default function Home() {
  const [champion, setChampion] = useState<any>(null);
  const [topContenders, setTopContenders] = useState<any[]>([]);
  const [upsets, setUpsets] = useState<any[]>([]);
  const [finals, setFinals] = useState<any[]>([]);
  const [prevOdds, setPrevOdds] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/predictions/champion`).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/intelligence/upsets`).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/intelligence/finals`).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/stats/odds-history`).then(r => r.json())
    ]).then(([champs, ups, fins, hist]) => {
      const sortedChamps = champs.sort((a: any, b: any) => b.champion_probability - a.champion_probability);
      setChampion(sortedChamps[0]);
      setTopContenders(sortedChamps.slice(0, 10));
      
      setUpsets(ups.slice(0, 2));
      setFinals(fins.slice(0, 1));
      
      const histVals = Object.values(hist || {});
      if (histVals.length >= 2) {
        setPrevOdds(histVals[histVals.length - 2]);
      } else if (histVals.length === 1) {
        setPrevOdds(histVals[0]);
      }
      
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load dashboard data", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="mb-12 flex flex-col items-center text-center relative pt-4">
          <div className="absolute left-1/2 -translate-x-1/2 -top-[200px] w-[1000px] h-[500px] bg-indigo-600/30 rounded-[100%] blur-[100px] pointer-events-none z-0" />
          
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs tracking-widest uppercase mb-3 relative z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Forecast
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase bg-gradient-to-br from-indigo-100 via-blue-200 to-purple-200 bg-clip-text text-transparent pb-1 relative z-10">
            Fifa WC 26 Hub
          </h1>
          <p className="text-indigo-200/60 text-lg md:text-xl font-medium mt-3 max-w-2xl leading-relaxed relative z-10">
            Your central hub for the most thrilling storylines, predictions, and upsets of the 2026 FIFA World Cup.
          </p>
        </header>

        {/* Section 1: Hero - Most Likely Champion */}
        {champion && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden glass-panel shadow-2xl"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${getFlagGradientByName(champion.team)} opacity-30 mix-blend-screen pointer-events-none`}></div>
            <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-black uppercase tracking-widest rounded-full mb-4">
                  🏆 Tournament Favorite
                </span>
                <div className="flex items-center gap-4 mb-4">
                  <img src={getFlagUrl(champion.team)} alt={champion.team} className="w-16 h-11 object-cover rounded shadow-lg border border-white/20" />
                  <h2 className="text-5xl md:text-7xl font-black uppercase text-white drop-shadow-lg">
                    {champion.team}
                  </h2>
                </div>
                <p className="text-xl md:text-2xl font-bold text-gray-200 mb-6 drop-shadow-md">
                  {champion.team} remains the tournament favorite due to their elite squad rating and consistent form against top opposition.
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-6xl md:text-8xl font-black text-white drop-shadow-xl">
                    {(champion.champion_probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-xl text-gray-300 font-bold uppercase tracking-widest mb-2 drop-shadow">Win Prob</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Intelligence Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Predicted Final */}
          {finals[0] && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/60 p-6 rounded-3xl flex flex-col justify-between border border-white/5 hover:border-indigo-500/30 transition-colors"
            >
               <div className="flex justify-between items-start mb-4">
                  <span className="text-indigo-400 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                    <Trophy className="w-4 h-4"/> Predicted Final
                  </span>
                  <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-1 rounded font-bold">
                    {(finals[0].probability * 100).toFixed(1)}% PROB
                  </span>
               </div>
               
               <div className="flex flex-col gap-2 mb-6 mt-4">
                  <div className="bg-black/40 p-3 flex items-center justify-center gap-3 rounded-xl border border-white/5">
                    <img src={getFlagUrl(finals[0].team_a)} className="w-8 h-5 object-cover rounded opacity-80" />
                    <span className="text-lg font-black uppercase text-white">{finals[0].team_a}</span>
                  </div>
                  <div className="text-center text-neutral-600 font-black italic text-xs my-1">VS</div>
                  <div className="bg-black/40 p-3 flex items-center justify-center gap-3 rounded-xl border border-white/5">
                    <img src={getFlagUrl(finals[0].team_b)} className="w-8 h-5 object-cover rounded opacity-80" />
                    <span className="text-lg font-black uppercase text-white">{finals[0].team_b}</span>
                  </div>
               </div>
               
               <Link href="/intelligence" className="text-center w-full bg-white/5 text-neutral-300 font-bold py-3 rounded-xl hover:bg-indigo-500 hover:text-white transition-colors text-xs tracking-widest uppercase mt-auto">
                 View Top Finals
               </Link>
            </motion.div>
          )}

          {/* Cards 2 & 3: High Risk Alerts */}
          {upsets.map((upset, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (idx * 0.1) }}
              className="bg-black/60 p-6 rounded-3xl flex flex-col justify-between border border-white/5 hover:border-rose-500/30 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-rose-500 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  High Risk Alert
                </span>
              </div>

              <div className="flex items-center gap-2 mb-6 w-full justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                <div className="flex flex-col items-start w-[40%]">
                  <span className="text-sm font-black text-white uppercase truncate w-full">{upset.underdog}</span>
                  <span className="text-[9px] text-rose-500/70 font-bold tracking-widest">UNDERDOG</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-700 italic">VS</span>
                <div className="flex flex-col items-end w-[40%]">
                  <span className="text-sm font-black text-neutral-400 uppercase truncate w-full text-right">{upset.favorite}</span>
                  <span className="text-[9px] text-neutral-600 font-bold tracking-widest text-right">FAVORITE</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                {/* Small SVG Gauge */}
                <div className="relative w-14 h-14 flex shrink-0 items-center justify-center">
                     <svg className="absolute inset-0 w-full h-full -rotate-90">
                       <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
                       <circle 
                          cx="28" cy="28" r="24" stroke="#f43f5e" strokeWidth="4" fill="none" strokeDasharray="150.8" 
                          strokeDashoffset={150.8 - (upset.upset_prob * 150.8)} strokeLinecap="round" 
                       />
                     </svg>
                     <span className="text-sm font-black text-rose-500">{(upset.upset_prob * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs font-medium text-neutral-500 italic leading-snug">"{upset.reason}"</p>
              </div>
              
             <Link href="/intelligence" className="text-center w-full bg-white/5 text-neutral-300 font-bold py-3 rounded-xl hover:bg-rose-500 hover:text-white transition-colors text-xs tracking-widest uppercase mt-auto">
               View Upset Watch
             </Link>
            </motion.div>
          ))}
        </div>

        {/* Section 5: Quick Access Grid */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Command Center</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/predictor" className="group glass-panel p-6 hover:bg-white/90 hover:text-black transition-colors flex flex-col items-center justify-center text-center gap-3">
              <Search className="w-8 h-8 text-gray-400 group-hover:text-black transition-colors" />
              <span className="font-bold uppercase tracking-wide">Match Predictor</span>
            </Link>
            <Link href="/bracket" className="group glass-panel p-6 hover:bg-white/90 hover:text-black transition-colors flex flex-col items-center justify-center text-center gap-3">
              <Trophy className="w-8 h-8 text-gray-400 group-hover:text-black transition-colors" />
              <span className="font-bold uppercase tracking-wide">Tournament Simulator</span>
            </Link>
            <Link href="/squads" className="group glass-panel p-6 hover:bg-white/90 hover:text-black transition-colors flex flex-col items-center justify-center text-center gap-3">
              <Users className="w-8 h-8 text-gray-400 group-hover:text-black transition-colors" />
              <span className="font-bold uppercase tracking-wide">Squad Explorer</span>
            </Link>
            <Link href="/intelligence" className="group glass-panel p-6 hover:bg-white/90 hover:text-black transition-colors flex flex-col items-center justify-center text-center gap-3">
              <Lightbulb className="w-8 h-8 text-gray-400 group-hover:text-black transition-colors" />
              <span className="font-bold uppercase tracking-wide">Intelligence Center</span>
            </Link>
          </div>
        </motion.section>

        {/* Section 6: Top 10 Contenders */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            Live Top 10 Contenders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topContenders.map((team, index) => {
              const currentProb = team.champion_probability * 100;
              const prevProb = prevOdds[team.team] ? prevOdds[team.team] * 100 : currentProb;
              const diff = currentProb - prevProb;
              
              return (
              <div 
                key={team.team} 
                className="glass-panel p-4 relative overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-tr ${getFlagGradientByName(team.team)} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                <div className="relative z-10 flex flex-col items-center text-center h-full justify-between">
                  <div className="text-gray-500 font-black text-xl mb-2 flex justify-between w-full items-center">
                    <span>#{index + 1}</span>
                    <img src={getFlagUrl(team.team)} alt={team.team} className="w-8 h-6 object-cover rounded shadow border border-white/10" />
                  </div>
                  <h4 className="text-lg font-black uppercase text-white mb-2">{team.team}</h4>
                  <div className="mt-auto flex items-end gap-2">
                    <div>
                      <div className="text-2xl font-black text-white">
                        {currentProb.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Win Prob</div>
                    </div>
                    {Math.abs(diff) > 0.05 && (
                      <div className={`text-xs font-bold mb-5 ${diff > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </motion.section>

        <MatchCenter />

      </div>
    </div>
  );
}
