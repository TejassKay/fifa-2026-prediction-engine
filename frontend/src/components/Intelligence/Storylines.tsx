"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { getFlagGradientByName, getFlagUrl } from "@/lib/flags";

export default function Storylines() {
  const [storylines, setStorylines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/intelligence/storylines`)
      .then(res => res.json())
      .then(data => {
        setStorylines(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600/20 to-transparent p-6 rounded-2xl border border-purple-500/20 mb-8">
        <h2 className="text-2xl font-black text-purple-400 uppercase tracking-tight mb-2 flex items-center gap-2">
          <span>📖</span> World Cup Storylines
        </h2>
        <p className="text-gray-300">
          The defining narratives of the tournament, algorithmically generated from our prediction engine and historical context.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {storylines.map((story, index) => (
          <motion.div
            key={story.title}
            id={`storyline-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#161616] border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-purple-500/50 transition-colors group relative"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${getFlagGradientByName(story.team)} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
            <div className="p-6 relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-black uppercase text-white drop-shadow-md">{story.title}</h3>
                  <img src={getFlagUrl(story.team)} alt={story.team} className="w-10 h-7 object-cover rounded shadow border border-white/20" />
                </div>
                <p className="text-gray-400 italic text-sm md:text-base border-l-2 border-purple-500/50 pl-4 py-1">
                  "{story.description}"
                </p>
              </div>

              <div className="flex-shrink-0 flex gap-4 mt-4 md:mt-0">
                <div className="text-center glass-panel p-3 min-w-[120px]">
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Focus Team</div>
                  <div className="text-lg font-black text-white">{story.team}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {storylines.length === 0 && (
          <div className="text-gray-500 text-center py-10">No storylines generated.</div>
        )}
      </div>
    </div>
  );
}
