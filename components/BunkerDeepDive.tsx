"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BarChart3,
  ChevronDown,
  ClipboardList,
  Clock3,
  Crosshair,
  Gauge,
  Info,
  ShieldCheck,
  Star,
  Target,
} from "lucide-react";
import { GoalLaboratory, RiskReward } from "./bunker/ReportSections";
import type { Pick, Report, WatchItem } from "./bunker/reportData";
import { evaluateReport, statusHeadline } from "./bunker/reportStatus";
import type { ReportStatus } from "./bunker/reportStatus";

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function OddsBars({ picks }: { picks: Pick[] }) {
  return (
    <div className="space-y-5">
      {picks.map((pick, index) => {
        const implied = pick.breakEven * 100;
        return (
          <div key={pick.id}>
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="font-bold text-slate-300">{pick.home} · {pick.away}</span>
              <span className="font-mono font-black text-white">{implied.toFixed(2)}%</span>
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
              {pick.model && <span className="absolute inset-y-0 w-0.5 bg-amber-200" style={{ left: `${pick.model.probability * 100}%` }} />}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-500" dir="ltr"><span>0%</span><span>{pick.model ? `מודל: ${percent(pick.model.probability)}` : "50%"}</span><span>100%</span></div>
          </div>
        );
      })}
    </div>
  );
}

function TeamBadge({ team, code, flag }: { team: string; code: string; flag: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-slate-950 shadow-[0_0_24px_rgba(16,185,129,.12)]">
        {flag === "austria" && <span className="absolute inset-0 bg-[linear-gradient(to_bottom,#ed2939_0_33%,#fff_33%_67%,#ed2939_67%)]" />}
        {flag === "netherlands" && <span className="absolute inset-0 bg-[linear-gradient(to_bottom,#ae1c28_0_33%,#fff_33%_67%,#21468b_67%)]" />}
        {flag === "germany" && <span className="absolute inset-0 bg-[linear-gradient(to_bottom,#111_0_33%,#d00_33%_67%,#ffce00_67%)]" />}
        {flag === "israel" && <>
          <span className="absolute inset-x-0 top-[22%] h-[12%] bg-white" />
          <span className="absolute inset-x-0 bottom-[22%] h-[12%] bg-white" />
          <Star size={15} fill="#1d4ed8" className="relative z-10 text-blue-700" />
        </>}
        {!flag && <span className="relative z-10 font-mono text-xs font-black text-cyan-200">{code.slice(0, 3)}</span>}
        <span className="absolute inset-0 bg-black/10" />
      </div>
      <div>
        <p className="text-sm font-black text-white">{team}</p>
        <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-slate-500">{code}</p>
      </div>
    </div>
  );
}

