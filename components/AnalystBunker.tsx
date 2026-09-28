"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, Atom, BarChart3, CalendarClock, ClipboardList, Info, LockKeyhole, Receipt, ShieldCheck, Target } from "lucide-react";
import Navbar from "./Navbar";
import CommunityFooter from "./CommunityFooter";
import report from "./analyst/reportData";
import { isBunkerPublished } from "./analyst/reportData";
import type { AnalystPick, AnalystSlip, VenueStats } from "./analyst/reportData";
import { isDropVerified } from "./drop/session";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatDate = (value: string) => new Date(value).toLocaleString("he-IL", {
  timeZone: "Asia/Jerusalem", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
});

function FormCard({ team, location, stats, reduced }: { team: string; location: string; stats: VenueStats; reduced: boolean }) {
  const frequency = stats.overTwo / stats.matches;
  return <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
    <p className="text-sm font-black text-white">{team} <span className="text-xs font-normal text-slate-400">· {location}</span></p>
    <div className="mt-3 flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-slate-400">3+ שערים במדגם</span>
      <span className="font-mono text-lg font-black text-cyan-100" dir="ltr">{stats.overTwo}/{stats.matches}</span>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="img" aria-label={`${stats.overTwo} מתוך ${stats.matches} משחקים עם שלושה שערים ומעלה`}>
      <motion.div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-cyan-300" initial={reduced ? false : { width: 0 }} whileInView={{ width: `${frequency * 100}%` }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.8 }} />
    </div>
    <p className="mt-3 text-[11px] text-slate-400">שערים למשחק · כבשה <bdi dir="ltr" className="font-mono text-white">{(stats.goalsFor / stats.matches).toFixed(1)}</bdi> · ספגה <bdi dir="ltr" className="font-mono text-white">{(stats.goalsAgainst / stats.matches).toFixed(1)}</bdi></p>
  </div>;
}

function SlipCard({ slip, reduced }: { slip: AnalystSlip; reduced: boolean }) {
  return <motion.section
    aria-label="הטופס המשולב הפעיל"
    initial={reduced ? false : { opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: reduced ? 0 : 0.5 }}
    className="relative overflow-hidden rounded-[1.7rem] border border-amber-300/25 bg-gradient-to-br from-[#1d1607] via-[#0d0c07] to-[#0a0d13] p-6 shadow-[0_24px_75px_rgba(0,0,0,.32)] sm:p-8"
  >
    <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-amber-400/[0.08] blur-[80px]" aria-hidden="true" />
    <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
      <p className="flex items-center gap-2 text-[11px] font-black text-amber-100"><Receipt size={15} /> {slip.label}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Active ticket · טופס פעיל</p>
    </div>
    <ol className="relative mt-5 space-y-3">
      {slip.legs.map((leg, index) => <li key={`${leg.home}-${leg.away}`} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-3.5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-black text-amber-200/70" dir="ltr">#{index + 1}</p>
          <p className="mt-1 text-sm font-black text-white sm:text-base">{leg.home} <span className="text-cyan-200/60">×</span> {leg.away}</p>
          <p className="mt-2 inline-block rounded-md border border-cyan-300/20 bg-cyan-300/[0.06] px-2.5 py-1 text-[11px] font-bold text-cyan-100" dir="ltr">{leg.market}</p>
        </div>
        <div className="ml-auto rounded-xl border border-amber-200/25 bg-amber-200/[0.06] px-4 py-2 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-100/70">Odds</p>
          <p className="font-mono text-xl font-black text-amber-100" dir="ltr">{leg.odds.toFixed(2)}</p>
        </div>
      </li>)}
    </ol>
    <div className="relative mt-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-100/85">סה״כ יחס · Total Odds</p>
        <p className="mt-1 text-[11px] text-slate-400">{slip.legs.length} selections · טיפס משולב אחד</p>
      </div>
      <p className="ml-auto font-mono text-3xl font-black text-amber-100" dir="ltr">{slip.totalOdds.toFixed(2)}</p>
    </div>
    <p className="relative mt-3 text-[10px] leading-5 text-slate-500">טופס הפעילות של האנליסט. אם אחת הבחירות לא תעמוד ביעדה, הטופס כולו מפסיד — בכפוף לכללי הסליקה.</p>
  </motion.section>;
}

