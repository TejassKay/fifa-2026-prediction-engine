"use client";

import { useState, useEffect } from "react";
import { fetchMatchPrediction, fetchChampions } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { getFlagGradientByName } from "@/lib/flags";

export default function PredictorPage() {
  const [homeTeam, setHomeTeam] = useState<string>("Spain");
  const [awayTeam, setAwayTeam] = useState<string>("France");
  const [teamList, setTeamList] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadTeams() {
      const champs = await fetchChampions();
      setTeamList(champs.map((c: any) => c.team));
    }
    loadTeams();
  }, []);

  useEffect(() => {
    async function loadPrediction() {
      setLoading(true);
      const data = await fetchMatchPrediction(homeTeam, awayTeam);
      setPrediction(data);
      setLoading(false);
    }
    if (homeTeam && awayTeam) {
      loadPrediction();
    }
  }, [homeTeam, awayTeam]);

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={`glow-left-${homeTeam}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.22 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className={`fixed top-0 -left-[10vw] bottom-0 w-[40vw] bg-gradient-to-r ${getFlagGradientByName(homeTeam)} blur-[120px] -z-10 pointer-events-none`}
        />
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          key={`glow-right-${awayTeam}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.22 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className={`fixed top-0 -right-[10vw] bottom-0 w-[40vw] bg-gradient-to-l ${getFlagGradientByName(awayTeam)} blur-[120px] -z-10 pointer-events-none`}
        />
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-8 pb-12 pt-8 relative z-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2 font-heading uppercase">Match Predictor</h1>
        <p className="text-neutral-400">Head-to-head probabilistic inference using XGBoost expected goals.</p>
      </div>

      <Card className="glass-panel overflow-hidden border-0">
        <CardContent className="p-8 pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Team A */}
            <div className="flex-1 w-full space-y-4">
              <label className="text-xs uppercase tracking-wider text-neutral-500 font-mono">Team A</label>
              <Select value={homeTeam} onValueChange={(val) => val && setHomeTeam(val)}>
                <SelectTrigger className="bg-black/50 border-white/10 h-14 text-xl font-heading uppercase tracking-wide rounded-xl">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-neutral-800 font-heading uppercase">
                  {teamList.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-center pt-2 h-20">
                {!loading && prediction && (
                  <>
                    <p className="text-4xl font-black text-white">{prediction.expected_goals.home.toFixed(2)}</p>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">Expected Goals</p>
                  </>
                )}
              </div>
            </div>

            <div className="text-2xl font-heading text-neutral-600 font-black mb-4 md:mb-0 uppercase tracking-widest bg-black/40 px-4 py-2 rounded-lg border border-white/5 shadow-inner">VS</div>

            {/* Team B */}
            <div className="flex-1 w-full space-y-4">
              <label className="text-xs uppercase tracking-wider text-neutral-500 font-mono">Team B</label>
              <Select value={awayTeam} onValueChange={(val) => val && setAwayTeam(val)}>
                <SelectTrigger className="bg-black/50 border-white/10 h-14 text-xl font-heading uppercase tracking-wide rounded-xl">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-neutral-800 font-heading uppercase">
                  {teamList.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-center pt-2 h-20">
                {!loading && prediction && (
                  <>
                    <p className="text-4xl font-black text-white">{prediction.expected_goals.away.toFixed(2)}</p>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-1">Expected Goals</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tug-of-war progress bar */}
          {!loading && prediction && mounted && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 mb-6 bg-black/40 p-6 rounded-2xl border border-white/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-rose-500/10 pointer-events-none" />
              
              <div className="flex justify-between items-end mb-3 px-1">
                <div className="text-left">
                  <span className="block text-emerald-400 font-black text-2xl">{(prediction.probabilities.home_win * 100).toFixed(1)}%</span>
                  <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Home Win</span>
                </div>
                <div className="text-center pb-1">
                  <span className="text-sm text-neutral-500 font-bold">DRAW {(prediction.probabilities.draw * 100).toFixed(1)}%</span>
                </div>
                <div className="text-right">
                  <span className="block text-rose-500 font-black text-2xl">{(prediction.probabilities.away_win * 100).toFixed(1)}%</span>
                  <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Away Win</span>
                </div>
              </div>

              {/* The Bar */}
              <div className="h-4 w-full bg-black rounded-full overflow-hidden flex shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.probabilities.home_win * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.probabilities.draw * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-neutral-600 border-x border-black/50"
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction.probabilities.away_win * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {loading || !prediction || !mounted ? (
        <Card className="glass-panel mt-8">
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-panel border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 pointer-events-none" />
          <CardHeader className="relative z-10 border-b border-white/5 bg-black/20">
            <CardTitle className="font-heading uppercase tracking-wide text-2xl">Most Likely Scorelines</CardTitle>
            <CardDescription className="text-neutral-400 font-medium">Top 5 exact match outcomes (90 minutes).</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 p-6">
            <div className="space-y-4">
              {prediction.top_scorelines.map((item: any, idx: number) => {
                const probPercent = item.prob * 100;
                const isTop = idx === 0;
                
                return (
                  <motion.div 
                    key={item.score}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-black text-lg ${isTop ? 'text-white' : 'text-neutral-300'}`}>
                        {item.score.replace('-', ' - ')}
                      </span>
                      <span className={`font-bold ${isTop ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-neutral-500'}`}>
                        {probPercent.toFixed(1)}%
                      </span>
                    </div>
                    
                    {/* Neon Pill Background */}
                    <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/5">
                      {/* Neon Pill Fill */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${probPercent * 3}%` }} // Multiply by 3 for visual scaling since probabilities are small
                        transition={{ duration: 1, delay: 0.2 + (idx * 0.1), type: "spring" }}
                        className={`h-full rounded-full ${
                          isTop 
                            ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse' 
                            : 'bg-indigo-500/50'
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
