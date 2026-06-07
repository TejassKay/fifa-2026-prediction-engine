import FixturesEditorClient from './FixturesEditorClient';

export default async function AdminResultsPage() {
  let pendingMatches = [];
  let completedMatches = [];
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/fixtures/pending`, {
      cache: 'no-store'
    });
    pendingMatches = await res.json();
    
    const resCompleted = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/fixtures/completed`, {
      cache: 'no-store'
    });
    completedMatches = await resCompleted.json();
  } catch (e) {
    console.error("Failed to fetch fixtures", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Result Entry</h2>
        <p className="text-neutral-500">Select a pending fixture to enter the score, or a completed fixture to edit/delete it.</p>
      </div>
      
      <FixturesEditorClient pendingMatches={pendingMatches} completedMatches={completedMatches} />
    </div>
  );
}
