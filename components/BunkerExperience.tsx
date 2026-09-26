"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Atom, BrainCircuit, LockKeyhole, ShieldCheck } from "lucide-react";
import Navbar from "./Navbar";
import CommunityFooter from "./CommunityFooter";
import BunkerDeepDive from "./BunkerDeepDive";
import report from "./bunker/reportData";
import { useFreshPageView } from "./useFreshPageView";
import { consumeBunkerEntry } from "./drop/bunkerEntry";

type AccessState = "checking" | "granted" | "locked";

function LocalClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat("he-IL", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(new Date()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);
  return <span className="text-cyan-100/50">שעה מקומית: <bdi className="font-mono">{time}</bdi></span>;
}

export default function BunkerExperience() {
  useFreshPageView();
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    setAccess(consumeBunkerEntry() ? "granted" : "locked");
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setAccess("locked");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-200 shadow-[0_0_48px_rgba(34,211,238,0.12)]"><LockKeyhole size={34} /></div>
          <p className="mt-6 text-xs font-black text-cyan-300">הגישה לדוח נעולה</p>
          <h1 className="mt-3 text-3xl font-black text-white">הבנקר נפתח לאחר אימות קוד ודרופ</h1>
          <p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">הזינו קוד גישה והשלימו את הדרופ בכל כניסה מחדש. רענון וקישור שמור אינם פותחים את הדוח.</p>
          <Link href="/drop" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-300 to-lime-300 px-6 py-3 font-black text-slate-950 transition hover:brightness-110">
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
          className="relative mb-7 overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950/80 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,.08) 1px, transparent 1px),linear-gradient(90deg,rgba(34,211,238,.08) 1px,transparent 1px)", backgroundSize: "34px 34px", maskImage: "linear-gradient(to bottom,black,transparent 80%)" }} />
          <div className="relative flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.07] px-3 py-1.5 text-[10px] font-black text-emerald-200"><ShieldCheck size={13} /> הדרופ הושלם · הדוח פתוח לצפייה</div>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-cyan-200"><BrainCircuit size={18} /> איינשטיין דרופ · שולחן האנליסט</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl"><span className="bg-gradient-to-l from-cyan-200 via-cyan-400 to-lime-300 bg-clip-text text-transparent">הבנקר</span></h1>
              <p className="mt-3 text-lg font-bold text-slate-200">{report.picks.length ? `דוח קדם־משחק · ניתוח ${report.picks.length} בחירות שערים` : "דוח קדם־משחק · סריקת משחקי היום"}</p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">{report.picks.length ? `${report.picks.map((pick) => `${pick.home}–${pick.away}`).join(" ו־")}: בחינת קו מעל 2.5 שערים, ספי האיזון והסיכון בטופס משולב.` : "בחירות יופיעו כאן רק לאחר אימות משחקים קרובים, נתוני שחקנים ויחסים עדכניים."} {report.mode === "demo" ? "נתוני הדגמה סינתטיים." : report.status === "unavailable" ? "ממתינים לעדכון מנתוני הספק." : `מקור הנתונים: ${report.source}.`}</p>
            </div>
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border border-cyan-200/25 bg-cyan-300/[0.06] text-cyan-200 shadow-[0_0_55px_rgba(34,211,238,0.14)] sm:h-36 sm:w-36"
            >
              <Atom size={76} strokeWidth={1.2} />
              <span className="absolute -bottom-2 -left-2 rounded-full border border-lime-200/30 bg-slate-950 px-3 py-1 text-xs font-black text-lime-200">קודם בודקים, אחר כך מעריכים</span>
            </motion.div>
          </div>
          <div className="relative mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-[10px] font-semibold text-cyan-100/60">
            <span className="flex items-center gap-2"><motion.span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,.8)]" animate={{ opacity: [.45, 1, .45] }} transition={{ duration: 1.8, repeat: Infinity }} />דוח אנליסט · {report.mode === "demo" ? "סביבת הדגמה" : report.status === "unavailable" ? "ממתינים לסריקת נתונים" : "נתוני משחקים ויחסים עדכניים"}</span>
            <LocalClock />
          </div>
        </motion.header>

        <BunkerDeepDive />
      </section>
      <CommunityFooter />
    </main>
  );
}
