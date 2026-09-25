"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Clock3, Crosshair, Gauge, Radio, Shield, Zap } from "lucide-react";

type PlayerPoint = { number: number; role: string; x: number; y: number };

const AUSTRIA: PlayerPoint[] = [
  { number: 1, role: "GK", x: 50, y: 91 },
  { number: 2, role: "RB", x: 82, y: 75 },
  { number: 4, role: "CB", x: 62, y: 78 },
  { number: 5, role: "CB", x: 38, y: 78 },
  { number: 3, role: "LB", x: 18, y: 75 },
  { number: 6, role: "DM", x: 50, y: 61 },
  { number: 8, role: "CM", x: 70, y: 51 },
  { number: 10, role: "CM", x: 30, y: 51 },
  { number: 7, role: "RW", x: 78, y: 30 },
  { number: 9, role: "ST", x: 50, y: 25 },
  { number: 11, role: "LW", x: 22, y: 30 },
];

const ISRAEL: PlayerPoint[] = [
  { number: 1, role: "GK", x: 50, y: 9 },
  { number: 2, role: "RB", x: 82, y: 25 },
  { number: 4, role: "CB", x: 62, y: 22 },
  { number: 5, role: "CB", x: 38, y: 22 },
  { number: 3, role: "LB", x: 18, y: 25 },
  { number: 6, role: "DM", x: 50, y: 39 },
  { number: 8, role: "CM", x: 70, y: 49 },
  { number: 10, role: "CM", x: 30, y: 49 },
  { number: 7, role: "RW", x: 78, y: 70 },
  { number: 9, role: "ST", x: 50, y: 75 },
  { number: 11, role: "LW", x: 22, y: 70 },
];

const SIM_EVENTS = [
  "אוסטריה מניעה מצד לצד · Simulation event",
  "לחץ ישראלי במרכז המגרש · Simulation event",
  "מעבר מהיר לאגף הימני · Simulation event",
  "הקישור סוגר קווי מסירה · Simulation event",
  "התקדמות לשליש האחרון · Simulation event",
];

