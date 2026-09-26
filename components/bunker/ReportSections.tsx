"use client";

import { useState } from "react";
import type { Pick } from "./reportData";

const money = (amount: number) => new Intl.NumberFormat("he-IL", {
  style: "currency", currency: "ILS", maximumFractionDigits: 2,
}).format(amount);

function goalBuckets(mean: number) {
  const buckets = [Math.exp(-mean)];
  for (let goals = 1; goals <= 5; goals++) buckets.push(buckets[goals - 1] * mean / goals);
  return [...buckets, 1 - buckets.reduce((sum, value) => sum + value, 0)];
}

function overTwo(mean: number) {
  return 1 - Math.exp(-mean) * (1 + mean + mean * mean / 2);
}

export function RiskReward({ stake, odds, modelChance }: { stake: number; odds: number; modelChance: number | null }) {
  const [assumedChance, setAssumedChance] = useState(modelChance === null ? 45 : Math.round(modelChance * 100));
  const threshold = 100 / odds;
  const expectedProfit = stake * (assumedChance / 100 * odds - 1);

  return <section className="mt-6 rounded-2xl border border-amber-200/15 bg-black/20 p-4 sm:p-5">
    <h3 className="text-base font-black text-white">נקודת האיזון ותוחלת הרווח</h3>
    <p className="mt-2 text-xs leading-6 text-slate-300">ביחס {odds.toFixed(2)} דרושה הצלחה משותפת ביותר מ־<bdi className="font-bold text-amber-100">{threshold.toFixed(2)}%</bdi> מהמקרים כדי שהתוחלת תהיה חיובית. זהו סף מחיר, לא הערכה של הסיכוי שהטופס יזכה.</p>
    {modelChance !== null && <p className="mt-2 text-xs text-amber-100">המודל מציע { (modelChance * 100).toFixed(2) }% בהנחת אי־תלות; המחוון מעוגל לאחוז שלם וניתן לשינוי.</p>}
    <label className="mt-5 block text-xs font-bold text-slate-200">
      הסתברות משותפת לצורך הדגמה בלבד: <bdi className="font-mono text-amber-100">{assumedChance}%</bdi>
      <input type="range" min="0" max="100" step="1" value={assumedChance} onChange={(event) => setAssumedChance(Number(event.target.value))} dir="ltr" className="mt-3 block w-full accent-amber-300" />
    </label>
    <div className="mt-3 relative h-3 rounded-full bg-white/10" dir="ltr" role="img" aria-label={`סף איזון ${threshold.toFixed(2)} אחוז; הסתברות שהונחה ${assumedChance} אחוז`}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/70" style={{ width: `${assumedChance}%` }} />
      <span className="absolute inset-y-[-4px] w-0.5 bg-amber-200" style={{ left: `${threshold}%` }} />
    </div>
    <div className="mt-2 flex justify-between text-[10px] text-slate-400" dir="ltr"><span>0%</span><span>סף איזון: {threshold.toFixed(2)}%</span><span>100%</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-live="polite">
      <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-slate-400">רווח אם הטופס זוכה</p><p className="mt-1 font-bold text-emerald-200"><bdi>{money(stake * (odds - 1))}</bdi></p></div>
      <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-slate-400">הפסד אם הטופס מפסיד</p><p className="mt-1 font-bold text-rose-200"><bdi>{money(-stake)}</bdi></p></div>
      <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-slate-400">תוחלת לפי ההנחה שבחרתם</p><p className={`mt-1 font-bold ${expectedProfit < 0 ? "text-rose-200" : "text-emerald-200"}`}><bdi>{money(expectedProfit)}</bdi></p></div>
    </div>
    <p className="mt-3 text-[10px] leading-5 text-slate-400">תוחלת = סכום הטופס × (הסתברות שהונחה × {odds.toFixed(2)} − 1). התוחלת אינה הרווח במשחק בודד. המחוון מציג תרחיש, גם כאשר נקודת הפתיחה שלו נגזרת מהמודל.</p>
  </section>;
}

