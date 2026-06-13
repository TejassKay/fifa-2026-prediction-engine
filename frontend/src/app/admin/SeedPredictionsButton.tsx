'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';

export default function SeedPredictionsButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSeed = async () => {
    if (!confirm('This will seed the production database with predictions for all 72 Group Stage matches. Continue?')) return;
    
    setLoading(true);
    setStatus("Seeding predictions...");
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/seed-predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.message);
      } else {
        setStatus("Failed to seed predictions.");
      }
    } catch (e) {
      setStatus("Error seeding predictions.");
    }
    setLoading(false);
  };

  return (
    <div className="mt-4 p-4 border border-white/10 bg-neutral-900 rounded-lg flex items-center justify-between">
      <div>
        <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-1">Initialize Production Database</h3>
        <p className="text-neutral-500 text-xs">If this is a new deployment, click this once to generate predictions for all Group Stage matches so the Timeline and Accuracy Center function correctly.</p>
        {status && <p className="text-emerald-500 text-xs mt-2 font-bold">{status}</p>}
      </div>
      <Button 
        onClick={handleSeed} 
        disabled={loading}
        variant="outline"
        className="border-emerald-600 text-emerald-500 hover:bg-emerald-600 hover:text-white font-bold transition-all"
      >
        <Database className="w-4 h-4 mr-2" />
        {loading ? "Seeding..." : "Seed Predictions"}
      </Button>
    </div>
  );
}