function TeamRoster({
  team,
  short,
  formation,
  players,
  accent,
}: {
  team: string;
  short: string;
  formation: string;
  players: PlayerPoint[];
  accent: "emerald" | "cyan";
}) {
  const emerald = accent === "emerald";
  return (
    <article className={`rounded-2xl border ${emerald ? "border-emerald-300/20" : "border-cyan-300/20"} bg-black/25 p-4`}>
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-xs font-black ${emerald ? "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200" : "border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-200"}`}>{short}</span>
          <div>
            <h3 className="text-sm font-black text-white">{team}</h3>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">SIMULATED LINEUP</p>
          </div>
        </div>
        <span className="rounded-lg border border-white/[0.09] px-2.5 py-1 font-mono text-xs font-bold text-slate-300">{formation}</span>
      </header>
      <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {players.map((player) => (
          <div key={player.number} className={`rounded-lg border px-1.5 py-2 text-center ${emerald ? "border-emerald-300/10 bg-emerald-300/[0.035]" : "border-cyan-300/10 bg-cyan-300/[0.035]"}`}>
            <p className={`font-mono text-xs font-black ${emerald ? "text-emerald-100" : "text-cyan-100"}`}>#{player.number}</p>
            <p className="mt-0.5 text-[8px] font-bold tracking-wide text-slate-500">{player.role}</p>
          </div>
        ))}
      </div>
    </article>
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
  const ballPosition = useMemo(() => ({
    x: 50 + Math.sin(tick * 0.36) * 28,
    y: 50 + Math.cos(tick * 0.23) * 29,
  }), [tick]);

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
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
            <Radio size={13} /> EINSTEIN TACTICAL SIMULATOR
          </p>
          <h2 className="mt-1.5 text-xl font-black text-white sm:text-2xl">3D Match Visualizer</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/[0.05] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-amber-100/80">
          <span className="relative flex h-2 w-2">
            <motion.span className="absolute inline-flex h-full w-full rounded-full bg-amber-300" animate={{ scale: [1, 2.2], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          SIMULATED FEED · NOT LIVE MATCH DATA
        </span>
      </header>

      <div className="relative mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(250px,0.7fr)]">
        <div className="relative min-h-[310px] overflow-hidden rounded-[1.5rem] border border-emerald-300/15 bg-[radial-gradient(ellipse_at_50%_50%,rgba(16,185,129,.12),rgba(2,12,9,.98)_72%)] p-3 sm:min-h-[390px] sm:p-5">
          <div className="absolute inset-x-6 top-4 z-10 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-white/80 sm:inset-x-8">
            <span className="flex items-center gap-1.5"><span className="text-emerald-200">AUT</span> Austria</span>
            <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 font-mono text-lg text-white backdrop-blur"><span>1</span><span className="text-slate-600">:</span><span>0</span></span>
            <span className="flex items-center gap-1.5">Israel <span className="text-cyan-200">ISR</span></span>
          </div>

          <div className="absolute inset-x-5 bottom-3 top-12 flex items-center justify-center sm:inset-x-12 sm:bottom-5 sm:top-14">
            <div className="absolute inset-0 rounded-[2rem] bg-emerald-400/[0.09] blur-2xl" />
            <div className="relative aspect-[1.25/1] w-full max-w-[680px] [perspective:1100px]">
              <div
                className="absolute inset-0 overflow-hidden rounded-[1.3rem] border border-emerald-200/35 bg-[repeating-linear-gradient(0deg,rgba(16,185,129,.12)_0_1px,transparent_1px_9%),linear-gradient(90deg,#073d2c,#0c6840_50%,#073d2c)] shadow-[0_24px_45px_rgba(0,0,0,.5),0_0_55px_rgba(16,185,129,.18)]"
                style={{ transform: "rotateX(38deg) rotateZ(-2deg) scale(.96)", transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-[4%] rounded-xl border border-emerald-100/65" />
                <div className="absolute left-1/2 top-[4%] h-[92%] border-l border-emerald-100/60" />
                <div className="absolute left-1/2 top-1/2 h-[22%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-100/65" />
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/80" />
                <div className="absolute left-[32%] top-[4%] h-[15%] w-[36%] border-x border-b border-emerald-100/60" />
                <div className="absolute left-[32%] bottom-[4%] h-[15%] w-[36%] border-x border-t border-emerald-100/60" />
                <div className="absolute left-[41%] top-[4%] h-[6%] w-[18%] border-x border-b border-emerald-100/60" />
                <div className="absolute left-[41%] bottom-[4%] h-[6%] w-[18%] border-x border-t border-emerald-100/60" />

                {AUSTRIA.map((player, index) => (
                  <motion.span
                    key={`aut-${player.number}`}
                    className="absolute z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-emerald-50 bg-emerald-300 font-mono text-[7px] font-black text-emerald-950 shadow-[0_0_12px_rgba(110,231,183,.65)] sm:h-6 sm:w-6 sm:text-[8px]"
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    animate={{ y: [0, index % 2 ? -2 : 2, 0] }}
                    transition={{ duration: 2.4 + index % 3 * 0.25, repeat: Infinity, ease: "easeInOut", delay: index * 0.035 }}
                    title={`Austria · ${player.role} #${player.number}`}
                  >{player.number}</motion.span>
                ))}
                {ISRAEL.map((player, index) => (
                  <motion.span
                    key={`isr-${player.number}`}
                    className="absolute z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-50 bg-cyan-200 font-mono text-[7px] font-black text-cyan-950 shadow-[0_0_12px_rgba(103,232,249,.55)] sm:h-6 sm:w-6 sm:text-[8px]"
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    animate={{ y: [0, index % 2 ? 2 : -2, 0] }}
                    transition={{ duration: 2.6 + index % 3 * 0.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.04 }}
                    title={`Israel · ${player.role} #${player.number}`}
                  >{player.number}</motion.span>
                ))}
                <motion.span
                  className="absolute z-20 flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white shadow-[0_0_16px_rgba(255,255,255,.95),0_0_28px_rgba(52,211,153,.85)] sm:h-4 sm:w-4"
                  animate={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}
                  transition={{ duration: 0.82, ease: "easeInOut" }}
                >
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                </motion.span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/85 px-2.5 py-1.5 font-mono text-[10px] text-emerald-100 sm:bottom-4 sm:left-4 sm:px-3 sm:text-xs">
            <Clock3 size={12} className="text-amber-200" /> SIM {String(simulatedMinute).padStart(2, "0")}:{String(simulatedSeconds).padStart(2, "0")}
          </div>
          <div className="absolute bottom-3 right-3 z-20 rounded-lg border border-white/10 bg-slate-950/85 px-2.5 py-1.5 font-mono text-[10px] text-cyan-100 sm:bottom-4 sm:right-4 sm:px-3 sm:text-xs">
            4-3-3 <span className="text-slate-600">VS</span> 4-3-3
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-emerald-300/15 bg-black/25 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200"><Gauge size={14} /> Tactical pressure</p>
              <span className="font-mono text-[9px] text-slate-600">SIMULATED</span>
            </div>
            <div className="mt-4 space-y-3">
              {[{ name: "Austria", value: homePressure, color: "bg-emerald-400" }, { name: "Israel", value: awayPressure, color: "bg-cyan-300" }].map((team) => (
                <div key={team.name}>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-300"><span>{team.name}</span><motion.span key={team.value} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="font-mono text-white">{team.value}%</motion.span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div className={`h-full rounded-full ${team.color} shadow-[0_0_12px_rgba(16,185,129,.38)]`} animate={{ width: `${team.value}%` }} transition={{ duration: 0.75, ease: "easeInOut" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Possession", value: homePossession, suffix: "%", icon: Activity }, { label: "Shots on target", value: 3 + tick % 4, suffix: "", icon: Crosshair }].map((stat) => (
              <motion.div key={stat.label} whileHover={{ y: -3 }} className="rounded-2xl border border-white/[0.08] bg-slate-950/65 p-3.5">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500"><stat.icon size={12} className="text-cyan-300" /> {stat.label}</p>
                <motion.p key={stat.value} initial={{ opacity: 0.45, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 font-mono text-2xl font-black text-white">{stat.value}{stat.suffix}</motion.p>
                {stat.label === "Possession" && <p className="mt-1 text-[9px] text-slate-500">AUT {homePossession} <span className="text-slate-700">·</span> ISR {awayPossession}</p>}
              </motion.div>
            ))}
          </div>

          <div className="min-h-[88px] overflow-hidden rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200"><Zap size={12} className="text-amber-200" /> SIM EVENT FEED</p>
            <motion.p key={event} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs font-semibold leading-5 text-slate-300">{event}</motion.p>
          </div>
        </aside>
      </div>

      <div className="relative mt-4 grid gap-3 lg:grid-cols-2">
        <TeamRoster team="Austria" short="AUT" formation="4-3-3" players={AUSTRIA} accent="emerald" />
        <TeamRoster team="Israel" short="ISR" formation="4-3-3" players={ISRAEL} accent="cyan" />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[9px] leading-5 text-slate-600"><Shield size={11} /> Tactical roles and metrics are generated by this local simulator; they are not official match lineups or live statistics.</p>
    </motion.section>
  );
}
