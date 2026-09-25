"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ACCUMULATOR_ODDS, accumulatorValuation, goalDistribution, impliedProbability, overTwoProbability } from "./reportMath";

const money = (value: number) => new Intl.NumberFormat("he-IL", {
  style: "currency", currency: "ILS", maximumFractionDigits: 2,
}).format(value);

export function PriceBars() {
  const reduced = useReducedMotion();
  return <figure className="rounded-2xl border border-emerald-300/15 bg-black/20 p-5 sm:p-7">
    <figcaption className="mb-6 text-lg font-black text-white">השוואת ספי האיזון</figcaption>
    {[
      { label: "אוסטריה – ישראל", odds: 1.56, color: "#10b981" },
      { label: "הולנד – גרמניה", odds: 1.49, color: "#2dd4bf" },
      { label: "הטופס המשולב", odds: ACCUMULATOR_ODDS, color: "#d4af37" },
    ].map(({ label, odds, color }) => {
      const percent = impliedProbability(odds) * 100;
      return <div key={label} className="mb-6 last:mb-0">
        <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-slate-200">{label}</span>
          <span className="font-mono text-white" dir="ltr">{odds.toFixed(2)} · {percent.toFixed(2)}%</span>
        </div>
        <div dir="ltr" className="h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`${label}: סף איזון ${percent.toFixed(2)} אחוז`}>
          <motion.div className="h-full origin-left rounded-full" style={{ width: `${percent}%`, background: color }}
            initial={{ scaleX: reduced ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.9 }} />
        </div>
      </div>;
    })}
    <p className="mt-6 text-xs leading-6 text-slate-400">הספים מחושבים באמצעות אחד חלקי היחס. אלה מחירי שוק לפני ניכוי מרווח מפעיל, ולא שיעורי הצלחה שנמדדו.</p>
  </figure>;
}

