"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, Search, Trophy, LayoutGrid, Activity } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/teams", label: "Team Explorer", icon: Users },
  { href: "/predictor", label: "Match Predictor", icon: Search },
  { href: "/bracket", label: "Knockout Bracket", icon: Trophy },
  { href: "/groups", label: "Group Stage", icon: LayoutGrid },
  { href: "/analytics", label: "Analytics & ML", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-black border-r border-neutral-800 h-full flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent tracking-tight leading-tight">
          FIFA 2026<br />Prediction Engine
        </h1>
        <p className="text-xs text-neutral-500 mt-2 font-mono uppercase tracking-wider">v2.0 Monte Carlo</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative",
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
              <Icon className={cn("w-5 h-5", isActive ? "text-emerald-400" : "text-neutral-500 group-hover:text-neutral-300")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-neutral-900">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-neutral-400 font-mono">Engine Online</span>
        </div>
      </div>
    </aside>
  );
}
