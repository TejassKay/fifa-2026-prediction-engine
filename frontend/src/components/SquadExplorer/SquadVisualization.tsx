"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SquadVisualizationProps {
  squadData: any;
  loading: boolean;
  selectedPlayer: any;
  onSelectPlayer: (player: any) => void;
}

export default function SquadVisualization({ squadData, loading, selectedPlayer, onSelectPlayer }: SquadVisualizationProps) {
  const [filter, setFilter] = useState("ALL");

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4">Loading squad data...</p>
      </div>
    );
  }

  if (!squadData) {
    return (
      <div className="flex-grow flex items-center justify-center text-gray-500 text-lg">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>Please select a team from the left panel.</p>
        </div>
      </div>
    );
  }

  const { players } = squadData;
  const filteredPlayers = filter === "ALL" ? players : players.filter((p: any) => p.position === filter);

  const positions = ["ALL", "GK", "DF", "MF", "FW"];

  const getPositionColor = (pos: string) => {
    switch (pos) {
      case "GK": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "DF": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "MF": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "FW": return "text-red-400 bg-red-400/10 border-red-400/20";
      default: return "text-gray-400 bg-gray-800 border-gray-700";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Squad Roster</h2>
        <div className="flex space-x-2 bg-[#1a1a1a] p-1 rounded-lg border border-gray-800">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setFilter(pos)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === pos
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={`${squadData.team}-${filter}`}
        >
          <AnimatePresence>
            {filteredPlayers.map((player: any) => {
              const isSelected = selectedPlayer?.name === player.name;
              const isDimmed = selectedPlayer && !isSelected;

              return (
                <motion.div
                  key={player.name}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectPlayer(player)}
                  className={`group flex items-center p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected 
                      ? "bg-indigo-900/40 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] z-10 scale-[1.02]" 
                      : "bg-[#161616] border-gray-800 hover:border-gray-600 hover:bg-[#1f1f1f]"
                  }`}
                  style={{ opacity: isDimmed ? 0.3 : 1 }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg border ${getPositionColor(player.position)} mr-4 flex-shrink-0 font-bold text-sm relative z-10`}>
                    {player.position}
                  </div>
                  <div className="flex-grow min-w-0 relative z-10 flex flex-col justify-center">
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-medium truncate transition-colors ${isSelected ? "text-white" : "text-gray-200 group-hover:text-white"}`}>
                        {player.name}
                      </h3>
                      {player.dob && (
                        <span className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded border border-gray-700 font-medium">
                          {(() => {
                            const parts = player.dob.split("/");
                            if (parts.length === 3) {
                              const dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                              const ageDate = new Date(Date.now() - dobDate.getTime());
                              return Math.abs(ageDate.getUTCFullYear() - 1970) + " YRS";
                            }
                            return "N/A";
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center mt-1">
                      {player.club && player.club !== "Unknown" && (
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.club.replace(/\([^)]*\)/g, '').trim())}&background=random&color=fff&rounded=true&bold=true&size=32`} 
                          alt={`${player.club} badge`}
                          className="w-4 h-4 rounded-full mr-1.5 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <p className={`text-xs truncate transition-colors ${isSelected ? "text-indigo-200" : "text-gray-500"}`}>
                        {player.club || "Unknown Club"}
                      </p>
                    </div>
                  </div>
                  <div className={`transition-colors relative z-10 ${isSelected ? "text-indigo-400" : "text-gray-600 group-hover:text-indigo-400"}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
        {filteredPlayers.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No players found for this position.
          </div>
        )}
      </div>
    </div>
  );
}
