"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function MostLikelyFinals() {
  const [finals, setFinals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/intelligence/finals")
      .then(res => res.json())
      .then(data => {
        setFinals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 mt-8">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const maxProb = finals.length > 0 ? finals[0].probability : 1;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600/20 to-transparent p-6 rounded-2xl border border-indigo-500/20 mb-8">
        <h2 className="text-2xl font-black text-indigo-400 uppercase tracking-tight mb-2 flex items-center gap-2">
          <span>🏆</span> Most Likely Finals
        </h2>
        <p className="text-gray-300">
          We aggregated the progression paths of all 48 teams to find the ultimate climaxes of the tournament. These are the Top 10 most mathematically probable matchups for the FIFA 2026 World Cup Final.
        </p>
      </div>

      <div className="bg-[#161616] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 bg-[#111] text-xs font-bold text-gray-500 uppercase tracking-widest">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-4">Team A</div>
          <div className="col-span-2 text-center">VS</div>
          <div className="col-span-4 text-right">Team B</div>
          <div className="col-span-1 text-center">Prob</div>
        </div>

        <div className="divide-y divide-gray-800">
          {finals.map((match, index) => (
            <motion.div
              key={`${match.team_a}-${match.team_b}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#1a1a1a] transition-colors relative"
            >
              <div className="col-span-1 text-center font-black text-gray-500">#{index + 1}</div>
              <div className="col-span-4 font-bold text-white uppercase truncate">{match.team_a}</div>
              <div className="col-span-2 text-center text-gray-700 italic text-sm">vs</div>
              <div className="col-span-4 font-bold text-white uppercase text-right truncate">{match.team_b}</div>
              <div className="col-span-1 text-center font-bold text-indigo-400">
                {(match.probability * 100).toFixed(1)}%
              </div>
              
              {/* Background Probability Bar */}
              <div 
                className="absolute left-0 bottom-0 h-[2px] bg-indigo-500/50" 
                style={{ width: `${(match.probability / maxProb) * 100}%` }}
              ></div>
            </motion.div>
          ))}
          {finals.length === 0 && (
            <div className="text-gray-500 text-center py-10">No finals data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
