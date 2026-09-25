"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ClipboardList,
  Crosshair,
  Gauge,
  Info,
  ShieldCheck,
  Target,
} from "lucide-react";

const PICKS = [
  {
    id: "01",
    home: "Austria",
    away: "Israel",
    initials: ["AUT", "ISR"],
    market: "Over 2.5 goals",
    odds: 1.56,
    read: "The selection needs three or more total goals. At this price, the market-implied break-even figure is about 64.1% before removing bookmaker margin.",
    questions: [
      "Compare recent non-penalty xG for and against for both teams.",
      "Check how often each side reaches three total goals across a meaningful sample.",
      "Review confirmed lineups, goalkeeper availability, and defensive absences.",
      "Assess match incentives and whether either side is likely to protect a draw.",
    ],
  },
  {
    id: "02",
    home: "Netherlands",
    away: "Germany",
    initials: ["NED", "GER"],
    market: "Over 2.5 goals",
    odds: 1.49,
    read: "The selection also needs three or more total goals. Its price implies roughly 67.1% before bookmaker margin; that is a price-derived figure, not a model forecast.",
    questions: [
      "Compare each team's recent xG creation with the opponent's xG conceded.",
      "Separate home and away scoring rates and account for opponent strength.",
      "Review confirmed attacking lineups, rest, and defensive availability.",
      "Treat head-to-head scores as context only; use a consistent sample and competition level.",
    ],
  },
];

