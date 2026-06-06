"use client";

import React from "react";

interface TeamSelectorProps {
  teams: string[];
  selectedTeam: string | null;
  onSelect: (team: string) => void;
}

export default function TeamSelector({ teams, selectedTeam, onSelect }: TeamSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="team-select" className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Select Team
      </label>
      <select
        id="team-select"
        value={selectedTeam || ""}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer appearance-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
          backgroundPosition: "right 0.5rem center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "1.5em 1.5em",
          paddingRight: "2.5rem"
        }}
      >
        <option value="" disabled>
          -- Choose a Team --
        </option>
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
    </div>
  );
}
