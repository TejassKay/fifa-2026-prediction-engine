"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, Search, Trophy, LayoutGrid, Activity, ClipboardList, Lightbulb, Star, ChevronLeft, ChevronRight, Calendar, TrendingUp, Clock, Target, Medal, ShieldAlert, LineChart, Dices, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";

const navGroups = [
  {
    title: "",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
    ]
  },
  {
    title: "Tournament",
    items: [
      { href: "/fixtures", label: "Upcoming Fixtures", icon: Calendar },
      { href: "/groups", label: "Group Stage", icon: LayoutGrid },
      { href: "/bracket", label: "Knockout Bracket", icon: Trophy },
      { href: "/road-to-glory", label: "Road To Glory", icon: TrendingUp },
    ]
  },
  {
    title: "Stories & Stars",
    items: [
      { href: "/intelligence", label: "Intelligence Center", icon: ShieldAlert },
      { href: "/golden-boot", label: "Golden Boot Race", icon: Medal },
      { href: "/awards", label: "Awards Center", icon: Star },
      { href: "/squads", label: "Squad Explorer", icon: Users },
      { href: "/timeline", label: "Tournament Timeline", icon: Clock },
    ]
  },
  {
    title: "Predictions",
    items: [
      { href: "/predictor", label: "Match Predictor", icon: Dices },
      { href: "/odds-history", label: "Odds History", icon: LineChart },
      { href: "/accuracy", label: "Accuracy Center", icon: Target },
    ]
  },
  {
    title: "Engine",
    items: [
      { href: "/analytics", label: "Analytics & ML", icon: Cpu },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }} // w-20 = 80px, w-64 = 256px
      className="glass-panel !rounded-none !border-y-0 !border-l-0 h-full flex-col hidden md:flex relative shrink-0 z-40"
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-neutral-800 hover:bg-neutral-700 text-white p-1 rounded-full border border-neutral-600 z-50 transition-colors shadow-lg"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="p-6 h-28 flex items-start relative overflow-hidden">
        <AnimatePresence mode="wait">
          <Logo isCollapsed={isCollapsed} />
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && group.title && (
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
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative",
                    isCollapsed ? "justify-center" : "gap-3",
                    isActive 
                      ? "text-white" 
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-neutral-800 rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-emerald-400" : "text-neutral-500 group-hover:text-neutral-300")} />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={cn("p-6 border-t border-neutral-900 flex justify-center overflow-hidden", isCollapsed ? "items-center" : "items-start")}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!isCollapsed && <span className="text-xs text-neutral-400 font-mono whitespace-nowrap">Engine Online</span>}
        </div>
      </div>
    </motion.aside>
  );
}
