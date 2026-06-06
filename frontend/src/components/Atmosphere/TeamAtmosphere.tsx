"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getTeamColorHex, getTeamSecondaryColorHex } from "@/lib/flags";

interface TeamAtmosphereProps {
  teamName: string;
}

export default function TeamAtmosphere({ teamName }: TeamAtmosphereProps) {
  const primaryColor = getTeamColorHex(teamName);
  const secondaryColor = getTeamSecondaryColorHex(teamName);

  return (
    <AnimatePresence>
      <motion.div
        key={`atmosphere-${teamName}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="fixed inset-0 z-[-3] pointer-events-none overflow-hidden bg-[#050505]"
      >
        {/* Core Lighting Setup - Stadium Tunnel / Ambient Fog Effect */}
        
        {/* Primary Lighting Spot (Top Right) */}
        <motion.div 
          className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-screen"
          animate={{ 
             scale: [1, 1.1, 1],
             x: [0, -40, 0],
             y: [0, 30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          style={{ 
            background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
            opacity: 0.15,
            filter: 'blur(80px)',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        />

        {/* Secondary Fill Light (Bottom Left) */}
        <motion.div 
          className="absolute bottom-[-20%] left-[-10%] w-[90vw] h-[90vw] rounded-full mix-blend-screen"
          animate={{ 
             scale: [1, 1.05, 1],
             x: [0, 50, 0],
             y: [0, -30, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{ 
            background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 60%)`,
            opacity: 0.1,
            filter: 'blur(90px)',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        />

        {/* Flowing Light Streak / Fabric Light */}
        <motion.div 
          className="absolute inset-[-50%] mix-blend-screen opacity-20"
          animate={{
             rotate: [0, 5, 0, -5, 0],
             scale: [1, 1.1, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          style={{
             background: `linear-gradient(45deg, transparent 35%, ${primaryColor} 45%, ${secondaryColor} 55%, transparent 65%)`,
             filter: 'blur(60px)',
             willChange: 'transform',
             transform: 'translateZ(0)'
          }}
        />
        
        {/* Cinematic Vignette to keep edges dark and text readable */}
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)] z-10" />
      </motion.div>
    </AnimatePresence>
  );
}