function MatchAnalysis({ pick, index }: { pick: Pick; index: number }) {
  const accent = index === 0 ? "emerald" : "cyan";
  return (
    <Reveal delay={index * 0.08}>
      <article className={`relative overflow-hidden rounded-[1.7rem] border bg-[#080f12]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,.3)] sm:p-7 ${accent === "emerald" ? "border-emerald-300/20" : "border-cyan-300/20"}`}>
        <div className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${accent === "emerald" ? "bg-emerald-400/[0.07]" : "bg-cyan-400/[0.07]"}`} />
        <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <p className="mb-2 text-[9px] font-black text-slate-400">משחק {pick.id} · {pick.fixture ? `${pick.fixture.competition} · ${new Date(pick.fixture.kickoff).toLocaleString("he-IL")}` : "תמונת מצב לפני שריקת הפתיחה"}</p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <TeamBadge team={pick.home} code={pick.homeCode} flag={pick.homeFlag} />
              <span className="font-mono text-xs font-black text-slate-600">נגד</span>
              <TeamBadge team={pick.away} code={pick.awayCode} flag={pick.awayFlag} />
            </div>
          </div>
          <div className="rounded-xl border border-amber-200/20 bg-amber-200/[0.05] px-4 py-2 text-center">
            <p className="text-[8px] font-black text-amber-100/80">יחס השוק</p>
            <p className="font-mono text-2xl font-black text-amber-100">{pick.odds.toFixed(2)}</p>
          </div>
        </header>

        <div className="relative mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4 sm:p-5">
            <p className="text-[9px] font-black text-emerald-200/80">הבחירה בשוק</p>
            <h4 className="mt-2 flex items-center gap-2 text-lg font-black text-white"><Target size={19} className="text-emerald-300" /> {pick.market}</h4>
            <p className="mt-2 text-xs leading-6 text-slate-400">סופרים את השערים של שתי הנבחרות יחד: שלושה ומעלה מזכים את הבחירה; עד שני שערים מפסידים אותה.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-red-300/10 bg-red-400/[0.035] p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">0–2 שערים</span>
                <p className="mt-1 text-xs font-black text-slate-300">הבחירה מפסידה</p>
              </div>
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.045] p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">3+ שערים</span>
                <p className="mt-1 text-xs font-black text-emerald-100">הבחירה זוכה</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[9px] font-black text-cyan-200"><BarChart3 size={14} /> סף האיזון לפי היחס</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">יחס {pick.odds.toFixed(2)} מציב את סף האיזון על {percent(pick.breakEven)}. {pick.model ? `לפי מדגם של ${pick.model.homeGames} משחקי בית של ${pick.home} ו־${pick.model.awayGames} משחקי חוץ של ${pick.away}, מודל השערים מציע ${percent(pick.model.probability)} לשלושה שערים ומעלה. הפער מהסף הוא ${percent(pick.model.probability - pick.breakEven)} נקודות אחוז.` : "לא התקבל מדגם מספיק לחישוב הסתברות עצמאית למשחק."}</p>
            <div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.025] p-3.5">
              <p className="font-mono text-xs text-cyan-100/80" dir="ltr">1 ÷ {pick.odds.toFixed(2)} × 100 = {percent(pick.breakEven)}</p>
              <p className="mt-1 text-[10px] leading-5 text-slate-400">סף תמחורי בלבד, ללא ניכוי מרווח ההימורים; לא אומדן לסיכוי בפועל.</p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid gap-4 border-t border-white/[0.07] pt-5 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black text-amber-100/80"><Crosshair size={13} /> מה צריך לבדוק לפני הערכת המשחק?</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">המודל מסתמך על שערים במשחקים קודמים, ללא התאמה לרמת היריבה. לפני הסקת מסקנה יש לבדוק גם כושר נוכחי, היעדרויות ומשמעות המשחק.</p>
          </div>
          <ul className="space-y-2">
            {["בדקו הרכבים, חיסורים וכשירות השוערים.", "השוו את רמת היריבות במדגם למשחק הקרוב.", "בחנו נתוני שערים צפויים ממקור מאומת, אם ישנם.", "בדקו את המסגרת התחרותית ואת כללי סליקת הטופס."].map((question) => (
              <li key={question} className="flex items-start gap-2 text-[10px] leading-5 text-slate-400">
                <ChevronDown size={13} className="mt-0.5 shrink-0 rotate-[-90deg] text-emerald-300" />{question}
              </li>
            ))}
          </ul>
        </div>

        {pick.fixture && <p className="relative mt-3 text-[10px] leading-5 text-slate-300">{pick.home}: {pick.fixture.lineup.homeKind === "confirmed" ? `הרכב מאושר, ${pick.fixture.lineup.homeChanges} שינויים מהמשחק הקודם` : "הרכב משוער על בסיס המשחק הקודם"} · {pick.away}: {pick.fixture.lineup.awayKind === "confirmed" ? `הרכב מאושר, ${pick.fixture.lineup.awayChanges} שינויים מהמשחק הקודם` : "הרכב משוער על בסיס המשחק הקודם"}. היחס מ־{pick.fixture.bookmaker} בעת הסריקה, עודכן ב־{new Date(pick.fixture.oddsUpdatedAt).toLocaleString("he-IL")}; יש לאמת את היחס לפני החלטה.</p>}
        {pick.fixture && <div className="relative mt-4 grid gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2">
          {([{ team: pick.home, players: pick.fixture.players.home }, { team: pick.away, players: pick.fixture.players.away }]).map(({ team, players }) => <div key={team} className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <p className="text-xs font-bold text-white">{team} · שחקני ההרכב הבולטים ({pick.fixture!.players.season})</p>
            <p className="mt-1 text-[10px] text-slate-400">נתוני עונה במפעל · שערים, בישולים, בעיטות ומסירות מפתח</p>
            <ul className="mt-2 space-y-1.5">{[...players].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.minutes - a.minutes).slice(0, 3).map((player) =>
              <li key={player.name} className="text-[10px] leading-5 text-slate-300">{player.name} · {player.minutes} דק׳ · {player.goals} שערים · {player.assists} בישולים · {player.shots ?? "—"} בעיטות ({player.shotsOnTarget ?? "—"} למסגרת) · {player.keyPasses ?? "—"} מסירות מפתח · ציון {player.rating?.toFixed(1) ?? "—"}</li>
            )}</ul>
          </div>)}
        </div>}
        <div className="relative mt-4 flex flex-wrap gap-2">
          {[pick.model ? `ממוצע שערים במודל: ${pick.model.mean.toFixed(2)} למשחק` : "מדגם: אינו מספיק לחיזוי", "מפגשים ישירים: לא נותחו", "נתוני xG: לא נמסרו"].map((item) => (
            <span key={item} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[9px] font-semibold text-slate-500">{item}</span>
          ))}
        </div>
      </article>
    </Reveal>
  );
}

function WatchlistCard({ item, index, timeZone }: { item: WatchItem; index: number; timeZone: string }) {
  const hasModel = item.probability !== null && item.edge !== null;
  const metrics = [
    { label: "יחס שוק · מעל 2.5", value: item.odds === null ? "—" : item.odds.toFixed(2), color: "text-amber-100" },
    { label: "הסתברות מודל", value: item.probability === null ? "—" : percent(item.probability), color: "text-cyan-100" },
    { label: "יחס הוגן במודל", value: item.fairOdds === null ? "—" : item.fairOdds.toFixed(2), color: "text-white" },
    { label: "פער מול השוק", value: item.edge === null ? "—" : `${item.edge >= 0 ? "+" : ""}${percent(item.edge)}`, color: item.edge === null ? "text-slate-500" : item.edge >= 0 ? "text-emerald-200" : "text-rose-200" },
  ];

  return (
    <li>
      <Reveal delay={index * 0.07}>
        <article className="relative h-full overflow-hidden rounded-[1.6rem] border border-cyan-300/15 bg-gradient-to-br from-[#101c21] via-[#0a1217] to-[#080d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,.3)] transition-colors hover:border-cyan-300/30 sm:p-6">
          <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[0.07] blur-[65px]" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-cyan-200/75" dir="ltr">MATCH {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{item.competition}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold ${hasModel ? "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100" : "border-amber-200/25 bg-amber-200/[0.07] text-amber-100"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${hasModel ? "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" : "bg-amber-200 shadow-[0_0_10px_rgba(253,230,138,.7)]"}`} />
              {hasModel ? "מודל מחושב" : "מעקב · נתונים חלקיים"}
            </span>
          </div>

          <div className="relative py-5">
            <h4 className="text-lg font-black leading-snug text-white sm:text-xl">{item.home} <span className="mx-1 font-mono text-sm text-cyan-300/60">×</span> {item.away}</h4>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Clock3 size={13} className="text-cyan-300/70" /> שריקת פתיחה <bdi dir="ltr" className="font-mono text-slate-200">{new Date(item.kickoff).toLocaleString("he-IL", { timeZone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</bdi></span>
              {item.bookmaker && <span>יחס מ־{item.bookmaker}</span>}
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3">
                <p className="text-[10px] font-semibold leading-4 text-slate-400">{metric.label}</p>
                <p className={`mt-2 font-mono text-lg font-black tabular-nums sm:text-xl ${metric.color}`} dir="ltr">{metric.value}</p>
              </div>
            ))}
          </div>

          <p className="relative mt-4 flex items-start gap-2 border-t border-white/[0.07] pt-4 text-xs leading-5 text-slate-400">
            <Info size={14} className="mt-0.5 shrink-0 text-amber-200/75" />
            <span>{item.note || (hasModel ? "הנתונים חושבו, אך לא נמצא צבר שעומד בסף הבחירה." : "נתוני מודל אינם זמינים למשחק זה.")} למעקב בלבד · לא המלצה.</span>
          </p>
        </article>
      </Reveal>
    </li>
  );
}

