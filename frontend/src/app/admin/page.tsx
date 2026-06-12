import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock } from 'lucide-react';
import SimulatorButton from './SimulatorButton';

export default async function AdminDashboard() {
  // We can fetch accuracy and db status here
  let accuracyData = null;
  let error = null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/accuracy/model`, {
      cache: 'no-store'
    });
    accuracyData = await res.json();
  } catch (err) {
    error = 'Failed to load accuracy data.';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Winner Accuracy</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyData?.winner_accuracy !== undefined 
                ? `${(accuracyData.winner_accuracy * 100).toFixed(1)}%` 
                : '--'}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Matches evaluated: {accuracyData?.matches_evaluated || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Log Loss</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyData?.log_loss !== undefined ? accuracyData.log_loss.toFixed(4) : '--'}
            </div>
            <p className="text-xs text-neutral-500 mt-1">Lower is better</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">System Status</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">Healthy</div>
            <p className="text-xs text-neutral-500 mt-1">Monte Carlo Simulator Standing By</p>
          </CardContent>
        </Card>
      </div>

      <SimulatorButton />
    </div>
  );
}
