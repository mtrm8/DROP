"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import CommunityFooter from "@/components/CommunityFooter";

function FloatingCard({ w, h, rot }: { w: number; h: number; rot: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-amber-400/40 bg-gradient-to-br from-neutral-900 via-zinc-900 to-black"
      style={{ width: w, height: h, transform: `rotate(${rot}deg)`, boxShadow: "0 0 22px rgba(228,174,57,0.18), 0 12px 26px rgba(0,0,0,0.5)" }}
    >
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(228,174,57,0.1), transparent 62%)" }} />
      <div className="flex h-full flex-col items-center justify-between py-2">
        <span className="text-[9px] font-bold text-amber-300/80">K</span>
        <span className="px-1 text-center font-serif text-[8px] font-black uppercase tracking-[0.14em] text-amber-200/90">
          MOSHA
        </span>
        <span className="rotate-180 text-[9px] font-bold text-amber-300/80">K</span>
      </div>
    </div>
  );
}

function HeroCard3D() {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 30, mass: 0.8 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 30, mass: 0.8 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  // The gold spotlight is a single pre-rendered gradient driven by cheap
  // transform-only motion (never re-painted per frame), keeping desktop smooth.
  const glowShiftX = useSpring(useTransform(glowX, [0, 100], [-42, 42]), { stiffness: 250, damping: 28, mass: 0.7 });
  const glowShiftY = useSpring(useTransform(glowY, [0, 100], [-42, 42]), { stiffness: 250, damping: 28, mass: 0.7 });

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    rotateY.set((px - 0.5) * 52);
    rotateX.set((0.5 - py) * 52);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <div className="relative animate-float">
      <div className="[perspective:1400px]">
        <motion.div
          role="button"
          aria-label="קלף MOSHA תלת־ממדי — גררו לסיבוב"
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="relative touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]"
          style={{ transformStyle: "preserve-3d", rotateX, rotateY, cursor: "grab", willChange: "transform", contain: "layout paint" }}
          whileTap={{ cursor: "grabbing" }}
        >
          <div
            className="relative h-[300px] w-[212px] sm:h-[390px] sm:w-[276px] overflow-hidden rounded-2xl border border-amber-400/45 bg-gradient-to-br from-[#12141c] via-[#0a0c12] to-black shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85),0_0_40px_rgba(228,174,57,0.14)]"
            style={{ transform: "translateZ(24px)" }}
          >
            <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(228,174,57,0.12), transparent 60%)" }} />
            <motion.div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: "50%",
                top: "50%",
                width: "240%",
                height: "140%",
                marginLeft: "-120%",
                marginTop: "-70%",
                x: glowShiftX,
                y: glowShiftY,
                background: "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.24), rgba(251,191,36,0.06) 45%, transparent 70%)",
              }}
            />

            <div className="absolute inset-2 rounded-xl border border-amber-400/25" />

            <span className="absolute left-3.5 top-3 text-xl font-bold text-amber-300/85 sm:text-2xl">K</span>
            <span className="absolute right-3.5 bottom-3 rotate-180 text-xl font-bold text-amber-300/85 sm:text-2xl">K</span>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="font-serif text-7xl font-black sm:text-8xl" style={{ textShadow: "0 0 34px rgba(228,174,57,0.55)", color: "#fbbf24" }}>
                M
              </span>
              <span className="text-xl font-black uppercase tracking-[0.34em] text-white sm:text-2xl">MOSHA</span>
              <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-300 sm:text-xs">
                Sports · Poker
              </span>
              <span className="mt-1.5 text-[9px] uppercase tracking-[0.3em] text-slate-500">Community Edition</span>
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(112deg, transparent 38%, rgba(255,255,255,0.09) 46%, transparent 56%)" }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const CARDS = [
  { left: "6%", top: "24%", w: 54, h: 76, rot: -18, rotMid: 10, dur: 16, delay: 0, sway: -30, fall: "52vh" },
  { left: "70%", top: "16%", w: 62, h: 88, rot: 14, rotMid: -8, dur: 18, delay: 1.5, sway: 26, fall: "58vh" },
  { left: "84%", top: "62%", w: 50, h: 72, rot: 20, rotMid: 12, dur: 15, delay: 3, sway: -18, fall: "44vh" },
  { left: "20%", top: "72%", w: 58, h: 82, rot: -10, rotMid: 14, dur: 17, delay: 2, sway: 22, fall: "48vh" },
];

