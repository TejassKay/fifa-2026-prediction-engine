"use client";

import { useEffect, useState } from "react";
import { getFlagUrl } from "@/lib/flags";
import { Clock, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function TimelinePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/timeline`)
      .then(r => r.json())
      .then(d => {
        setEvents(d);
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

  if (events.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4">World Cup Timeline</h1>
        <p className="text-neutral-500">No events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-20">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs tracking-widest uppercase mb-2">
              <Clock className="w-4 h-4" /> Chronological Feed
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
              Tournament Timeline
            </h1>
          </div>
        </header>

        <div className="relative border-l-2 border-white/10 pl-6 md:pl-10 space-y-12">
          {events.map((ev, i) => {
            const getOddsImpact = (before: number, after: number) => {
              if (before === undefined || after === undefined) return null;
              const diff = after - before;
              const isPos = diff > 0.0005;
              const isNeg = diff < -0.0005;
              return (
                <div className={`flex items-center gap-1 text-[10px] font-black tracking-widest uppercase mt-1 ${isPos ? "text-emerald-400" : isNeg ? "text-rose-500" : "text-neutral-500"}`}>
                  {isPos ? <TrendingUp className="w-3 h-3" /> : isNeg ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {isPos ? "+" : ""}{(diff * 100).toFixed(1)}% CHAMP PROB
                </div>
              );
            };

            return (
            <div key={ev.match_id} className="relative">
              <div className="absolute -left-[35px] md:-left-[51px] top-1 w-6 h-6 rounded-full bg-neutral-900 border-4 border-indigo-500 z-10" />
              
              <div className="glass-panel p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border
                    ${ev.insight === "Massive Upset" ? "border-rose-500 text-rose-500 bg-rose-500/10" : 
                      ev.insight === "Perfect Prediction" ? "border-emerald-500 text-emerald-500 bg-emerald-500/10" :
                      ev.insight === "Correct Winner" ? "border-blue-500 text-blue-500 bg-blue-500/10" :
                      "border-neutral-500 text-neutral-500 bg-neutral-500/10"
                    }`}>
                    {ev.insight}
                  </span>
                </div>

                <div className="text-neutral-400 font-bold text-xs tracking-widest uppercase mb-4">
                  {ev.date} • {ev.stage}
                </div>

                <div className="flex items-center gap-6 mb-6">
                  <div className="flex flex-col items-center gap-2">
                    <img src={getFlagUrl(ev.team_a)} className="w-12 h-8 object-cover rounded shadow" />
                    <span className="font-bold text-sm uppercase">{ev.team_a}</span>
                    {getOddsImpact(ev.team_a_odds_before, ev.team_a_odds_after)}
                  </div>
                  <div className="text-4xl font-black">{ev.actual_home_score} - {ev.actual_away_score}</div>
                  <div className="flex flex-col items-center gap-2">
                    <img src={getFlagUrl(ev.team_b)} className="w-12 h-8 object-cover rounded shadow" />
                    <span className="font-bold text-sm uppercase">{ev.team_b}</span>
                    {getOddsImpact(ev.team_b_odds_before, ev.team_b_odds_after)}
                  </div>
                </div>

                {ev.insight !== "No Prediction Data" && (
                  <div className="bg-black/50 p-4 rounded border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm font-bold text-neutral-400">
                      Prediction: {ev.team_a} {ev.pred_home_score} - {ev.pred_away_score} {ev.team_b}
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1 text-xs font-bold uppercase">
                        {ev.winner_correct ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                        <span className={ev.winner_correct ? "text-emerald-500" : "text-rose-500"}>Winner</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold uppercase">
                        {ev.exact_score_correct ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                        <span className={ev.exact_score_correct ? "text-emerald-500" : "text-rose-500"}>Score</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
