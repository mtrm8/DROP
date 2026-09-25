"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Atom,
  BadgeCheck,
  BrainCircuit,
  ChevronLeft,
  Clock3,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Navbar from "./Navbar";
import CommunityFooter from "./CommunityFooter";

const COMPLETED_KEY = "drop-completed";
const DEMO_LEGS = [
  {
    home: "Austria",
    away: "Israel",
    initials: ["AT", "IL"],
    market: "בחירת הדגמה · אוסטריה / תיקו",
    odds: 1.56,
  },
  {
    home: "Netherlands",
    away: "Germany",
    initials: ["NL", "DE"],
    market: "בחירת הדגמה · שתי הקבוצות יבקיעו",
    odds: 1.49,
  },
];
const TOTAL_ODDS = 2.32;

type AccessState = "checking" | "granted" | "locked";

export default function BunkerExperience() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [stake, setStake] = useState(100);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COMPLETED_KEY);
      const record = raw ? JSON.parse(raw) as { code?: unknown; item?: { name?: unknown } } : null;
      setAccess(
        record && typeof record.code === "string" && typeof record.item?.name === "string"
          ? "granted"
          : "locked"
      );
    } catch {
      setAccess("locked");
    }
  }, []);

  const potentialReturn = stake * TOTAL_ODDS;

  if (access === "checking") {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-6 text-cyan-200">
          <Atom className="animate-spin" size={34} aria-label="טוען הרשאה" />
        </div>
        <CommunityFooter />
      </main>
    );
  }

  if (access === "locked") {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-200 shadow-[0_0_48px_rgba(34,211,238,0.12)]">
            <LockKeyhole size={34} />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">ACCESS LOCKED</p>
          <h1 className="mt-3 text-3xl font-black text-white">הבנקר נפתח אחרי דרופ</h1>
          <p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">
            השלימו דרופ ושמרו את תוצאת הזכייה במכשיר הזה כדי לפתוח את מעבדת Einstein Drop.
          </p>
          <Link
            href="/drop"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-300 to-lime-300 px-6 py-3 font-black text-slate-950 transition hover:brightness-110"
          >
            <ArrowLeft size={18} /> מעבר לדרופ
          </Link>
        </section>
        <CommunityFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-400/[0.08] blur-[100px]" />
        <div className="absolute right-[-180px] top-[45%] h-[380px] w-[380px] rounded-full bg-lime-400/[0.05] blur-[100px]" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8 sm:px-8 sm:pt-14">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950/80 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(34,211,238,.08) 1px,transparent 1px)", backgroundSize: "34px 34px", maskImage: "linear-gradient(to bottom,black,transparent 80%)" }} />
          <div className="relative flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                <ShieldCheck size={13} /> DROP COMPLETE · ACCESS GRANTED
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-cyan-200">
                <BrainCircuit size={18} /> Einstein Drop · Analyst Desk
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">
                THE <span className="bg-gradient-to-l from-cyan-200 via-cyan-400 to-lime-300 bg-clip-text text-transparent">BUNKER</span>
              </h1>
              <p className="mt-3 text-lg font-bold text-slate-200">הבנקר · חדר האנליסטים</p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">
                טפסי דוגמה, יחסים ותובנות קהילתיות בעיצוב לוח אנליסטים. כל הבחירות והסכומים המוצגים כאן להמחשה בלבד.
              </p>
            </div>
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border border-cyan-200/25 bg-cyan-300/[0.06] text-cyan-200 shadow-[0_0_55px_rgba(34,211,238,0.14)] sm:h-36 sm:w-36"
            >
              <Atom size={76} strokeWidth={1.2} />
              <span className="absolute -bottom-2 -left-2 rounded-full border border-lime-200/30 bg-slate-950 px-3 py-1 font-mono text-xs font-black text-lime-200">E=mc²</span>
            </motion.div>
          </div>
          <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-[11px] font-semibold text-cyan-100/60">
            <span className="flex items-center gap-2"><Activity size={14} className="text-lime-300" /> COMMUNITY INSIGHTS</span>
            <span className="rounded-full border border-amber-200/15 bg-amber-200/[0.04] px-3 py-1 text-amber-100/80">DEMO BOARD · NOT LIVE PICKS</span>
          </div>
        </motion.header>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">ANALYST ACCUMULATOR</p>
                <h2 className="mt-1 text-2xl font-black text-white">טופס משולב</h2>
              </div>
              <span className="font-mono text-[10px] text-slate-500">ED · SAMPLE 001</span>
            </div>

            <motion.article
              whileHover={{ y: -5, scale: 1.005 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/25 bg-slate-950/85 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-7"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/[0.08] blur-3xl" />
              <div className="relative flex items-center justify-between gap-3 border-b border-dashed border-white/[0.12] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200"><ScanLine size={22} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">EINSTEIN ANALYSTS</p>
                    <h3 className="mt-0.5 text-base font-black text-white">כרטיס צבירה · 2 בחירות</h3>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/25 bg-amber-200/[0.07] px-3 py-1.5 text-xs font-black text-amber-100">
                  <Clock3 size={13} /> בהמתנה
                </span>
              </div>

              <div className="relative mt-4 space-y-3">
                {DEMO_LEGS.map((leg, index) => (
                  <motion.div
                    key={leg.home}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.12, duration: 0.4 }}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition duration-300 hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-slate-900 font-mono text-[10px] font-black text-cyan-200">{leg.initials[0]}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-white" dir="ltr">{leg.home} <span className="text-slate-600">vs</span> {leg.away}</p>
                          <p className="mt-1 text-[10px] text-slate-500">כדורגל · משחק לדוגמה</p>
                        </div>
                      </div>
                      <ChevronLeft size={16} className="shrink-0 text-slate-600" />
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lime-300/20 bg-slate-900 font-mono text-[10px] font-black text-lime-200">{leg.initials[1]}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                      <p className="text-xs font-bold text-slate-300">{leg.market}</p>
                      <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 font-mono text-sm font-black text-cyan-100">{leg.odds.toFixed(2)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <span className="text-[10px] font-semibold text-slate-500">יחס משולב לדוגמה</span>
                  <motion.p key={TOTAL_ODDS} initial={{ opacity: 0.5, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-1 font-mono text-2xl font-black text-white">{TOTAL_ODDS.toFixed(2)}</motion.p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <label htmlFor="bunker-stake" className="text-[10px] font-semibold text-slate-500">סכום הדגמה (₪)</label>
                  <input
                    id="bunker-stake"
                    type="number"
                    min="1"
                    max="100000"
                    value={stake}
                    onChange={(event) => setStake(Math.max(1, Math.min(100000, Number(event.target.value) || 1)))}
                    className="mt-1 block w-full bg-transparent font-mono text-2xl font-black text-cyan-100 outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
                  />
                </div>
              </div>

              <div className="relative mt-3 flex items-center justify-between rounded-xl border border-lime-300/20 bg-lime-300/[0.045] px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-300"><TrendingUp size={15} className="text-lime-300" /> החזר תיאורטי לדוגמה</span>
                <motion.span key={potentialReturn} initial={{ opacity: 0.5, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="font-mono text-xl font-black text-lime-200">₪{potentialReturn.toFixed(2)}</motion.span>
              </div>
              <p className="relative mt-3 text-[10px] leading-5 text-slate-500">1.56 × 1.49 ≈ 2.32 · החישוב להמחשה ואינו מייצג טופס פעיל או הצעה להימור.</p>
            </motion.article>

            <div className="grid gap-3 sm:grid-cols-2">
              {DEMO_LEGS.map((leg, index) => (
                <motion.article
                  key={`pick-${leg.home}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-4 transition-colors hover:border-cyan-300/25"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">ANALYST PICK · DEMO</span>
                    <BadgeCheck size={15} className="text-cyan-300/70" />
                  </div>
                  <p className="mt-3 text-sm font-black text-white" dir="ltr">{leg.home} vs {leg.away}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-[10px] text-slate-500">{leg.market}</span>
                    <span className="font-mono text-lg font-black text-cyan-100">{leg.odds.toFixed(2)}</span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-100/80"><Clock3 size={12} /> בהמתנה · סטטוס המחשה</span>
                </motion.article>
              ))}
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
            className="flex flex-col gap-5"
          >
            <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/25 bg-gradient-to-br from-cyan-950/70 via-slate-950 to-slate-950 p-6 shadow-[0_20px_70px_rgba(8,145,178,0.1)] sm:p-7">
              <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/[0.08] blur-3xl" />
              <div className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                <Sparkles size={15} /> COMMUNITY INSIGHTS
              </div>
              <h2 className="relative mt-3 text-2xl font-black text-white">קוראים את הטופס</h2>
              <div className="relative mt-5 space-y-3">
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs font-black text-cyan-100">יחס כפול — תנודתיות כפולה</p>
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-400">כל בחירה נוספת מעלה את היחס המצטבר, אך גם מקטינה את הסיכוי שכל הבחירות יצליחו.</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs font-black text-lime-100">המתנה אינה המלצה</p>
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-400">תגית “בהמתנה” היא סטטוס עיצובי לדוגמה בלבד — אין כאן מעקב אחר משחקים או אנליסטים בזמן אמת.</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs font-black text-white">חישוב שקוף</p>
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-400">החזר תיאורטי = סכום הדגמה × יחס. בפועל תנאי מפעיל, עמלות ותוצאות עשויים לשנות את הסכום.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-amber-200/15 bg-amber-200/[0.035] p-5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-100">
                <ShieldCheck size={15} /> לוח דוגמה · לא נתונים חיים
              </div>
              <p className="mt-2 text-[11px] leading-6 text-slate-400">
                הקבוצות, היחסים, סכום ההדגמה והסטטוסים כאן הם תוכן המחשה בלבד. אין מדובר בבחירות פעילות של אנליסטים, בהמלצה, בתחזית או בהבטחה לתוצאה.
              </p>
            </div>

            <Link href="/drop" className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 text-sm font-bold text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100">
              חזרה לדרופ
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            </Link>
          </motion.aside>
        </div>
      </section>
      <CommunityFooter />
    </main>
  );
}
