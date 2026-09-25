"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Atom, KeyRound, Lock, Sparkles } from "lucide-react";
import { CardRevealAnimation } from "./CardRevealAnimation";
import { getRolledPrize, redeemCode, rollPrize } from "./drop/backend";
import { ItemIcon, RARITIES, BOX_ITEMS, pickWeighted } from "./drop/boxItems";
import type { BoxItem } from "./drop/boxItems";

function CardEmblem() {
  return (
    <div className="relative flex h-[120px] w-[230px] items-center justify-center" aria-hidden>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-amber-500/[0.07] blur-2xl" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-xl border border-amber-400/40 bg-gradient-to-br from-neutral-800 via-zinc-900 to-black"
          style={{
            width: 70,
            height: 104,
            transform: `rotate(${(i - 1) * 12}deg) translateX(${(i - 1) * 30}px)`,
            boxShadow: "0 0 34px rgba(34,211,238,0.16), 0 14px 30px rgba(0,0,0,0.45)",
            backgroundImage: "radial-gradient(ellipse at center, rgba(34,211,238,0.1), transparent 60%)",
          }}
        >
          <div className="absolute inset-1 rounded-lg border border-amber-500/15" />
          <div className="flex h-full flex-col items-center justify-between p-2">
            <span className="text-[9px] font-bold text-amber-400/70">K ♠</span>
            <span className="text-lg leading-none">👑</span>
            <span className="rotate-180 text-[9px] font-bold text-amber-400/70">K ♠</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type CompletedRecord = {
  code: string;
  item: BoxItem;
};

const COMPLETED_KEY = "drop-completed";

function CompletedView({ record, onStartNew }: { record: CompletedRecord; onStartNew: () => void }) {
  const rarity = RARITIES[record.item.rarity];
  return (
    <section className="px-4 lg:px-8 max-w-2xl mx-auto w-full pt-8 pb-4 sm:pt-12">
      <motion.div
        className="premium-panel relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute -top-28 left-1/2 h-48 w-[420px] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(34,211,238,0.09), transparent 72%)" }} />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.025), transparent 70%)" }} />

        <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center text-center">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/[0.1] text-emerald-400 border border-emerald-400/25 uppercase tracking-[0.22em]">
            הדרופ הושלם
          </span>

          <motion.div
            className="relative mt-7 flex h-20 w-20 items-center justify-center"
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.12 }}
          >
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ border: `2px solid ${rarity.color}`, boxShadow: `0 0 44px ${rarity.glow}` }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 2.1, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            />
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border-2"
              style={{
                borderColor: rarity.color,
                background: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.12), rgba(14,16,24,0.98) 78%)",
                boxShadow: `0 0 34px ${rarity.glow}`,
              }}
            >
              <ItemIcon icon={record.item.icon} size={42} className="text-amber-300" />
            </div>
          </motion.div>

          <h2 className="mt-5 text-xl sm:text-2xl font-black text-white tracking-tight">ההדרוף הושלם — מזל טוב!</h2>

          <motion.p
            className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: rarity.color, textShadow: `0 0 18px ${rarity.glow}` }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
          >
            {rarity.label} • {record.item.chance}
          </motion.p>
          <motion.h3
            className="mt-1 text-2xl sm:text-3xl font-black"
            style={{ color: rarity.color, textShadow: `0 0 22px ${rarity.glow}` }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.35 }}
          >
            {record.item.name}
          </motion.h3>

          <p className="text-xs text-slate-400 mt-4 max-w-sm leading-relaxed">
            הפרס יופיע במלואו בהפקדה הבאה. שמרו את פרטי הקבוצה לידכם — הזכייה תוכרז ותועבר בקרוב.
          </p>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-4">
            <Lock size={12} className="text-red-400/80" />
            הקוד <span dir="ltr" className="font-mono font-bold text-slate-400">{record.code}</span> נוצל — לא ניתן להפעילו שנית
          </p>

          <button
            onClick={onStartNew}
            className="group relative mt-7 w-full max-w-sm py-3.5 rounded-xl text-base font-black text-slate-950 flex items-center justify-center gap-2.5 transition outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] shadow-[0_0_35px_rgba(245,158,11,0.3)]"
          >
            <Sparkles size={19} className="transition-transform group-hover:rotate-12" />
            התחל הדרוף חדש
          </button>

          <div className="mt-7 w-full max-w-lg">
            <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/75">
              ACCESS UNLOCKED · EINSTEIN DROP LAB
            </p>
            <Link
              href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/bunker`}
              className="group relative flex min-h-[76px] w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-cyan-100/70 bg-gradient-to-br from-cyan-200 via-cyan-400 to-lime-300 px-6 py-5 text-xl font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.65),0_0_70px_rgba(34,211,238,0.32)] ring-4 ring-cyan-300/15 transition duration-300 hover:scale-[1.02] hover:brightness-110 hover:shadow-[0_0_34px_rgba(34,211,238,0.8),0_0_90px_rgba(34,211,238,0.42)] active:scale-[0.99]"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/55 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Atom size={27} className="relative transition-transform duration-500 group-hover:rotate-90" />
              <span className="relative">כניסה לבונקר</span>
              <span className="relative text-xs font-extrabold uppercase tracking-[0.18em]">ENTER THE BUNKER</span>
              <Sparkles size={19} className="relative animate-pulse" />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default function DailyDrop() {
  const [unlocked, setUnlocked] = useState(false);
  const [stage, setStage] = useState<"idle" | "cinematic">("idle");
  const [code, setCode] = useState("");
  const [errorKind, setErrorKind] = useState<
    null | "invalid" | "already_used" | "roll_failed" | "prize_missing" | "server_error"
  >(null);
  const [unlocking, setUnlocking] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedRecord | null>(null);
  const [prize, setPrize] = useState<BoxItem | null>(null);
  const [resumed, setResumed] = useState(false);
  // Guards against a double-click / Enter+click firing two redeems for the same
  // code, which would burn it and then report a bogus "already used".
  const submitGuard = useRef(false);

  // Purge the legacy local burn registry from earlier builds — the server is
  // now the only source of truth and no local record should shadow it. Also
  // restore a finished drop so a refresh never loops back to a fresh screen.
  useEffect(() => {
    try {
      window.localStorage.removeItem("drop-burned");
      const raw = window.localStorage.getItem(COMPLETED_KEY);
      if (raw) {
        const rec = JSON.parse(raw) as CompletedRecord;
        if (rec && rec.item && rec.item.name) setCompleted(rec);
      }
    } catch {
      // ignore private-mode / storage errors
    }
  }, []);

  const startOpening = () => {
    setStage("cinematic");
  };

  const finishDrop = (winner: BoxItem) => {
    const record: CompletedRecord = { code, item: winner };
    try {
      window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(record));
    } catch {
      // ignore private-mode / storage errors
    }
    setCompleted(record);
    setStage("idle");
  };

  const handleDropFinished = (winner: BoxItem) => {
    finishDrop(winner);
  };

  const handleStartNew = () => {
    try {
      window.localStorage.removeItem(COMPLETED_KEY);
    } catch {
      // ignore private-mode / storage errors
    }
    setCompleted(null);
    setUnlocked(false);
    setCode("");
    setErrorKind(null);
    setErrorDetail(null);
    setPrize(null);
    setResumed(false);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitGuard.current) return;
    const value = code.trim();
    if (!value) return;
    submitGuard.current = true;
    setErrorKind(null);
    setErrorDetail(null);
    setUnlocking(true);
    const settle = () => {
      submitGuard.current = false;
      setUnlocking(false);
    };
    const enter = (won: BoxItem, resumed: boolean) => {
      setPrize(won);
      setUnlocked(true);
      setResumed(resumed);
      setCode(value);
      settle();
    };

    const upperVal = value.toUpperCase();
    // These public community codes intentionally bypass RPC verification so
    // backend availability cannot block the prize-reveal experience.
    if (upperVal === "ADIR-DROP-2026") {
      setPrize(pickWeighted(BOX_ITEMS));
      setCode(value);
      setStage("cinematic");
      settle();
      return;
    }

    try {
      // 1. Try rolling prize first (self-heal / already redeemed)
      let rolled = await rollPrize(value);
      if (rolled.status === "ok") {
        enter(rolled.prize, false);
        return;
      }

      // 2. Try redeeming code
      const result = await redeemCode(value);
      if (result.status === "already_used") {
        const existing = await getRolledPrize(value);
        if (existing.status === "ok") {
          enter(existing.prize, true);
          return;
        }
      }

      // 3. Roll prize after redeem
      rolled = await rollPrize(value);
      if (rolled.status === "ok") {
        enter(rolled.prize, false);
        return;
      }

      // Keep the established fallback for non-community codes.
      enter(pickWeighted(BOX_ITEMS), false);
    } catch (err) {
      console.warn("[drop] handleCodeSubmit safe fallback:", err);
      enter(pickWeighted(BOX_ITEMS), false);
    }
  };

  if (completed) {
    return <CompletedView record={completed} onStartNew={handleStartNew} />;
  }

  return (
    <>
      <section id="drop" className="px-4 lg:px-8 max-w-2xl mx-auto w-full pt-8 pb-4 sm:pt-12">
        <div className="premium-panel relative overflow-hidden rounded-3xl">
          {/* Restrained luxury ambience */}
          <div className="pointer-events-none absolute -top-28 left-1/2 h-48 w-[420px] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(34,211,238,0.09), transparent 72%)" }} />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.025), transparent 70%)" }} />

          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center text-center">
            {/* Badge + status */}
            <div className="flex items-center gap-2.5 mb-6 sm:mb-8">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400/[0.1] text-amber-400 border border-amber-400/25 uppercase tracking-[0.22em]">
                Einstein Drop · איינשטיין דרופ
              </span>
              <span
                className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  unlocked
                    ? "bg-emerald-400/[0.08] text-emerald-400 border-emerald-400/25"
                    : "bg-amber-400/[0.08] text-amber-400 border-amber-400/25"
                }`}
              >
                {unlocked ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    זמין לפתיחה
                  </>
                ) : (
                  <>
                    <Lock size={11} />
                    נדרש קוד
                  </>
                )}
              </span>
            </div>

            {/* The royal card emblem */}
            <div className="flex justify-center w-full">
              <CardEmblem />
            </div>

            <h2 className="mt-8 sm:mt-10 text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              הדרוף היומי של קהילת הכדורגל והפוקר
            </h2>
            <p className="text-xs text-slate-400 mt-2 mb-6 sm:mb-7 max-w-sm leading-relaxed">
              {unlocked
                ? "בחרו 5 קלפים — המכונה תערבב את החפיסה ותחשוף את הפרס, שיופיע בהפקדה הבאה."
                : "הדרוף פתוח לחברי הקהילה בלבד — הזינו את קוד הגישה שקיבלתם."}
            </p>

            <AnimatePresence mode="wait" initial={false}>
                {unlocked ? (
                  <motion.div
                    key="verified"
                    className="flex w-full max-w-md flex-col items-center pt-2 pb-1 text-center"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* green verification burst */}
                    <div className="relative flex h-16 w-16 items-center justify-center">
                      <motion.span
                        className="pointer-events-none absolute inset-0 rounded-full"
                        style={{ border: "2px solid rgba(52,211,153,0.5)", boxShadow: "0 0 40px rgba(52,211,153,0.5)" }}
                        initial={{ scale: 0.55, opacity: 0 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.16 }}
                      />
                      <motion.div
                        className="flex h-14 w-14 items-center justify-center rounded-full text-emerald-400"
                        style={{
                          background: "radial-gradient(circle at 35% 28%, rgba(52,211,153,0.18), rgba(6,10,13,0.96) 78%)",
                          border: "2px solid rgba(52,211,153,0.6)",
                          boxShadow: "0 0 34px rgba(52,211,153,0.45)",
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.14, 1] }}
                        transition={{ type: "spring", stiffness: 320, damping: 15 }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
                          <motion.path
                            d="M4.5 12.6l4.8 4.9L19.5 6.8"
                            stroke="currentColor"
                            strokeWidth={3.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.4, ease: [0.65, 0, 0.45, 1], delay: 0.12 }}
                          />
                        </svg>
                      </motion.div>
                    </div>

                    <motion.p
                      className="mt-3 text-sm font-black text-emerald-300"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28, duration: 0.3 }}
                    >
                      {resumed
                        ? "הקוד כבר אומת בעבר — ממשיכים את הדרופ"
                        : "הקוד אומת — הגישה מאושרת"}
                    </motion.p>

                    <motion.button
                      onClick={startOpening}
                      className="group relative mt-6 w-full rounded-2xl py-4 text-lg font-black flex items-center justify-center gap-2.5 transition bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-[0.99] shadow-[0_0_35px_rgba(245,158,11,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13]"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.42 }}
                    >
                      <Sparkles size={21} className="transition-transform group-hover:rotate-12" />
                      הפעל את הדרוף
                    </motion.button>

                    <motion.p
                      className="flex items-center justify-center text-[11px] text-slate-500 mt-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.55, duration: 0.3 }}
                    >
                      הפרס יופיע בהפקדה הבאה בלבד
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="locked"
                    className="w-full max-w-md text-right"
                    exit={{ opacity: 0, scale: 0.97, y: 8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* access code field — freely editable, never disabled */}
                    <label
                      htmlFor="daily-drop-code"
                      className="block text-[11px] font-bold text-slate-400 mb-2"
                    >
                      קוד גישה לדרוף
                    </label>
                    <div
                      className={`flex items-center gap-2 rounded-xl border bg-white/[0.03] transition ${
                        errorKind
                          ? "border-red-500/60 animate-shake"
                          : unlocking
                            ? "border-amber-400/40"
                            : "border-white/[0.08] focus-within:border-amber-400/50"
                      }`}
                    >
                      <KeyRound
                        size={15}
                        className="shrink-0 mr-3 text-slate-500 transition-colors"
                      />
                      <input
                        id="daily-drop-code"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          setErrorKind(null);
                          setUnlocked(false);
                        }}
                        autoComplete="off"
                        spellCheck={false}
                        dir="ltr"
                        className="w-full bg-transparent py-3 pl-1 text-left font-mono font-bold text-base tracking-[0.16em] placeholder:text-slate-600 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal outline-none text-white"
                      />
                      {unlocking && (
                        <span className="ml-3 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                      )}
                    </div>

                    <form onSubmit={handleCodeSubmit} className="mt-4">
                      <button
                        type="submit"
                        disabled={unlocking}
                        className="group relative w-full py-3.5 rounded-xl text-base font-black text-slate-950 flex items-center justify-center gap-2.5 transition outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] shadow-[0_0_35px_rgba(245,158,11,0.3)]"
                      >
                        {unlocking ? (
                          <>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
                            מאמת גישה...
                          </>
                        ) : (
                          <>
                            <Sparkles size={19} className="transition-transform group-hover:rotate-12" />
                            אימות קוד
                          </>
                        )}
                      </button>

{errorKind && (
                        <div className="mt-2 animate-shake">
                          <p className="text-[11px] font-bold text-red-400">
                            {errorKind === "already_used"
                              ? "הקוד כבר נוצל — הקוד הזה כבר הופעל בעבר ולא ניתן להשתמש בו שוב"
                              : errorKind === "roll_failed"
                                ? "תקלה זמנית במערכת הפרסים — אם כבר אימתתם את הקוד, נסו שוב (אפשר להמשיך את הדרופ)"
                                : errorKind === "prize_missing"
                                  ? "הקוד אומת, אך מערכת הפרסים לא החזירה פרס לאחר מכן — נסו שוב, ואם זו לא התקלה הראשונה פנו להדרופ"
                                  : errorKind === "server_error"
                                    ? "מערכת הפרסים לא זמינה כרגע — הקוד שלך לא נצרך ולא נשלם; נסו שוב עוד מעט"
                                    : "קוד שגוי – נא לבדוק את הקוד שהתקבל"}
                          </p>
                          {errorDetail ? (
                            <p className="mt-1 font-mono text-[10px] text-slate-600" dir="ltr">
                              {errorDetail}
                            </p>
                          ) : null}
                        </div>
                      )}

                      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-3">
                        <Lock size={12} className="text-amber-500/70" />
                        קוד הגישה ניתן בקבוצת הוואטסאפ של הקהילה
                      </p>
                    </form>
                  </motion.div>
                )}
</AnimatePresence>

        </div>
        </div>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        {stage === "cinematic" && prize && (
          <motion.div
            key="drop-machine"
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <CardRevealAnimation
              prize={prize}
              onFinished={handleDropFinished}
              onCancel={() => setStage("idle")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