function PickCard({ pick, index, reduced }: { pick: AnalystPick; index: number; reduced: boolean }) {
  const meetings = pick.stats.headToHead;
  const highScoring = meetings.filter((game) => game.homeGoals + game.awayGoals >= 3).length;
  return <motion.article
    initial={reduced ? false : { opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : index * 0.08 }}
    className="relative overflow-hidden rounded-[1.7rem] border border-emerald-300/20 bg-gradient-to-br from-[#0c1b19] via-[#090f14] to-[#0a0d13] p-5 shadow-[0_24px_75px_rgba(0,0,0,.32)] sm:p-7"
  >
    <div className="pointer-events-none absolute -top-20 left-0 h-60 w-60 rounded-full bg-emerald-400/[0.07] blur-[75px]" aria-hidden="true" />
    <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
      <div>
        <p className="flex items-center gap-2 text-[10px] font-black text-emerald-200"><ShieldCheck size={14} /> בחירת אנליסט #{index + 1} · {pick.competition}</p>
        <h2 className="mt-3 text-xl font-black leading-snug text-white sm:text-2xl">{pick.home} <span className="text-cyan-200/60">×</span> {pick.away}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><CalendarClock size={14} /> {formatDate(pick.kickoff)}</p>
      </div>
      <div className="rounded-xl border border-amber-200/25 bg-amber-200/[0.06] px-4 py-2 text-center">
        <p className="text-[10px] font-bold text-amber-100/80">יחס · {pick.bookmaker}</p>
        <p className="font-mono text-2xl font-black text-amber-100" dir="ltr">{pick.odds.toFixed(2)}</p>
      </div>
    </div>

    <div className="relative mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
        <p className="flex items-center gap-2 text-[10px] font-bold text-emerald-200"><Target size={14} /> הבחירה והנימוק</p>
        <h3 className="mt-2 text-lg font-black text-white">{pick.market}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-200">{pick.summary}</p>
        <p className="mt-3 text-[10px] text-slate-500">מקור הנתונים: {pick.source}</p>
      </div>
      <div className="rounded-2xl border border-cyan-300/10 bg-black/20 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-cyan-100"><BarChart3 size={15} /> מפת הסתברויות · הנחת האנליסט</p>
        {pick.analystProbability !== null ? <div className="mt-4 space-y-3">
          {[
            { label: "הערכת האנליסט", value: pick.analystProbability, color: "bg-gradient-to-l from-cyan-300 to-emerald-400" },
            { label: "סף איזון לפי היחס", value: pick.breakEven, color: "bg-gradient-to-l from-amber-200 to-amber-500" },
          ].map((bar) => <div key={bar.label}>
            <div className="mb-1.5 flex justify-between text-[11px] text-slate-300"><span>{bar.label}</span><span className="font-mono" dir="ltr">{percent(bar.value)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]" role="img" aria-label={`${bar.label}: ${percent(bar.value)}`}>
              <motion.div className={`h-full rounded-full ${bar.color}`} initial={reduced ? false : { width: 0 }} whileInView={{ width: `${bar.value * 100}%` }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.8 }} />
            </div>
          </div>)}
          <p className="text-[10px] leading-5 text-slate-400">הסתברות אנושית שהוזנה ידנית. סף האיזון הוא 1 חלקי היחס.</p>
        </div> : <p className="mt-3 text-xs leading-6 text-slate-400">האנליסט לא סיפק הסתברות מספרית. סף האיזון לפי היחס הוא {percent(pick.breakEven)}; אין כאן תחזית ממוחשבת.</p>}
      </div>
    </div>

    <div className="relative mt-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-black text-white"><Activity size={15} className="text-emerald-300" /> נתוני כושר שהוזנו ידנית</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormCard team={pick.home} location="בבית" stats={pick.stats.home} reduced={reduced} />
        <FormCard team={pick.away} location="בחוץ" stats={pick.stats.away} reduced={reduced} />
      </div>
    </div>

    <div className="relative mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <p className="text-xs font-black text-white">מפגשים ישירים במדגם האנליסט</p>
      {meetings.length ? <>
        <p className="mt-2 text-xs text-cyan-100">{highScoring} מ־{meetings.length} הסתיימו עם שלושה שערים ומעלה</p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/[0.07]" role="img" aria-label={`${highScoring} מתוך ${meetings.length} מפגשים עם שלושה שערים ומעלה`}>
          <div className="bg-gradient-to-l from-emerald-400 to-cyan-300" style={{ width: `${highScoring / meetings.length * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{meetings.map((game, i) => <div key={`${game.date}-${i}`} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-center">
          <p className="font-mono text-[10px] text-slate-500" dir="ltr">{game.date}</p>
          <p className="font-mono text-xs font-black text-white" dir="ltr">{game.homeGoals} : {game.awayGoals}</p>
        </div>)}</div>
      </> : <p className="mt-2 text-xs text-slate-400">לא הוזנו מפגשים ישירים לדוח זה.</p>}
    </div>

    <div className="relative mt-5 grid gap-4 border-t border-white/[0.08] pt-5 sm:grid-cols-2">
      <div><p className="text-xs font-black text-emerald-200">למה האנליסט בחר במשחק?</p><ul className="mt-2 space-y-2">{pick.factors.map((factor) => <li key={factor} className="text-xs leading-6 text-slate-300">• {factor}</li>)}</ul></div>
      <div><p className="flex items-center gap-2 text-xs font-black text-amber-100"><Info size={14} /> מה עלול לשנות את ההערכה?</p><ul className="mt-2 space-y-2">{pick.risks.map((risk) => <li key={risk} className="text-xs leading-6 text-slate-400">• {risk}</li>)}</ul></div>
    </div>
  </motion.article>;
}

export default function AnalystBunker({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const [now, setNow] = useState<number | null>(null);
  // The analyst ships the report file with the site: while it is empty the
  // bunker is not published at all, so access stays disabled for everyone.
  const published = isBunkerPublished(report);
  // Both the standalone route and the embedded landing-page section are
  // session-gated: only visitors who completed the drop flow in this tab may
  // see the report. Bookmarks, shared URLs and direct links get a locked
  // teaser (route visits are sent back to the drop flow itself).
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!published || allowed !== null) return;
    if (isDropVerified()) {
      setAllowed(true);
      return;
    }
    setAllowed(false);
    if (!embedded) router.replace("/drop");
  }, [published, allowed, embedded, router]);
  useEffect(() => {
    const check = () => setNow(Date.now());
    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const upcoming = now === null ? report.picks : report.picks.filter((pick) => Date.parse(pick.kickoff) > now);
  const Heading = embedded ? "h2" : "h1";

  const content = <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-8 sm:py-12">
      <header className="relative overflow-hidden rounded-[1.7rem] border border-emerald-300/20 bg-gradient-to-br from-[#0c2018] via-[#081416] to-[#0a0d14] p-6 shadow-[0_25px_85px_rgba(0,0,0,.3)] sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.08] blur-[90px]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] px-3 py-1.5 text-[10px] font-black text-emerald-100"><ClipboardList size={14} /> דוח אנליסט אנושי · בחירות ידניות</span>
           <Heading className="mt-5 text-3xl font-black text-white sm:text-5xl">באנקר האנליסט</Heading>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">הבחירות, הנתונים והנימוקים כאן נכתבים ומוזנים ידנית על ידי {report.analyst}.</p>
          <p className="mt-3 text-xs text-emerald-200/80">{report.asOf ? `נערך לאחרונה: ${formatDate(report.asOf)}` : "ממתינים לפרסום בחירות אנליסט מאומתות."}</p>
          <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3.5 py-2.5 text-[11px] font-black text-amber-100" role="note">
            <LockKeyhole size={14} className="shrink-0" />
            הבאנקר ננעל אוטומטית לאחר ריפרש או עדכון אתר
          </p>
        </div>
      </header>

      {report.slip && <SlipCard slip={report.slip} reduced={reduced} />}

      {upcoming.length ? <div className="space-y-5">{upcoming.map((pick, index) => <PickCard key={pick.id} pick={pick} index={index} reduced={reduced} />)}</div> :
        <section className="rounded-[1.7rem] border border-emerald-300/15 bg-slate-950/80 p-7 text-center sm:p-10" role="status">
          <ClipboardList size={30} className="mx-auto text-emerald-300/70" />
          <h2 className="mt-4 text-xl font-black text-white">{report.slip ? "הטיפס המשולב מוצג למעלה" : report.picks.length ? "כל הבחירות שפורסמו כבר יצאו לדרך" : "בחירות האנליסט טרם פורסמו"}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">{report.slip ? "לטיפס הפעיל אין עדיין ניתוח מלא בעמוד. לאחר סקירה ידנית יפורסמו כאן היחסים, נתוני הכושר, הנימוקים והגרפים לכל משחק." : report.picks.length ? "כשיועלו בחירות ידניות חדשות, הניתוח המלא יופיע כאן לאחר פרסום האתר." : "הצוות יעלה לכאן בחירות שנבדקו ידנית, כולל יחסים, נתוני כושר, הסברים וגרפים."}</p>
        </section>}
    </div>;

  // Fail-closed locked state for visitors without this tab's drop session:
  // it is what a shared URL, a fresh bookmark or a new tab renders.
  const locked = <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12" role="status">
      <div className="rounded-[1.7rem] border border-emerald-300/15 bg-slate-950/80 p-7 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-200"><LockKeyhole size={24} /></div>
         <Heading className="mt-4 text-2xl font-black text-white sm:text-3xl">באנקר האנליסט נעול</Heading>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">הבחירות הידניות, הטיפס המשולב ונתוני האנליסט זמינים לאחר השלמת הדרופ. השלימו את הדרופ כדי לצפות בדוח המלא.</p>
        <button type="button" onClick={() => router.push("/drop")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-300 to-cyan-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:brightness-110">מעבר לעמוד הדרופ</button>
      </div>
    </section>;

  // No report yet: the entry is visibly disabled for everyone, published or
  // not, so an empty bunker is never presented as if it were live.
  const unpublished = <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12" role="status">
      <div className="rounded-[1.7rem] border border-emerald-300/15 bg-slate-950/80 p-7 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.07] text-emerald-200"><LockKeyhole size={24} /></div>
        <Heading className="mt-4 text-2xl font-black text-white sm:text-3xl">באנקר האנליסט</Heading>
        <p className="mx-auto mt-3 max-w-xl text-base font-black leading-7 text-slate-200">האנליסט עדיין לא פירסם באנקר</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-400">כשיפורסמו בחירות אנליסט ידניות, הדוח המלא יופיע כאן. עד אז הגישה לבאנקר סגורה.</p>
        <button type="button" disabled aria-disabled="true" className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-black text-slate-500">פתיחת באנקר האנליסט</button>
      </div>
    </section>;

  if (!published) {
    if (embedded) return unpublished;
    return <main className="min-h-screen overflow-x-clip">
      <Navbar />
      {unpublished}
      <CommunityFooter />
    </main>;
  }

  // Embedded variant drops the page chrome so the section can sit directly in
  // the landing page's scroll flow beneath the Community Drops block. Without
  // this tab's drop session it only renders the locked teaser above.
  if (embedded) return allowed === true ? content : locked;
  if (allowed !== true) return <main className="min-h-screen overflow-x-clip">
    <Navbar />
    <div className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center gap-3 px-6" role="status">
      <Atom className="animate-spin text-cyan-200" size={34} aria-label="בודקים גישת דרופ" />
      <span className="text-sm font-bold text-slate-400">נדרש קוד דרופ — עוברים לעמוד הדרופ…</span>
    </div>
    <CommunityFooter />
  </main>;
  return <main className="min-h-screen overflow-x-clip">
    <Navbar />
    {content}
    <CommunityFooter />
  </main>;
}
