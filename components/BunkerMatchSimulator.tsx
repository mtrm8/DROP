"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BadgeCheck, Clock3, Gauge, Radio, Shield, Sparkles, Zap } from "lucide-react";

type PlayerCardData = { number: number; role: string; lane: string };

const AUSTRIA: PlayerCardData[] = [
  { number: 1, role: "Goalkeeper", lane: "LAST LINE" },
  { number: 2, role: "Right back", lane: "DEFENCE" },
  { number: 4, role: "Centre back", lane: "DEFENCE" },
  { number: 5, role: "Centre back", lane: "DEFENCE" },
  { number: 3, role: "Left back", lane: "DEFENCE" },
  { number: 6, role: "Holding mid", lane: "CONTROL" },
  { number: 8, role: "Central mid", lane: "CONTROL" },
  { number: 10, role: "Playmaker", lane: "CREATION" },
  { number: 7, role: "Right wing", lane: "ATTACK" },
  { number: 9, role: "Striker", lane: "ATTACK" },
  { number: 11, role: "Left wing", lane: "ATTACK" },
];

const ISRAEL: PlayerCardData[] = [
  { number: 1, role: "Goalkeeper", lane: "LAST LINE" },
  { number: 2, role: "Right back", lane: "DEFENCE" },
  { number: 4, role: "Centre back", lane: "DEFENCE" },
  { number: 5, role: "Centre back", lane: "DEFENCE" },
  { number: 3, role: "Left back", lane: "DEFENCE" },
  { number: 6, role: "Holding mid", lane: "CONTROL" },
  { number: 8, role: "Central mid", lane: "CONTROL" },
  { number: 10, role: "Playmaker", lane: "CREATION" },
  { number: 7, role: "Right wing", lane: "ATTACK" },
  { number: 9, role: "Striker", lane: "ATTACK" },
  { number: 11, role: "Left wing", lane: "ATTACK" },
];

const SIM_EVENTS = [
  "Austria shifts possession across the back line",
  "Israel compresses the central channel",
  "Wide overload building on the right flank",
  "Midfield press triggers a simulated transition",
  "Austria probes the final third",
  "Israel resets into a compact block",
];

function PlayerTradingCard({
  team,
  player,
  index,
  tick,
  accent,
}: {
  team: string;
  player: PlayerCardData;
  index: number;
  tick: number;
  accent: "emerald" | "cyan";
}) {
  const emerald = accent === "emerald";
  const signal = Math.round(68 + Math.sin(tick * 0.17 + index * 0.9) * 18);
  const theme = emerald
    ? {
        border: "border-emerald-300/20 hover:border-emerald-200/55",
        glow: "bg-emerald-400/[0.11]",
        accent: "text-emerald-200",
        edge: "from-emerald-300/70 via-lime-200/15 to-transparent",
        avatar: "from-emerald-300/25 via-emerald-950 to-[#07130f]",
        badge: "border-emerald-200/25 bg-emerald-200/[0.07] text-emerald-100",
      }
    : {
        border: "border-cyan-300/20 hover:border-cyan-200/55",
        glow: "bg-cyan-400/[0.11]",
        accent: "text-cyan-200",
        edge: "from-cyan-300/70 via-teal-200/15 to-transparent",
        avatar: "from-cyan-300/25 via-cyan-950 to-[#071116]",
        badge: "border-cyan-200/25 bg-cyan-200/[0.07] text-cyan-100",
      };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14, rotateX: 7 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.035, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, rotateY: emerald ? -3 : 3, scale: 1.025 }}
      className={`group relative isolate overflow-hidden rounded-2xl border bg-[#080f12] p-2.5 shadow-[0_12px_30px_rgba(0,0,0,.25)] transition-colors duration-300 ${theme.border}`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${theme.glow} opacity-60`} />
      <div className={`absolute inset-x-3 top-0 h-px bg-gradient-to-r ${theme.edge}`} />
      <div className="relative flex items-center justify-between gap-1">
        <span className={`font-mono text-[9px] font-black tracking-[0.17em] ${theme.accent}`}>{team.toUpperCase()}</span>
        <span className="font-mono text-[9px] font-bold text-slate-600">{player.lane}</span>
      </div>

      <div className={`relative mt-2 flex aspect-[1.15/0.92] items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-br ${theme.avatar}`}>
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "14px 14px" }} />
        <span className={`absolute -left-1 -top-5 font-mono text-[76px] font-black leading-none opacity-[0.08] ${theme.accent}`}>{String(player.number).padStart(2, "0")}</span>
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.6 + (index % 3) * 0.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.04 }}
          className="relative flex h-[68%] aspect-square items-center justify-center rounded-full border border-white/10 bg-slate-950/50 shadow-[0_0_30px_rgba(0,0,0,.4)]"
        >
          <svg viewBox="0 0 80 80" className={`h-[82%] w-[82%] ${theme.accent}`} fill="none" aria-hidden="true">
            <circle cx="40" cy="25" r="13" fill="currentColor" fillOpacity=".78" />
            <path d="M15 72c1-18 11-28 25-28s24 10 25 28H15Z" fill="currentColor" fillOpacity=".48" />
            <path d="M23 55 40 64l17-9" stroke="white" strokeOpacity=".5" strokeWidth="2" />
          </svg>
        </motion.div>
        <span className="absolute bottom-1.5 right-2 font-mono text-[9px] font-bold text-white/60">ED LAB</span>
        <span className={`absolute bottom-1.5 left-2 font-mono text-[9px] font-black ${theme.accent}`}>#{String(player.number).padStart(2, "0")}</span>
      </div>

      <div className="relative mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-[11px] font-black text-white">{player.role}</h4>
          <p className="mt-0.5 truncate text-[9px] text-slate-500">{player.lane} · simulated role</p>
        </div>
        <span className={`shrink-0 rounded-md border px-1.5 py-1 font-mono text-[9px] font-black ${theme.badge}`}>{signal}</span>
      </div>

      <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className={`h-full rounded-full ${emerald ? "bg-emerald-300" : "bg-cyan-300"}`}
          animate={{ width: `${signal}%` }}
          transition={{ duration: 0.75, ease: "easeInOut" }}
        />
      </div>
      <p className="relative mt-1 text-right text-[8px] font-bold uppercase tracking-[0.14em] text-slate-600">SIM INDEX</p>
    </motion.article>
  );
}

function TeamLineup({
  team,
  short,
  players,
  tick,
  accent,
}: {
  team: string;
  short: string;
  players: PlayerCardData[];
  tick: number;
  accent: "emerald" | "cyan";
}) {
  const emerald = accent === "emerald";
  return (
    <section className={`relative overflow-hidden rounded-[1.5rem] border bg-[#050b0d]/90 p-3.5 sm:p-5 ${emerald ? "border-emerald-300/20" : "border-cyan-300/20"}`}>
      <div className={`pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-[80px] ${emerald ? "bg-emerald-400/[0.08]" : "bg-cyan-400/[0.08]"}`} />
      <header className="relative mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border font-mono text-xs font-black ${emerald ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100" : "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-100"}`}>{short}</div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">SIMULATED STARTING XI</p>
            <h3 className="mt-0.5 text-base font-black text-white">{team}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${emerald ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100" : "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100"}`}>
            <BadgeCheck size={12} /> 4-3-3
          </span>
          <span className="rounded-full border border-amber-200/15 bg-amber-200/[0.04] px-2.5 py-1 font-mono text-[9px] font-bold text-amber-100/70">XI · 11</span>
        </div>
      </header>
      <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {players.map((player, index) => (
          <PlayerTradingCard key={`${short}-${player.number}`} team={short} player={player} index={index} tick={tick} accent={accent} />
        ))}
      </div>
    </section>
  );
}

