"use client";

import { useEffect, useState } from "react";
import { fetchAnalytics } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      const result = await fetchAnalytics();
      setData(result);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data || !mounted) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12 flex h-[50vh] items-center justify-center">
        <span className="text-neutral-500 font-mono animate-pulse">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Analytics & ML</h1>
        <p className="text-neutral-400">Deep dive into XGBoost model performance and historical backtesting.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Feature Importances</CardTitle>
              <CardDescription>XGBoost global feature weightings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                  <BarChart data={data.feature_importances} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#262626" />
                    <XAxis type="number" stroke="#525252" tick={{fill: '#a3a3a3'}} />
                    <YAxis 
                      dataKey="feature" 
                      type="category" 
                      stroke="#525252"
                      tick={{fill: '#e5e5e5', fontSize: 12}}
                    />
                    <Tooltip 
                      cursor={{fill: '#171717'}}
                      contentStyle={{backgroundColor: '#000', border: '1px solid #262626', borderRadius: '8px'}}
                      itemStyle={{color: '#8b5cf6'}}
                    />
                    <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Backtest</CardTitle>
              <CardDescription>Brier Score comparison against ELO Baseline.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={data.backtest_results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="year" stroke="#525252" tick={{fill: '#a3a3a3'}} />
                    <YAxis domain={[0.4, 0.7]} stroke="#525252" tick={{fill: '#a3a3a3'}} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#000', border: '1px solid #262626', borderRadius: '8px'}}
                    />
                    <Legend wrapperStyle={{fontSize: '12px', color: '#a3a3a3'}} />
                    <Line type="monotone" name="XGBoost" dataKey="xgb_brier" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} />
                    <Line type="monotone" name="ELO Baseline" dataKey="elo_brier" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4, fill: '#f43f5e'}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backtest Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="text-neutral-400">Tournament</TableHead>
                    <TableHead className="text-right text-emerald-400">XGB Acc</TableHead>
                    <TableHead className="text-right text-neutral-400">ELO Acc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.backtest_results.map((r: any) => (
                    <TableRow key={r.year} className="border-neutral-800 hover:bg-neutral-900/50">
                      <TableCell className="font-mono text-white">{r.year}</TableCell>
                      <TableCell className="text-right font-medium text-white">{(r.xgb_acc * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-neutral-400">{(r.elo_acc * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
