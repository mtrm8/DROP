"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, KeyRound, Lock, Sparkles } from "lucide-react";
import { CardRevealAnimation } from "./CardRevealAnimation";
import { getRolledPrize, redeemCode } from "./drop/backend";
import type { DropContent } from "./drop/backend";
import { ItemIcon, RARITIES } from "./drop/boxItems";
import type { BoxItem } from "./drop/boxItems";
import { DROP_COMMUNITY, DROP_PRIZE_COPY, DROP_TITLE } from "./drop/copy";
import { clearDropVerified, markDropVerified } from "./drop/session";
import { useFreshPageView } from "./useFreshPageView";

function CardEmblem() {
  return (
    <div className="relative flex h-[140px] w-[min(85vw,380px)] items-center justify-center sm:h-[190px]" aria-hidden>
      <div className="pointer-events-none absolute inset-0 rounded-full bg-amber-500/[0.07] blur-2xl" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-xl border border-amber-400/40 bg-gradient-to-br from-neutral-800 via-zinc-900 to-black"
          style={{
            width: "clamp(78px, 10vw, 112px)",
            height: "clamp(116px, 15vw, 168px)",
            transform: `rotate(${(i - 1) * 12}deg) translateX(${(i - 1) * 52}px)`,
            boxShadow: "0 0 34px rgba(34,211,238,0.16), 0 14px 30px rgba(0,0,0,0.45)",
            backgroundImage: "radial-gradient(ellipse at center, rgba(34,211,238,0.1), transparent 60%)",
          }}
        >
          <div className="absolute inset-1 rounded-lg border border-amber-500/15" />
          <div className="flex h-full flex-col items-center justify-between p-2">
            <span className="text-[9px] font-bold text-amber-400/70">K ♠</span>
            <span className="drop-emoji text-lg leading-none">👑</span>
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
  content: DropContent;
};

const COMPLETED_KEY = "drop-completed";
const ACTIVE_KEY = "drop-in-progress";

function DropDetails({ content }: { content: DropContent }) {
  if (!content.title && !content.description && !content.analysis) return null;
  return <div className="mt-6 w-full max-w-2xl rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5 text-right text-slate-200">
    {content.title && <h3 className="text-lg font-black text-cyan-100">{content.title}</h3>}
    {content.description && <p className="mt-2 whitespace-pre-line text-sm leading-7">{content.description}</p>}
    {content.analysis && <p className="mt-3 whitespace-pre-line text-sm leading-7">{content.analysis}</p>}
  </div>;
}

function CompletedView({ record, onStartNew }: { record: CompletedRecord; onStartNew: () => void }) {
  const rarity = RARITIES[record.item.rarity];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-4 sm:px-5 sm:pt-6 lg:px-8">
      <motion.div
        className="premium-panel relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute -top-28 left-1/2 h-48 w-[420px] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(34,211,238,0.09), transparent 72%)" }} />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.025), transparent 70%)" }} />

        <div className="relative flex flex-col items-center px-4 py-8 text-center sm:px-10 sm:py-12 lg:py-16">
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

          <h2 className="mt-5 text-xl sm:text-2xl font-black text-white tracking-tight">הדרופ הושלם — מזל טוב!</h2>

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
            הפרס הכספי יופיע בהפקדה הבאה. שמרו את פרטי הקהילה לידכם — הזכייה תוכרז ותועבר בקרוב.
          </p>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-4">
            <Lock size={12} className="text-red-400/80" />
            הקוד <span dir="ltr" className="font-mono font-bold text-slate-400">{record.code}</span> נוצל — לא ניתן להפעילו שנית
          </p>

          <div className="mt-5 flex w-full max-w-2xl flex-col items-center rounded-2xl border border-amber-300/40 bg-amber-300/[0.08] px-5 py-4 text-amber-100" role="note">
            <Camera size={26} aria-hidden="true" />
            <p className="mt-2 text-base font-black">צלמו עכשיו צילום מסך של הזכייה והקוד</p>
            <p className="mt-1 text-sm leading-6">שמרו את הצילום והציגו אותו לצוות הקהילה כדי לממש את הפרס.</p>
          </div>
          <DropDetails content={record.content} />

          <button
            onClick={onStartNew}
            className="group relative mt-7 flex min-h-14 w-full max-w-2xl items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 py-3.5 text-base font-black text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.3)] transition hover:brightness-110 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] sm:text-lg"
          >
            <Sparkles size={19} className="transition-transform group-hover:rotate-12" />
            התחל דרופ חדש
          </button>

        </div>
      </motion.div>
    </section>
  );
}