export function GoalModelCharts() {
  const [mean, setMean] = useState(2.5);
  const reduced = useReducedMotion();
  const titleId = useId();
  const distribution = goalDistribution(mean);
  const chance = overTwoProbability(mean) * 100;
  const points = Array.from({ length: 41 }, (_, i) => ({ mean: 1 + i / 10, chance: overTwoProbability(1 + i / 10) * 100 }));
  const path = points.map((point, i) => `${i ? "L" : "M"}${48 + i * 10},${230 - point.chance * 2}`).join(" ");
  return <section id="goals-model" className="scroll-mt-24 rounded-[1.8rem] border border-emerald-300/20 bg-[#07110e] p-5 sm:p-8">
    <p className="text-xs font-bold text-emerald-300">פרק 04 · מעבדת שערים</p>
    <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">איך ציפיית השערים משנה את קו 2.5?</h2>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">נתון שערים צפויים מודד את איכות המצבים לפי הסיכוי של כל בעיטה להפוך לשער. הוא אינו זהה לתוצאה בפועל. כאן ניתן לבחור ממוצע שערים היפותטי ולבחון התפלגות פואסון — מודל מתמטי פשוט לספירת שערים, ללא כיול לנבחרת מסוימת.</p>
    <label className="mt-6 block rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-emerald-100">
        ממוצע שערים משוער לתרחיש <output className="font-mono text-xl" dir="ltr">{mean.toFixed(1)}</output>
      </span>
      <input type="range" min="1" max="5" step="0.1" value={mean} dir="ltr"
        aria-valuetext={`${mean.toFixed(1)} שערים בממוצע, הנחה מתמטית`}
        onChange={(e) => setMean(Number(e.target.value))}
        className="mt-4 w-full accent-emerald-400" />
      <span className="mt-1 flex justify-between text-xs text-slate-400" dir="ltr"><span>1.0</span><span>5.0</span></span>
    </label>
    <p className="mt-3 text-xs leading-6 text-[#d4af37]">הממוצע שבחרתם הוא הנחת תרחיש בלבד; הוא אינו נתון שערים צפויים של אוסטריה, ישראל, הולנד או גרמניה.</p>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <figure className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <figcaption className="font-bold text-white">התפלגות מספר השערים בתרחיש</figcaption>
        <p className="mt-2 text-xs text-slate-400">עמודות ירוקות: תוצאות שמעל קו 2.5</p>
        <div className="mt-6 flex h-48 items-end gap-2 border-b border-white/20" dir="ltr">
          {distribution.map((probability, index) => <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-2 font-mono text-[10px] text-slate-300 sm:text-xs">{(probability * 100).toFixed(1)}%</span>
            <motion.div className={`w-full max-w-12 origin-bottom rounded-t-lg ${index >= 3 ? "bg-gradient-to-t from-emerald-800 to-emerald-300" : "bg-gradient-to-t from-slate-800 to-slate-500"}`}
              style={{ height: `${probability * 230}%` }} initial={{ scaleY: reduced ? 1 : 0 }} whileInView={{ scaleY: 1 }}
              viewport={{ once: true }} transition={{ duration: reduced ? 0 : 0.6 }}
              title={`${index === 6 ? "6 ומעלה" : index} שערים: ${(probability * 100).toFixed(2)}%`} />
          </div>)}
        </div>
        <div className="mt-3 flex gap-2 text-center font-mono text-xs text-slate-300" dir="ltr">
          {distribution.map((_, i) => <span className="flex-1" key={i}>{i === 6 ? "6+" : i}</span>)}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">מספר שערים · העמודה האחרונה כוללת את כל התוצאות משישה ומעלה</p>
      </figure>

      <figure className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <figcaption className="font-bold text-white">עקומת רגישות למעל 2.5 שערים</figcaption>
        <svg viewBox="0 0 490 275" className="mt-4 w-full" role="img" aria-labelledby={titleId} style={{ direction: "ltr" }}>
          <title id={titleId}>הסתברות למעל 2.5 במודל פואסון. בממוצע {mean.toFixed(1)} שערים: {chance.toFixed(1)} אחוז.</title>
          {[0, 25, 50, 75, 100].map((p) => <g key={p}>
            <line x1="48" x2="448" y1={230 - p * 2} y2={230 - p * 2} stroke="#ffffff12" />
            <text x="38" y={234 - p * 2} textAnchor="end" fontSize="11" fill="#94a3b8">{p}%</text>
          </g>)}
          {[1, 2, 3, 4, 5].map((m) => <text key={m} x={48 + (m - 1) * 100} y="252" textAnchor="middle" fontSize="12" fill="#94a3b8">{m}</text>)}
          <motion.path d={path} stroke="#10b981" strokeWidth="3" fill="none" initial={{ pathLength: reduced ? 1 : 0 }}
            whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 1.2 }} />
          <line x1={48 + (mean - 1) * 100} x2={48 + (mean - 1) * 100} y1={230 - chance * 2} y2="230" stroke="#d4af37" strokeDasharray="4 4" />
          <circle cx={48 + (mean - 1) * 100} cy={230 - chance * 2} r="6" fill="#d4af37" stroke="#06110d" strokeWidth="2" />
        </svg>
        <p className="text-center text-xs text-slate-400">ציר אופקי: ממוצע שערים לתרחיש · ציר אנכי: הסתברות</p>
      </figure>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4" aria-live="polite">
      <span className="text-sm text-slate-200">מעל 2.5 לפי ההנחה שבחרתם</span>
      <strong className="font-mono text-2xl text-emerald-200" dir="ltr">{chance.toFixed(2)}%</strong>
    </div>
    <p className="mt-4 text-xs leading-6 text-slate-400">המודל מניח קצב שערים קבוע ואירועים בלתי תלויים. הוא אינו כולל כרטיסים, חילופים, איכות יריבות או שינויי קצב במהלך משחק. העקומה היא קשר מתמטי ולא מגמת כיבוש היסטורית.</p>
  </section>;
}

