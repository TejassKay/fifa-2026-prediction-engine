"use client";

import { useEffect, useState } from "react";
import { getFlagUrl, getFlagGradientByName } from "@/lib/flags";

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/schedule`)
      .then(r => r.json())
      .then(data => {
        setSchedule(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && schedule.length > 0) {
      // Find the first date with an upcoming match
      const upcomingMatch = schedule.find(m => m.status !== 'completed');
      if (upcomingMatch) {
        setTimeout(() => {
          const el = document.getElementById(`date-${upcomingMatch.date}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500); // Small delay ensures DOM is fully painted
      }
    }
  }, [loading, schedule]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Group by date
  const grouped = schedule.reduce((acc: any, match: any) => {
    const date = match.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(match);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans pb-20">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase mb-4">
            Full Schedule
          </h1>
          <a href="/fixtures" className="text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-sm font-bold flex items-center gap-2">
            ← Back to Upcoming
          </a>
        </header>

        {dates.map(date => (
          <div key={date} id={`date-${date}`} className="space-y-4 pt-4 scroll-mt-20">
            <h2 className="text-2xl font-black text-emerald-500 uppercase tracking-widest border-b border-white/10 pb-2">
              {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {grouped[date].map((match: any) => (
                <div key={match.match_number} className="group relative glass-panel p-4 overflow-hidden transition-colors bg-neutral-900 border border-neutral-800 hover:border-neutral-600">
                  
                  {/* Gradients Bleeding on Hover */}
                  <div className={`absolute inset-y-0 left-0 w-48 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[60px] pointer-events-none ${getFlagGradientByName(match.team_a)}`} />
                  <div className={`absolute inset-y-0 right-0 w-48 bg-gradient-to-l opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[60px] pointer-events-none ${getFlagGradientByName(match.team_b)}`} />

                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Match {match.match_number} • {match.stage}</span>
                      <span className="text-xs text-neutral-400 font-bold">{match.time_local}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col items-center gap-2 w-1/3">
                        <img src={getFlagUrl(match.team_a)} className="w-12 h-8 object-cover rounded shadow" alt={match.team_a} />
                        <span className="text-base font-bold uppercase text-center">{match.team_a}</span>
                        {match.status === 'completed' && match.goal_scorers && (
                          <div className="text-[10px] text-neutral-400 text-center mt-1 space-y-1">
                            {match.goal_scorers.filter((s:any) => s.team === match.team_a).map((s:any, i:number) => (
                              <div key={i}>{s.player_name} {s.minute ? `(${s.minute}')` : ''}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="w-1/3 flex justify-center items-center">
                        {match.status === 'completed' ? (
                          <div className="text-4xl font-black">{match.home_score} - {match.away_score}</div>
                        ) : (
                          <div className="text-neutral-600 font-bold">vs</div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 w-1/3">
                        <img src={getFlagUrl(match.team_b)} className="w-12 h-8 object-cover rounded shadow" alt={match.team_b} />
                        <span className="text-base font-bold uppercase text-center">{match.team_b}</span>
                        {match.status === 'completed' && match.goal_scorers && (
                          <div className="text-[10px] text-neutral-400 text-center mt-1 space-y-1">
                            {match.goal_scorers.filter((s:any) => s.team === match.team_b).map((s:any, i:number) => (
                              <div key={i}>{s.player_name} {s.minute ? `(${s.minute}')` : ''}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-white/5 text-center text-xs text-neutral-500 font-bold uppercase tracking-widest">
                      {match.venue}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