export default function BunkerMatchSimulator() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((current) => current + 1), 900);
    return () => window.clearInterval(timer);
  }, []);

  const homePressure = Math.round(56 + Math.sin(tick * 0.19) * 19);
  const awayPressure = 100 - homePressure;
  const homePossession = Math.round(53 + Math.sin(tick * 0.11) * 8);
  const awayPossession = 100 - homePossession;
  const simulatedMinute = 12 + Math.floor(tick / 5) % 79;
  const simulatedSeconds = (tick * 7) % 60;
  const event = SIM_EVENTS[Math.floor(tick / 4) % SIM_EVENTS.length];

  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.55 }}
      className="relative mb-8 overflow-hidden rounded-[1.8rem] border border-emerald-300/20 bg-[#06130f]/90 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(16,185,129,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(16,185,129,.08) 1px,transparent 1px)", backgroundSize: "32px 32px", maskImage: "linear-gradient(to bottom, black, transparent 85%)" }} />
      <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300"><Radio size={13} /> EINSTEIN LINEUP TERMINAL</p>
          <h2 className="mt-1.5 text-xl font-black text-white sm:text-2xl">Starting XI · Player Cards</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/[0.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-amber-100/80">
          <span className="relative flex h-2 w-2">
            <motion.span className="absolute inline-flex h-full w-full rounded-full bg-amber-300" animate={{ scale: [1, 2.2], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          LOCAL TACTICAL SIMULATION
        </span>
      </header>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"><Clock3 size={12} className="text-amber-200" /> Sim clock</p>
          <p className="mt-1 font-mono text-xl font-black text-white">{String(simulatedMinute).padStart(2, "0")}:{String(simulatedSeconds).padStart(2, "0")}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"><Activity size={12} className="text-emerald-300" /> Simulated possession</p>
          <p className="mt-1 font-mono text-xl font-black text-white"><span className="text-emerald-200">{homePossession}%</span><span className="mx-2 text-slate-700">:</span><span className="text-cyan-200">{awayPossession}%</span></p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500"><Gauge size={12} className="text-amber-200" /> Match momentum</p>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-300" animate={{ width: `${homePressure}%` }} transition={{ duration: 0.75 }} />
            <motion.div className="h-full bg-gradient-to-r from-cyan-300 to-cyan-700" animate={{ width: `${awayPressure}%` }} transition={{ duration: 0.75 }} />
          </div>
          <p className="mt-1 flex justify-between font-mono text-[9px] text-slate-500"><span>AUT {homePressure}</span><span>ISR {awayPressure}</span></p>
        </div>
      </div>

      <div className="relative mt-4 grid gap-3 xl:grid-cols-2">
        <TeamLineup team="Austria" short="AUT" players={AUSTRIA} tick={tick} accent="emerald" />
        <TeamLineup team="Israel" short="ISR" players={ISRAEL} tick={tick} accent="cyan" />
      </div>

      <div className="relative mt-3 flex flex-col gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200"><Zap size={13} className="text-amber-200" /> TACTICAL SIM EVENT</p>
        <motion.p key={event} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="text-xs font-semibold text-slate-300">{event}</motion.p>
      </div>
      <p className="relative mt-2 flex items-center gap-1.5 text-[9px] leading-5 text-slate-600"><Shield size={11} /> Generated squad roles and tactical values are simulator content, not official rosters or live match data.</p>
    </motion.section>
  );
}