export default function DailyDrop() {
  useFreshPageView();
  const [unlocked, setUnlocked] = useState(false);
  const [stage, setStage] = useState<"idle" | "cinematic">("idle");
  const [code, setCode] = useState("");
  const [errorKind, setErrorKind] = useState<null | "invalid" | "already_used" | "server_error">(null);
  const [unlocking, setUnlocking] = useState(false);
  const [completed, setCompleted] = useState<CompletedRecord | null>(null);
  const [prize, setPrize] = useState<BoxItem | null>(null);
  const [content, setContent] = useState<DropContent>({});
  const [resumed, setResumed] = useState(false);
  const [verificationStage, setVerificationStage] = useState<"confirming" | "ready">("ready");
  // Guards against a double-click / Enter+click firing two redeems for the same
  // code, which would burn it and then report a bogus "already used".
  const submitGuard = useRef(false);

  // An unfinished drop retains its locked deck, but code entry is required
  // again after every refresh before that deck can be resumed.
  useEffect(() => {
    try {
      window.localStorage.removeItem("drop-burned");
      window.localStorage.removeItem(COMPLETED_KEY);
    } catch {
      // ignore private-mode / storage errors
    }
  }, []);

  useEffect(() => {
    if (!unlocked || verificationStage !== "confirming") return;
    const timer = window.setTimeout(() => setVerificationStage("ready"), 2600);
    return () => window.clearTimeout(timer);
  }, [unlocked, verificationStage]);

  const startOpening = () => {
    if (!prize || verificationStage !== "ready") return;
    setStage("cinematic");
  };

  const rememberActive = (value: string, won: BoxItem) => {
    try {
      const previous = JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || "null");
      const cards = previous?.code === value && previous?.prize?.id === won.id ? previous.cards : undefined;
      window.localStorage.setItem(ACTIVE_KEY, JSON.stringify({ code: value, prize: won, cards }));
    } catch {
      // Browser storage may be disabled; the in-memory flow still works.
    }
  };

  const finishDrop = (winner: BoxItem) => {
    const record: CompletedRecord = { code, item: winner, content };
    try {
      window.localStorage.removeItem(ACTIVE_KEY);
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
    setStage("idle");
    clearDropVerified();
    try {
      window.localStorage.removeItem(ACTIVE_KEY);
      window.localStorage.removeItem(COMPLETED_KEY);
    } catch {
      // ignore private-mode / storage errors
    }
    setCompleted(null);
    setUnlocked(false);
    setCode("");
    setErrorKind(null);
    setPrize(null);
    setContent({});
    setResumed(false);
    setVerificationStage("ready");
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitGuard.current) return;
    const value = code.trim().toUpperCase();
    if (!value) return;
    submitGuard.current = true;
    setErrorKind(null);
    setUnlocking(true);
    const settle = () => {
      submitGuard.current = false;
      setUnlocking(false);
    };
    const enter = (drop: { prize: BoxItem; content: DropContent }, resumed: boolean) => {
      rememberActive(value, drop.prize);
      markDropVerified();
      setPrize(drop.prize);
      setContent(drop.content);
      setVerificationStage("confirming");
      setUnlocked(true);
      setResumed(resumed);
      setCode(value);
      settle();
    };

    try {
      let pending: { code?: string } | null = null;
      try {
        pending = JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || "null");
      } catch {
        // The code may still be verified when browser storage is unavailable.
      }
      if (pending?.code === value) {
        const existing = await getRolledPrize(value);
        if (existing.status === "ok") {
          enter(existing.drop, true);
          return;
        }
        if (existing.status === "error") {
          setErrorKind("server_error");
          settle();
          return;
        }
      }

      const result = await redeemCode(value);
      if (result.status !== "ok") {
        setErrorKind(result.status === "already_used" ? "already_used" : result.status === "invalid" ? "invalid" : "server_error");
        settle();
        return;
      }
      enter(result.drop, false);
    } catch (err) {
      console.warn("[drop] code validation failed:", err);
      setErrorKind("server_error");
      settle();
    }
  };

  if (completed) {
    return <CompletedView record={completed} onStartNew={handleStartNew} />;
  }

  return (
    <>
    <section id="drop" className="mx-auto w-full max-w-7xl px-4 pb-4 pt-4 sm:px-5 sm:pt-6 lg:px-8">
        <div className="premium-panel relative flex min-h-[calc(100svh-13rem)] flex-col justify-center overflow-hidden rounded-3xl">
          {/* Restrained luxury ambience */}
          <div className="pointer-events-none absolute -top-28 left-1/2 h-48 w-[420px] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(34,211,238,0.09), transparent 72%)" }} />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.025), transparent 70%)" }} />

          <div className="relative flex flex-col items-center px-4 py-8 text-center sm:px-10 sm:py-12 lg:py-16">
            {/* Badge + status */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5 sm:mb-8">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400/[0.1] text-amber-400 border border-amber-400/25 uppercase tracking-[0.22em]">
                 Einstein Drop · אינשטיין דרופ
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

            <h2 className="mt-8 w-full max-w-2xl text-balance text-2xl font-black leading-snug tracking-tight text-white sm:mt-10 sm:text-3xl lg:text-4xl">
              {DROP_TITLE}
            </h2>
            <p className="mb-6 mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:mb-7 sm:text-base">
              {unlocked
                ? DROP_PRIZE_COPY
                 : `הדרופ פתוח לחברי ${DROP_COMMUNITY} — הזינו את קוד הגישה שקיבלתם.`}
            </p>

            <AnimatePresence mode="wait" initial={false}>
                {unlocked ? (
                  <motion.div
                    key="verified"
                    className="flex w-full max-w-4xl flex-col items-center pt-2 pb-1 text-center"
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
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 24, mass: 0.7 }}
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
                      role="status"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28, duration: 0.3 }}
                    >
                      {verificationStage === "confirming"
                        ? "הקוד אומת בהצלחה — מכינים את הדרופ..."
                        : resumed
                          ? "הקוד כבר אומת בעבר — ממשיכים את הדרופ"
                          : "הקוד אומת — הגישה מאושרת"}
                    </motion.p>
                    <AnimatePresence mode="wait">
                      {verificationStage === "confirming" ? (
                        <motion.div key="preparing" className="mt-7 h-1.5 w-40 overflow-hidden rounded-full bg-emerald-400/15"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <motion.div className="h-full rounded-full bg-emerald-400"
                            initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2.6, ease: "easeInOut" }} />
                        </motion.div>
                      ) : (
                        <motion.div key="activate" className="w-full" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                          <button
                            onClick={startOpening}
                            className="group relative mt-6 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 py-4 text-lg font-black text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.35)] transition hover:brightness-110 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] sm:text-xl"
                          >
                            <Sparkles size={21} className="transition-transform group-hover:rotate-12" />
                            הפעל את הדרופ
                          </button>
                          <p className="mt-3 text-[11px] text-slate-500">הפרס יופיע בהפקדה הבאה בלבד</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="locked"
                    className="w-full max-w-4xl text-right"
                    exit={{ opacity: 0, scale: 0.97, y: 8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* access code field — freely editable, never disabled */}
                    <label
                      htmlFor="daily-drop-code"
                      className="block text-[11px] font-bold text-slate-400 mb-2"
                    >
                      קוד גישה לדרופ
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
                        form="drop-code-form"
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

                    <form id="drop-code-form" onSubmit={handleCodeSubmit} className="mt-4">
                      <button
                        type="submit"
                        disabled={unlocking}
                        className="group relative flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 py-3.5 text-base font-black text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.3)] transition hover:brightness-110 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] sm:text-lg"
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
                              : errorKind === "server_error"
                                ? "לא ניתן לאמת את הקוד כרגע — נסו שוב בעוד רגע"
                                : "קוד שגוי – נא לבדוק את הקוד שהתקבל"}
                          </p>
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