export function RiskRewardChart({ stake }: { stake: number }) {
  const [probability, setProbability] = useState(45);
  const reduced = useReducedMotion();
  const id = useId();
  const valuation = accumulatorValuation(stake, probability / 100);
  const breakEven = impliedProbability(ACCUMULATOR_ODDS) * 100;
  // Vertical axis is percentage of stake, avoiding axis jumps when stake changes.
  const y = (p: number) => 178 - (p * ACCUMULATOR_ODDS - 100) * 0.8;
  return <figure className="mt-6 rounded-2xl border border-[#d4af37]/20 bg-black/20 p-4 sm:p-6">
    <figcaption className="text-lg font-black text-white">סיכון–תשואה: מהי נקודת האיזון?</figcaption>
    <p className="mt-2 text-sm leading-7 text-slate-300">אם שתי הבחירות מצליחות, הרווח הנקי הוא <bdi>{money(stake * (ACCUMULATOR_ODDS - 1))}</bdi>. אם אחת מהן נכשלת, ההפסד הוא מלוא הסכום: <bdi>{money(stake)}</bdi>. הגרף בוחן תוחלת תחת הסתברות משותפת שתבחרו בעצמכם.</p>
    <label className="mt-4 block text-sm text-slate-200">
      הסתברות משותפת לצורך תרחיש: <bdi className="font-mono text-[#e8ca75]">{probability}%</bdi>
      <input className="mt-3 block w-full accent-emerald-400" type="range" min="0" max="100" step="1" dir="ltr"
        value={probability} onChange={(e) => setProbability(Number(e.target.value))} />
    </label>
    <svg viewBox="0 0 540 315" className="mx-auto mt-4 w-full max-w-2xl" style={{ direction: "ltr" }} role="img" aria-labelledby={id}>
      <title id={id}>תוחלת רווח כאחוז מהסכום ביחס 2.32. סף האיזון {breakEven.toFixed(2)} אחוז. ההסתברות היא הנחת משתמש ולא תחזית.</title>
      {[-100, -50, 0, 50, 100].map((v) => <g key={v}>
        <line x1="64" x2="484" y1={178 - v * 0.8} y2={178 - v * 0.8} stroke={v === 0 ? "#94a3b8" : "#ffffff12"} />
        <text x="52" y={182 - v * 0.8} fontSize="12" fill="#94a3b8" textAnchor="end">{v}%</text>
      </g>)}
      {[0, 25, 50, 75, 100].map((v) => <text key={v} x={64 + v * 4.2} y="284" fontSize="12" fill="#94a3b8" textAnchor="middle">{v}%</text>)}
      <motion.path d={`M64,${y(0)} L484,${y(100)}`} stroke="#10b981" strokeWidth="3" fill="none"
        initial={{ pathLength: reduced ? 1 : 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: reduced ? 0 : 1 }} />
      <line x1={64 + breakEven * 4.2} x2={64 + breakEven * 4.2} y1="50" y2="258" stroke="#d4af37" strokeDasharray="4 4" />
      <circle cx={64 + probability * 4.2} cy={y(probability)} r="6" fill="#e8ca75" stroke="#08110d" strokeWidth="2" />
    </svg>
    <p className="text-center text-xs text-slate-400">ציר אופקי: הסתברות משותפת שהונחה · ציר אנכי: תוחלת כאחוז מהסכום</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-live="polite">
      <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-slate-400">סף איזון לפי 2.32</p><p className="mt-1 font-mono text-xl text-white" dir="ltr">{breakEven.toFixed(2)}%</p></div>
      <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-slate-400">תוחלת הרווח לפי ההנחה</p><p className={`mt-1 text-xl font-bold ${valuation.expectedProfit < 0 ? "text-rose-300" : "text-emerald-200"}`}><bdi>{money(valuation.expectedProfit)}</bdi></p></div>
    </div>
    <p className="mt-4 text-xs leading-6 text-slate-400">תוחלת = סכום × (הסתברות שהונחה × יחס − 1). היא אינה ההחזר במשחק בודד. ללא אומדן הסתברות עצמאי ומבוסס אין בסיס לקבוע שהטופס מציע יתרון.</p>
  </figure>;
}
