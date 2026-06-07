"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";
import { navGroups } from "@/lib/navigation";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Top Bar */}
      <header className="md:hidden flex items-center justify-between px-4 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 sticky top-0 z-40 h-16 shrink-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <Logo isCollapsed={true} />
        </AnimatePresence>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 ml-auto text-neutral-400 hover:text-white relative z-50"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Full Screen Overlay Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-[80vw] max-w-sm bg-neutral-950 border-l border-neutral-800 z-50 flex flex-col md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-900 h-16 shrink-0">
                <span className="font-heading font-bold text-lg text-white tracking-wide">Navigation</span>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 -mr-2 text-neutral-400 hover:text-white bg-neutral-900 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {navGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    {group.title && (
                      <div className="px-3 pt-2 pb-1 text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                        {group.title}
                      </div>
                    )}
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-neutral-800 text-white" 
                              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                          )}
                        >
                          <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-emerald-400" : "text-neutral-500")} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
