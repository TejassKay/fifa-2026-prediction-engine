"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Trophy, Star, Target, Zap, Shield, Crown, ChevronLeft, ChevronRight, Activity, TrendingUp } from "lucide-react";

const formatEuro = (value: number) => {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
  return `€${value}`;
};

const getPosTagColor = (pos: string) => {
  switch (pos) {
    case "GK": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    case "DF": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "MF": return "text-green-400 bg-green-400/10 border-green-400/20";
    case "FW": return "text-red-400 bg-red-400/10 border-red-400/20";
    default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
};

export default function AwardsCenter() {
  const [data, setData] = useState<any>({
    goldenBoot: [],
    goldenBall: [],
    bestYoung: [],
    breakoutStars: [],
    valuableXI: null,
    teamMVPs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/golden-boot`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/golden-ball`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/best-young-player`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/breakout-stars`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/valuable-xi`).then(res => res.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/all-team-mvps`).then(res => res.json())
    ]).then(([boot, ball, young, breakout, xi, mvps]) => {
      setData({
        goldenBoot: boot,
        goldenBall: ball,
        bestYoung: young,
        breakoutStars: breakout,
        valuableXI: xi,
        teamMVPs: mvps
      });
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen text-white p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <Skeleton className="h-20 w-1/3 rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-3xl" />
          <Skeleton className="h-[400px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const { goldenBoot, goldenBall, bestYoung, breakoutStars, valuableXI, teamMVPs } = data;

  const renderPodium = (players: any[], type: 'goals' | 'form') => {
    if (players.length < 3) return null;
    const podiumArr = [
      { p: players[1], rank: 2, shadow: 'shadow-[0_0_40px_rgba(156,163,175,0.3)]', border: 'border-gray-300/60', height: 'h-[360px] md:h-[400px]', scale: '', glow: 'from-gray-300/20' },
      { p: players[0], rank: 1, shadow: 'shadow-[0_0_70px_rgba(250,214,21,0.6)]', border: 'border-yellow-400', height: 'h-[420px] md:h-[480px]', scale: 'md:scale-110 z-20 md:-translate-y-8', glow: 'from-yellow-500/30' },
      { p: players[2], rank: 3, shadow: 'shadow-[0_0_40px_rgba(180,83,9,0.3)]', border: 'border-amber-700/60', height: 'h-[320px] md:h-[360px]', scale: '', glow: 'from-amber-700/20' }
    ];

    return (
      <div className="flex flex-col md:flex-row items-end justify-center gap-6 mt-16 mb-24 px-4">
        {podiumArr.map((item) => (
          <motion.div 
            key={item.p.name}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-3xl overflow-hidden border-2 ${item.border} ${item.shadow} ${item.height} ${item.scale} w-full md:w-[320px] glass-panel transition-all`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.glow} to-transparent mix-blend-screen opacity-50`} />
            <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center font-black text-2xl text-white border border-white/20 z-30 shadow-lg">
              {item.rank}
            </div>
            {item.p.image_url && (
              <img src={item.p.image_url} alt={item.p.name} className="absolute inset-0 w-full h-[85%] object-cover object-top opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-30 flex flex-col justify-end h-full">
              <div className="flex items-center gap-3 mb-2">
                <img src={getFlagUrl(item.p.team)} className="w-8 h-5 object-cover rounded shadow-md border border-white/20" />
                <span className="font-bold text-xs uppercase tracking-widest text-gray-300">{item.p.team}</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-6 font-heading drop-shadow-md">{item.p.name}</h3>
              <div className="flex items-center justify-between border-t border-white/20 pt-4">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">{type === 'goals' ? 'Predicted Goals' : 'Impact Score'}</div>
                  <div className="text-3xl font-black text-white">{type === 'goals' ? item.p.predicted_goals : item.p.mvp_score.toFixed(1)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Form</div>
                  <div className="text-xl font-black text-neutral-300">{item.p.form_score.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-32">
      <div className="max-w-7xl mx-auto space-y-32">
        
        {/* HEADER */}
        <header className="text-center pt-12 pb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] mb-6 font-heading">
            FIFA 2026 Awards
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm max-w-2xl mx-auto leading-relaxed">
            The race for global glory. Tracking the most influential stars, breakout talents, and future legends of the tournament.
          </p>
        </header>

        {/* 1. GOLDEN BOOT */}
        <section>
          <div className="flex flex-col items-center justify-center text-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-3xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
              <Target className="w-10 h-10 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-widest text-white font-heading">Golden Boot Race</h2>
              <div className="text-xs text-yellow-500 font-bold uppercase tracking-widest mt-2">Predicted Tournament Top Scorer</div>
            </div>
          </div>
          
          {renderPodium(goldenBoot, 'goals')}
        </section>

        {/* 2. GOLDEN BALL */}
        <section>
          <div className="flex flex-col items-center justify-center text-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <Crown className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-widest text-white font-heading">Golden Ball Race</h2>
              <div className="text-xs text-amber-500 font-bold uppercase tracking-widest mt-2">Player of the Tournament</div>
            </div>
          </div>

          {renderPodium(goldenBall, 'form')}
        </section>

        {/* 3. FUTURE STARS (BREAKOUT DESIGN) */}
        <section>
          <div className="flex items-center gap-4 mb-16">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Zap className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-widest text-white font-heading">Future Stars</h2>
              <div className="text-sm text-cyan-400 font-bold uppercase tracking-widest">Best Young Player (U23)</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-y-20 gap-x-6 pt-12">
            {bestYoung.slice(0, 10).map((player: any) => (
              <Link href={`/squads?team=${player.team}`} key={player.name}>
                <motion.div whileHover={{ y: -5 }} className="glass-panel border-cyan-500/30 hover:border-cyan-400 transition-colors shadow-xl h-[160px] relative flex flex-col justify-end p-4 group">
                  {/* Breakout Image */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-28 h-28 z-20 transition-transform duration-300 group-hover:scale-110">
                    {player.image_url ? (
                      <div className="w-full h-full rounded-full overflow-hidden border-4 border-cyan-500/30 shadow-2xl bg-black">
                        <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-[50%_15%]" />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-800 border-4 border-cyan-500/30 shadow-2xl" />
                    )}
                  </div>
                  
                  {/* Content below image */}
                  <div className="text-center z-10 w-full mt-auto">
                    <h4 className="font-black text-white text-lg truncate font-heading uppercase tracking-tight">{player.name}</h4>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <img src={getFlagUrl(player.team)} className="w-5 h-3.5 rounded-sm object-cover shadow-md" />
                      <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">U23</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. HIDDEN GEMS (BREAKOUT DESIGN) */}
        <section>
          <div className="flex items-center gap-4 mb-16">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-widest text-white font-heading">Hidden Gems</h2>
              <div className="text-sm text-purple-400 font-bold uppercase tracking-widest">Underrated Breakout Stars</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-y-20 gap-x-6 pt-12">
            {breakoutStars.slice(0, 5).map((player: any) => (
              <Link href={`/squads?team=${player.team}`} key={player.name}>
                <motion.div whileHover={{ y: -5 }} className="glass-panel border-purple-500/30 hover:border-purple-400 transition-colors shadow-xl h-[160px] relative flex flex-col justify-end p-4 group">
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-28 h-28 z-20 transition-transform duration-300 group-hover:scale-110">
                    {player.image_url ? (
                      <div className="w-full h-full rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl bg-black">
                        <img src={player.image_url} alt={player.name} className="w-full h-full object-cover object-[50%_15%]" />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-800 border-4 border-purple-500/30 shadow-2xl" />
                    )}
                  </div>
                  
                  <div className="text-center z-10 w-full mt-auto">
                    <h4 className="font-black text-white text-lg truncate font-heading uppercase tracking-tight">{player.name}</h4>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <img src={getFlagUrl(player.team)} className="w-5 h-3.5 rounded-sm object-cover shadow-md" />
                      <span className="text-[10px] text-purple-400 font-bold tracking-widest uppercase bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">{player.form_score.toFixed(1)} FORM</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. MOST VALUABLE XI (ISOMETRIC 3D PITCH) */}
        <section>
          <div className="flex flex-col items-center justify-center text-center gap-4 mb-16">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Shield className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-widest text-white font-heading">Most Valuable XI</h2>
              <div className="text-sm text-emerald-400 font-bold uppercase tracking-widest mt-2">Total Squad Value: {formatEuro(valuableXI?.total_value || 0)}</div>
            </div>
          </div>

          <div className="relative w-full max-w-5xl mx-auto h-[700px] md:h-[800px] flex items-center justify-center perspective-[1000px] mt-10">
            {/* 3D Isometric Pitch Graphic */}
            <div className="absolute w-[80%] h-[90%] md:w-[700px] md:h-[900px] border-4 border-emerald-500/30 bg-emerald-900/30 backdrop-blur-sm rounded-lg shadow-[0_0_60px_rgba(16,185,129,0.2)] pointer-events-none z-0 overflow-hidden" 
                 style={{ transform: "rotateX(55deg) rotateZ(-35deg)", transformStyle: "preserve-3d" }}>
               <div className="absolute inset-0 border-2 border-emerald-400/20 m-8 rounded pointer-events-none" />
               <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-emerald-400/20 pointer-events-none" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[2px] border-emerald-400/20 pointer-events-none" />
               <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 h-48 border-b-[2px] border-x-[2px] border-emerald-400/20 pointer-events-none" />
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 h-48 border-t-[2px] border-x-[2px] border-emerald-400/20 pointer-events-none" />
            </div>

            {/* Players Overlay (2D Absolute Positioning for Crisp Reading) */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between py-12 md:py-24 px-4 w-full h-full pointer-events-none">
              
              {/* Attackers */}
              <div className="flex justify-center gap-12 md:gap-32 w-full pointer-events-auto">
                 {valuableXI?.squad?.FW?.map((p: any) => (
                   <motion.div whileHover={{ scale: 1.1 }} key={p.name} className="flex flex-col items-center">
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-[3px] border-emerald-400 shadow-[0_10px_20px_rgba(0,0,0,0.8)] overflow-hidden bg-black mb-2 relative">
                        <img src={p.image_url} className="absolute inset-0 w-full h-full object-cover object-top" />
                      </div>
                      <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded text-[10px] md:text-xs font-black text-white border border-white/20 uppercase tracking-widest whitespace-nowrap shadow-xl flex items-center gap-2">
                        <img src={getFlagUrl(p.team)} className="w-4 h-3 rounded-sm" />
                        {p.name.split(' ').pop()}
                        <span className="text-emerald-400">FW</span>
                      </div>
                      <div className="text-[9px] text-emerald-400 font-bold uppercase mt-1 bg-black/80 px-2 py-0.5 rounded border border-emerald-900 shadow-md">{formatEuro(p.market_value)}</div>
                   </motion.div>
                 ))}
              </div>
              
              {/* Midfielders */}
              <div className="flex justify-center gap-16 md:gap-40 w-full pointer-events-auto mt-4 md:mt-0">
                 {valuableXI?.squad?.MF?.map((p: any) => (
                   <motion.div whileHover={{ scale: 1.1 }} key={p.name} className="flex flex-col items-center">
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-[3px] border-emerald-400 shadow-[0_10px_20px_rgba(0,0,0,0.8)] overflow-hidden bg-black mb-2 relative">
                        <img src={p.image_url} className="absolute inset-0 w-full h-full object-cover object-top" />
                      </div>
                      <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded text-[10px] md:text-xs font-black text-white border border-white/20 uppercase tracking-widest whitespace-nowrap shadow-xl flex items-center gap-2">
                        <img src={getFlagUrl(p.team)} className="w-4 h-3 rounded-sm" />
                        {p.name.split(' ').pop()}
                        <span className="text-emerald-400">MF</span>
                      </div>
                      <div className="text-[9px] text-emerald-400 font-bold uppercase mt-1 bg-black/80 px-2 py-0.5 rounded border border-emerald-900 shadow-md">{formatEuro(p.market_value)}</div>
                   </motion.div>
                 ))}
              </div>

              {/* Defenders */}
              <div className="flex justify-center gap-8 md:gap-24 w-full pointer-events-auto mt-4 md:mt-0">
                 {valuableXI?.squad?.DF?.map((p: any) => (
                   <motion.div whileHover={{ scale: 1.1 }} key={p.name} className="flex flex-col items-center">
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-[3px] border-emerald-400 shadow-[0_10px_20px_rgba(0,0,0,0.8)] overflow-hidden bg-black mb-2 relative">
                        <img src={p.image_url} className="absolute inset-0 w-full h-full object-cover object-top" />
                      </div>
                      <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded text-[10px] md:text-xs font-black text-white border border-white/20 uppercase tracking-widest whitespace-nowrap shadow-xl flex items-center gap-2">
                        <img src={getFlagUrl(p.team)} className="w-4 h-3 rounded-sm" />
                        {p.name.split(' ').pop()}
                        <span className="text-emerald-400">DF</span>
                      </div>
                      <div className="text-[9px] text-emerald-400 font-bold uppercase mt-1 bg-black/80 px-2 py-0.5 rounded border border-emerald-900 shadow-md">{formatEuro(p.market_value)}</div>
                   </motion.div>
                 ))}
              </div>

              {/* Goalkeeper */}
              <div className="flex justify-center w-full pointer-events-auto mt-4 md:mt-0">
                 {valuableXI?.squad?.GK?.map((p: any) => (
                   <motion.div whileHover={{ scale: 1.1 }} key={p.name} className="flex flex-col items-center">
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-[3px] border-emerald-400 shadow-[0_10px_20px_rgba(0,0,0,0.8)] overflow-hidden bg-black mb-2 relative">
                        <img src={p.image_url} className="absolute inset-0 w-full h-full object-cover object-top" />
                      </div>
                      <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded text-[10px] md:text-xs font-black text-white border border-white/20 uppercase tracking-widest whitespace-nowrap shadow-xl flex items-center gap-2">
                        <img src={getFlagUrl(p.team)} className="w-4 h-3 rounded-sm" />
                        {p.name.split(' ').pop()}
                        <span className="text-emerald-400">GK</span>
                      </div>
                      <div className="text-[9px] text-emerald-400 font-bold uppercase mt-1 bg-black/80 px-2 py-0.5 rounded border border-emerald-900 shadow-md">{formatEuro(p.market_value)}</div>
                   </motion.div>
                 ))}
              </div>

            </div>
          </div>
        </section>

        {/* 6. TEAM MVPS */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-widest text-white">Team MVPs</h2>
              <div className="text-sm text-blue-400 font-bold uppercase tracking-widest">The crucial player for every nation</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMVPs.map((t: any) => (
              <Link href={`/squads?team=${t.team}`} key={t.team}>
                <div className="glass-panel p-4 hover:border-gray-600 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={getFlagUrl(t.team)} className="w-8 h-5 rounded shadow-sm" />
                    <span className="font-black uppercase text-white tracking-wide">{t.team}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">MVP</span>
                      <span className="text-xs font-bold text-white">{t.mvp?.name}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded">
                      <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest">Breakout</span>
                      <span className="text-xs font-bold text-white">{t.breakout ? t.breakout.name : <span className="text-gray-500 italic">None</span>}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Highest Valued</span>
                      <span className="text-xs font-bold text-white">{t.highest_value?.name}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