const TOTAL_ODDS = PICKS.reduce((product, pick) => product * pick.odds, 1);
const COMBINED_DISPLAY_ODDS = 2.32;
const combinedImplied = (1 / TOTAL_ODDS) * 100;

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function OddsBars() {
  return (
    <div className="space-y-5">
      {PICKS.map((pick, index) => {
        const implied = (1 / pick.odds) * 100;
        return (
          <div key={pick.id}>
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="font-bold text-slate-300" dir="ltr">{pick.home} · {pick.away}</span>
              <span className="font-mono font-black text-white">{implied.toFixed(1)}%</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={`h-full rounded-full ${index === 0 ? "bg-gradient-to-r from-emerald-800 via-emerald-500 to-emerald-300" : "bg-gradient-to-r from-teal-800 via-cyan-500 to-cyan-200"}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${implied}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.15 + index * 0.14, ease: "easeOut" }}
              />
              <span className="absolute inset-y-0 left-1/2 border-l border-dashed border-white/35" />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-600"><span>0%</span><span>50% reference</span><span>100%</span></div>
          </div>
        );
      })}
    </div>
  );
}

function MatchAnalysis({ pick, index }: { pick: (typeof PICKS)[number]; index: number }) {
  const accent = index === 0 ? "emerald" : "cyan";
  return (
    <Reveal delay={index * 0.08}>
      <article className={`relative overflow-hidden rounded-[1.7rem] border bg-[#080f12]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,.3)] sm:p-7 ${accent === "emerald" ? "border-emerald-300/20" : "border-cyan-300/20"}`}>
        <div className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${accent === "emerald" ? "bg-emerald-400/[0.07]" : "bg-cyan-400/[0.07]"}`} />
        <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border font-mono text-[10px] font-black ${accent === "emerald" ? "border-emerald-300/30 bg-emerald-300/[0.07] text-emerald-100" : "border-cyan-300/30 bg-cyan-300/[0.07] text-cyan-100"}`}>
              {pick.initials[0]}
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">MATCH {pick.id} · PRE-MATCH REVIEW</p>
              <h3 className="mt-1 text-xl font-black text-white sm:text-2xl" dir="ltr">{pick.home} <span className="text-slate-600">vs</span> {pick.away}</h3>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200/20 bg-amber-200/[0.05] px-4 py-2 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-100/60">DECIMAL ODDS</p>
            <p className="font-mono text-2xl font-black text-amber-100">{pick.odds.toFixed(2)}</p>
          </div>
        </header>

        <div className="relative mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4 sm:p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-200/70">MARKET SELECTION</p>
            <h4 className="mt-2 flex items-center gap-2 text-lg font-black text-white"><Target size={19} className="text-emerald-300" /> {pick.market}</h4>
            <p className="mt-2 text-xs leading-6 text-slate-400">Over 2.5 goals wins at a total of 3 or more goals. Totals of 0, 1, or 2 goals do not meet the line.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-red-300/10 bg-red-400/[0.035] p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">0–2 goals</span>
                <p className="mt-1 text-xs font-black text-slate-300">Below the line</p>
              </div>
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">3+ goals</span>
                <p className="mt-1 text-xs font-black text-emerald-100">Selection wins</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200"><BarChart3 size={14} /> PRICE-IMPLIED REFERENCE</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{pick.read}</p>
            <div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.025] p-3.5">
              <p className="font-mono text-xs text-cyan-100/80">1 ÷ {pick.odds.toFixed(2)} = {((1 / pick.odds) * 100).toFixed(1)}%</p>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">Raw implied price only; bookmaker margin is not removed. This is not a forecast or estimated true probability.</p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid gap-4 border-t border-white/[0.07] pt-5 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/80"><Crosshair size={13} /> ANALYST CHECKLIST</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">{pick.id === "01" ? "For Austria–Israel, the market case depends on verified chance creation, conversion, and each defence's ability to manage transitions." : "For Netherlands–Germany, assess verified shot quality, transition defence, and whether the match context encourages both teams to keep attacking."}</p>
          </div>
          <ul className="space-y-2">
            {pick.questions.map((question) => (
              <li key={question} className="flex items-start gap-2 text-[10px] leading-5 text-slate-400">
                <ChevronDown size={13} className="mt-0.5 shrink-0 rotate-[-90deg] text-emerald-300" />{question}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {["Recent goal trend: not supplied", "H2H sample: not supplied", "xG feed: not connected"].map((item) => (
            <span key={item} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[9px] font-semibold text-slate-500">{item}</span>
          ))}
        </div>
      </article>
    </Reveal>
  );
}

export default function BunkerDeepDive() {
  const [stake, setStake] = useState(100);
  const theoreticalReturn = stake * TOTAL_ODDS;
  const netProfit = theoreticalReturn - stake;
  const roundedCombinedImplied = (1 / COMBINED_DISPLAY_ODDS) * 100;
  const sourceInputs = useMemo(() => PICKS.map(({ home, away, odds, market }) => ({ home, away, odds, market })), []);

  return (
    <div className="space-y-7">
      <Reveal>
        <section className="relative overflow-hidden rounded-[1.7rem] border border-emerald-300/20 bg-gradient-to-br from-[#081713] via-[#070d10] to-[#101008] p-5 shadow-[0_22px_85px_rgba(0,0,0,.32)] sm:p-7">
          <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.07] blur-[90px]" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-emerald-200"><ClipboardList size={13} /> PRE-MATCH ANALYST BRIEF</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">Accumulator Deep-Dive</h2>
              <p className="mt-2 text-sm font-bold text-slate-300">ניתוח טופס משולב · שתי בחירות Over 2.5</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">COMBINED PRICE</p>
              <p className="mt-0.5 font-mono text-3xl font-black text-amber-100">2.32</p>
              <p className="text-[9px] text-slate-500">1.56 × 1.49 = {TOTAL_ODDS.toFixed(4)} → 2 decimals</p>
            </div>
          </div>
          <div className="relative mt-5 flex items-start gap-2 rounded-xl border border-amber-200/15 bg-amber-200/[0.035] p-3 text-[10px] leading-5 text-slate-400">
            <Info size={14} className="mt-0.5 shrink-0 text-amber-200" />
            <span>Markets and prices below are reproduced from the slip details supplied. No match date, verified historical dataset, head-to-head sample, xG source, or confirmed lineup was supplied; no missing statistics are invented.</span>
          </div>
        </section>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        {PICKS.map((pick, index) => <MatchAnalysis key={pick.id} pick={pick} index={index} />)}
      </div>

      <Reveal>
        <section className="rounded-[1.7rem] border border-cyan-300/20 bg-[#070e11]/95 p-5 shadow-[0_18px_70px_rgba(0,0,0,.28)] sm:p-7">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200">PRICE VISUALIZATION</p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Raw implied-price comparison</h2>
            </div>
            <p className="text-[9px] text-slate-500">Derived directly from decimal odds · margin not removed</p>
          </header>
          <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_0.8fr]">
            <OddsBars />
            <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">ACCUMULATOR MULTIPLICATION</p>
              <div className="mt-4 flex items-center justify-center gap-2 font-mono text-sm font-black sm:text-base">
                <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] px-2.5 py-2 text-emerald-100">1.56</span>
                <span className="text-slate-600">×</span>
                <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.05] px-2.5 py-2 text-cyan-100">1.49</span>
                <span className="text-slate-600">=</span>
                <span className="rounded-lg border border-amber-200/25 bg-amber-200/[0.06] px-2.5 py-2 text-amber-100">2.32</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] text-slate-500">Combined raw implied</p>
                  <p className="mt-1 font-mono text-xl font-black text-white">{combinedImplied.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] text-slate-500">From rounded 2.32</p>
                  <p className="mt-1 font-mono text-xl font-black text-white">{roundedCombinedImplied.toFixed(1)}%</p>
                </div>
              </div>
              <p className="mt-3 text-[9px] leading-5 text-slate-500">Multiplying implied prices assumes independent outcomes and does not account for bookmaker margin or correlation. It is not a model probability.</p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="overflow-hidden rounded-[1.7rem] border border-amber-200/20 bg-gradient-to-br from-[#141309] via-[#0c0d0b] to-[#07100d] p-5 sm:p-7">
          <header className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-amber-100/80"><Gauge size={14} /> Stake & return valuation</header>
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
            <label className="block rounded-2xl border border-white/[0.08] bg-black/25 p-4">
              <span className="text-[10px] font-bold text-slate-500">Stake input (₪)</span>
              <input type="number" min="1" max="100000" value={stake} onChange={(event) => setStake(Math.max(1, Math.min(100000, Number(event.target.value) || 1)))} className="mt-2 block w-full bg-transparent font-mono text-3xl font-black text-white outline-none focus-visible:ring-1 focus-visible:ring-amber-200" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <motion.div key={theoreticalReturn} initial={{ opacity: 0.6, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
                <p className="text-[9px] font-bold text-slate-500">Gross theoretical return</p>
                <p className="mt-2 font-mono text-2xl font-black text-emerald-100">₪{theoreticalReturn.toFixed(2)}</p>
                <p className="mt-1 text-[9px] text-slate-600">Stake × exact combined price</p>
              </motion.div>
              <motion.div key={netProfit} initial={{ opacity: 0.6, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.035] p-4">
                <p className="text-[9px] font-bold text-slate-500">Theoretical net profit</p>
                <p className="mt-2 font-mono text-2xl font-black text-amber-100">₪{netProfit.toFixed(2)}</p>
                <p className="mt-1 text-[9px] text-slate-600">Gross return − stake</p>
              </motion.div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
            <div className="grid grid-cols-[1.2fr_1fr_0.7fr] bg-white/[0.035] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500 sm:px-4">
              <span>Selection</span><span>Market</span><span className="text-right">Odds</span>
            </div>
            {sourceInputs.map((pick) => (
              <div key={pick.home} className="grid grid-cols-[1.2fr_1fr_0.7fr] border-t border-white/[0.05] px-3 py-3 text-[10px] sm:px-4">
                <span className="font-bold text-slate-200" dir="ltr">{pick.home} – {pick.away}</span><span className="text-slate-400">{pick.market}</span><span className="text-right font-mono font-black text-cyan-100">{pick.odds.toFixed(2)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1.2fr_1fr_0.7fr] border-t border-amber-200/10 bg-amber-200/[0.025] px-3 py-3 text-[10px] sm:px-4">
              <span className="font-black text-amber-100">Accumulator</span><span className="text-slate-400">2-leg multiple</span><span className="text-right font-mono font-black text-amber-100">{COMBINED_DISPLAY_ODDS.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[9px] leading-5 text-slate-500"><AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-200/70" /> Returns are arithmetic examples from the supplied prices. They are not guaranteed outcomes or an assessment of value.</p>
        </section>
      </Reveal>

      <Reveal>
        <section className="rounded-[1.7rem] border border-white/[0.08] bg-slate-950/75 p-5 sm:p-7">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200"><ShieldCheck size={14} /> Evidence desk</div>
          <h2 className="mt-2 text-xl font-black text-white">Before forming a football view</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">The supplied slip gives the fixtures, Over 2.5 markets, and decimal prices. Historical goal distributions, confirmed lineups, head-to-head sample, and xG data were not supplied, so no team-specific statistical claims are presented.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { title: "Scoring trend", value: "Source data not supplied", icon: BarChart3 },
              { title: "Head-to-head", value: "Sample not supplied", icon: Activity },
              { title: "Expected goals", value: "Verified xG unavailable", icon: Target },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <item.icon size={15} className="text-cyan-200" />
                <p className="mt-2 text-[10px] font-black text-white">{item.title}</p>
                <p className="mt-1 text-[9px] text-slate-500">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
