"use client";

import React from "react";
import { motion } from "framer-motion";

interface FormationViewProps {
  squadData: any;
  loading: boolean;
}

export default function FormationView({ squadData, loading }: FormationViewProps) {
  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!squadData) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-gray-500 h-full text-center relative p-6">
        <div className="absolute inset-0 border-2 border-dashed border-gray-800 rounded-xl pointer-events-none opacity-50"></div>
        <svg className="w-16 h-16 mb-4 text-gray-700 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm font-semibold tracking-wide">NO SQUAD SELECTED</p>
        <p className="text-xs text-gray-600 mt-2 max-w-[200px]">Search for a nation to analyze their formation and squad depth.</p>
      </div>
    );
  }

  const { players } = squadData;

  const positions = {
    GK: players.filter((p: any) => p.position === "GK").length,
    DF: players.filter((p: any) => p.position === "DF").length,
    MF: players.filter((p: any) => p.position === "MF").length,
    FW: players.filter((p: any) => p.position === "FW").length,
  };

  // Node component for the pitch
  const Node = ({ pos, count, top, left, color }: any) => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className={`absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2`}
      style={{ top, left }}
    >
      <div className={`w-8 h-8 rounded-full border-2 bg-[#1a1a1a] shadow-lg flex items-center justify-center text-xs font-bold ${color}`}>
        {count}
      </div>
      <span className="text-[10px] font-bold text-white/70 mt-1 uppercase tracking-wider">{pos}</span>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex justify-between items-center">
        <span>Squad Depth</span>
        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">4-3-3 (Est.)</span>
      </h3>
      
      {/* Realistic CSS Pitch */}
      <div className="flex-grow w-full bg-[#183620] rounded-xl border-4 border-[#255230] relative overflow-hidden shadow-inner flex flex-col justify-between">
        {/* Pitch patterns (stripes) */}
        <div className="absolute inset-0 flex flex-col opacity-20">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-[#255230]' : 'bg-transparent'}`}></div>
          ))}
        </div>

        {/* Pitch Lines */}
        <div className="absolute inset-2 border-2 border-white/40 pointer-events-none"></div>
        {/* Halfway Line */}
        <div className="absolute top-1/2 w-full h-[2px] bg-white/40 -translate-y-1/2 pointer-events-none"></div>
        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border-2 border-white/40 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        {/* Center Spot */}
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-white/60 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        {/* Top Penalty Area */}
        <div className="absolute top-2 left-1/2 w-1/2 h-16 border-b-2 border-l-2 border-r-2 border-white/40 -translate-x-1/2 pointer-events-none"></div>
        {/* Top Goal Area */}
        <div className="absolute top-2 left-1/2 w-1/4 h-6 border-b-2 border-l-2 border-r-2 border-white/40 -translate-x-1/2 pointer-events-none"></div>
        {/* Top Penalty Arc */}
        <div className="absolute top-18 left-1/2 w-10 h-6 border-b-2 border-white/40 rounded-b-full -translate-x-1/2 pointer-events-none opacity-60"></div>
        
        {/* Bottom Penalty Area */}
        <div className="absolute bottom-2 left-1/2 w-1/2 h-16 border-t-2 border-l-2 border-r-2 border-white/40 -translate-x-1/2 pointer-events-none"></div>
        {/* Bottom Goal Area */}
        <div className="absolute bottom-2 left-1/2 w-1/4 h-6 border-t-2 border-l-2 border-r-2 border-white/40 -translate-x-1/2 pointer-events-none"></div>
        {/* Bottom Penalty Arc */}
        <div className="absolute bottom-18 left-1/2 w-10 h-6 border-t-2 border-white/40 rounded-t-full -translate-x-1/2 pointer-events-none opacity-60"></div>

        {/* Player Nodes */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <Node pos="FW" count={positions.FW} top="15%" left="50%" color="border-red-500 text-red-400" />
          <Node pos="MF" count={positions.MF} top="40%" left="50%" color="border-green-500 text-green-400" />
          <Node pos="DF" count={positions.DF} top="75%" left="50%" color="border-blue-500 text-blue-400" />
          <Node pos="GK" count={positions.GK} top="92%" left="50%" color="border-yellow-500 text-yellow-400" />
        </div>
      </div>
    </div>
  );
}
