"use client";

import FixtureStack from "@/components/FixtureStack";

export default function FixturesPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase">
            Upcoming Fixtures
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-medium mt-2">
            The next 10 matches of the tournament. Swipe through to view advanced Monte Carlo forecasts.
          </p>
        </header>
        
        <FixtureStack />

        <div className="mt-12 flex justify-center pb-8">
          <a href="/schedule" className="inline-block bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold uppercase tracking-wider px-8 py-4 rounded-full hover:bg-white/20 transition-all shadow-xl">
            View full schedule
          </a>
        </div>
      </div>
    </div>
  );
}
