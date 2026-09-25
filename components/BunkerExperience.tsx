"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Atom, BrainCircuit, LockKeyhole, ShieldCheck } from "lucide-react";
import Navbar from "./Navbar";
import CommunityFooter from "./CommunityFooter";
import BunkerDeepDive from "./BunkerDeepDive";

const COMPLETED_KEY = "drop-completed";
type AccessState = "checking" | "granted" | "locked";

export default function BunkerExperience() {
  const [access, setAccess] = useState<AccessState>("checking");
  const reduced = useReducedMotion();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COMPLETED_KEY);
      const record = raw ? JSON.parse(raw) as { code?: unknown; item?: { name?: unknown } } : null;
      setAccess(record && typeof record.code === "string" && typeof record.item?.name === "string" ? "granted" : "locked");
    } catch {
      setAccess("locked");
    }
  }, []);

  if (access === "checking") {
    return (
      <main className="min-h-screen">
        <Navbar hebrewBrand />
        <div className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-6 text-cyan-200">
          <Atom className="animate-spin" size={34} aria-label="טוען הרשאה" />
        </div>
        <CommunityFooter hebrewBrand />
      </main>
    );
  }

  if (access === "locked") {
    return (
      <main className="min-h-screen">
        <Navbar hebrewBrand />
        <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-200 shadow-[0_0_48px_rgba(34,211,238,0.12)]"><LockKeyhole size={34} /></div>
          <p className="mt-6 text-xs font-black text-emerald-300">הגישה נעולה</p>
          <h1 className="mt-3 text-3xl font-black text-white">הבנקר נפתח אחרי דרופ</h1>
          <p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">השלימו דרופ ושמרו את תוצאת הזכייה במכשיר הזה כדי לפתוח את דוח האנליסט של איינשטיין דרופ.</p>
          <Link href="/drop" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-300 to-lime-300 px-6 py-3 font-black text-slate-950 transition hover:brightness-110">
            <ArrowLeft size={18} /> מעבר לדרופ
          </Link>
        </section>
        <CommunityFooter hebrewBrand />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#050a08]">
      <Navbar hebrewBrand />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-400/[0.08] blur-[100px]" />
        <div className="absolute right-[-180px] top-[45%] h-[380px] w-[380px] rounded-full bg-lime-400/[0.05] blur-[100px]" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8 sm:px-8 sm:pt-14">
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-7 overflow-hidden rounded-[2rem] border border-emerald-300/25 bg-gradient-to-bl from-[#0d2419] via-[#080e0d] to-[#141209] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] sm:p-10"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(34,211,238,.08) 1px,transparent 1px)", backgroundSize: "34px 34px", maskImage: "linear-gradient(to bottom,black,transparent 80%)" }} />
          <div className="relative flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-3 py-1.5 text-xs font-bold text-emerald-200"><ShieldCheck size={13} /> הדרופ הושלם · הגישה לדוח נפתחה</div>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-emerald-200"><BrainCircuit size={18} /> איינשטיין דרופ · מחלקת המחקר</p>
              <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-7xl"><span className="bg-gradient-to-l from-emerald-100 via-emerald-300 to-[#d4af37] bg-clip-text text-transparent">הבנקר</span></h1>
              <p className="mt-4 text-xl font-bold text-white sm:text-2xl">דוח מודיעין ספורטיבי · ניתוח לפני המשחק</p>
              <p className="mt-3 max-w-xl text-sm leading-8 text-slate-300">אוסטריה–ישראל והולנד–גרמניה: פירוק בחירות מעל 2.5 שערים, קריאת מחיר השוק, מסגרת טקטית וניתוח סיכון–תשואה.</p>
            </div>
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border border-[#d4af37]/35 bg-emerald-300/[0.06] text-emerald-200 shadow-[0_0_55px_rgba(16,185,129,0.14)] sm:h-36 sm:w-36"
            >
              <Atom size={76} strokeWidth={1.2} />
              <span className="absolute -bottom-2 -left-2 rounded-full border border-[#d4af37]/30 bg-[#080e0d] px-3 py-1 text-xs font-bold text-[#e8ca75]">מחקר לפני החלטה</span>
            </motion.div>
          </div>
          <div className="relative mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-[10px] font-semibold text-cyan-100/60">
            <span className="text-xs text-emerald-100/70">דוח קדם-משחק · מבוסס על פרטי הטופס שנמסרו</span>
            <span className="text-xs text-[#e8ca75]">שתי בחירות · יחס משולב 2.32</span>
          </div>
        </motion.header>

        <BunkerDeepDive />
      </section>
      <CommunityFooter hebrewBrand />
    </main>
  );
}