function FallingField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {CARDS.map((c, i) => (
        <div
          key={`card-${i}`}
          className="animate-fall-card absolute"
          style={
            {
              left: c.left,
              top: c.top,
              "--rot": `${c.rot}deg`,
              "--rot-mid": `${c.rotMid}deg`,
              "--sway": `${c.sway}px`,
              "--fall": c.fall,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            } as React.CSSProperties
          }
        >
          <FloatingCard w={c.w} h={c.h} rot={c.rot} />
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <main
      className="flex w-full max-w-[100vw] min-h-screen flex-col overflow-x-clip bg-[#05060a]"
      style={{ backgroundColor: "#05060a" }}
    >
      <Navbar />

      {/* hero */}
      <section
        className="relative flex w-full min-h-screen min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 py-24 text-center sm:min-h-[92vh]"
        style={{ backgroundColor: "#05060a" }}
      >
        <FallingField />

        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-1/2 top-1/3 h-[46vw] w-[80vw] -translate-x-1/2 rounded-full bg-amber-500/[0.08] blur-[140px]" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(110% 80% at 50% 0%, transparent 52%, rgba(0,0,0,0.6) 100%)" }} />
        </div>

        <div
          className="relative z-10 flex w-full flex-col items-center text-center"
          style={{ opacity: 1 }}
        >
          <HeroCard3D />

          <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300">
            <ShieldCheck size={12} />
            Sports · Poker · Community
          </span>

          <h1
            className="mt-7 text-5xl font-black tracking-tight leading-none text-center sm:text-7xl lg:text-8xl"
          >
            <span className="text-white">MOSHA</span>{" "}
            <span className="bg-gradient-to-l from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(245,158,11,0.35)]">
              DROP
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-md text-sm text-slate-400 leading-relaxed sm:text-base">
            בחרו <span className="font-bold text-amber-300">5 קלפים</span>, המכונה תערבב את החפיסה
            ותחשוף את הפרס — בונוס או מתנה בשקלים שיופיעו בהפקדה הבאה שלכם.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4">
            <Link
              href="/drop"
              className="group relative inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-lg font-black text-slate-950 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_45px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-[0.99]"
            >
              <Sparkles size={22} className="transition-transform group-hover:rotate-12" />
              פתחו את ההדרוף
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            </Link>
            <p className="text-[11px] text-slate-500">
              כניסה עם קוד הקהילה — קוד זמין פעם אחת בלבד
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 sm:block">
          <div className="animate-bob">
            <ChevronDown size={22} className="text-amber-400/60" />
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="relative w-full px-6 pb-4" style={{ backgroundColor: "#05060a" }}>
        <div className="mx-auto max-w-4xl">
          <motion.h2
            initial={{ y: 16 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center text-2xl font-black text-white sm:text-3xl"
          >
            הדרוף עובד בשלושה צעדים
          </motion.h2>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { n: "01", t: "בחרו 5 קלפים", d: "עשרה קלפים על השולחן, כל אחד מסתיר פרס אמיתי. הבחירה נעולה — קלף שנבחר לא ניתן לביטול." },
              { n: "02", t: "ריפל של דילר", d: "המכונה טורפת את החפיסה באיטיות ובתצוגה מלאה — ריפל כפול של דילר מקצועי, רגע לפני ההכרעה." },
              { n: "03", t: "הפרס מתגלה", d: "קלף הזוכה נחשף, והפרס יופיע בהפקדה הבאה בלבד. קוד אחד לכל חבר — פעם אחת." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ y: 22 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: "easeOut" }}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 text-center transition hover:border-amber-400/25 hover:bg-white/[0.05]"
              >
                <span className="font-serif text-3xl font-black" style={{ textShadow: "0 0 18px rgba(228,174,57,0.45)", color: "#fbbf24" }}>
                  {s.n}
                </span>
                <h3 className="mt-3 text-lg font-black text-white">{s.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* closing CTA */}
      <section className="relative w-full overflow-hidden px-6 py-20 text-center" style={{ backgroundColor: "#05060a" }}>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[78vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.07] blur-[120px]" />
        <motion.div
          initial={{ y: 20 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center text-center"
        >
          <h2 className="text-2xl font-black text-white sm:text-4xl">
            מקום אחד <span className="bg-gradient-to-l from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">למזל שלכם</span>
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-xs text-slate-400 sm:text-sm">
            ההדרוף פתוח לחברי הקהילה בלבד. הזינו את הקוד האישי שלכם והתחילו לסבב.
          </p>
          <Link
            href="/drop"
            className="group mt-8 inline-flex items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-lg font-black text-slate-950 outline-none transition focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_45px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-[0.99]"
          >
            בחרו את הקלפים שלכם
            <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          </Link>
        </motion.div>
      </section>

      <CommunityFooter />
    </main>
  );
}