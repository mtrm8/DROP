"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Atom, BrainCircuit, LockKeyhole, ShieldCheck } from "lucide-react";
import Navbar from "./Navbar";
import CommunityFooter from "./CommunityFooter";
import BunkerDeepDive from "./BunkerDeepDive";
import type { Report } from "./bunker/reportData";
import { evaluateReport, statusLabel, statusSummary } from "./bunker/reportStatus";
import type { ReportStatus } from "./bunker/reportStatus";
import { useFreshPageView } from "./useFreshPageView";

type AccessState = "checking" | "granted" | "locked";
const MEMBER_CODE = "ADIR-DROP-2026";
const MEMBER_SESSION_KEY = "ai-bunker-member-access";
const initialReport: Report = {
  mode: "demo", source: "", asOf: new Date(0).toISOString(), timeZone: "Asia/Jerusalem",
  picks: [], combinedOdds: 0, productOdds: 0, breakEven: 0,
  jointProbability: null, jointFairOdds: null, jointEdge: null,
  status: "no-picks", statusMessage: null, watchlist: [], scanNote: null,
  methodology: "",
};

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

export default function AIBunkerExperience() {
  useFreshPageView();
  const [access, setAccess] = useState<AccessState>("checking");
  const [memberCode, setMemberCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const report = initialReport;
  const [status, setStatus] = useState<ReportStatus | null>(null);

  // The published report is a daily snapshot: resolve what it means for the
  // visitor's clock in the browser, and keep it honest while the tab stays open.
  useEffect(() => {
    const check = () => setStatus(evaluateReport(report, new Date()));
    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, [report]);

  useEffect(() => {
    try {
      setAccess(window.sessionStorage.getItem(MEMBER_SESSION_KEY) === "granted" ? "granted" : "locked");
    } catch {
      setAccess("locked");
    }
  }, []);

  const handleUnlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Tolerate surrounding whitespace and keyboard case so the correct code
    // always unlocks instead of bouncing the member back to the lock.
    if (memberCode.trim().toUpperCase() !== MEMBER_CODE) {
      setCodeError(true);
      return;
    }
    try {
      window.sessionStorage.setItem(MEMBER_SESSION_KEY, "granted");
    } catch {
      // The current view can still open if storage is disabled.
    }
    setMemberCode("");
    setCodeError(false);
    setAccess("granted");
  };

  const handleLock = () => {
    try { window.sessionStorage.removeItem(MEMBER_SESSION_KEY); } catch { /* storage may be disabled */ }
    setAccess("locked");
  };

  // Header copy is driven by the evaluated state: a stale or provider-blocked
  // scan must never claim to show "today's games".
  const state = status?.state ?? null;
  const visiblePicks = status ? status.activePicks : report.picks;

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
        <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-200 shadow-[0_0_48px_rgba(34,211,238,0.12)]"><LockKeyhole size={34} /></div>
          <p className="mt-6 rounded-full border border-amber-200/25 bg-amber-200/[0.07] px-3 py-1.5 text-xs font-black text-amber-100">בפיתוח · IN DEVELOPMENT</p>
           <h1 className="mt-4 text-3xl font-black text-white">באנקר AI - גישה למפתחים</h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">מנוע הנתונים האוטומטי זמין כעת לתצוגה מוקדמת בלבד. הזינו קוד גישה כדי לצפות בסריקה הניסיונית ובבחירות האוטומטיות.</p>
          <form onSubmit={handleUnlock} className="mt-7 w-full max-w-md text-right">
            <label htmlFor="ai-bunker-member-code" className="text-xs font-bold text-cyan-100">קוד זה מיועד רק למפתחים</label>
            <input id="ai-bunker-member-code" type="text" value={memberCode} onChange={(event) => { setMemberCode(event.target.value); setCodeError(false); }} autoComplete="off" spellCheck={false} dir="ltr" className="mt-2 w-full rounded-xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-center font-mono text-base tracking-wide text-white outline-none focus-visible:border-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-300/20" />
            {codeError && <p role="alert" className="mt-2 text-xs text-rose-300">קוד הגישה שגוי. בדקו את הקוד ונסו שוב.</p>}
             <button type="submit" className="mt-4 w-full rounded-xl bg-gradient-to-l from-cyan-300 to-lime-300 px-6 py-3 font-black text-slate-950 transition hover:brightness-110">כניסה לבאנקר AI</button>
          </form>
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
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/[0.07] px-3 py-1.5 text-[10px] font-black text-amber-100"><ShieldCheck size={13} /> בפיתוח · גישת מפתחים פעילה</div>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-cyan-200"><BrainCircuit size={18} /> אינשטיין דרופ · מנוע נתונים אוטומטי</p>
               <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl"><span className="bg-gradient-to-l from-cyan-200 via-cyan-400 to-lime-300 bg-clip-text text-transparent">באנקר AI</span></h1>
              <p className="mt-3 text-lg font-bold text-slate-200">
                {visiblePicks.length
                  ? `סריקת AI · ${visiblePicks.length} בחירות שערים`
                  : state === "no-picks" && report.watchlist?.length
                    ? `מעקב ניסיוני · ${report.watchlist.length} משחקים`
                    : state === "unavailable"
                      ? "סריקת AI · ממתינים לנתוני הספק"
                      : state === "stale"
                        ? "סריקת AI · ממתינים לסריקה הבאה"
                        : state === "started"
                          ? "סריקת AI · משחקי היום כבר התחילו"
                          : "סריקת AI · משחקי היום"}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">
                {visiblePicks.length
                  ? `${visiblePicks.map((pick) => `${pick.home}–${pick.away}`).join(" ו־")}: בחינת קו מעל 2.5 שערים, ספי האיזון והסיכון בטופס משולב.`
                  : state === "no-picks" && report.watchlist?.length
                    ? "משחקי היום מוצגים ככרטיסי מעקב עם מחירי שוק, נתוני מודל כשזמינים, והסבר ברור למידע שטרם אומת."
                    : state === "unavailable"
                      ? "הסריקה לא השלימה קבלת נתונים מהספק, ולכן לא נפתח היום טופס מהמרות. הסקירה תחזור אוטומטית בפעימה הבאה."
                      : state === "stale"
                        ? "הדוח שפורסם בסריקה האחרונה מוצג כמות שהוא. נתוני היום ייכנסו לכאן מיד לאחר שהסריקה המתוזמנת הבאה תסתיים."
                        : state === "started"
                          ? "כל משחקי הסריקה כבר התחילו, ולכן לא ניתן יותר להמר עליהם. הבחירות יעודכנו כאן בפעימת הסריקה הבאה."
                          : "בחירות יופיעו כאן רק לאחר אימות משחקים קרובים, נתוני שחקנים ויחסים עדכניים."}
                {status ? ` ${statusSummary(status, report)}` : ""}
              </p>
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
            <span className="flex items-center gap-2">
              <motion.span
                className={`h-2 w-2 rounded-full ${status?.isLive ? "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,.8)]" : "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,.7)]"}`}
                animate={{ opacity: [.45, 1, .45] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
               {status ? statusLabel(status, report) : "באנקר AI · טוענים את מצב הסריקה"}
            </span>
            <button type="button" onClick={handleLock} className="rounded-lg border border-white/[0.09] px-3 py-1.5 font-semibold text-slate-300 hover:border-cyan-300/30 hover:text-white">נעילת תצוגת AI</button>
            <LocalClock />
          </div>
        </motion.header>

        <BunkerDeepDive key={report.asOf} report={report} />
      </section>
      <CommunityFooter />
    </main>
  );
}
