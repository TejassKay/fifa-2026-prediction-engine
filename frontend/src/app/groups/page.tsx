"use client";

import { useEffect, useState } from "react";
import { fetchGroups } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchGroups();
      setGroups(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-12 flex h-[50vh] items-center justify-center">
        <span className="text-neutral-500 font-mono animate-pulse">Assigning 48 teams to groups...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Group Stage View</h1>
        <p className="text-neutral-400 max-w-3xl">
          Tournament schedule mapped to our XGBoost Monte Carlo simulation. Displays ELO rating and the probability of advancing to the Round of 32 for all 48 teams across 12 groups.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((g, index) => (
          <motion.div 
            key={g.group} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-black border-neutral-800 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center text-xl">
                  <span>Group {g.group}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-800 hover:bg-transparent">
                      <TableHead className="w-[120px] text-neutral-400">Team</TableHead>
                      <TableHead className="text-right text-neutral-400">ELO</TableHead>
                      <TableHead className="text-right text-emerald-400">Advance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.teams.map((t: any) => (
                      <TableRow key={t.team} className="border-neutral-800 hover:bg-neutral-900/50 transition-colors">
                        <TableCell className="font-medium text-white truncate max-w-[120px]" title={t.team}>
                          {t.team}
                        </TableCell>
                        <TableCell className="text-right text-neutral-400 font-mono">{Math.round(t.elo)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-emerald-400 text-sm">{(t.prob * 100).toFixed(1)}%</span>
                            <Progress value={t.prob * 100} className="h-1 w-16 bg-neutral-800" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
