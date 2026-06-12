"use client";

import { useEffect, useState } from "react";
import { getFlagUrl } from "@/lib/flags";
import { Flame, Medal, Target } from "lucide-react";

const PlayerAvatar = ({ name, team }: { name: string, team: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/players/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => {
        if (d && !d.error && d.image_url) {
          setImageUrl(d.image_url);
        }
      })
      .catch(console.error);
  }, [name]);

  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div className="relative shrink-0">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 border-2 border-white/10 flex items-center justify-center font-black text-lg shadow-xl relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover object-top" />
        ) : (
          <>
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
            <span className="relative z-10 text-white drop-shadow-md">{initials}</span>
          </>
        )}
      </div>
      <img src={getFlagUrl(team)} className="absolute -bottom-1 -right-1 w-6 h-4 object-cover rounded shadow border border-neutral-900" title={team} />
    </div>
  );
};

export default function GoldenBootPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/stats/golden-boot`)
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

  const { top_scorers, team_leaders, rising_players } = data || { top_scorers: [], team_leaders: [], rising_players: [] };

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-20">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="mb-12">
          <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs tracking-widest uppercase mb-2">
            <Medal className="w-4 h-4" /> Official Tracker
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
            Golden Boot Race
          </h1>
          <p className="text-neutral-400 text-lg font-medium mt-2">
            Live goal-scorer rankings and team scoring totals based on completed matches.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Top Scorers Leaderboard */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Target className="text-yellow-500" /> Leaderboard
            </h2>
            <div className="glass-panel p-6">
              {top_scorers.length > 0 ? (
                <div className="space-y-4">
                  {top_scorers.map((player: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`font-black text-xl w-8 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-neutral-500"}`}>
                          {i + 1}
                        </div>
                        <PlayerAvatar name={player.name} team={player.team} />
                        <div>
                          <div className="font-bold text-lg uppercase leading-none">{player.name}</div>
                          <div className="text-xs text-neutral-400 font-bold tracking-widest uppercase mt-1">{player.team}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-white">{player.goals}</span>
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Goals</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">No goals recorded yet.</p>
              )}
            </div>
          </div>

          {/* Side Panels */}
          <div className="space-y-8">
            {/* Rising Players */}
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 mb-4">
                <Flame className="text-rose-500" /> In Form
              </h2>
              <div className="glass-panel p-6 space-y-4">
                {rising_players.length > 0 ? (
                  rising_players.map((player: any, i: number) => (
                    <div key={i} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar name={player.name} team={player.team} />
                        <span className="font-bold text-sm uppercase">{player.name}</span>
                      </div>
                      <span className="text-rose-500 font-black text-xl">{player.goals}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500 text-sm">No data yet.</p>
                )}
              </div>
            </div>

            {/* Team Totals */}
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight mb-4">
                Team Totals
              </h2>
              <div className="glass-panel p-6 space-y-4">
                {team_leaders.length > 0 ? (
                  team_leaders.map((team: any, i: number) => (
                    <div key={i} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <img src={getFlagUrl(team.team)} className="w-6 h-4 object-cover rounded shadow" />
                        <span className="font-bold text-sm uppercase">{team.team}</span>
                      </div>
                      <span className="font-black text-emerald-400">{team.goals}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500 text-sm">No data yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
