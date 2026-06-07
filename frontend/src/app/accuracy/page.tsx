"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Target, TrendingUp, AlertTriangle, Zap, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

export default function AccuracyCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/accuracy/model`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (data?.message) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">Accuracy Center</h1>
        <p className="text-neutral-500">{data.message}</p>
      </div>
    );
  }

  const {
    matches_evaluated,
    winner_accuracy,
    exact_score_accuracy,
    brier_score,
    log_loss,
    best_prediction,
    worst_prediction,
    biggest_upset,
    most_surprising_result,
    largest_odds_swing
  } = data;

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs tracking-widest uppercase mb-2">
              <Activity className="w-4 h-4" /> Model Performance
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
              Accuracy Center
            </h1>
            <p className="text-neutral-400 text-lg font-medium mt-2">
              Live evaluation of the prediction engine across {matches_evaluated} completed matches.
            </p>
          </div>
        </header>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 border-t-4 border-emerald-500">
            <div className="text-neutral-400 font-bold text-xs uppercase tracking-widest mb-2">Winner Accuracy</div>
            <div className="text-4xl font-black text-white">{(winner_accuracy * 100).toFixed(1)}%</div>
          </div>
          <div className="glass-panel p-6 border-t-4 border-blue-500">
            <div className="text-neutral-400 font-bold text-xs uppercase tracking-widest mb-2">Exact Score</div>
            <div className="text-4xl font-black text-white">{(exact_score_accuracy * 100).toFixed(1)}%</div>
          </div>
          <div className="glass-panel p-6 border-t-4 border-purple-500">
            <div className="text-neutral-400 font-bold text-xs uppercase tracking-widest mb-2">Brier Score</div>
            <div className="text-4xl font-black text-white">{brier_score.toFixed(3)}</div>
            <div className="text-[10px] text-neutral-500 mt-1 uppercase">Lower is better</div>
          </div>
          <div className="glass-panel p-6 border-t-4 border-rose-500">
            <div className="text-neutral-400 font-bold text-xs uppercase tracking-widest mb-2">Log Loss</div>
            <div className="text-4xl font-black text-white">{log_loss.toFixed(3)}</div>
            <div className="text-[10px] text-neutral-500 mt-1 uppercase">Lower is better</div>
          </div>
        </div>

        {/* AI Insights */}
        <h2 className="text-2xl font-black uppercase tracking-tight mt-12 mb-4">AI Model Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {biggest_upset && (
            <div className="glass-panel p-6 border border-rose-500/30 bg-rose-500/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertTriangle className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-rose-500 font-bold uppercase tracking-widest text-xs mb-4">Biggest Upset</h3>
                <div className="text-xl font-black uppercase text-white mb-2">{biggest_upset.match}</div>
                <div className="text-sm text-neutral-300">
                  Underdog won despite having only a <span className="text-rose-500 font-bold">{(biggest_upset.prob_assigned * 100).toFixed(1)}%</span> pre-match win probability.
                </div>
              </div>
            </div>
          )}

          {best_prediction && (
            <div className="glass-panel p-6 border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Target className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4">Best Prediction</h3>
                <div className="text-xl font-black uppercase text-white mb-2">{best_prediction.match}</div>
                <div className="text-sm text-neutral-300">
                  Assigned <span className="text-emerald-400 font-bold">{(best_prediction.prob_assigned * 100).toFixed(1)}%</span> probability to the actual outcome.
                </div>
              </div>
            </div>
          )}

          {largest_odds_swing && (
            <div className="glass-panel p-6 border border-purple-500/30 bg-purple-500/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ArrowRightLeft className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-4">Largest Odds Swing</h3>
                <div className="text-xl font-black uppercase text-white mb-2">{largest_odds_swing.team}</div>
                <div className="text-sm text-neutral-300">
                  Their championship probability swung by <span className="text-purple-400 font-bold">{(largest_odds_swing.swing * 100).toFixed(1)}%</span> after {largest_odds_swing.match}.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accuracy Timeline */}
        <div className="mt-12">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Historical Trend</h2>
          <div className="glass-panel p-6">
            <div className="flex flex-col gap-2">
              {data.timeline && data.timeline.slice().reverse().map((t: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 hover:bg-white/5 rounded transition-colors border-b border-white/5 last:border-0">
                  <span className="font-bold">{t.match}</span>
                  <div className="flex items-center gap-6 text-sm">
                    <span className={t.is_winner_correct ? "text-emerald-400" : "text-rose-500"}>
                      {t.is_winner_correct ? "Correct" : "Incorrect"} Call
                    </span>
                    <span className="text-neutral-400">
                      Cum. Accuracy: <span className="text-white font-bold">{(t.cumulative_accuracy * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
