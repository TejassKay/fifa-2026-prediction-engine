"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";

const Countdown = ({ dateStr, timeStr }: { dateStr: string, timeStr?: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const targetStr = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`;
    const target = new Date(targetStr).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft("MATCH DAY");
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) setTimeLeft(`Starts in ${days}d ${hours}h`);
      else setTimeLeft(`Starts in ${hours}h ${mins}m`);
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  return <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">{timeLeft}</span>;
};

const LiveBadge = () => (
  <span className="flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30">
    <div className="relative flex items-center justify-center">
      <div className="absolute w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75"></div>
      <div className="relative w-1.5 h-1.5 bg-red-500 rounded-full"></div>
    </div>
    LIVE
  </span>
);

export default function FixtureStack() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchFixtures = () => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/fixtures/upcoming`)
        .then(res => res.json())
        .then(data => setFixtures(data))
        .catch(err => console.error(err));
    };
    fetchFixtures();
    const interval = setInterval(fetchFixtures, 30000);
    return () => clearInterval(interval);
  }, []);

  if (fixtures.length === 0) return null;

  const handleNext = () => {
    if (currentIndex < fixtures.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Restack animation
      setCurrentIndex(0);
    }
  };

  return (
    <div className="relative h-[450px] w-full max-w-4xl mx-auto mt-12 mb-20 flex justify-center">
        {fixtures.map((fixture, index) => {
          const isTop = index === currentIndex;
          const isGone = index < currentIndex;

          return (
            <motion.div
              key={index}
              className="absolute inset-0 bg-[#111] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-800 overflow-hidden cursor-pointer"
              style={{ zIndex: isGone ? 0 : 10 - (index - currentIndex) }}
              initial={false}
              animate={isGone ? {
                x: "-150%",
                rotateZ: -15,
                opacity: 0,
                scale: 0.8,
                y: 0
              } : {
                scale: isTop ? 1 : 1 - (index - currentIndex) * 0.05,
                y: isTop ? 0 : (index - currentIndex) * 20,
                opacity: isTop ? 1 : 1 - (index - currentIndex) * 0.2,
                x: 0,
                rotateZ: 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={isTop ? handleNext : undefined}
            >
              <div className="absolute inset-0 flex pointer-events-none opacity-20 transition-opacity">
                <div className={`flex-1 bg-gradient-to-r ${getFlagGradientByName(fixture.home_team)}`}></div>
                <div className={`flex-1 bg-gradient-to-l ${getFlagGradientByName(fixture.away_team)}`}></div>
              </div>

              {/* Midfield Line & Center Circle */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white opacity-30 z-0"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-white opacity-30 z-0"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-50 z-0"></div>
              
              <div className="relative z-10 p-6 md:p-10 flex flex-col items-center text-center h-full justify-center">
                <div className="flex justify-between items-center w-full absolute top-6 px-10">
                   <div className="text-gray-400 font-bold uppercase tracking-widest text-xs flex items-center gap-3">
                     {fixture.date} 
                     {fixture.status === "LIVE" ? <LiveBadge /> : <Countdown dateStr={fixture.date} timeStr={fixture.time_local} />}
                   </div>
                   <div className="text-gray-400 font-bold uppercase tracking-widest text-xs">{fixture.venue}</div>
                </div>
                
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 mt-4">
                  <div className="flex-1 text-center md:text-right flex flex-col items-center md:items-end">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <h3 className="text-4xl md:text-5xl font-black uppercase text-white drop-shadow-md">{fixture.home_team}</h3>
                      <img src={getFlagUrl(fixture.home_team)} alt={fixture.home_team} className="w-12 h-8 object-cover rounded shadow-lg border border-white/20 hidden md:block" />
                    </div>
                    <img src={getFlagUrl(fixture.home_team)} alt={fixture.home_team} className="w-12 h-8 object-cover rounded shadow-lg border border-white/20 md:hidden mt-2" />
                    
                    <div className="text-emerald-400 font-bold uppercase tracking-widest mt-2 text-xl">
                      {(fixture.prediction.probabilities.home_win * 100).toFixed(1)}% WIN
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center shrink-0 z-20">
                    <div className="glass-panel px-6 py-4 mb-4 shadow-xl">
                      <div className="text-sm text-gray-400 font-bold tracking-widest mb-1 text-center">MOST LIKELY SCORE</div>
                      <div className="text-4xl md:text-5xl font-black text-white text-center">
                        {fixture.prediction.top_scorelines[0].score.replace("-", " - ")}
                      </div>
                    </div>
                    {isTop && (
                      <Link 
                        href={`/fixtures/${fixture.id}`} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-full shadow-lg transition-colors border border-emerald-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Match Hub
                      </Link>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <img src={getFlagUrl(fixture.away_team)} alt={fixture.away_team} className="w-12 h-8 object-cover rounded shadow-lg border border-white/20 hidden md:block" />
                      <h3 className="text-4xl md:text-5xl font-black uppercase text-white drop-shadow-md">{fixture.away_team}</h3>
                    </div>
                    <img src={getFlagUrl(fixture.away_team)} alt={fixture.away_team} className="w-12 h-8 object-cover rounded shadow-lg border border-white/20 md:hidden mt-2" />
                    
                    <div className="text-emerald-400 font-bold uppercase tracking-widest mt-2 text-xl">
                      {(fixture.prediction.probabilities.away_win * 100).toFixed(1)}% WIN
                    </div>
                  </div>
                </div>
                
                {isTop && (
                  <div className="absolute bottom-6 text-gray-500 text-xs font-bold uppercase tracking-widest animate-pulse flex items-center gap-2">
                    <span>Click to slide away</span>
                    <span className="text-lg">👈</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
