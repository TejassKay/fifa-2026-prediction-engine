"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFlagUrl, getTeamColorHex, getFlagGradientByName } from "@/lib/flags";
import TeamSelector from "@/components/SquadExplorer/TeamSelector";
import TeamIdentityHeader from "@/components/SquadExplorer/TeamIdentityHeader";
import TeamAtmosphere from "@/components/Atmosphere/TeamAtmosphere";
import PlayerRadarChart from "@/components/SquadExplorer/PlayerRadarChart";
import PlayerMarketValueChart from "@/components/SquadExplorer/PlayerMarketValueChart";
import { Star, Crown } from "lucide-react";

const formatEuro = (value: number) => {
  if (!value) return "N/A";
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

export default function SquadsPage() {
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [squadData, setSquadData] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/teams`)
      .then((res) => res.json())
      .then((data) => setTeams(data))
      .catch((err) => console.error("Error fetching teams:", err));
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      setLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/teams/${selectedTeam}/squad`)
        .then(res => res.json())
        .then(squad => {
          setSquadData(squad);
          setSelectedPlayer(null); // Reset player when team changes
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching squad:", err);
          setLoading(false);
        });
    }
  }, [selectedTeam]);

  return (
    <div className="relative w-full h-[calc(100vh-3rem)] md:h-[calc(100vh-5rem)] flex flex-col font-sans bg-transparent rounded-xl overflow-hidden shadow-2xl border border-white/10">
      {/* 2D AMBIENT BACKGROUND LAYERS */}
      {squadData && <TeamAtmosphere teamName={squadData.team} />}
      


      {/* IDENTITY HEADER */}
      {squadData ? (
        <TeamIdentityHeader 
          squadData={squadData} 
          teams={teams} 
          selectedTeam={selectedTeam || ''} 
          onSelectTeam={setSelectedTeam} 
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-10 z-10">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase font-heading drop-shadow-md mb-8">
            Squad Explorer
          </h1>
          <div className="w-full max-w-md">
            <TeamSelector
              teams={teams}
              selectedTeam={selectedTeam}
              onSelect={setSelectedTeam}
            />
          </div>
        </div>
      )}

      {squadData && (
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
      
      {/* LEFT COLUMN: ROSTER (w-1/4) */}
      <div className="w-full md:w-1/4 h-full glass-panel border-r border-white/10 flex flex-col p-6 overflow-hidden backdrop-blur-2xl bg-black/60 shrink-0">
         {squadData && (
            <div className="flex flex-col flex-1 overflow-hidden">
               <h3 className="font-heading text-lg uppercase tracking-widest text-neutral-400 mb-4 border-b border-white/10 pb-2 flex items-center justify-between shrink-0">
                 Roster
                 <span className="text-xs text-neutral-500 font-bold">
                   {squadData.players.filter((p: any) => p.name && p.name.trim() !== '').length} Players
                 </span>
               </h3>
               
               {/* Scrollable Player List Block */}
               <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
                 {squadData.players
                   .filter((p: any) => p.name && p.name.trim() !== '')
                   .map((p: any) => (
                      <div 
                        key={p.name} 
                        onClick={() => setSelectedPlayer(p)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transform transition-all duration-200 hover:scale-[1.02] shrink-0 ${selectedPlayer?.name === p.name ? 'bg-white/10 border border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'border border-transparent hover:bg-white/5'}`}
                      >
                         <span className="w-8 font-black text-gray-500 text-sm">{p.jersey_number || '-'}</span>
                         <span className="flex-1 font-bold uppercase tracking-wide text-white truncate pr-2">{p.name}</span>
                         <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${getPosTagColor(p.position)}`}>{p.position}</span>
                      </div>
                   ))}
               </div>
            </div>
         )}
      </div>
      
      {/* RIGHT COLUMN: BENTO DASHBOARD (w-3/4) */}
      <div className="flex-1 p-6 lg:p-10 h-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {selectedPlayer ? (
            <motion.div 
              key={selectedPlayer.name}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="flex flex-col gap-6 max-w-5xl mx-auto"
            >
              {/* HERO CARD CONTAINER */}
              <div 
                className="relative w-full h-[320px] rounded-3xl overflow-hidden glass-panel border border-white/5 flex items-end p-8 shadow-2xl"
                style={{ background: `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 100%), ${getTeamColorHex(squadData?.team)}20` }}
              >
                {/* Non-transparent image rendered with gradient blending */}
                {selectedPlayer.image_url ? (
                  <img 
                    src={selectedPlayer.image_url} 
                    alt={selectedPlayer.name} 
                    className="absolute right-0 bottom-0 h-[120%] object-cover object-[50%_15%] mix-blend-normal z-10 opacity-90" 
                    style={{ filter: `drop-shadow(0 0 40px ${getTeamColorHex(squadData?.team)}80)` }}
                  />
                ) : (
                  <div className="absolute right-10 bottom-0 h-full flex items-center justify-center opacity-10">
                    <Star className="w-64 h-64" />
                  </div>
                )}
                
                {/* Blend overlay to hide hard bottom edges of the image */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10" />

                <div className="relative z-20 flex flex-col max-w-[60%]">
                   <span className="text-[140px] font-black leading-none tracking-tighter text-white/5 absolute -top-16 -left-6 select-none">{selectedPlayer.jersey_number || '-'}</span>
                   <h1 className="text-6xl font-black uppercase tracking-tighter text-white drop-shadow-lg leading-[0.85]">{selectedPlayer.name}</h1>
                   <div className="flex items-center gap-4 mt-6">
                      <img src={getFlagUrl(squadData?.team)} className="w-8 h-5 rounded-sm shadow-sm" />
                      <span className={`px-3 py-1 text-sm font-black rounded-sm border ${getPosTagColor(selectedPlayer.position)}`}>{selectedPlayer.position}</span>
                      <span className="text-xl font-bold text-gray-300">|</span>
                      <span className="text-2xl font-bold text-white uppercase tracking-widest">{selectedPlayer.club || "Unknown"}</span>
                   </div>
                </div>
              </div>

              {/* INTELLIGENCE BENTO GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Card 1: Metrics */}
                 <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/40 shadow-xl flex flex-col">
                   <h3 className="text-lg font-bold text-gray-400 mb-6 uppercase tracking-wider">Tournament Stats</h3>
                   <div className="space-y-8 flex-1 justify-center flex flex-col">
                      <div>
                        <div className="flex justify-between mb-2 font-bold"><span className="text-gray-300 uppercase text-xs tracking-widest">Goals</span><span className="text-white text-lg">{selectedPlayer.total_goals || 0}</span></div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${Math.min(100, (selectedPlayer.total_goals || 0) * 10)}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2 font-bold"><span className="text-gray-300 uppercase text-xs tracking-widest">Assists</span><span className="text-white text-lg">{selectedPlayer.total_assists || 0}</span></div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" style={{ width: `${Math.min(100, (selectedPlayer.total_assists || 0) * 15)}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2 font-bold"><span className="text-gray-300 uppercase text-xs tracking-widest">Minutes Played</span><span className="text-white text-lg">{selectedPlayer.total_minutes || 0}</span></div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" style={{ width: `${Math.min(100, (selectedPlayer.total_minutes || 0) / 30)}%` }} /></div>
                      </div>
                   </div>
                 </div>

                 {/* Card 2: Radar Profile */}
                 <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/40 shadow-xl flex flex-col items-center">
                   <h3 className="text-lg font-bold text-gray-400 mb-2 uppercase tracking-wider w-full text-left">Attribute Profile</h3>
                   <div className="w-full flex-1 min-h-[220px] flex items-center justify-center">
                      <PlayerRadarChart player={selectedPlayer} teamColor={getTeamColorHex(squadData?.team)} />
                   </div>
                 </div>

                 {/* Card 3: Form & Value Trend */}
                 <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/40 shadow-xl flex flex-col justify-between">
                   <div>
                     <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-wider">Form Trend</h3>
                     <div className="flex flex-col items-center justify-center py-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-6xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] tracking-tighter">{selectedPlayer.form_score?.toFixed(1) || "0.0"}</div>
                        <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Algorithmic Rating</div>
                     </div>
                   </div>

                   <div className="mt-4 pt-4 border-t border-white/10 flex-1 flex flex-col">
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Market Value Trend</div>
                        <div className="text-xl font-black uppercase tracking-tighter font-heading text-white">{formatEuro(selectedPlayer.market_value)}</div>
                      </div>
                      <div className="flex-1 w-full min-h-[80px]">
                         <PlayerMarketValueChart 
                           historicalValues={selectedPlayer.historical_values} 
                           historicalDates={selectedPlayer.historical_dates}
                           teamColor={getTeamColorHex(squadData?.team)}
                         />
                      </div>
                   </div>
                 </div>
              </div>

            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center text-center max-w-md">
                 <div className="w-24 h-24 mb-6 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center bg-black/20">
                   <Star className="w-8 h-8 text-gray-600" />
                 </div>
                 <h2 className="text-2xl font-black text-white/40 uppercase tracking-widest mb-2 font-heading">Select a Player</h2>
                 <p className="text-gray-500 font-medium">Choose a player from the roster to view their detailed intelligence profile and statistics.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
      )}
    </div>
  );
}
