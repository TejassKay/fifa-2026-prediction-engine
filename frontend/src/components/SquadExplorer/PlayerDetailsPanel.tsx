"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { getFlagGradient } from "@/lib/flags";

interface PlayerDetailsPanelProps {
  player: any;
  countryCode: string;
}

export default function PlayerDetailsPanel({ player, countryCode }: PlayerDetailsPanelProps) {
  const [intel, setIntel] = useState<any>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  useEffect(() => {
    if (player?.name) {
      setLoadingIntel(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/players/${encodeURIComponent(player.name)}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setIntel(data);
          } else {
            setIntel(null);
          }
          setLoadingIntel(false);
        })
        .catch(err => {
          console.error(err);
          setIntel(null);
          setLoadingIntel(false);
        });
    }
  }, [player?.name]);
  if (!player) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-500 h-full text-center">
        <div>
          <svg className="mx-auto h-12 w-12 text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm font-medium">Select a player to view details</p>
        </div>
      </div>
    );
  }

  // Calculate age from DOB (DD/MM/YYYY format expected)
  const calculateAge = (dobString: string) => {
    if (!dobString) return "N/A";
    const parts = dobString.split("/");
    if (parts.length === 3) {
      const dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const diffMs = Date.now() - dobDate.getTime();
      const ageDt = new Date(diffMs);
      return Math.abs(ageDt.getUTCFullYear() - 1970);
    }
    return "N/A";
  };

  const getPosBorderColor = (pos: string) => {
    switch (pos) {
      case "GK": return "border-yellow-500";
      case "DF": return "border-blue-500";
      case "MF": return "border-green-500";
      case "FW": return "border-red-500";
      default: return "border-gray-500";
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={player.name}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2"
      >
        {/* Top Section: Cinematic Player Showcase */}
        <div className={`relative h-48 rounded-xl bg-gradient-to-br ${getFlagGradient(countryCode)} mb-6 flex items-end overflow-hidden shadow-lg border-2 ${getPosBorderColor(player.position)}`}>
          {intel?.image_url ? (
            <div className="absolute right-0 bottom-0 pointer-events-none h-full">
              <img src={intel.image_url} alt={player.name} className="h-full w-auto object-cover object-top opacity-100 drop-shadow-2xl mix-blend-luminosity" style={{ maskImage: 'linear-gradient(to top, transparent, black 20%)' }} />
            </div>
          ) : (
            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
          <div className="p-4 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent relative z-10 pt-16">
            <span className="inline-block px-2 py-1 bg-white text-black rounded text-xs font-bold tracking-wider mb-1">
              {player.position}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tight truncate w-full" title={player.name}>{player.name}</h2>
          </div>
        </div>

        {/* Middle Section: Core Stats */}
        <div className="space-y-4 mb-8">
          <div className="bg-[#161616] border border-gray-800 rounded-lg p-4 shadow min-w-0">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Club</h3>
            <p className="font-semibold text-gray-200 text-lg flex items-center min-w-0">
              <span className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mr-2 text-xs shrink-0">⚽</span>
              <span className="truncate" title={player.club}>{player.club}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#161616] border border-gray-800 rounded-lg p-4 shadow">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Age / DOB</h3>
              <div className="flex items-end justify-between">
                <span className="font-bold text-white text-2xl">{calculateAge(player.dob)}</span>
                <span className="text-xs text-gray-500 mb-1">{player.dob}</span>
              </div>
            </div>
            
            <div className="bg-[#161616] border border-gray-800 rounded-lg p-4 shadow">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Height</h3>
              <div className="flex items-end justify-between">
                <span className="font-bold text-white text-2xl">{player.height ? player.height : '--'}</span>
                <span className="text-xs text-gray-500 mb-1">cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Future Metrics (EA FC Style) */}
        <div className="mt-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            Advanced Metrics
          </h3>
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 shadow-inner">
            {loadingIntel ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500 font-semibold">CAPS</span>
                    <span className="font-bold text-sm text-gray-300">{intel?.international_caps || '--'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((intel?.international_caps || 0) / 100 * 100, 100)}%` }}
                      className="h-full bg-blue-500" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500 font-semibold">GOALS</span>
                    <span className="font-bold text-sm text-gray-300">{intel?.international_goals || '--'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((intel?.international_goals || 0) / 50 * 100, 100)}%` }}
                      className="h-full bg-green-500" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500 font-semibold">M. VALUE</span>
                    <span className="font-bold text-sm text-gray-300">{intel?.market_value ? `€${(intel.market_value/1000000).toFixed(1)}M` : '--'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((intel?.market_value || 0) / 100000000 * 100, 100)}%` }}
                      className="h-full bg-yellow-500" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-gray-500 font-semibold">IMPACT SCORE</span>
                    <span className="font-bold text-sm text-indigo-400">{intel?.form_score ? intel.form_score.toFixed(1) : '--'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${intel?.form_score || 0}%` }}
                      className="h-full bg-indigo-500" 
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
