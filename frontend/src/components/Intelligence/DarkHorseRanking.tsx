"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function DarkHorseRanking() {
  const [darkHorses, setDarkHorses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/intelligence/dark-horses")
      .then(res => res.json())
      .then(data => {
        setDarkHorses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600/20 to-transparent p-6 rounded-2xl border border-orange-500/20 mb-8">
        <h2 className="text-2xl font-black text-orange-400 uppercase tracking-tight mb-2 flex items-center gap-2">
          <span>🔥</span> The Dark Horse Index
        </h2>
        <p className="text-gray-300">
          Our model identifies teams whose underlying squad strength and recent tactical form heavily outperform their public perception and official FIFA ranking. These are the teams poised to make a shock deep run in the tournament.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {darkHorses.map((team, index) => (
          <motion.div
            key={team.team}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#161616] border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-orange-500/50 transition-colors group"
          >
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 text-3xl font-black border border-orange-500/20 group-hover:scale-110 transition-transform">
                #{index + 1}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-end gap-3 mb-2">
                  <h3 className="text-2xl font-black uppercase text-white">{team.team}</h3>
                  <span className="text-sm font-bold text-gray-500 mb-1">FIFA Rank: {team.fifa_rank}</span>
                </div>
                <p className="text-gray-400 italic text-sm md:text-base border-l-2 border-orange-500/50 pl-4 py-1">
                  "{team.reason}"
                </p>
              </div>

              <div className="flex-shrink-0 flex gap-4 mt-4 md:mt-0">
                <div className="text-center glass-panel p-3 min-w-[100px]">
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Squad Rating</div>
                  <div className="text-xl font-black text-white">{team.elo}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {darkHorses.length === 0 && (
          <div className="text-gray-500 text-center py-10">No dark horses identified.</div>
        )}
      </div>
    </div>
  );
}
