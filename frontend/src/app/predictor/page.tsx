"use client";

import { useState, useEffect } from "react";
import { fetchMatchPrediction, fetchChampions } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ['#10b981', '#737373', '#f43f5e'];

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

  const pieData = prediction ? [
    { name: `${homeTeam} Win`, value: prediction.probabilities.home_win },
    { name: 'Draw', value: prediction.probabilities.draw },
    { name: `${awayTeam} Win`, value: prediction.probabilities.away_win },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Match Predictor</h1>
        <p className="text-neutral-400">Head-to-head probabilistic inference using XGBoost expected goals.</p>
      </div>

      <Card className="bg-black border-neutral-800">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 w-full space-y-4">
              <label className="text-xs uppercase tracking-wider text-neutral-500 font-mono">Team A</label>
              <Select value={homeTeam} onValueChange={(val) => val && setHomeTeam(val)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-800 h-12 text-lg">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-black border-neutral-800">
                  {teamList.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-center pt-2 h-20">
                {!loading && prediction && (
                  <>
                    <p className="text-3xl font-light text-white">{prediction.expected_goals.home.toFixed(2)}</p>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-mono mt-1">Expected Goals (xG)</p>
                  </>
                )}
              </div>
            </div>

            <div className="text-xl font-mono text-neutral-600 font-bold mb-4 md:mb-0">VS</div>

            <div className="flex-1 w-full space-y-4">
              <label className="text-xs uppercase tracking-wider text-neutral-500 font-mono">Team B</label>
              <Select value={awayTeam} onValueChange={(val) => val && setAwayTeam(val)}>
                <SelectTrigger className="bg-neutral-900 border-neutral-800 h-12 text-lg">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-black border-neutral-800">
                  {teamList.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-center pt-2 h-20">
                {!loading && prediction && (
                  <>
                    <p className="text-3xl font-light text-white">{prediction.expected_goals.away.toFixed(2)}</p>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-mono mt-1">Expected Goals (xG)</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading || !prediction || !mounted ? (
        <div className="h-[250px] flex items-center justify-center">
          <span className="text-neutral-500 font-mono animate-pulse">Running Poisson match simulation...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-black border-neutral-800">
            <CardHeader>
              <CardTitle>Outcome Probability</CardTitle>
              <CardDescription>Based on Poisson distribution of xG.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{backgroundColor: '#000', border: '1px solid #262626', borderRadius: '8px'}}
                      itemStyle={{color: '#fff'}}
                      formatter={(val: any) => [`${(val * 100).toFixed(1)}%`, 'Probability']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}} />
                    <span className="text-sm text-neutral-400">{d.name} ({(d.value*100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-neutral-800">
            <CardHeader>
              <CardTitle>Most Likely Scorelines</CardTitle>
              <CardDescription>Top 5 exact match outcomes (90 minutes).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={prediction.top_scorelines} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="score" stroke="#525252" tick={{fill: '#e5e5e5', fontSize: 16, fontWeight: 'bold'}} />
                    <YAxis 
                      stroke="#525252"
                      tick={{fill: '#a3a3a3'}}
                      tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                    />
                    <Tooltip 
                      cursor={{fill: '#171717'}}
                      contentStyle={{backgroundColor: '#000', border: '1px solid #262626', borderRadius: '8px'}}
                      formatter={(val: any) => [`${(val * 100).toFixed(1)}%`, 'Probability']}
                    />
                    <Bar dataKey="prob" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
