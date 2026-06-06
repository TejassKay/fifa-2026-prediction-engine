"use client";

import { motion } from "framer-motion";

export default function Logo({ isCollapsed = false }: { isCollapsed?: boolean }) {
  if (isCollapsed) {
    return (
      <motion.div 
        key="mini-logo"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.2 }}
        className="absolute left-1/2 -translate-x-1/2 font-black text-2xl bg-gradient-to-br from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tighter"
      >
        HUB
      </motion.div>
    );
  }

  return (
    <motion.div 
      key="full-logo"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="absolute left-6 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M2 12h20"></path>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight leading-tight whitespace-nowrap">
          Fifa WC 26 Hub
        </h1>
        <p className="text-[10px] text-indigo-300 mt-0.5 font-mono uppercase tracking-[0.2em] whitespace-nowrap">Global Prediction Engine</p>
      </div>
    </motion.div>
  );
}
