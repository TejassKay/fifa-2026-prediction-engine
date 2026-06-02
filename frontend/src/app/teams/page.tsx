"use client";

import { useState, useEffect } from "react";
import { fetchTeamStats, fetchChampions } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Bar, BarChart, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function TeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>("Argentina");
  const [teamList, setTeamList] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
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
    async function loadStats() {
      setLoading(true);
      const data = await fetchTeamStats(selectedTeam);
      setStats(data);
      setLoading(false);
    }
    if (selectedTeam) {
      loadStats();
    }
  }, [selectedTeam]);

  const teamData = stats?.progression;
  const stageData = teamData ? [
    { stage: 'Round of 32', prob: teamData.round_of_32_probability },
    { stage: 'Round of 16', prob: teamData.round_of_16_probability },
    { stage: 'Quarter Finals', prob: teamData.quarter_final_probability },
    { stage: 'Semi Finals', prob: teamData.semi_final_probability },
    { stage: 'Final', prob: teamData.final_probability },
    { stage: 'Champion', prob: teamData.champion_probability },
  ] : [];

  const radarData = stats ? [
    { subject: 'ELO', A: stats.elo_rating / 2200 * 100, fullMark: 100 },
    { subject: 'Offense', A: parseFloat(stats.recent_form.goals_scored_L5) / 3 * 100, fullMark: 100 },
    { subject: 'Defense', A: (1 - parseFloat(stats.recent_form.goals_conceded_L5) / 2) * 100, fullMark: 100 },
    { subject: 'Form (Win %)', A: parseFloat(stats.recent_form.win_rate_L10) * 100, fullMark: 100 },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Team Explorer</h1>
          <p className="text-neutral-400">Deep dive into probabilistic forecasts for any qualified nation.</p>
        </div>
        <div className="w-64">
          <Select value={selectedTeam} onValueChange={(val) => val && setSelectedTeam(val)}>
            <SelectTrigger className="bg-black border-neutral-800">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent className="bg-black border-neutral-800">
              {teamList.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading || !stats || !mounted ? (
        <div className="h-[400px] flex items-center justify-center">
          <span className="text-neutral-500 font-mono animate-pulse">Loading {selectedTeam} profile...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black border-neutral-800 md:col-span-1">
            <CardHeader>
              <CardTitle>{selectedTeam} Profile</CardTitle>
              <CardDescription>Pre-tournament features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">ELO Rating</span>
                  <span className="font-mono text-white">{Math.round(stats.elo_rating)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">FIFA Ranking</span>
                  <span className="font-mono text-white">#{stats.fifa_ranking}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Recent Goals (L5)</span>
                  <span className="font-mono text-white">{stats.recent_form.goals_scored_L5}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Win Rate (L10)</span>
                  <span className="font-mono text-emerald-400">{(parseFloat(stats.recent_form.win_rate_L10) * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="h-[250px] w-full -ml-4">
                <ResponsiveContainer width="99%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#262626" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: '#a3a3a3', fontSize: 12}} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Stats" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-neutral-800 md:col-span-2">
            <CardHeader>
              <CardTitle>Tournament Progression</CardTitle>
              <CardDescription>Probability of {selectedTeam} reaching each stage of the knockout bracket.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={stageData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="stage" stroke="#525252" tick={{fill: '#a3a3a3'}} />
                    <YAxis 
                      domain={[0, 1]} 
                      tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                      stroke="#525252"
                      tick={{fill: '#a3a3a3'}}
                    />
                    <Tooltip 
                      cursor={{fill: '#171717'}}
                      contentStyle={{backgroundColor: '#000', border: '1px solid #262626', borderRadius: '8px'}}
                      itemStyle={{color: '#38bdf8'}}
                      formatter={(val: any) => [`${(val * 100).toFixed(1)}%`, 'Probability']}
                    />
                    <Bar 
                      dataKey="prob" 
                      fill="#38bdf8" 
                      radius={[4, 4, 0, 0]} 
                      animationBegin={0}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
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
