"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamIdentityCardProps {
  teamName: string;
}

export default function TeamIdentityCard({ teamName }: TeamIdentityCardProps) {
  const [identity, setIdentity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamName) return;
    setLoading(true);
    fetch(`http://localhost:8000/api/team-identity/${teamName}`)
      .then(res => res.json())
      .then(data => {
        setIdentity(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching team identity:", err);
        setLoading(false);
      });
  }, [teamName]);

  if (loading || !identity) {
    return (
      <div className="bg-[#111] border border-gray-800 rounded-xl p-5 shadow-xl h-full flex flex-col justify-between min-h-[220px]">
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <motion.div 
      id={`team-identity-${teamName}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111] border border-gray-800 rounded-xl p-5 shadow-xl h-full flex flex-col justify-between relative overflow-hidden group min-h-[220px]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
      
      <div className="relative z-10">
        <div className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-1 flex justify-between items-center">
          Team Identity
        </div>
        <h3 className="text-2xl font-black text-white uppercase mb-4 drop-shadow-md">{identity.nickname}</h3>
        
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Most Important Player</div>
            <div className="text-sm font-bold text-gray-200">{identity.most_important_player}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Breakout Candidate</div>
            <div className="text-sm font-bold text-emerald-400">{identity.breakout_player}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-end relative z-10">
        <div>
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Expected Finish</div>
          <div className="text-sm font-black text-white uppercase drop-shadow-sm">{identity.expected_finish}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Biggest Threat</div>
          <div className="text-sm font-bold text-red-400 uppercase drop-shadow-sm">{identity.biggest_threat}</div>
        </div>
      </div>
    </motion.div>
  );
}
