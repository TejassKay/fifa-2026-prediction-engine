"use client";

import { useEffect, useState } from "react";
import { fetchBracket } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function BracketPage() {
  const [bracket, setBracket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchBracket();
      setBracket(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !bracket || !bracket.r32) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-12 flex h-[50vh] items-center justify-center">
        <span className="text-neutral-500 font-mono animate-pulse">Simulating 32-team Knockout Bracket...</span>
      </div>
    );
  }

  const renderMatch = (match: any, delay: number) => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.05 }}
      className="flex flex-col border border-neutral-800 rounded bg-black w-40 text-xs shadow-lg shadow-black/50 z-10"
    >
      <div className={`px-2 py-1.5 flex justify-between ${match.winner === match.home ? 'text-emerald-400 font-bold' : 'text-neutral-500'}`}>
        <span className="truncate max-w-[100px]" title={match.home}>{match.home}</span>
        <span className="font-mono">{match.score_home.toFixed(1)}</span>
      </div>
      <div className={`px-2 py-1.5 flex justify-between border-t border-neutral-800 ${match.winner === match.away ? 'text-emerald-400 font-bold' : 'text-neutral-500'}`}>
        <span className="truncate max-w-[100px]" title={match.away}>{match.away}</span>
        <span className="font-mono">{match.score_away.toFixed(1)}</span>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full space-y-8 pb-12 overflow-x-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Tournament Bracket</h1>
        <p className="text-neutral-400 max-w-3xl">
          The deterministic 32-team knockout stage. Built dynamically from the simulated Group Stage results, paired using official FIFA 2026 format rules, and simulated match-by-match using Expected Goals (xG).
        </p>
      </motion.div>

      {/* Bracket Container */}
      <div className="w-full overflow-x-auto pb-8">
        <div className="min-w-[1600px] h-[900px] bg-black/40 border-y border-neutral-800 p-8 flex justify-between relative mx-auto">
        
        {/* Left Side */}
        <div className="flex w-1/2 justify-between pr-4">
          {/* L: R32 */}
          <div className="flex flex-col justify-around h-full">
            {bracket.r32.slice(0, 8).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i)}</div>
            ))}
          </div>
          {/* L: R16 */}
          <div className="flex flex-col justify-around h-full">
            {bracket.r16.slice(0, 4).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i + 8)}</div>
            ))}
          </div>
          {/* L: QF */}
          <div className="flex flex-col justify-around h-full">
            {bracket.qf.slice(0, 2).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i + 12)}</div>
            ))}
          </div>
          {/* L: SF */}
          <div className="flex flex-col justify-around h-full">
            {bracket.sf.slice(0, 1).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i + 14)}</div>
            ))}
          </div>
        </div>

        {/* Center Final */}
        <div className="flex flex-col items-center justify-center z-10 w-64 text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.5, type: "spring" }}
            className="w-32 h-32 rounded-full border-4 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center flex-col shadow-[0_0_50px_rgba(16,185,129,0.2)]"
          >
            <span className="text-3xl">🏆</span>
          </motion.div>
          <div>
            <h3 className="text-emerald-400 font-bold tracking-widest uppercase">World Cup Final</h3>
            <div className="mt-4 flex justify-center">
              {renderMatch(bracket.final[0], 20)}
            </div>
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
              className="text-white text-xl mt-6 font-bold"
            >
              Champion: <span className="text-emerald-400">{bracket.champion}</span>
            </motion.p>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex w-1/2 justify-between pl-4 flex-row-reverse">
          {/* R: R32 */}
          <div className="flex flex-col justify-around h-full">
            {bracket.r32.slice(8, 16).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i + 16)}</div>
            ))}
          </div>
          {/* R: R16 */}
          <div className="flex flex-col justify-around h-full">
            {bracket.r16.slice(4, 8).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i + 24)}</div>
            ))}
          </div>
          {/* R: QF */}
          <div className="flex flex-col justify-around h-full">
            {bracket.qf.slice(2, 4).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i + 28)}</div>
            ))}
          </div>
          {/* R: SF */}
          <div className="flex flex-col justify-around h-full">
            {bracket.sf.slice(1, 2).map((m: any, i: number) => (
              <div key={m.id}>{renderMatch(m, i + 30)}</div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
