"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getFlagGradientByName, getFlagUrl, getTeamColorHex, getTeamSecondaryColorHex } from "@/lib/flags";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Shield, Target, Star, Trophy, Clock, Swords, Zap } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export default function MatchHub() {
  const { id } = useParams();
  const router = useRouter();
  const [matchData, setMatchData] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<{home: any, away: any} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8000/api/match/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.push("/");
          return;
        }
        setMatchData(data);
        
        Promise.all([
          fetch(`http://localhost:8000/api/teams/${data.home_team}`).then(r => r.json()),
          fetch(`http://localhost:8000/api/teams/${data.away_team}`).then(r => r.json())
        ]).then(([homeStats, awayStats]) => {
          setTeamStats({ home: homeStats, away: awayStats });
          setLoading(false);
        });
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id, router]);

  if (loading || !matchData || !teamStats) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-8">
        <Skeleton className="h-[600px] w-full rounded-[3rem] mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <Skeleton className="h-64 w-full rounded-3xl md:col-span-7" />
          <Skeleton className="h-64 w-full rounded-3xl md:col-span-5" />
        </div>
      </div>
    );
  }

  const { home_team, away_team, prediction, key_players, story, road_to_glory } = matchData;
  const homeProb = (prediction.probabilities.home_win * 100).toFixed(1);
  const awayProb = (prediction.probabilities.away_win * 100).toFixed(1);
  const drawProb = (prediction.probabilities.draw * 100).toFixed(1);
  const topScoreline = prediction.top_scorelines[0].score;

  const getPosTagColor = (pos: string) => {
    switch (pos) {
      case "GK": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "DF": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "MF": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "FW": return "text-red-400 bg-red-400/10 border-red-400/20";
      default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getAccurateAttributes = (stats: any) => {
    if (!stats) return { Attack: 50, Defense: 50, Midfield: 50, Pace: 50, Tactics: 50 };
    
    const attack = Math.min(99, (stats.recent_form.goals_scored_L5 / 3.0) * 60 + 35);
    const def = Math.min(99, Math.max(40, 95 - (stats.recent_form.goals_conceded_L5 * 20)));
    const mid = Math.min(99, Math.max(40, (stats.elo_rating - 1400) / 700 * 55 + 40));
    const pace = Math.min(99, 40 + (stats.recent_form.win_rate_L10 * 55));
    const tactics = Math.min(99, Math.max(50, 95 - (stats.fifa_ranking * 0.8)));

    return {
      Attack: Math.round(attack),
      Defense: Math.round(def),
      Midfield: Math.round(mid),
      Pace: Math.round(pace),
      Tactics: Math.round(tactics)
    };
  };

  const homeAttrs = getAccurateAttributes(teamStats.home);
  const awayAttrs = getAccurateAttributes(teamStats.away);

  const radarData = [
    { subject: 'Attack', A: homeAttrs.Attack, B: awayAttrs.Attack, fullMark: 100 },
    { subject: 'Defense', A: homeAttrs.Defense, B: awayAttrs.Defense, fullMark: 100 },
    { subject: 'Midfield', A: homeAttrs.Midfield, B: awayAttrs.Midfield, fullMark: 100 },
    { subject: 'Pace', A: homeAttrs.Pace, B: awayAttrs.Pace, fullMark: 100 },
    { subject: 'Tactics', A: homeAttrs.Tactics, B: awayAttrs.Tactics, fullMark: 100 },
  ];

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
  };

  const isSimilar = (hex1: string, hex2: string) => {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    const distance = Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
    return distance < 100; // threshold for visual collision
  };

  let colorHome = getTeamColorHex(home_team);
  let colorAway = getTeamColorHex(away_team);

  if (isSimilar(colorHome, colorAway)) {
    const secondaryAway = getTeamSecondaryColorHex(away_team);
    if (!isSimilar(colorHome, secondaryAway)) {
      colorAway = secondaryAway;
    } else {
      colorAway = colorHome === "#FFFFFF" || colorHome === "#E0E0E0" ? "#000000" : "#FFFFFF";
    }
  }

  const renderPlayerCards = (players: any[]) => (
    <div className="space-y-3">
      {players.map((p, i) => (
        <Link href={`/squads?team=${p.team}`} key={p.id || i}>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 bg-black/40 hover:bg-black/60 p-3 rounded-xl border border-white/5 transition-colors group"
          >
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-full border border-white/10 object-cover shadow-sm shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full border border-white/10 bg-black/50 flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors font-heading tracking-wide">{p.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${getPosTagColor(p.position)}`}>
                  {p.position}
                </span>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                  Form: {p.form_score.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">MVP Score</div>
              <div className="text-lg font-black text-white">{p.mvp_score.toFixed(1)}</div>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen font-sans max-w-[1400px] mx-auto p-4 md:p-8">
      <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white font-black tracking-widest text-xs uppercase mb-8 transition-colors drop-shadow">
        <ChevronLeft className="w-4 h-4" /> Dashboard
      </Link>

      {/* MASSIVE HERO */}
      <div className="relative min-h-[500px] md:min-h-[600px] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl mb-12 flex items-center justify-center p-4 md:p-8 bg-black/50">
        
        {/* Absolute VS Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
           <span className="text-[25vw] font-black italic tracking-tighter text-white drop-shadow-2xl">VS</span>
        </div>

        {/* Ambient background gradients */}
        <div className="absolute inset-0 flex pointer-events-none opacity-30 mix-blend-screen">
          <div className={`flex-1 bg-gradient-to-r ${getFlagGradientByName(home_team)} blur-3xl rounded-full scale-150 -translate-x-1/4`}></div>
          <div className={`flex-1 bg-gradient-to-l ${getFlagGradientByName(away_team)} blur-3xl rounded-full scale-150 translate-x-1/4`}></div>
        </div>
        
        <div className="relative z-10 w-full max-w-5xl">
          {/* Metadata chip */}
          <div className="flex justify-center mb-8 md:mb-12">
            <div className="glass-panel px-6 py-2 rounded-full border border-white/10 text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 shadow-lg backdrop-blur-md">
              <Clock className="w-4 h-4" /> {matchData.date} • {matchData.venue} • {matchData.stage}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 relative">
            
            {/* Home Flag */}
            <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center z-10 w-full md:w-auto">
               <img src={getFlagUrl(home_team)} className="w-40 h-24 md:w-64 md:h-40 object-cover rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/20 mb-6" />
               <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tight drop-shadow-2xl mb-2 font-heading text-center">{home_team}</h2>
            </motion.div>

            {/* Central Score / Stats Panel */}
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-20 md:mx-[-4rem]">
               <div className="glass-panel border border-white/20 p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center min-w-[200px] md:min-w-[240px] backdrop-blur-xl bg-black/60">
                 <div className="text-neutral-400 font-bold uppercase tracking-widest text-[10px] mb-2 border-b border-white/10 pb-2 w-full text-center">Projected Output</div>
                 <div className="flex flex-row items-center justify-center gap-4 text-6xl md:text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-6 font-heading">
                   <span>{topScoreline.split("-")[0]}</span>
                   <span className="text-neutral-600">-</span>
                   <span>{topScoreline.split("-")[1]}</span>
                 </div>
                 
                 {/* Segmented Flex-Bar */}
                 <div className="w-full h-8 flex rounded-full overflow-hidden font-black text-[10px] md:text-xs tracking-widest border border-white/10 shadow-inner">
                   <div className="bg-emerald-500/80 flex items-center justify-center text-black" style={{ width: `${homeProb}%` }}>
                     {homeProb}%
                   </div>
                   <div className="bg-neutral-600/80 flex items-center justify-center text-white" style={{ width: `${drawProb}%` }}>
                     {drawProb}%
                   </div>
                   <div className="bg-rose-500/80 flex items-center justify-center text-black" style={{ width: `${awayProb}%` }}>
                     {awayProb}%
                   </div>
                 </div>
               </div>
            </motion.div>

            {/* Away Flag */}
            <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center z-10 w-full md:w-auto">
               <img src={getFlagUrl(away_team)} className="w-40 h-24 md:w-64 md:h-40 object-cover rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/20 mb-6" />
               <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tight drop-shadow-2xl mb-2 font-heading text-center">{away_team}</h2>
            </motion.div>

          </div>
        </div>
      </div>

      {/* FLOATING PANELS GRID */}
      <div className="relative z-30 -mt-16 md:-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-8 pb-32">
        
        {/* TALE OF THE TAPE (Col-span 7) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-7 glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col justify-between">
           <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-6 flex items-center gap-3 font-heading">
             <Swords className="text-orange-500 w-6 h-6" /> Tale of the Tape
           </h3>
           
           {/* Color Legend */}
           <div className="flex items-center justify-center gap-8 mb-4 w-full">
             <div className="flex items-center gap-3">
               <div className="w-4 h-4 rounded-full shadow-[0_0_10px]" style={{ backgroundColor: colorHome, boxShadow: `0 0 10px ${colorHome}` }}></div>
               <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-neutral-300">{home_team}</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-4 h-4 rounded-full shadow-[0_0_10px]" style={{ backgroundColor: colorAway, boxShadow: `0 0 10px ${colorAway}` }}></div>
               <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-neutral-300">{away_team}</span>
             </div>
           </div>

           <div className="flex-1 w-full min-h-[300px] flex items-center justify-center -ml-4">
             <ResponsiveContainer width="100%" height="100%">
               <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                 <defs>
                   <filter id="glowHome" x="-20%" y="-20%" width="140%" height="140%">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feMerge>
                       <feMergeNode in="blur"/>
                       <feMergeNode in="SourceGraphic"/>
                     </feMerge>
                   </filter>
                   <filter id="glowAway" x="-20%" y="-20%" width="140%" height="140%">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feMerge>
                       <feMergeNode in="blur"/>
                       <feMergeNode in="SourceGraphic"/>
                     </feMerge>
                   </filter>
                 </defs>
                 <PolarGrid stroke="rgba(255,255,255,0.1)" />
                 <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold' }} />
                 <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                 
                 <Radar name={home_team} dataKey="A" stroke={colorHome} strokeWidth={3} fill={colorHome} fillOpacity={0.4} filter="url(#glowHome)" />
                 <Radar name={away_team} dataKey="B" stroke={colorAway} strokeWidth={3} fill={colorAway} fillOpacity={0.4} filter="url(#glowAway)" />
               </RadarChart>
             </ResponsiveContainer>
           </div>
        </motion.div>

        {/* Key Players (Col-span 5) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-5 glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col gap-8">
           <h3 className="text-2xl font-black uppercase tracking-widest text-white flex items-center gap-3 font-heading">
             <Star className="text-emerald-400 w-6 h-6" /> Key Players
           </h3>
           
           <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                   <img src={getFlagUrl(home_team)} className="w-6 h-4 object-cover rounded-sm shadow-sm border border-white/20" />
                   <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">{home_team} Alpha</h4>
                </div>
                {renderPlayerCards(key_players.home)}
              </div>
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 mb-3">
                   <img src={getFlagUrl(away_team)} className="w-6 h-4 object-cover rounded-sm shadow-sm border border-white/20" />
                   <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">{away_team} Alpha</h4>
                </div>
                {renderPlayerCards(key_players.away)}
              </div>
           </div>
        </motion.div>

        {/* Road to Glory Outlook (Col-span 12) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-12 glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl mb-12">
            <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3 font-heading">
              <Trophy className="text-yellow-500 w-6 h-6" /> Tournament Outlook
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Home Path */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <img src={getFlagUrl(home_team)} alt={home_team} className="w-8 h-5 object-cover rounded-sm border border-white/10" />
                  <span className="font-black uppercase text-lg tracking-wide">{home_team} Path</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Semi Final</span>
                      <span className="text-white font-black text-lg">{(road_to_glory.home.semi_final_probability * 100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-black rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div className={`h-full bg-gradient-to-r ${getFlagGradientByName(home_team)}`} style={{ width: `${(road_to_glory.home.semi_final_probability * 100 || 0)}%`}}></div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Champion</span>
                      <span className="text-white font-black text-lg">{(road_to_glory.home.champion_probability * 100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-black rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div className={`h-full bg-gradient-to-r ${getFlagGradientByName(home_team)}`} style={{ width: `${(road_to_glory.home.champion_probability * 100 || 0)}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Away Path */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <img src={getFlagUrl(away_team)} alt={away_team} className="w-8 h-5 object-cover rounded-sm border border-white/10" />
                  <span className="font-black uppercase text-lg tracking-wide">{away_team} Path</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Semi Final</span>
                      <span className="text-white font-black text-lg">{(road_to_glory.away.semi_final_probability * 100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-black rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div className={`h-full bg-gradient-to-r ${getFlagGradientByName(away_team)}`} style={{ width: `${(road_to_glory.away.semi_final_probability * 100 || 0)}%`}}></div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Champion</span>
                      <span className="text-white font-black text-lg">{(road_to_glory.away.champion_probability * 100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-black rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div className={`h-full bg-gradient-to-r ${getFlagGradientByName(away_team)}`} style={{ width: `${(road_to_glory.away.champion_probability * 100 || 0)}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 text-center">
               <Link href="/road-to-glory" className="inline-block border border-white/20 hover:border-white/50 bg-black/50 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-xl">
                 Open Full Road To Glory
               </Link>
            </div>
        </motion.div>

      </div>
    </div>
  );
}