export function GoalLaboratory({ picks }: { picks: Pick[] }) {
  const [selected, setSelected] = useState(0);
  const pick = picks[selected];
  const [adjustment, setAdjustment] = useState<number | null>(null);
  const mean = adjustment ?? pick.model?.mean ?? 2.5;
  const buckets = goalBuckets(mean);
  const chance = overTwo(mean) * 100;

  return <section className="rounded-[1.7rem] border border-emerald-300/20 bg-[#07110e] p-5 sm:p-7">
    <p className="text-[10px] font-black text-emerald-200">מעבדת שערים · תרחיש מתמטי</p>
    <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">כיצד ממוצע השערים משפיע על הסיכוי לעבור את קו 2.5?</h2>
    <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-300">בחרו משחק ושנו את ממוצע השערים כדי לבחון את רגישות מודל פואסון. {pick.model ? `נקודת הפתיחה מחושבת ממדגם שערים של ${pick.home} בבית ושל ${pick.away} בחוץ.` : "אין מדגם מספיק למשחק זה; נקודת הפתיחה להמחשה בלבד."} שינוי המחוון הוא תרחיש, לא עדכון לנתוני המקור.</p>
    <label className="mt-4 block text-xs text-slate-200">משחק לבחינה
      <select value={selected} onChange={(event) => { setSelected(Number(event.target.value)); setAdjustment(null); }} className="mt-2 block w-full rounded-lg border border-white/20 bg-[#07110e] p-2 text-white">
        {picks.map((item, index) => <option key={item.id} value={index}>{item.home} – {item.away}</option>)}
      </select>
    </label>
    <label className="mt-5 block rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <span className="flex items-center justify-between gap-3 text-xs font-bold text-emerald-100">ממוצע שערים שהונח לתרחיש <output className="font-mono text-xl" dir="ltr">{mean.toFixed(1)}</output></span>
      <input type="range" min="0.1" max={Math.max(10, Math.ceil(pick.model?.mean ?? 0))} step="0.1" value={mean} dir="ltr" onChange={(event) => setAdjustment(Number(event.target.value))} className="mt-4 block w-full accent-emerald-400" />
      <span className="mt-1 flex justify-between text-[10px] text-slate-400" dir="ltr"><span>0.1</span><span>{Math.max(10, Math.ceil(pick.model?.mean ?? 0)).toFixed(1)}</span></span>
    </label>
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <figure className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <figcaption className="text-sm font-bold text-white">מפת הסתברויות למספר השערים</figcaption>
        <p className="mt-1 text-[10px] leading-5 text-slate-400">חלוקה לפי המודל בלבד · העמודה האחרונה כוללת שישה שערים ומעלה</p>
        <div className="mt-5 flex h-40 items-end gap-2 border-b border-white/20" dir="ltr">
          {buckets.map((probability, index) => <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-2 font-mono text-[9px] text-slate-200 sm:text-xs">{(probability * 100).toFixed(1)}%</span>
            <div className={`w-full max-w-12 rounded-t-md ${index >= 3 ? "bg-emerald-400" : "bg-slate-500"}`} style={{ height: `${Math.min(100, probability * 250)}%` }} />
          </div>)}
        </div>
        <div className="mt-2 flex gap-2 text-center font-mono text-xs text-slate-300" dir="ltr">{buckets.map((_, index) => <span key={index} className="flex-1">{index === 6 ? "6+" : index}</span>)}</div>
        <p className="mt-3 text-[10px] text-slate-400">אפור: 0–2 שערים · ירוק: 3 שערים ומעלה</p>
      </figure>
      <div className="flex flex-col justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-5" aria-live="polite">
        <p className="text-sm font-bold text-white">סיכוי למעל 2.5 לפי ההנחה</p>
        <strong className="mt-3 font-mono text-4xl text-emerald-200" dir="ltr">{chance.toFixed(2)}%</strong>
        <p className="mt-3 text-xs leading-6 text-slate-300">המודל מחבר את ההסתברויות לשלושה שערים ומעלה ב־{pick.home}–{pick.away}. {adjustment !== null ? "זוהי הדמיה לפי הממוצע שבחרתם." : "זהו אומדן מודל לפי המדגם שסופק, לא תוצאה ודאית."}</p>
      </div>
    </div>
    <p className="mt-4 text-[10px] leading-5 text-slate-400">המודל מניח קצב שערים קבוע ואי־תלות בין השערים. הוא אינו מביא בחשבון הרכבים, יריבות, כרטיסים או שינויי קצב במהלך המשחק. נתוני שערים צפויים, כשיהיו זמינים, מתארים איכות מצבים ואינם זהים למספר השערים בפועל.</p>
  </section>;
}
