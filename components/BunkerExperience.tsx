"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Atom,
  BrainCircuit,
  ChartNoAxesCombined,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Navbar from "./Navbar";
import CommunityFooter from "./CommunityFooter";

const COMPLETED_KEY = "drop-completed";
const DEMO_LEGS = [
  { title: "בחירת הדגמה א׳", detail: "הסתברות משוערת לאירוע בודד" },
  { title: "בחירת הדגמה ב׳", detail: "הסתברות משוערת לאירוע בודד" },
  { title: "בחירת הדגמה ג׳", detail: "הסתברות משוערת לאירוע בודד" },
];

type AccessState = "checking" | "granted" | "locked";

export default function BunkerExperience() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [probabilities, setProbabilities] = useState([90, 90, 90]);

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

  const combined = useMemo(
    () => probabilities.reduce((chance, probability) => chance * (probability / 100), 1),
    [probabilities]
  );
  const combinedPercent = combined * 100;
  const fairOdds = combined > 0 ? 1 / combined : 0;

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
          <h1 className="mt-3 text-3xl font-black text-white">הבונקר נפתח אחרי דרופ</h1>
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
                <BrainCircuit size={18} /> Einstein Intelligence Lab
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">
                THE <span className="bg-gradient-to-l from-cyan-200 via-cyan-400 to-lime-300 bg-clip-text text-transparent">BUNKER</span>
              </h1>
              <p className="mt-3 text-lg font-bold text-slate-200">הבונקר · מעבדת ההסתברויות</p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">
                חדר הבקרה נפתח. שחקו עם ההסתברויות, בחנו איך צירוף אירועים משנה את הסיכוי, ותנו למתמטיקה לדבר.
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
          <div className="relative mt-8 flex items-center gap-2 border-t border-white/[0.08] pt-4 text-[11px] font-semibold text-cyan-100/60">
            <Zap size={14} className="text-lime-300" /> מערכת חישוב אינטראקטיבית · מצב הדגמה
          </div>
        </motion.header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="rounded-[1.75rem] border border-white/[0.09] bg-slate-950/75 p-5 backdrop-blur-xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">ACCUMULATOR SIMULATOR</p>
                <h2 className="mt-2 text-2xl font-black text-white">בנו כרטיס הדגמה</h2>
              </div>
              <ChartNoAxesCombined className="text-cyan-300" size={26} />
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-400">שנו את ההסתברות של כל אירוע וראו את הסיכוי המשולב מתעדכן בזמן אמת.</p>

            <div className="mt-6 space-y-3">
              {DEMO_LEGS.map((leg, index) => (
                <label key={leg.title} className="block rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-cyan-300/25">
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-extrabold text-white">{leg.title}</span>
                      <span className="mt-1 block text-[10px] text-slate-500">{leg.detail}</span>
                    </span>
                    <span className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 font-mono text-lg font-black text-cyan-200">
                      {probabilities[index]}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="99"
                    value={probabilities[index]}
                    onChange={(event) => {
                      const next = [...probabilities];
                      next[index] = Number(event.target.value);
                      setProbabilities(next);
                    }}
                    className="mt-4 h-1.5 w-full cursor-pointer accent-cyan-300"
                    aria-label={`${leg.title}: ${probabilities[index]} אחוז`}
                  />
                  <span className="mt-1 flex justify-between font-mono text-[9px] text-slate-600"><span>1%</span><span>99%</span></span>
                </label>
              ))}
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            className="flex flex-col gap-5"
          >
            <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/25 bg-gradient-to-br from-cyan-950/70 via-slate-950 to-slate-950 p-6 shadow-[0_20px_70px_rgba(8,145,178,0.1)] sm:p-7">
              <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/[0.08] blur-3xl" />
              <div className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                <Sparkles size={15} /> COMBINED PROBABILITY
              </div>
              <div className="relative mt-5 flex items-end gap-2">
                <motion.span key={combinedPercent.toFixed(1)} initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-6xl font-black leading-none text-white sm:text-7xl">
                  {combinedPercent.toFixed(1)}%
                </motion.span>
              </div>
              <p className="relative mt-3 text-xs text-cyan-100/60">הסיכוי שכל שלושת אירועי ההדגמה יתרחשו</p>
              <div className="relative mt-6 flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3">
                <span className="text-xs font-semibold text-slate-400">יחס הוגן תיאורטי</span>
                <span className="font-mono text-xl font-black text-lime-200">{fairOdds.toFixed(2)}</span>
              </div>
              <p className="relative mt-3 text-[10px] leading-5 text-slate-500">חישוב לימודי בלבד: מכפלת ההסתברויות, בהנחת עצמאות בין האירועים.</p>
            </div>

            <div className="rounded-[1.5rem] border border-amber-200/15 bg-amber-200/[0.035] p-5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-100">
                <ShieldCheck size={15} /> שקיפות לפני הכול
              </div>
              <p className="mt-2 text-[11px] leading-6 text-slate-400">
                המספרים בכרטיס הם ערכי הדגמה שתוכלו לשנות — הם אינם תחזיות, נתוני משחקים חיים או הבטחה לזכייה. בהימורים אמיתיים, הסיכוי בפועל עשוי להיות שונה; אירועים תלויים אינם מחושבים היטב באמצעות מכפלה פשוטה.
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
