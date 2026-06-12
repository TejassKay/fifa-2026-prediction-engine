'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

export default function SimulatorButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleTrigger = async () => {
    setLoading(true);
    setStatus("Simulation running... this may take 30-60 seconds.");
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] || '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/trigger-simulation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setStatus("Simulation completed successfully! Dashboards are updated.");
        // optionally reload the page to refresh data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setStatus("Failed to run simulation.");
      }
    } catch (e) {
      setStatus("Error triggering simulation.");
    }
    setLoading(false);
  };

  return (
    <div className="mt-6 p-4 border border-white/10 bg-neutral-900 rounded-lg flex items-center justify-between">
      <div>
        <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-1">Manual Override</h3>
        <p className="text-neutral-500 text-xs">Force the Monte Carlo Simulator to run 10,000 iterations right now and overwrite the Dashboard Probabilities.</p>
        {status && <p className="text-emerald-500 text-xs mt-2 font-bold">{status}</p>}
      </div>
      <Button 
        onClick={handleTrigger} 
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
      >
        <Play className="w-4 h-4 mr-2" />
        {loading ? "Running..." : "Trigger Simulator"}
      </Button>
    </div>
  );
}
