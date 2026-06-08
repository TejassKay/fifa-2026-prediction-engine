"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamSelectorProps {
  teams: string[];
  selectedTeam: string | null;
  onSelect: (team: string) => void;
}

export default function TeamSelector({ teams, selectedTeam, onSelect }: TeamSelectorProps) {
  // Alphabetically sort teams
  const sortedTeams = [...teams].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-xs uppercase tracking-wider text-neutral-500 font-mono">
        Select Team
      </label>
      <Select value={selectedTeam || undefined} onValueChange={(val) => val && onSelect(val)}>
        <SelectTrigger className="bg-black/50 border-white/10 h-14 text-xl font-heading uppercase tracking-wide rounded-xl">
          <SelectValue placeholder="-- Choose a Team --" />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-neutral-800 font-heading uppercase max-h-80">
          {sortedTeams.map((team) => (
            <SelectItem key={team} value={team}>
              {team}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
