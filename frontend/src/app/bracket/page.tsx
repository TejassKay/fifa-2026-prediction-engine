"use client";

import { useEffect, useState, useRef } from "react";
import { fetchBracket } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { getFlagUrl } from "@/lib/flags";

export default function BracketPage() {
  const [bracket, setBracket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchBracket();
        setBracket(data);
      } catch (err) {
        console.error("Failed to load bracket", err);
        setBracket(null);
      } finally {
        setLoading(false);
        // Center scroll horizontally initially
        setTimeout(() => {
          if (containerRef.current) {
            const scrollTarget = (2600 - window.innerWidth) / 2;
            containerRef.current.scrollTo({ left: scrollTarget > 0 ? scrollTarget : 0, behavior: "smooth" });
          }
        }, 100);
      }
    }
    load();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll-fast
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  if (loading) {
    return (
      <div className="w-full space-y-8 pb-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <Skeleton className="h-10 w-1/3 mb-4" />
          <Skeleton className="h-6 w-2/3" />
        </div>
        <div className="flex justify-center items-center h-[900px]">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!bracket || !bracket.r32) {
    return (
      <div className="w-full space-y-8 pb-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 mt-12 text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Error Loading Bracket</h1>
          <p className="text-neutral-500">Could not fetch bracket data. Please ensure the backend is running.</p>
        </div>
      </div>
    );
  }

  // --- Layout Engine ---
  const MATCH_WIDTH = 200;
  const MATCH_HEIGHT = 80;
  const TOTAL_WIDTH = 2600;
  const TOTAL_HEIGHT = 1200;

  function getCoords(stage: number, side: 'L' | 'R' | 'C', idx: number) {
    let cx = 0;
    if (stage === 4) cx = TOTAL_WIDTH / 2;
    else {
      const xOffsets = [150, 400, 700, 1000]; // R32, R16, QF, SF
      if (side === 'L') cx = xOffsets[stage];
      else cx = TOTAL_WIDTH - xOffsets[stage];
    }
    
    let cy = 0;
    if (stage === 4) cy = TOTAL_HEIGHT / 2;
    else {
      const items = Math.pow(2, 3 - stage); // 8, 4, 2, 1
      const spacing = TOTAL_HEIGHT / items;
      cy = spacing * (idx + 0.5);
    }
    
    return { cx, cy, x: cx - MATCH_WIDTH/2, y: cy - MATCH_HEIGHT/2 };
  }

  const nodes = [
    ...bracket.r32.slice(0, 8).map((m: any, i: number) => ({ match: m, stage: 0, side: 'L', idx: i })),
    ...bracket.r32.slice(8, 16).map((m: any, i: number) => ({ match: m, stage: 0, side: 'R', idx: i })),
    ...bracket.r16.slice(0, 4).map((m: any, i: number) => ({ match: m, stage: 1, side: 'L', idx: i })),
    ...bracket.r16.slice(4, 8).map((m: any, i: number) => ({ match: m, stage: 1, side: 'R', idx: i })),
    ...bracket.qf.slice(0, 2).map((m: any, i: number) => ({ match: m, stage: 2, side: 'L', idx: i })),
    ...bracket.qf.slice(2, 4).map((m: any, i: number) => ({ match: m, stage: 2, side: 'R', idx: i })),
    ...bracket.sf.slice(0, 1).map((m: any, i: number) => ({ match: m, stage: 3, side: 'L', idx: i })),
    ...bracket.sf.slice(1, 2).map((m: any, i: number) => ({ match: m, stage: 3, side: 'R', idx: i })),
    { match: bracket.final[0], stage: 4, side: 'C', idx: 0 }
  ];

  const lines: any[] = [];
  
  // Helper to check if a line should glow
  const lineGlows = (m1: any, m2: any) => {
    if (!hoveredTeam) return false;
    const hasHovered1 = m1.home === hoveredTeam || m1.away === hoveredTeam;
    const hasHovered2 = m2.home === hoveredTeam || m2.away === hoveredTeam;
    return hasHovered1 && hasHovered2;
  };

  // Build Connections
  nodes.forEach(node => {
    if (node.stage < 4) {
      const nextStage = node.stage + 1;
      const nextIdx = Math.floor(node.idx / 2);
      let nextSide = node.side;
      if (nextStage === 4) nextSide = 'C';
      
      const nextNode = nodes.find(n => n.stage === nextStage && n.side === nextSide && n.idx === nextIdx);
      if (nextNode) {
        const startPos = getCoords(node.stage, node.side as any, node.idx);
        const endPos = getCoords(nextNode.stage, nextNode.side as any, nextNode.idx);
        
        const startX = node.side === 'L' ? startPos.cx + MATCH_WIDTH/2 : startPos.cx - MATCH_WIDTH/2;
        const startY = startPos.cy;
        const endX = node.side === 'L' ? endPos.cx - MATCH_WIDTH/2 : endPos.cx + MATCH_WIDTH/2;
        const endY = endPos.cy;
        
        const cp1X = startX + (endX - startX) * 0.5;
        const cp2X = endX - (endX - startX) * 0.5;

        lines.push({
          d: `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`,
          glows: lineGlows(node.match, nextNode.match)
        });
      }
    }
  });

  const renderMatchNode = (node: any) => {
    const coords = getCoords(node.stage, node.side as any, node.idx);
    const m = node.match;
    const isFinal = node.stage === 4;

    return (
      <div 
        key={`${node.stage}-${node.side}-${node.idx}`}
        style={{
          position: 'absolute',
          left: coords.x,
          top: coords.y,
          width: MATCH_WIDTH,
          height: MATCH_HEIGHT
        }}
        className={`glass-panel border-white/5 rounded-2xl flex flex-col justify-center overflow-hidden z-10 transition-transform ${isFinal ? 'shadow-[0_0_30px_rgba(16,185,129,0.3)] border-emerald-500/30 scale-125' : ''}`}
      >
        {isFinal && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />}
        
        {/* Home Row */}
        <div 
          className={`flex items-center px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors ${m.winner === m.home ? 'text-emerald-400 bg-emerald-500/5' : 'text-neutral-400'}`}
          onMouseEnter={() => setHoveredTeam(m.home)}
          onMouseLeave={() => setHoveredTeam(null)}
        >
          <img src={getFlagUrl(m.home)} className="w-5 h-5 rounded-full object-cover shadow-sm mr-2 opacity-90" />
          <span className={`font-heading uppercase tracking-wide truncate flex-1 ${m.winner === m.home ? 'font-black' : 'font-semibold'}`}>
            {m.home}
          </span>
          <span className="font-mono font-bold">{m.score_home.toFixed(1)}</span>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/5" />

        {/* Away Row */}
        <div 
          className={`flex items-center px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors ${m.winner === m.away ? 'text-emerald-400 bg-emerald-500/5' : 'text-neutral-400'}`}
          onMouseEnter={() => setHoveredTeam(m.away)}
          onMouseLeave={() => setHoveredTeam(null)}
        >
          <img src={getFlagUrl(m.away)} className="w-5 h-5 rounded-full object-cover shadow-sm mr-2 opacity-90" />
          <span className={`font-heading uppercase tracking-wide truncate flex-1 ${m.winner === m.away ? 'font-black' : 'font-semibold'}`}>
            {m.away}
          </span>
          <span className="font-mono font-bold">{m.score_away.toFixed(1)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-black tracking-tight text-white mb-2 font-heading uppercase">Tournament Bracket</h1>
        <p className="text-neutral-400 max-w-3xl">
          The deterministic 32-team knockout stage. Powered by XGBoost. <span className="text-emerald-400 font-bold">Drag to pan. Hover a team to trace their path.</span>
        </p>
      </motion.div>

      <div 
        ref={containerRef}
        className={`w-full overflow-x-auto overflow-y-hidden select-none custom-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div 
          className="relative mx-auto bg-black/20 border-y border-white/5"
          style={{ width: TOTAL_WIDTH, height: TOTAL_HEIGHT }}
        >
          {/* SVG Connector Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Draw non-glowing lines first so they are underneath */}
            {lines.filter(l => !l.glows).map((line, i) => (
              <path 
                key={`line-base-${i}`} 
                d={line.d} 
                stroke="#333" 
                strokeWidth={2} 
                fill="none" 
              />
            ))}
            
            {/* Draw glowing lines on top */}
            {lines.filter(l => l.glows).map((line, i) => (
              <path 
                key={`line-glow-${i}`} 
                d={line.d} 
                stroke="#10b981" 
                strokeWidth={4} 
                fill="none"
                className="drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]"
              />
            ))}
          </svg>

          {/* HTML Match Nodes */}
          {nodes.map(node => renderMatchNode(node))}
          
          {/* Champion Highlight */}
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
            className="absolute z-20 flex flex-col items-center pointer-events-none"
            style={{ 
              left: TOTAL_WIDTH / 2 - 150, 
              top: TOTAL_HEIGHT / 2 - 250,
              width: 300 
            }}
          >
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(16,185,129,0.4)] mb-4 backdrop-blur-md">
              🏆
            </div>
            <h3 className="text-emerald-400 font-black tracking-widest uppercase font-heading text-3xl drop-shadow-lg">
              {bracket.champion}
            </h3>
            <p className="text-emerald-500/70 font-bold uppercase tracking-widest text-sm mt-1">World Champion 2026</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
