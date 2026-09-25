"use client";

import Link from "next/link";
import { TrophyIcon } from "./drop/sportsIcons";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 premium-hairline border-b border-white/[0.06] texture-metal bg-[#07090f]/85 backdrop-blur-xl px-4 lg:px-8">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-6">
        {/* Logo — Moshe wordmark + gold trophy */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-amber-400/[0.16] blur-md group-hover:blur-lg transition duration-300" />
            <TrophyIcon size={30} className="relative" />
          </div>
          <div className="leading-tight">
            <span className="text-lg font-black tracking-tight text-white">
              MOSHA <span className="bg-gradient-to-l from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">DROP</span>
            </span>
            <p className="text-[9px] font-semibold text-slate-500 tracking-[0.34em] uppercase leading-tight">
              Sports · Poker · Community
            </p>
          </div>
        </Link>

        {/* Centered nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/drop"
            className="px-3.5 py-2 rounded-lg text-amber-400 bg-amber-400/[0.08] border border-amber-400/20 hover:bg-amber-400/[0.14] transition"
          >
            הדרוף היומי
          </Link>
        </nav>
      </div>
    </header>
  );
}