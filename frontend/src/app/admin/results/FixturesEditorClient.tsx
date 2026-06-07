'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export default function FixturesEditorClient({ pendingMatches, completedMatches }: { pendingMatches: any[], completedMatches: any[] }) {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [homeScore, setHomeScore] = useState<number | ''>('');
  const [awayScore, setAwayScore] = useState<number | ''>('');
  
  type Winner = 'H' | 'D' | 'A';
  const [winner, setWinner] = useState<Winner>('D');
  
  const [scorers, setScorers] = useState<any[]>([]);
  const [squads, setSquads] = useState<{home: any[], away: any[]}>({home: [], away: []});
  const [searchTerm, setSearchTerm] = useState('');
  const [minute, setMinute] = useState<number | ''>('');
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSelectMatch = async (match: any) => {
    setSelectedMatch(match);
    setHomeScore(match.status === 'completed' && match.home_score !== null ? match.home_score : '');
    setAwayScore(match.status === 'completed' && match.away_score !== null ? match.away_score : '');
    setWinner(match.status === 'completed' ? match.winner : 'D');
    
    // Parse goal scorers if editing a completed match
    if (match.status === 'completed' && match.goal_scorers) {
      try {
        setScorers(typeof match.goal_scorers === 'string' ? JSON.parse(match.goal_scorers) : match.goal_scorers);
      } catch (e) {
        setScorers([]);
      }
    } else {
      setScorers([]);
    }
    setSearchTerm('');
    setMinute('');
    
    // Fetch squads
    setLoadingSquads(true);
    try {
      const [homeRes, awayRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/teams/${encodeURIComponent(match.team_a)}/squad`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/teams/${encodeURIComponent(match.team_b)}/squad`)
      ]);
      const homeData = await homeRes.json();
      const awayData = await awayRes.json();
      setSquads({ home: homeData.players || [], away: awayData.players || [] });
    } catch (e) {
      console.error("Failed to load squads", e);
    }
    setLoadingSquads(false);
  };

  const filteredPlayers = [...squads.home, ...squads.away].filter(p => 
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addScorer = (player: any) => {
    if (!minute) return alert('Enter minute first');
    const isHome = squads.home.find(p => p.name === player.name);
    const teamName = isHome ? selectedMatch.team_a : selectedMatch.team_b;
    setScorers([...scorers, { player_name: player.name, team: teamName, minute: parseInt(String(minute)) }]);
    setSearchTerm('');
    setMinute('');
  };

  const handleSave = async () => {
    if (homeScore === '' || awayScore === '') return alert('Enter scores');
    setSaving(true);
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/matches/record`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: selectedMatch.match_number.toString(),
          home_score: homeScore,
          away_score: awayScore,
          winner: winner,
          goal_scorers: scorers
        })
      });
      
      if (res.ok) {
        setSelectedMatch(null);
        router.refresh();
      } else {
        alert('Failed to save');
      }
    } catch (e) {
      alert('Error saving');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this result? This will undo bracket progression.')) return;
    setSaving(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/matches/${selectedMatch.match_number}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedMatch(null);
        router.refresh();
      } else {
        alert('Failed to delete');
      }
    } catch (e) {
      alert('Error deleting');
    }
    setSaving(false);
  };

  // Determine winner automatically based on score inputs
  const handleScoreChange = (type: 'home' | 'away', val: string) => {
    const num = val === '' ? '' : parseInt(val);
    if (type === 'home') {
      setHomeScore(num);
      if (num !== '' && awayScore !== '') {
        if (num > awayScore) setWinner('H');
        else if (num < awayScore) setWinner('A');
        else setWinner('D');
      }
    } else {
      setAwayScore(num);
      if (num !== '' && homeScore !== '') {
        if (homeScore > num) setWinner('H');
        else if (homeScore < num) setWinner('A');
        else setWinner('D');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Queue List */}
      <div>
        <div className="flex gap-4 mb-4 border-b border-neutral-800 pb-2">
          <button 
            className={`font-bold pb-2 ${activeTab === 'pending' ? 'text-white border-b-2 border-blue-500' : 'text-neutral-500'}`}
            onClick={() => { setActiveTab('pending'); setSelectedMatch(null); }}
          >
            Pending Fixtures
          </button>
          <button 
            className={`font-bold pb-2 ${activeTab === 'completed' ? 'text-white border-b-2 border-blue-500' : 'text-neutral-500'}`}
            onClick={() => { setActiveTab('completed'); setSelectedMatch(null); }}
          >
            Completed Matches
          </button>
        </div>
        
        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
          {activeTab === 'pending' ? (
            pendingMatches.map(m => (
              <Card 
                key={m.match_number} 
                className={`cursor-pointer transition-colors ${selectedMatch?.match_number === m.match_number ? 'bg-neutral-800 border-blue-500' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}
                onClick={() => handleSelectMatch(m)}
              >
                <CardContent className="p-4 flex justify-between items-center text-white">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">{m.stage} • {m.date}</div>
                    <div className="font-semibold">{m.team_a} vs {m.team_b}</div>
                  </div>
                  <div className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">Awaiting</div>
                </CardContent>
              </Card>
            ))
          ) : (
            completedMatches.map(m => (
              <Card 
                key={m.match_number} 
                className={`cursor-pointer transition-colors ${selectedMatch?.match_number === m.match_number ? 'bg-neutral-800 border-blue-500' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}
                onClick={() => handleSelectMatch(m)}
              >
                <CardContent className="p-4 flex justify-between items-center text-white">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">{m.stage} • {m.date}</div>
                    <div className="font-semibold">{m.team_a} {m.home_score} - {m.away_score} {m.team_b}</div>
                  </div>
                  <div className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">Completed</div>
                </CardContent>
              </Card>
            ))
          )}
          {activeTab === 'pending' && pendingMatches.length === 0 && <p className="text-neutral-500">No pending fixtures.</p>}
          {activeTab === 'completed' && completedMatches.length === 0 && <p className="text-neutral-500">No completed fixtures.</p>}
        </div>
      </div>

      {/* Editor */}
      {selectedMatch && (
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-2xl font-bold border-b border-neutral-800 pb-4">
              {selectedMatch.team_a} vs {selectedMatch.team_b}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 uppercase">{selectedMatch.team_a} Score</label>
                <Input type="number" value={homeScore} onChange={e => handleScoreChange('home', e.target.value)} className="bg-neutral-950 mt-1 border-neutral-800 text-lg" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 uppercase">{selectedMatch.team_b} Score</label>
                <Input type="number" value={awayScore} onChange={e => handleScoreChange('away', e.target.value)} className="bg-neutral-950 mt-1 border-neutral-800 text-lg" />
              </div>
            </div>
            
            {homeScore !== '' && homeScore === awayScore && selectedMatch.stage !== 'Group Stage' && (
              <div>
                <label className="text-xs text-neutral-400 uppercase block mb-2">Penalty Shootout Winner</label>
                <div className="flex gap-2">
                  <Button variant={winner === 'H' ? 'default' : 'outline'} className="flex-1 bg-neutral-800" onClick={() => setWinner('H')}>{selectedMatch.team_a}</Button>
                  <Button variant={winner === 'A' ? 'default' : 'outline'} className="flex-1 bg-neutral-800" onClick={() => setWinner('A')}>{selectedMatch.team_b}</Button>
                </div>
              </div>
            )}

            <div className="border-t border-neutral-800 pt-4">
              <h4 className="font-semibold mb-3">Goal Scorers</h4>
              <ul className="mb-4 space-y-2">
                {scorers.map((s, i) => (
                  <li key={i} className="text-sm bg-neutral-800 px-3 py-2 rounded flex justify-between">
                    <span>⚽ {s.player_name}</span>
                    <span className="text-neutral-400">{s.minute}'</span>
                  </li>
                ))}
              </ul>
              
              <div className="flex gap-2 mb-2">
                <Input placeholder="Minute..." type="number" value={minute} onChange={e => setMinute(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-24 bg-neutral-950 border-neutral-800" />
                <Input placeholder="Search player..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-neutral-950 border-neutral-800" />
              </div>
              
              {searchTerm && (
                <div className="bg-neutral-950 border border-neutral-800 rounded max-h-40 overflow-y-auto">
                  {filteredPlayers.slice(0, 5).map(p => (
                    <div key={p.name} className="px-3 py-2 hover:bg-neutral-800 cursor-pointer text-sm flex justify-between" onClick={() => addScorer(p)}>
                      <span>{p.name}</span>
                      <span className="text-neutral-500">{p.position}</span>
                    </div>
                  ))}
                  {filteredPlayers.length === 0 && <div className="p-3 text-sm text-neutral-500">No players found</div>}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving || loadingSquads}>
                {saving ? 'Saving...' : (activeTab === 'completed' ? 'Update Result' : 'Save Result')}
              </Button>
              {activeTab === 'completed' && (
                <Button onClick={handleDelete} variant="destructive" disabled={saving || loadingSquads}>
                  Delete Result
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
