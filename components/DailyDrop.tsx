"use client";

import { useState } from "react";
import { Check, KeyRound, Lock, Sparkles } from "lucide-react";
import { CardRevealAnimation } from "./CardRevealAnimation";
import { redeemCode } from "./drop/backend";

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
            boxShadow: "0 0 34px rgba(228,174,57,0.14), 0 14px 30px rgba(0,0,0,0.45)",
            backgroundImage: "radial-gradient(ellipse at center, rgba(228,174,57,0.08), transparent 60%)",
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

export default function DailyDrop() {
  const [unlocked, setUnlocked] = useState(false);
  const [stage, setStage] = useState<"idle" | "cinematic">("idle");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [codeUsedError, setCodeUsedError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const startOpening = () => {
    setStage("cinematic");
  };

  const handleDropFinished = () => {
    setStage("idle");
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unlocking) return;
    const value = code.trim();
    setCodeError(false);
    setCodeUsedError(false);
    setUnlocking(true);
    const result = await redeemCode(value);
    setUnlocking(false);
    if (result.status === "invalid") {
      setCodeError(true);
      return;
    }
    if (result.status === "already_used") {
      setCodeUsedError(true);
      return;
    }
    setUnlocked(true);
    setCode(value);
  };

  return (
    <>
      <section id="drop" className="px-4 lg:px-8 max-w-2xl mx-auto w-full pt-8 pb-4 sm:pt-12">
        <div className="premium-panel relative overflow-hidden rounded-3xl">
          {/* Restrained luxury ambience */}
          <div className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[420px] h-48 rounded-full bg-amber-400/[0.06] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-white/[0.02] blur-3xl" />

          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center text-center">
            {/* Badge + status */}
            <div className="flex items-center gap-2.5 mb-6 sm:mb-8">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400/[0.1] text-amber-400 border border-amber-400/25 uppercase tracking-[0.22em]">
                Daily Sports &amp; Poker Drop
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

            <div className="w-full max-w-md text-right">
              {/* access code field — freely editable, never disabled */}
              <label
                htmlFor="daily-drop-code"
                className="block text-[11px] font-bold text-slate-400 mb-2"
              >
                קוד גישה לדרוף
              </label>
              <div
                className={`flex items-center gap-2 rounded-xl border bg-white/[0.03] transition ${
                  unlocked
                    ? "border-amber-400/60 shadow-[0_0_18px_rgba(228,174,57,0.15)]"
                    : codeError || codeUsedError
                      ? "border-red-500/60 animate-shake"
                      : unlocking
                        ? "border-amber-400/40"
                        : "border-white/[0.08] focus-within:border-amber-400/50"
                }`}
              >
                <KeyRound
                  size={15}
                  className={`shrink-0 mr-3 transition-colors ${unlocked ? "text-amber-400" : "text-slate-500"}`}
                />
                <input
                  id="daily-drop-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setCodeError(false);
                    setCodeUsedError(false);
                    setUnlocked(false);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  className={`w-full bg-transparent py-3 pl-1 text-left font-mono font-bold text-base tracking-[0.16em] placeholder:text-slate-600 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal outline-none ${
                    unlocked || unlocking ? "text-amber-300" : "text-white"
                  }`}
                />
                {unlocking && (
                  <span className="ml-3 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                )}
              </div>

              <form onSubmit={handleCodeSubmit} className="mt-4">
                {!unlocked ? (
                  <>
                    <button
                      type="submit"
                      disabled={unlocking}
                      className={`group relative w-full py-3.5 rounded-xl text-base font-black text-slate-950 flex items-center justify-center gap-2.5 transition outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] ${
                        unlocking
                          ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_26px_rgba(245,158,11,0.3)]"
                          : "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] shadow-[0_0_35px_rgba(245,158,11,0.3)]"
                      }`}
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

                    {codeError && (
                      <p className="text-[11px] font-bold text-red-400 mt-2 animate-shake">
                        קוד שגוי — נא לבדוק את הקוד שהתקבל
                      </p>
                    )}

                    {codeUsedError && (
                      <p className="text-[11px] font-bold text-red-400 mt-2 animate-shake">
                        הקוד כבר נוצל או אינו תקף — אפשר לנסות קוד אחר
                      </p>
                    )}

                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-3">
                      <Lock size={12} className="text-amber-500/70" />
                      קוד הגישה ניתן בקבוצת הוואטסאפ של הקהילה
                    </p>
                  </>
                ) : (
                  <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-300 mt-2">
                    <Check size={14} strokeWidth={3} />
                    הקוד אומת — הגישה מאושרת
                  </p>
                )}
              </form>
            </div>

            {unlocked && (
              <>
                <button
                  onClick={startOpening}
                  className="group relative w-full max-w-md mt-5 py-4 rounded-2xl text-lg font-black flex items-center justify-center gap-2.5 transition outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] text-slate-950 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.99] shadow-[0_0_35px_rgba(245,158,11,0.3)]"
                >
                  <Sparkles size={21} className="transition-transform group-hover:rotate-12" />
                  הפעל את הדרוף
                </button>

                <p className="flex items-center justify-center text-[11px] text-slate-500 mt-3">
                  הפרס יופיע בהפקדה הבאה בלבד
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {stage === "cinematic" && (
        <CardRevealAnimation onFinished={handleDropFinished} onCancel={() => setStage("idle")} />
      )}
    </>
  );
}