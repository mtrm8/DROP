"use client";

import Link from "next/link";
import { BrainCircuit, MessageCircle } from "lucide-react";
import { WHATSAPP_URL } from "./drop/community";

export default function Navbar({ hebrewBrand = false }: { hebrewBrand?: boolean }) {
  return (
    <header className="sticky top-0 z-50 premium-hairline border-b border-white/[0.06] texture-metal bg-[#07111b]/90 backdrop-blur-md px-4 lg:px-8">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-6">
        {/* Einstein Drop wordmark */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-cyan-400/[0.2] blur-md group-hover:blur-lg transition duration-300" />
            <BrainCircuit size={30} className="relative text-cyan-300" />
          </div>
          <div className="leading-tight">
            <span className="text-lg font-black tracking-tight text-white">
              {hebrewBrand ? "איינשטיין" : "Einstein"} <span className="bg-gradient-to-l from-cyan-200 via-cyan-400 to-lime-300 bg-clip-text text-transparent">{hebrewBrand ? "דרופ" : "Drop"}</span>
            </span>
            <p className="text-[9px] font-semibold text-slate-500 tracking-[0.34em] uppercase leading-tight">
              חכמה · קלפים · קהילה
            </p>
          </div>
        </Link>

        {/* Centered nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg text-[#25D366] bg-[#25D366]/[0.08] border border-[#25D366]/25 hover:bg-[#25D366]/[0.16] transition flex items-center gap-2"
          >
            <MessageCircle size={16} className="shrink-0" />
            הצטרפו לקהילה בוואטסאפ
          </a>
        </nav>
      </div>
    </header>
  );
}
