"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, BookOpen, ChartNoAxesCombined, Crosshair, Goal, Scale, Shield, ShieldCheck, Swords, Users } from "lucide-react";
import TeamBadge, { type Country } from "./bunker/TeamBadge";
import { GoalModelCharts, PriceBars, RiskRewardChart } from "./bunker/ReportCharts";
import { ACCUMULATOR_ODDS, EXACT_PRODUCT, LEG_ODDS, accumulatorValuation, impliedProbability } from "./bunker/reportMath";

const PICKS = [
  {
    id: "austria-israel", chapter: "02", home: "אוסטריה", away: "ישראל",
    countries: ["austria", "israel"] as Country[], odds: LEG_ODDS[0],
    headline: "שלושה שערים — אך לא בהכרח משני הצדדים",
    intro: "הבחירה באוסטריה–ישראל מתייחסת לסך השערים, ולא למנצחת. גם 3:0 וגם 2:1 עוברים את הקו. לכן השאלה האנליטית היא האם קצב יצירת המצבים הכולל תומך בשלושה שערים, ולא רק האם אחת הנבחרות עדיפה.",
    attack: "לבחינת ההתקפה יש להפריד בין מספר הבעיטות לבין איכותן: מצבים מתוך הרחבה, מסירות רוחב לאחור ומצבים נייחים עשויים לייצר איכות שונה מבעיטות מרחוק. עבור שתי הנבחרות נדרש מדגם של מצבים שנוצרו, תוך התאמה לרמת היריבות. יתרון בהחזקת כדור לבדו אינו מוכיח פוטנציאל שערים גבוה.",
    defence: "בצד ההגנתי כדאי לבדוק מצבים שסופגים לאחר איבוד כדור, הגנה על מרכז הרחבה ויכולת להתמודד עם כדורים נייחים. לחץ גבוה עשוי לקצר את הדרך לשער, אך גם לחשוף שטח מאחורי ההגנה. אלה מנגנונים לבחינה בווידאו ובנתונים, ולא קביעה שכך אוסטריה או ישראל ישחקו במפגש המסוים.",
    history: "מגמת שערים צריכה להתבסס על חלון משחקים מוגדר: כמה משחקים נבדקו, באיזו מסגרת, מול אילו יריבות ובאיזה מגרש. שיעור משחקים עם שלושה שערים במדגם קטן עלול להשתנות מאוד בעקבות תוצאה חריגה אחת. יש להשוות גם את החציון ואת איכות המצבים כדי לזהות אם רצף הכיבוש נשען על בסיס יציב.",
    scenarios: ["שער מוקדם עשוי לפתוח שטחים אם הנבחרת שבפיגור מגדילה סיכון.", "יתרון מוקדם עשוי דווקא להוביל להאטת הקצב ולשמירה על התוצאה.", "מצבים נייחים יכולים להכריע את הקו גם במשחק עם מעט התקפות מסודרות."],
  },
  {
    id: "netherlands-germany", chapter: "03", home: "הולנד", away: "גרמניה",
    countries: ["netherlands", "germany"] as Country[], odds: LEG_ODDS[1],
    headline: "מחיר נמוך יותר מציב רף הסתברות גבוה יותר",
    intro: "בהולנד–גרמניה נבחר אותו שוק, אך היחס 1.49 נמוך יותר. פירוש הדבר הוא רף איזון גבוה יותר ביחס לבחירה הראשונה. מוניטין התקפי או תוצאות זכורות ממפגשי עבר אינם מספיקים כדי להצדיק את המחיר ללא נתוני סגל, מסגרת ותאריך.",
    attack: "בתדריך הטקטי יש לבחון מי יוצר יתרון בין הקווים, האם שחקני הכנף נכנסים לרחבה ומהי התרומה של המגנים להתקפה. תנועה של קשרים מאחור עשויה להוסיף הזדמנויות גם כשהחלוץ מכוסה. הרכב התקפי על הנייר אינו תחליף לבדיקה של איכות המצבים ושל חלוקת התפקידים בפועל.",
    defence: "הגנת המעבר היא ציר מרכזי לבדיקה: כמה שחקנים נשארים מאחורי הכדור בזמן התקפה, ומה קורה לאחר איבוד באגף. קו הגנה גבוה עשוי להגדיל את הסיכון למתפרצות, אך לחץ מתואם יכול לצמצם אותו. כדי לבחור בין ההסברים נדרשים נתוני המפגש והסגלים, שאינם כלולים ביחסים שסופקו.",
    history: "מפגשים ישירים מספקים הקשר, אך שינוי מאמן, גיל הסגל והמסגרת התחרותית יכולים להפוך השוואה ישנה ללא רלוונטית. אין להסיק תדירות כיבוש מזיכרון של משחק בולט. יש לציין תאריכים, גודל מדגם והפרדה בין משחקי ידידות למשחקים תחרותיים לפני הצגת מגמה היסטורית.",
    scenarios: ["לחץ הדדי עשוי לייצר מעברים מהירים, אך גם לצמצם זמן לקבלת החלטות.", "משחק שבו תיקו מתאים לשני הצדדים עלול להתנהל בקצב שונה מהצפוי.", "היעדרות של יוצר מצבים או שחקן הגנה מרכזי עשויה לשנות את הערכת הקו."],
  },
];

function Reveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.08 }} transition={{ duration: reduced ? 0 : 0.5 }}>{children}</motion.div>;
}

const currency = (value: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(value);

function MatchReport({ pick }: { pick: (typeof PICKS)[number] }) {
  const implied = impliedProbability(pick.odds) * 100;
  return <Reveal>
    <article id={pick.id} className="relative scroll-mt-24 overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-[#080e0d] p-5 sm:p-9">
      <div aria-hidden className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-emerald-400/[0.06] blur-3xl" />
      <header className="relative border-b border-white/10 pb-7">
        <p className="text-xs font-bold text-[#d4af37]">פרק {pick.chapter} · תיק משחק</p>
        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{pick.home} נגד {pick.away}</h2>
        <div className="mt-7 flex flex-wrap items-center justify-around gap-6 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-6">
          <TeamBadge country={pick.countries[0]} />
          <div className="text-center">
            <p className="text-xs text-slate-400">מעל 2.5 שערים</p>
            <p className="mt-1 font-mono text-4xl font-black text-[#e8ca75] sm:text-5xl" dir="ltr">{pick.odds.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-400">יחס לפי פרטי הטופס</p>
          </div>
          <TeamBadge country={pick.countries[1]} />
        </div>
      </header>

      <div className="relative mt-7 grid gap-7 lg:grid-cols-[1.45fr_1fr]">
        <div>
          <h3 className="text-xl font-black text-white">{pick.headline}</h3>
          <p className="mt-3 text-sm leading-8 text-slate-300">{pick.intro}</p>
          <div className="mt-5 rounded-xl border-r-2 border-emerald-400 bg-emerald-300/[0.04] p-4">
            <p className="text-sm leading-7 text-slate-200">נקודת האיזון במחיר הזה היא <bdi className="font-bold text-emerald-200">{implied.toFixed(2)}%</bdi>. כדי לטעון ליתרון כלכלי נדרש אומדן הסתברות עצמאי הגבוה מסף זה; היחס לבדו אינו מספק אומדן כזה.</p>
            <p className="mt-2 font-mono text-sm text-emerald-300" dir="ltr">1 ÷ {pick.odds.toFixed(2)} × 100 = {implied.toFixed(2)}%</p>
          </div>
        </div>
        <aside className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="flex items-center gap-2 font-bold text-white"><Goal size={20} className="text-emerald-300" /> מפת תוצאות</h3>
          <p className="mt-3 text-xs leading-6 text-slate-400">סיווג לפי מספר השערים בלבד. גובה האריחים אינו מייצג הסתברות.</p>
          <div className="mt-4 grid grid-cols-3 gap-2" dir="ltr">
            {[0, 1, 2, 3, 4, 5].map((goals) => <div key={goals} className={`rounded-xl border p-3 text-center ${goals < 3 ? "border-white/10 bg-white/[0.02] text-slate-400" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"}`}>
              <p className="font-mono text-xl font-black">{goals === 5 ? "5+" : goals}</p>
              <p className="mt-1 text-xs">{goals < 3 ? "לא עובר" : "עובר"}</p>
            </div>)}
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-400">יש לבדוק בטופס המקורי את כללי הסליקה: זמן חוקי, הארכה ותנאי ביטול. הם לא נמסרו עם היחסים.</p>
        </aside>
      </div>

      <div className="relative mt-7 grid gap-4 md:grid-cols-2">
        {[
          { title: "יצירת מצבים והתקפה", icon: Swords, body: pick.attack },
          { title: "מבנה ההגנה והמעברים", icon: Shield, body: pick.defence },
        ].map(({ title, icon: Icon, body }) => <section key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-emerald-300/30">
          <Icon className="mb-3 text-emerald-300" size={25} />
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
        </section>)}
      </div>
      <section className="relative mt-5 rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.03] p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-[#e8ca75]"><BookOpen size={21} /> מגמות כיבוש והקשר היסטורי</h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">{pick.history}</p>
        <p className="mt-3 text-xs leading-6 text-slate-400">מצב המקור: לא סופקו תאריכים או תוצאות עבר למשחק זה. לכן אין כאן אחוזי כיבוש היסטוריים או גרף מגמה המיוחס לנבחרות.</p>
      </section>
      <section className="relative mt-6">
        <h3 className="font-bold text-white">תרחישים לבדיקה לפני גיבוש תחזית</h3>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {pick.scenarios.map((text, index) => <li key={text} className="rounded-xl border border-white/10 p-4">
            <span className="font-mono text-lg text-emerald-400" aria-hidden>{String(index + 1).padStart(2, "0")}</span>
            <p className="mt-2 text-sm leading-7 text-slate-300">{text}</p>
          </li>)}
        </ol>
      </section>
    </article>
  </Reveal>;
}

export default function BunkerDeepDive() {
  const [stakeText, setStakeText] = useState("100");
  const numericStake = Number(stakeText);
  const validStake = stakeText.trim() !== "" && Number.isFinite(numericStake) && numericStake >= 1 && numericStake <= 100000;
  const stake = validStake ? numericStake : 0;
  const value = accumulatorValuation(stake, 0);

  return <div className="space-y-8" dir="rtl">
    <nav aria-label="ניווט בפרקי הדוח" className="flex flex-wrap gap-2 rounded-2xl border border-emerald-300/15 bg-[#080e0d] p-3">
      {[
        ["summary", "תקציר מנהלים"], ["austria-israel", "אוסטריה – ישראל"], ["netherlands-germany", "הולנד – גרמניה"],
        ["goals-model", "מעבדת שערים"], ["valuation", "סיכון ותשואה"], ["sources", "מקורות ומתודולוגיה"],
      ].map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-emerald-300/10 hover:text-emerald-100 focus-visible:outline focus-visible:outline-emerald-300">{label}</a>)}
    </nav>

    <Reveal><section id="summary" className="scroll-mt-24 rounded-[2rem] border border-emerald-300/20 bg-gradient-to-bl from-[#10241c] via-[#080e0d] to-[#131108] p-5 sm:p-9">
      <p className="text-xs font-bold text-emerald-300">פרק 01 · תקציר מנהלים</p>
      <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">שני משחקים. קו שערים אחד.</h2>
      <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">הדוח מפרק את טופס הצבירה לשני תיקים: אוסטריה נגד ישראל ביחס 1.56, והולנד נגד גרמניה ביחס 1.49. בשניהם נבחרו מעל 2.5 שערים. המטרה היא להבין את מחיר הבחירה, את תנאי ההצלחה ואת הנתונים הדרושים כדי להעריך אותה מקצועית.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {[
          ["בחירות בטופס", "02", "שתיהן צריכות להצליח"],
          ["יחס משולב שנמסר", "2.32", "זהו הבסיס לחישובי ההחזר"],
          ["סף איזון משולב", `${(impliedProbability(ACCUMULATOR_ODDS) * 100).toFixed(2)}%`, "מחושב מהמחיר, לא מתחזית"],
        ].map(([label, number, note]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-sm text-slate-400">{label}</p><p className="mt-2 font-mono text-3xl font-black text-[#e8ca75]" dir="ltr">{number}</p><p className="mt-2 text-xs leading-6 text-slate-400">{note}</p>
        </div>)}
      </div>
      <p className="mt-6 text-sm leading-7 text-slate-400">בסיס הדוח: פרטי הבחירות והיחסים שנמסרו. תאריך, מסגרת, נתוני שערים צפויים, הרכבים ומפגשי עבר אינם מצורפים. הפרקים הטקטיים מציגים מסגרת ניתוח; הגרפים מבוססים על חישובי מחיר או על הנחות מפורשות.</p>
      <a href="#austria-israel" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-200">לפתיחת תיקי המשחק <ArrowDown size={17} /></a>
    </section></Reveal>

    {PICKS.map((pick) => <MatchReport key={pick.id} pick={pick} />)}

    <Reveal><section className="rounded-[2rem] border border-white/10 bg-[#090f0d] p-5 sm:p-8">
      <h2 className="text-2xl font-black text-white">שלוש עדשות להערכת המשחק</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400">כרטיסי עבודה לקראת קבלת הרכבים ומידע תחרותי. אין כאן שחקנים, תפקידים או שופט שיוחסו למפגש ללא מקור.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { icon: Users, title: "תפקידי מפתח", subtitle: "יוצר מצבים · חלוץ · שוער", body: "האם יוצרי המצבים צפויים לפתוח? האם החלוץ מקבל דקות מלאות? שינוי בעמדה מרכזית עשוי לשנות את נפח ההתקפה גם בלי לשנות את המערך הרשום." },
          { icon: Crosshair, title: "איכות ולא רק כמות", subtitle: "רחבה · מעברים · כדורים נייחים", body: "עשר בעיטות אינן בהכרח טובות מחמש. יש לבחון מרחק, זווית, לחץ הגנתי וסוג מצב. נתוני שערים צפויים מועילים במיוחד כאשר מפרידים פנדלים מהמשחק השוטף." },
          { icon: Scale, title: "הקשר השיפוט", subtitle: "קצב · עבירות · כדורי עונשין", body: "זהות השופט לא נמסרה. לאחר אימותה אפשר לבדוק ממוצעי עבירות וכרטיסים במדגם מתאים, אך אין לתרגם אותם אוטומטית להסתברות לפנדל או להרחקה." },
        ].map(({ icon: Icon, title, subtitle, body }) => <motion.article key={title} whileHover={{ y: -4 }} className="relative overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-emerald-950/40 to-black/40 p-6">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.06] text-emerald-200"><Icon size={32} strokeWidth={1.5} /></div>
          <h3 className="text-xl font-black text-white">{title}</h3><p className="mt-2 text-xs text-[#e8ca75]">{subtitle}</p><p className="mt-4 text-sm leading-7 text-slate-300">{body}</p>
        </motion.article>)}
      </div>
    </section></Reveal>

    <Reveal><section className="rounded-[2rem] border border-emerald-300/20 bg-[#080e0d] p-5 sm:p-8">
      <div className="mb-6 flex items-center gap-3"><ChartNoAxesCombined className="text-emerald-300" /><h2 className="text-2xl font-black text-white">מה המחיר אומר — ומה הוא לא אומר</h2></div>
      <div className="grid gap-6 lg:grid-cols-2"><PriceBars /><div className="space-y-5 text-sm leading-8 text-slate-300">
        <h3 className="text-xl font-bold text-white">מחיר, הסתברות ושולי ביטחון</h3>
        <p>יחס נמוך יותר מחייב הסתברות הצלחה גבוהה יותר כדי להגיע לאיזון. לכן הבחירה בהולנד–גרמניה דורשת רף גבוה יותר מהבחירה באוסטריה–ישראל. אין בכך הוכחה שהמפגש השני אכן צפוי להניב יותר שערים.</p>
        <p>היחסים כוללים בדרך כלל מרווח של מפעיל ההימורים. כדי להסירו נדרשים גם היחסים של הצד המשלים בשוק ובאותו מועד. שתי בחירות ה״מעל״ לבדן אינן מאפשרות להפיק הסתברות הוגנת נטולת מרווח.</p>
        <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
          <p className="font-bold text-[#e8ca75]">דיוק בטופס המשולב</p>
          <p className="mt-2 font-mono" dir="ltr">1.56 × 1.49 = {EXACT_PRODUCT.toFixed(4)} ≈ 2.32</p>
          <p className="mt-2">מכפלת היחסים לפני עיגול היא 2.3244. בדוח זה ההחזר מחושב לפי היחס המשולב שנמסר, 2.32; תנאי הטופס המקורי הם שקובעים את הסכום המשולם.</p>
        </div>
        <p>הפיכת מכפלת היחסים להסתברות משותפת אמיתית דורשת גם אומדנים עצמאיים וגם הנחת אי־תלות מתאימה. כאן מוצגים ספי מחיר בלבד.</p>
      </div></div>
    </section></Reveal>

    <Reveal><GoalModelCharts /></Reveal>

    <Reveal><section id="valuation" className="scroll-mt-24 rounded-[2rem] border border-[#d4af37]/25 bg-gradient-to-bl from-[#17150d] to-[#080e0d] p-5 sm:p-8">
      <p className="text-xs font-bold text-[#d4af37]">פרק 05 · הערכת הטופס</p>
      <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">החזר אפשרי, סכום בסיכון ותוחלת</h2>
      <p className="mt-4 text-sm leading-7 text-slate-300">צבירה מגדילה את ההחזר האפשרי, אך מחייבת הצלחה בכל הבחירות. בחירה אחת שנכשלת מספיקה כדי להפסיד את הסכום שהושקע, בכפוף לכללי הסליקה של הטופס.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-slate-300">
          סכום לחישוב בשקלים
          <input type="number" min="1" max="100000" step="0.01" value={stakeText} onChange={(e) => setStakeText(e.target.value)} aria-invalid={!validStake} aria-describedby={!validStake ? "stake-error" : undefined}
            className="mt-3 block w-full rounded-lg border border-emerald-200/20 bg-[#080e0d] px-3 py-2 font-mono text-2xl text-white outline-none focus:ring-2 focus:ring-emerald-300" dir="ltr" />
          {!validStake && <span id="stake-error" className="mt-2 block text-xs text-rose-300">יש להזין סכום בין 1 ל־100,000 ₪.</span>}
        </label>
        {[["החזר כולל אם הטופס זוכה", value.grossReturn], ["רווח נקי אם הטופס זוכה", value.netProfit]].map(([label, amount]) => <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-5" aria-live="polite">
          <p className="text-sm text-slate-300">{label}</p><p className="mt-4 text-2xl font-black text-emerald-100"><bdi>{validStake ? currency(Number(amount)) : "—"}</bdi></p>
        </div>)}
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-right text-sm">
          <caption className="border-b border-white/10 bg-white/[0.025] p-4 text-right font-bold text-white">טבלת תמחור לפי הבחירות שנמסרו</caption>
          <thead className="text-slate-400"><tr><th scope="col" className="p-4">משחק</th><th scope="col" className="p-4">בחירה</th><th scope="col" className="p-4">יחס</th><th scope="col" className="p-4">סף איזון</th></tr></thead>
          <tbody>{PICKS.map((pick) => <tr key={pick.id} className="border-t border-white/5 text-slate-200"><th scope="row" className="p-4 font-semibold">{pick.home} – {pick.away}</th><td className="p-4">מעל 2.5 שערים</td><td className="p-4"><bdi>{pick.odds.toFixed(2)}</bdi></td><td className="p-4"><bdi>{(impliedProbability(pick.odds) * 100).toFixed(2)}%</bdi></td></tr>)}</tbody>
          <tfoot className="border-t border-[#d4af37]/25 bg-[#d4af37]/5 text-[#e8ca75]"><tr><th scope="row" className="p-4">טופס משולב</th><td className="p-4">שתי הבחירות</td><td className="p-4">2.32</td><td className="p-4"><bdi>{(impliedProbability(ACCUMULATOR_ODDS) * 100).toFixed(2)}%</bdi></td></tr></tfoot>
        </table>
      </div>
      {validStake && <RiskRewardChart stake={stake} />}
    </section></Reveal>

    <Reveal><section id="sources" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-[#080e0d] p-5 sm:p-8">
      <p className="text-xs font-bold text-emerald-300">פרק 06 · מקורות ומתודולוגיה</p>
      <h2 className="mt-2 flex items-center gap-3 text-2xl font-black text-white"><ShieldCheck className="text-emerald-300" /> הפרדה בין עובדות, חישובים והנחות</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {[
          ["פרטים שנמסרו", "שמות ארבע הנבחרות, שתי בחירות מעל 2.5 שערים, יחסים 1.56 ו־1.49 ויחס משולב 2.32. לא נמסר מועד שבו היחסים נלקחו."],
          ["חישובים בדוח", "ספי איזון, מכפלת יחסים, החזר ברוטו ורווח נקי. כל אלה ניתנים לשחזור מהמספרים בטופס. המחירים לא עברו ניכוי מרווח מפעיל."],
          ["תרחישים בהנחת משתמש", "התפלגות השערים ועקומת התוחלת מחושבות לפי פרמטרים שבחרתם. הן אינן סדרת נתונים היסטורית או תחזית מאומתת למשחקים."],
        ].map(([title, body]) => <div key={title} className="rounded-xl border border-white/10 p-5"><h3 className="font-bold text-emerald-100">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{body}</p></div>)}
      </div>
      <h3 className="mt-7 text-lg font-bold text-white">להשלמת תיק המידע</h3>
      <p className="mt-3 text-sm leading-8 text-slate-300">נדרשים תאריך ומסגרת, הרכבים מאושרים, מקור נתונים עקבי לשערים צפויים, רשימת משחקי המדגם ומידע על המגרש והשופט. עד לקבלתם לא ניתן להציג ממוצעי כיבוש, אחוזי מפגשים ישירים או מדדי שערים צפויים ספציפיים לנבחרות. סמלי הנבחרות בדוח הם עיצובים מקוריים בצבעי דגלי המדינות, ולא סמלי ההתאחדויות הרשמיים.</p>
    </section></Reveal>
  </div>;
}
