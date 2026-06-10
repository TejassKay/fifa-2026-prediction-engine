"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";

const PrecisionCountdown = ({ dateStr, timeStr, timestamp }: { dateStr: string, timeStr?: string, timestamp?: number }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    let target: number;
    if (timestamp) {
      target = timestamp;
    } else {
      const targetStr = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`;
      target = new Date(targetStr).getTime();
    }
    
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
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
        <div className="relative w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)]"></div>
      </div>
      <div className="text-emerald-400 font-black tracking-widest uppercase text-lg md:text-xl drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
        {timeLeft}
      </div>
    </div>
  );
};

const LiveBadgeCenter = () => (
    <div className="flex items-center justify-center gap-3 mt-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
        <div className="relative w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)]"></div>
      </div>
      <div className="text-red-500 font-black tracking-widest uppercase text-lg md:text-xl drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
        LIVE
      </div>
    </div>
);

export default function MatchCenter() {
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFixtures = () => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/fixtures/upcoming`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setMatchData(data[0]);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    };
    fetchFixtures();
    const interval = setInterval(fetchFixtures, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="h-48 w-full bg-[#111] rounded-3xl border border-gray-800 animate-pulse mb-8"></div>;
  }

  if (!matchData || !matchData.prediction) return null;

  const { home_team, away_team, prediction } = matchData;

  return (
    <div id="match-center" className="glass-panel overflow-hidden relative shadow-2xl mb-8 group p-0">
      {/* Background Gradients */}
      <div className="absolute inset-0 flex pointer-events-none opacity-20 transition-opacity group-hover:opacity-30">
        <div className={`flex-1 bg-gradient-to-r ${getFlagGradientByName(home_team)}`}></div>
        <div className={`flex-1 bg-gradient-to-l ${getFlagGradientByName(away_team)}`}></div>
      </div>

      {/* Midfield Line & Center Circle */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white opacity-30 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-white opacity-30 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-50 z-0"></div>
      
      <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Home Team */}
        <div className="flex-1 text-center md:text-right flex flex-col items-center md:items-end">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white drop-shadow-md">
              {home_team}
            </h2>
            <img src={getFlagUrl(home_team)} alt={home_team} className="w-16 h-11 object-cover rounded shadow-lg border border-white/20 hidden md:block" />
          </div>
          <img src={getFlagUrl(home_team)} alt={home_team} className="w-16 h-11 object-cover rounded shadow-lg border border-white/20 md:hidden mt-2" />
          
          <div className="text-emerald-400 font-bold uppercase tracking-widest mt-2 text-xl">
            {(prediction.probabilities.home_win * 100).toFixed(1)}% WIN
          </div>
          <div className="text-gray-500 text-sm font-bold tracking-widest uppercase mt-1">
            {prediction.expected_goals.home.toFixed(2)} xG
          </div>
        </div>
        
        {/* Center Info */}
        <div className="flex flex-col items-center shrink-0 mx-4">
          <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-4 text-center">
            <div>{matchData.date}</div>
            <div>{matchData.venue}</div>
            {matchData.status === "LIVE" ? <LiveBadgeCenter /> : <PrecisionCountdown dateStr={matchData.date} timeStr={matchData.time_local} timestamp={matchData.timestamp} />}
          </div>
          
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="glass-panel px-6 py-4 mb-4 shadow-xl text-center">
              <div className="text-sm text-gray-400 font-bold tracking-widest mb-1">MOST LIKELY SCORE</div>
              <div className="text-4xl md:text-5xl font-black text-white">
                {prediction.top_scorelines[0].score.replace("-", " - ")}
              </div>
            </div>
            <Link 
              href={`/fixtures/${matchData.id}`} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-full shadow-lg transition-colors border border-emerald-400"
            >
              View Match Hub
            </Link>
          </div>
          
          <div className="text-gray-500 font-bold tracking-widest text-xs uppercase bg-black/50 px-3 py-1 rounded-full border border-gray-800 mt-4">
            Draw: {(prediction.probabilities.draw * 100).toFixed(1)}%
          </div>
        </div>
        
        {/* Away Team */}
        <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <img src={getFlagUrl(away_team)} alt={away_team} className="w-16 h-11 object-cover rounded shadow-lg border border-white/20 hidden md:block" />
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white drop-shadow-md">
              {away_team}
            </h2>
          </div>
          <img src={getFlagUrl(away_team)} alt={away_team} className="w-16 h-11 object-cover rounded shadow-lg border border-white/20 md:hidden mt-2" />
          
          <div className="text-emerald-400 font-bold uppercase tracking-widest mt-2 text-xl">
            {(prediction.probabilities.away_win * 100).toFixed(1)}% WIN
          </div>
          <div className="text-gray-500 text-sm font-bold tracking-widest uppercase mt-1">
            {prediction.expected_goals.away.toFixed(2)} xG
          </div>
        </div>
      </div>
    </div>
  );
}