export default function BunkerDeepDive({ report }: { report: Report }) {
  const [stake, setStake] = useState(100);
  // Whether a match has kicked off, and whether this report is still today's,
  // depend on the visitor's clock. Resolve them in the browser only and re-check
  // every minute so a long-open tab ages the report correctly.
  const [status, setStatus] = useState<ReportStatus | null>(null);
  useEffect(() => {
    const check = () => setStatus(evaluateReport(report, new Date()));
    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, [report]);

  // Only matches that have not kicked off are still actionable. A match that
  // already started must not hide its siblings, which are still bettable.
  const PICKS = status?.activePicks ?? [];
  const demo = status?.state === "demo";
  const theoreticalReturn = stake * report.combinedOdds;
  const netProfit = theoreticalReturn - stake;
  const roundedCombinedImplied = report.breakEven * 100;
  const sourceInputs = PICKS;

  if (!status) return <section className="rounded-2xl border border-cyan-300/20 bg-slate-950 p-7 text-sm text-slate-300" role="status">בודקים את מצב סריקת היום…</section>;

  if (status.state === "stale" || status.state === "started" || PICKS.length === 0) {
    const { title, body } = statusHeadline(status, report);
    const watch = status.isToday ? report.watchlist ?? [] : [];
    return (
      <section className="relative overflow-hidden rounded-[1.7rem] border border-cyan-300/20 bg-gradient-to-br from-[#0c1a1e] via-[#080f14] to-[#0b1016] p-5 shadow-[0_24px_85px_rgba(0,0,0,.34)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/[0.06] blur-[85px]" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-[10px] font-black tracking-wide text-cyan-200"><ClipboardList size={14} /> שולחן האנליסט · סריקת משחקי היום</p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
        </div>
        {watch.length > 0 ? (
          <div className="relative mt-8 border-t border-white/[0.08] pt-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-cyan-300/70" dir="ltr">DAILY WATCHLIST / {String(watch.length).padStart(2, "0")}</p>
                <h3 className="mt-1 text-xl font-black text-white">משחקים למעקב היום</h3>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/[0.06] px-3 py-1.5 text-[10px] font-bold text-amber-100"><Activity size={13} /> מידע למעקב · לא המלצה</span>
            </div>
            <ul className="grid gap-4 lg:grid-cols-2">
              {watch.map((item, index) => <WatchlistCard key={`${item.home}-${item.away}-${item.kickoff}`} item={item} index={index} timeZone={status.timeZone} />)}
            </ul>
          </div>
        ) : null}
        {report.scanNote && <p className="relative mt-5 border-t border-white/[0.07] pt-4 text-xs leading-6 text-slate-400">{report.scanNote}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <Reveal>
        <section className="relative overflow-hidden rounded-[1.7rem] border border-emerald-300/20 bg-gradient-to-br from-[#081713] via-[#070d10] to-[#101008] p-5 shadow-[0_22px_85px_rgba(0,0,0,.32)] sm:p-7">
          <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.07] blur-[90px]" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-black text-emerald-200"><ClipboardList size={13} /> תקציר מנהלים · דוח קדם־משחק</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">{PICKS.length} משחקים, קו שערים אחד</h2>
              <p className="mt-2 text-sm font-bold text-slate-300">
                {PICKS.length} בחירות מעל 2.5 שערים · כולן חייבות להצליח
                {status.kickedOff.length > 0 && ` · היחס המשולב מחושב על כל ${report.picks.length} המשחקים של הסריקה`}
              </p>
              <p className="mt-2 text-xs text-amber-100">{demo ? "סביבת הדגמה · נתונים סינתטיים, לא תחזית למשחקים אמיתיים" : `מקור: ${report.source} · עדכון: ${new Date(report.asOf).toLocaleString("he-IL")}`}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3">
              <p className="text-[8px] font-black text-slate-400">{demo ? "היחס המשולב לדוגמה" : "יחס משולב מחושב מאותם יחסי שוק"}</p>
              <p className="mt-0.5 font-mono text-3xl font-black text-amber-100">{report.combinedOdds.toFixed(2)}</p>
              <p className="text-[9px] text-slate-400">מכפלת היחסים: <bdi>{report.productOdds.toFixed(4)}</bdi></p>
            </div>
          </div>
          <div className="relative mt-5 flex items-start gap-2 rounded-xl border border-amber-200/15 bg-amber-200/[0.035] p-3 text-[10px] leading-5 text-slate-400">
            <Info size={14} className="mt-0.5 shrink-0 text-amber-200" />
            <span>{demo ? "זהו פלט הדגמה המבוסס על תוצאות סינתטיות. אין להשתמש בו כהערכת משחקים אמיתיים. " : "הדוח חושב מנתוני ספק המשחקים והיחסים. הרכבים מאושרים נבדקו; היעדר אישור מסומן כהערכת הרכב לפי המשחק הקודם. "}מודל השערים מבוסס על תוצאות בית וחוץ; איכות היריבות ונתוני xG אינם נכללים בו. {report.jointProbability === null ? "לא התקבל מדגם מספיק להערכת כל הבחירות." : "ההסתברות המשולבת מניחה אי־תלות בין המשחקים."}</span>
          </div>
          {status.kickedOff.length > 0 && (
            <p className="relative mt-3 flex items-start gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.03] p-3 text-[10px] leading-5 text-cyan-100/80">
              <Info size={14} className="mt-0.5 shrink-0 text-cyan-200" />
              <span>{status.kickedOff.map((pick) => `${pick.home}–${pick.away}`).join(", ")} כבר החל{status.kickedOff.length === 1 ? "" : "ו"} ולכן אינם מוצגים. המשחקים הממתינים למעלה מעודכנים וניתנים להצבעה.</span>
            </p>
          )}
        </section>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        {PICKS.map((pick, index) => <MatchAnalysis key={pick.id} pick={pick} index={index} />)}
      </div>

      <Reveal>
        <section className="rounded-[1.7rem] border border-cyan-300/20 bg-[#070e11]/95 p-5 shadow-[0_18px_70px_rgba(0,0,0,.28)] sm:p-7">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black text-cyan-200">מפת הסתברויות · מחיר השוק</p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">איזה סיכוי דרוש כדי להגיע לאיזון?</h2>
            </div>
            <p className="text-[9px] text-slate-400">סף איזון = 1 חלקי היחס · לפני ניכוי מרווח ההימורים</p>
          </header>
          <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_0.8fr]">
            <OddsBars picks={PICKS} />
            <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
              <p className="text-[9px] font-black text-slate-400">הבחירות יחד</p>
              <div className="mt-4 flex items-center justify-center gap-2 font-mono text-sm font-black sm:text-base">
                {PICKS.map((pick, index) => <span key={pick.id} className="contents">{index > 0 && <span className="text-slate-600">×</span>}<span className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] px-2.5 py-2 text-emerald-100">{pick.odds.toFixed(2)}</span></span>)}
                <span className="text-slate-600">=</span>
                <span className="rounded-lg border border-amber-200/25 bg-amber-200/[0.06] px-2.5 py-2 text-amber-100">{report.productOdds.toFixed(4)}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] text-slate-400">סף לפי מכפלת היחסים</p>
                  <p className="mt-1 font-mono text-xl font-black text-white">{percent(1 / report.productOdds)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[9px] text-slate-400">סף לפי היחס המשולב: {report.combinedOdds.toFixed(2)}</p>
                  <p className="mt-1 font-mono text-xl font-black text-white">{roundedCombinedImplied.toFixed(2)}%</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-400">{demo ? "היחס שנמסר בדוגמה" : "מכפלת יחסי השוק המעוגלת"}, {report.combinedOdds.toFixed(2)}, היא הבסיס לחישובי ההחזר והאיזון. {report.jointProbability === null ? "אין מדגם מספיק להערכת סיכוי משותף." : `המודל מעריך סיכוי משותף של ${percent(report.jointProbability)} בהנחת אי־תלות בין המשחקים; התוחלת לפי אומדן זה היא ${percent(report.jointEdge!)} מסכום הטופס.`} מרווח ההימורים אינו מנוכה מהיחסים.</p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="overflow-hidden rounded-[1.7rem] border border-amber-200/20 bg-gradient-to-br from-[#141309] via-[#0c0d0b] to-[#07100d] p-5 sm:p-7">
          <header className="flex items-center gap-2 text-sm font-black text-amber-100"><Gauge size={14} /> סיכון ותשואה · מה קורה אם הטופס זוכה?</header>
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
            <label className="block rounded-2xl border border-white/[0.08] bg-black/25 p-4">
              <span className="text-[10px] font-bold text-slate-400">סכום הטופס לחישוב (₪)</span>
              <input type="number" min="1" max="100000" step="0.01" value={stake} onChange={(event) => setStake(Math.max(1, Math.min(100000, Number(event.target.value) || 1)))} className="mt-2 block w-full bg-transparent font-mono text-3xl font-black text-white outline-none focus-visible:ring-1 focus-visible:ring-amber-200" dir="ltr" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <motion.div key={theoreticalReturn} initial={{ opacity: 0.6, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
                <p className="text-[9px] font-bold text-slate-400">החזר כולל אם שתי הבחירות מצליחות</p>
                <p className="mt-2 font-mono text-2xl font-black text-emerald-100">₪{theoreticalReturn.toFixed(2)}</p>
                <p className="mt-1 text-[9px] text-slate-400">סכום הטופס × {report.combinedOdds.toFixed(2)}, כולל הקרן</p>
              </motion.div>
              <motion.div key={netProfit} initial={{ opacity: 0.6, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.035] p-4">
                <p className="text-[9px] font-bold text-slate-400">רווח נקי אם שתי הבחירות מצליחות</p>
                <p className="mt-2 font-mono text-2xl font-black text-amber-100">₪{netProfit.toFixed(2)}</p>
                <p className="mt-1 text-[9px] text-slate-400">ההחזר הכולל פחות סכום הטופס</p>
              </motion.div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
            <div className="grid grid-cols-[1.2fr_1fr_0.7fr] bg-white/[0.035] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500 sm:px-4">
              <span>משחק</span><span>בחירה</span><span className="text-right">יחס</span>
            </div>
            {sourceInputs.map((pick) => (
              <div key={pick.home} className="grid grid-cols-[1.2fr_1fr_0.7fr] border-t border-white/[0.05] px-3 py-3 text-[10px] sm:px-4">
                <span className="font-bold text-slate-200">{pick.home} – {pick.away}</span><span className="text-slate-400">{pick.market}</span><span className="text-right font-mono font-black text-cyan-100">{pick.odds.toFixed(2)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1.2fr_1fr_0.7fr] border-t border-amber-200/10 bg-amber-200/[0.025] px-3 py-3 text-[10px] sm:px-4">
              <span className="font-black text-amber-100">טופס משולב</span><span className="text-slate-400">כל הבחירות יחד</span><span className="text-right font-mono font-black text-amber-100">{report.combinedOdds.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-slate-400"><AlertCircle size={12} className="mt-0.5 shrink-0 text-amber-200/70" /> אם בחירה אחת מפסידה, סכום הטופס כולו בסיכון, בכפוף לכללי הסליקה. {demo ? "החישוב מבוסס על היחס המשולב בדוגמה." : "היחס המשולב הוא מכפלת יחסי השוק מאותו מפעיל, מעוגלת לשתי ספרות; יחס הטופס בפועל עשוי להיות שונה."}</p>
          <RiskReward stake={stake} odds={report.combinedOdds} modelChance={report.jointProbability} />
        </section>
      </Reveal>

      <Reveal><GoalLaboratory picks={PICKS} /></Reveal>

      <Reveal>
        <section className="rounded-[1.7rem] border border-white/[0.08] bg-slate-950/75 p-5 sm:p-7">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-200"><ShieldCheck size={14} /> מקורות ומתודולוגיה</div>
          <h2 className="mt-2 text-xl font-black text-white">מה ידוע, מה מחושב ומה עדיין חסר</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-400">מקור הנתונים: {report.source}. עודכן: {new Date(report.asOf).toLocaleString("he-IL")}. {report.methodology} {demo ? "ההרכבים אינם כלולים בדוגמה." : "היחס המשולב מחושב ממכפלת מחירי אותו מפעיל; אינו ציטוט לטופס."} נתוני xG אינם כלולים בקלט. מעבדת השערים מאפשרת לשנות את הנחת הממוצע ולבחון רגישות.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { title: "מגמות שערים", value: "נכלל מדגם תוצאות בית וחוץ; לא בוצעה התאמה לרמת היריבות", icon: BarChart3 },
              { title: "מפגשים ישירים", value: "לא נותחו במודל", icon: Activity },
              { title: "שערים צפויים", value: "דרוש מקור נתונים עקבי ומאומת", icon: Target },
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
