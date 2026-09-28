"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Layers3, MessageCircle } from "lucide-react";
import { WHATSAPP_URL } from "./drop/community";

const isCurrent = (pathname: string | null, href: string) =>
  pathname === href || Boolean(pathname?.startsWith(`${href}/`));

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 premium-hairline border-b border-white/[0.06] texture-metal bg-[#07111b]/90 backdrop-blur-md px-4 lg:px-8">
      <div className="max-w-7xl mx-auto flex min-h-16 items-center justify-between gap-6">
        {/* Einstein Drop wordmark */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-cyan-400/[0.2] blur-md group-hover:blur-lg transition duration-300" />
            <BrainCircuit size={30} className="relative text-cyan-300" />
          </div>
          <div className="leading-tight">
            <span className="text-lg font-black tracking-tight text-white">
              Einstein <span className="bg-gradient-to-l from-cyan-200 via-cyan-400 to-lime-300 bg-clip-text text-transparent">Drop</span>
            </span>
            <p className="text-[9px] font-semibold text-slate-500 tracking-[0.34em] uppercase leading-tight">
              חוכמה · דרופים · קהילה
            </p>
          </div>
        </Link>

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
      <nav aria-label="אזורי האתר" className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-2 pb-3 pt-1 text-xs font-bold sm:flex sm:gap-2 sm:overflow-x-auto sm:text-sm">
        <Link href="/drop" aria-current={isCurrent(pathname, "/drop") ? "page" : undefined}
          className={`inline-flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition sm:min-h-10 sm:shrink-0 sm:flex-row sm:gap-2 sm:whitespace-nowrap sm:px-4 ${isCurrent(pathname, "/drop") ? "border-cyan-300/40 bg-cyan-300/[0.1] text-cyan-100" : "border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-cyan-300/25 hover:text-white"}`}>
          <Layers3 size={16} className="shrink-0 text-cyan-300" />
           <span>דרופים</span>
        </Link>
      </nav>
    </header>
  );
}
