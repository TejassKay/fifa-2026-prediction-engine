import { motion } from "framer-motion";
import { getFlagUrl, getTeamColorHex, getTeamSecondaryColorHex, getFlagGradientByName } from "@/lib/flags";
import { getTeamNickname } from "@/lib/teams";
import TeamSelector from "./TeamSelector";
import { Trophy, Globe2 } from "lucide-react";

interface TeamIdentityHeaderProps {
  squadData: any;
  teams: string[];
  selectedTeam: string;
  onSelectTeam: (team: string) => void;
}

export default function TeamIdentityHeader({ squadData, teams, selectedTeam, onSelectTeam }: TeamIdentityHeaderProps) {
  if (!squadData) return null;

  const teamColor = getTeamColorHex(selectedTeam);
  const secondaryColor = getTeamSecondaryColorHex(selectedTeam);
  const nickname = getTeamNickname(selectedTeam);
  const stats = squadData.stats || {};
  const winProb = stats.progression?.champion_probability ? (stats.progression.champion_probability * 100).toFixed(1) + "%" : "N/A";
  const fifaRank = stats.fifa_ranking || "N/A";

  return (
    <div className="w-full relative z-10 glass-panel border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0 flex flex-col overflow-hidden">
      {/* Accent Top Border */}
      <motion.div 
        key={`border-${selectedTeam}`}
        className={`h-1.5 w-full bg-gradient-to-r ${getFlagGradientByName(selectedTeam)}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      
      <div className="p-6 md:px-10 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Subtle Background Graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none overflow-hidden flex items-center justify-end">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black z-10" />
          <div className="w-full h-[200%] rounded-full blur-[40px] translate-x-1/2 mix-blend-screen will-change-transform transform-gpu" style={{ backgroundColor: secondaryColor !== "#FFFFFF" ? secondaryColor : teamColor }} />
        </div>

        {/* Left Side: Identity */}
        <div className="flex items-center gap-6 relative z-10">
          <motion.div 
            key={`flag-${selectedTeam}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
            className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center bg-black/50"
            style={{ borderColor: teamColor }}
          >
            <img src={getFlagUrl(selectedTeam)} alt={selectedTeam} className="w-full h-full object-cover" />
          </motion.div>
          
          <div className="flex flex-col relative">
            
            {/* Massive Background Nickname */}
            <motion.div
               key={`bg-nick-${selectedTeam}`}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 0.05, x: 0 }}
               className="absolute -top-8 md:-top-16 -left-4 text-[60px] md:text-[120px] font-black uppercase whitespace-nowrap pointer-events-none select-none tracking-tighter text-white z-0"
               style={{ WebkitTextStroke: `2px ${teamColor}` }}
            >
               {nickname}
            </motion.div>

            <motion.h2 
              key={`nick-${selectedTeam}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50 mb-1 relative z-10"
              style={{ color: secondaryColor !== "#FFFFFF" ? secondaryColor : "rgba(255,255,255,0.7)" }}
            >
              {nickname}
            </motion.h2>
            <div className="flex items-center gap-4 relative z-10">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white font-heading drop-shadow-lg leading-none">
                {selectedTeam}
              </h1>
              <div className="w-48 hidden md:block">
                <TeamSelector teams={teams} selectedTeam={selectedTeam} onSelect={onSelectTeam} />
              </div>
            </div>
            <div className="w-48 block md:hidden mt-3 relative z-10">
              <TeamSelector teams={teams} selectedTeam={selectedTeam} onSelect={onSelectTeam} />
            </div>
          </div>
        </div>

        {/* Right Side: Stats Banner */}
        <div className="flex items-center gap-8 relative z-10 bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-lg">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Globe2 className="w-3 h-3" /> FIFA Rank
            </span>
            <span className="text-2xl font-black text-white font-heading">
              {fifaRank}
            </span>
          </div>
          
          <div className="w-px h-10 bg-white/10" />
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400/70" /> To Win
            </span>
            <span className="text-2xl font-black text-emerald-400 font-heading drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              {winProb}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
