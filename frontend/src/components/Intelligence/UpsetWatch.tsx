"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function UpsetWatch() {
  const [upsets, setUpsets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/intelligence/upsets`)
      .then(res => res.json())
      .then(data => {
        setUpsets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-600/20 to-transparent p-6 rounded-2xl border border-yellow-500/20 mb-8">
        <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-tight mb-2 flex items-center gap-2">
          <span>⚠️</span> Upset Alert
        </h2>
        <p className="text-gray-300">
          The Group Stage is where dreams are made and giants fall. Our predictive engine has flagged these matchups as high-risk for the favorites, based on tactical matchups and underlying underdog strength.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {upsets.map((match, index) => (
          <motion.div
            key={match.match}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#161616] border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-yellow-500/50 transition-colors flex flex-col"
          >
            <div className="bg-[#111] p-4 border-b border-gray-800 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Group Stage Matchup</span>
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                HIGH RISK
              </span>
            </div>
            
            <div className="p-6 flex-grow flex flex-col justify-center">
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col items-center w-[40%] text-center">
                  <span className="text-2xl font-black uppercase text-white truncate w-full">{match.underdog}</span>
                  <span className="text-xs text-yellow-500 font-bold tracking-widest mt-1">UNDERDOG</span>
                </div>
                
                <div className="text-gray-600 font-black italic text-xl">VS</div>
                
                <div className="flex flex-col items-center w-[40%] text-center">
                  <span className="text-2xl font-black uppercase text-gray-400 truncate w-full">{match.favorite}</span>
                  <span className="text-xs text-gray-600 font-bold tracking-widest mt-1">FAVORITE</span>
                </div>
              </div>

              <div className="glass-panel p-4 mb-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Upset Probability</span>
                  <span className="text-xl font-black text-yellow-400">{(match.upset_prob * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${match.upset_prob * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-400 italic">"{match.reason}"</p>
            </div>
          </motion.div>
        ))}
        {upsets.length === 0 && (
          <div className="text-gray-500 text-center py-10 md:col-span-2">No high-risk upsets found in the group stage.</div>
        )}
      </div>
    </div>
  );
}
