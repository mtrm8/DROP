"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, Sparkles, X } from "lucide-react";
import { BOX_ITEMS, BoxItem, ItemIcon, RARITIES, pickWeighted } from "./drop/boxItems";

const CARDS_COUNT = 10;
const SELECT_COUNT = 5;

// Stage layout + safety envelope. The collect/shuffle/reveal animations
// translate cards up to ~±220px sideways and ~-280px above the card tray, so
// the stage reserves that room and `fit` scales against the envelope — the
// whole animation stays fully visible and centered, never clipped at the edge.
const STAGE_W = 380;
const STAGE_H = 1040; /* 280 entry headroom + 760 content */
const ENV_W = 440; /* covers the widest sideways fan-out */
const ENTRY_PAD = 280;

type Phase = "grid" | "collect" | "revealSelection" | "shuffle" | "suspense" | "reveal" | "done";

interface DealCard {
  id: number;
  item: BoxItem;
  selected: boolean;
}

interface CardRevealProps {
  onFinished: (winner: BoxItem) => void;
  onCancel?: () => void;
  // The cash prize the SERVER already rolled for this code. The machine only
  // decides which slot visually shows it — the amount can never be influenced,
  // re-rolled or forged by the client.
  prize: BoxItem;
}

// ---- realistic dealer riffle: lift -> split halves -> overlapping interleave -> mint, twice, in one long smooth pass ----
const SHUFFLE_TIMES = [0, 0.06, 0.16, 0.28, 0.4, 0.5, 0.6, 0.7, 0.8, 0.88, 0.95, 1];

const shuffleX = (i: number) => {
  const xi = (i - 2) * 2;
  const L = i < 2;
  const s = (a: number, b: number) => (L ? a : b);
  return [
    xi, xi,
    s(xi - 64, xi + 64),
    s(xi + 18 + i * 2, xi - 18 - i * 2),
    0,
    s(xi - 58, xi + 58),
    s(xi + 16 + i * 2, xi - 16 - i * 2),
    0, 0,
    s(xi + 2, xi - 2),
    s(xi - 1, xi + 1),
    xi,
  ];
};
const shuffleY = (i: number) => {
  const L = i < 2;
  const ripple = (i % 3) * 2;
  return [0, -16, -6, L ? 14 + ripple : 18 + ripple, 2, -8, L ? 16 + ripple : 12 + ripple, 3, -2, 0, 0, 0];
};
const shuffleZ = (i: number) => {
  const zi = (i - 2) * 5;
  const L = i < 2;
  return [zi, zi, L ? zi - 15 : zi + 15, L ? zi + 6 : zi - 6, 0, L ? zi + 13 : zi - 13, L ? zi - 5 : zi + 5, 0, 0, L ? zi + 1 : zi - 1, L ? zi - 1 : zi + 1, zi];
};
const shuffleScale = () => [1, 1.04, 1.1, 1.14, 1.02, 1.1, 1.12, 1.02, 1, 1, 1, 1];

function CardBackFace({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-xl border border-amber-400/50 bg-gradient-to-br from-neutral-900 via-zinc-900 to-black p-2.5"
      style={{ boxShadow: "0 0 26px rgba(228,174,57,0.16), inset 0 0 18px rgba(228,174,57,0.06)" }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(228,174,57,0.1), transparent 62%)" }} />
      <div className="pointer-events-none absolute inset-0 card-sheen" style={{ background: "linear-gradient(115deg, transparent 28%, rgba(255,224,138,0.1) 42%, rgba(255,224,138,0.04) 52%, transparent 62%)" }} />
      <div className="pointer-events-none absolute inset-1 rounded-lg border border-amber-500/20" />
      <div className="flex w-full justify-between text-[11px] font-bold text-amber-300/80">
        <span>K</span>
        <span>♠</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className={compact ? "text-lg leading-none" : "text-2xl leading-none"}>♛</span>
        <span className={`font-serif font-black text-amber-300 ${compact ? "text-[13px]" : "text-xl"}`} style={{ textShadow: "0 0 10px rgba(228,174,57,0.5)" }}>
          MOSHA
        </span>
        {!compact && <span className="text-[7px] font-semibold uppercase tracking-[0.24em] text-amber-400/50">הדרוף היומי</span>}
      </div>
      <div className="flex w-full rotate-180 justify-between text-[11px] font-bold text-amber-300/80">
        <span>K</span>
        <span>♠</span>
      </div>
    </div>
  );
}

function CardFront({ item, compact = false }: { item: BoxItem; compact?: boolean }) {
  const rarity = RARITIES[item.rarity];
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-xl text-center"
      style={{
        background: "linear-gradient(170deg, #171a22 0%, #0c0f17 55%, #090b11 100%)",
        border: `1px solid ${rarity.border}`,
        boxShadow: `0 0 26px ${rarity.glow}, 0 14px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <div className="absolute inset-x-3 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${rarity.color}, transparent)` }} />
      <div className="flex h-full flex-col items-center justify-between px-1.5 py-1.5">
        <span className="rounded-full px-2 py-px text-[8px] font-bold" style={{ background: rarity.bg, color: rarity.color, border: `1px solid ${rarity.border}` }}>
          {item.chance}
        </span>
        <div
          className={`flex items-center justify-center rounded-full border ${compact ? "h-9 w-9" : "h-12 w-12"}`}
          style={{ borderColor: rarity.color, background: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.1), rgba(15,17,24,0.97) 78%)", boxShadow: `0 0 22px ${rarity.glow}` }}
        >
          <ItemIcon icon={item.icon} size={compact ? 20 : 26} className="text-amber-300" />
        </div>
        <div className={`line-clamp-2 font-extrabold leading-tight ${compact ? "text-[8px]" : "text-[9px]"}`} style={{ color: rarity.color, textShadow: `0 0 12px ${rarity.glow}` }}>
          {item.name}
        </div>
      </div>
    </div>
  );
}

function GoldBurst({ glow }: { glow: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[30] overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => {
        const ang = (i / 24) * Math.PI * 2;
        const dist = 50 + (i % 5) * 16;
        const size = 3 + (i % 3) * 2.5;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, background: "#ffd97a", boxShadow: `0 0 10px 2px ${glow}` }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, scale: 1, opacity: 0 }}
            transition={{ duration: 1.1 + (i % 4) * 0.15, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

// The deck always contains the server-rolled prize at a random slot; the other
// cards are purely cosmetic decoys drawn from the same cash pool.
function buildDeck(prize: BoxItem): DealCard[] {
  const prizeSlot = Math.floor(Math.random() * CARDS_COUNT);
  const decoys = BOX_ITEMS.filter((item) => item.id !== prize.id);
  return Array.from({ length: CARDS_COUNT }, (_, i) => ({
    id: i,
    item: i === prizeSlot ? prize : pickWeighted(decoys),
    selected: false,
  }));
}

export function CardRevealAnimation({ onFinished, onCancel, prize }: CardRevealProps) {
  const [cards, setCards] = useState<DealCard[]>(() => buildDeck(prize));
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("grid");

  const selectedCount = cards.filter((c) => c.selected).length;
  const selectedCards = cards.filter((c) => c.selected);
  const winnerCard = cards.find((c) => c.id === winnerId) ?? null;
  const isComplete = selectedCount === SELECT_COUNT;

  // Scale the whole game to fit the viewport — never scrolls, shrinks neatly on small screens.
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(1, (vh - 70) / STAGE_H, (vw - 16) / ENV_W);
      setFit(Math.max(0.3, scale));
    };
    compute();
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(compute, 160);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timer);
    };
  }, []);

  // Rule 1 — Selection Lock: once a card is selected it can never be unselected.
  const toggle = (id: number) => {
    if (phase !== "grid") return;
    setCards((prev) => {
      if (prev.find((c) => c.id === id)?.selected) return prev;
      if (prev.filter((c) => c.selected).length >= SELECT_COUNT) return prev;
      return prev.map((c) => (c.id === id ? { ...c, selected: true } : c));
    });
  };

  const startMachine = () => {
    if (isComplete) setPhase("collect");
  };

  useEffect(() => {
    const timers: number[] = [];
    if (phase === "collect") {
      timers.push(window.setTimeout(() => setPhase("revealSelection"), 1700));
    } else if (phase === "revealSelection") {
      timers.push(window.setTimeout(() => setPhase("shuffle"), 2500));
    } else if (phase === "shuffle") {
      timers.push(window.setTimeout(() => setPhase("suspense"), 8600));
    } else if (phase === "suspense") {
      timers.push(
        window.setTimeout(() => {
          // The machine "picks" the slot holding the server-rolled prize.
          const target = cards.find((c) => c.item.id === prize.id) ?? cards[0];
          if (target) setWinnerId(target.id);
          setPhase("reveal");
        }, 1250)
      );
    } else if (phase === "reveal") {
      timers.push(window.setTimeout(() => setPhase("done"), 2600));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#05060a]">
      {/* pure black & gold ambience */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[44vw] w-[74vw] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(228,174,57,0.09), transparent 72%)" }} />
        <div className="absolute bottom-0 left-1/2 h-64 w-[84vw] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(228,174,57,0.05), transparent 72%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      </div>

      {/* header */}
      <div className="relative z-20 flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-br from-[#1a2030] to-[#0c0f16] shadow-[0_0_16px_rgba(228,174,57,0.18)]">
            <span className="text-base">♛</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/70">Drop Machine</p>
            <p className="text-sm font-bold text-white leading-tight">הדרוף היומי — מכונת הקלפים</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 transition outline-none hover:border-amber-400/40 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]"
            aria-label="סגירה"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-visible px-3">
        <div
          className="flex flex-col items-center justify-center"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${fit})`, transformOrigin: "center center" }}
        >
        <AnimatePresence mode="wait">
          {phase === "grid" ? (
            <motion.div
              key="grid"
              className="flex w-full flex-col items-center"
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.3 }}
            >
              <p className="mb-4 max-w-md text-center text-sm text-slate-400">
                <span className="font-bold text-amber-300">10 קלפים</span> לפניכם — כל אחד מסתיר פרס אמיתי. בחרו בדיוק{" "}
                <span className="font-bold text-amber-300">{SELECT_COUNT}</span> והמכונה תערבב אותם כדי לחשוף את המזל.
              </p>
              <p className="mb-5 flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3 py-1 text-[11px] font-semibold text-amber-300/90">
                <Lock size={11} />
                בחירה נעולה — קלף שנבחר לא ניתן לביטול
              </p>

              <div className="mb-6 flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    isComplete ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {isComplete ? "הבחירה הושלמה" : `נבחרו ${selectedCount}/${SELECT_COUNT}`}
                </span>
                <div className="flex gap-1.5">
                  {Array.from({ length: SELECT_COUNT }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 w-6 rounded-full transition ${
                        i < selectedCount ? "bg-gradient-to-r from-amber-300 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid w-full max-w-[380px] grid-cols-5 place-items-center gap-2 sm:gap-2.5">
                {cards.map((c) => {
                  const picked = c.selected;
                  return (
                    <motion.div
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      whileHover={picked ? undefined : { y: -7, scale: 1.05 }}
                      whileTap={picked ? undefined : { scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className={`relative h-24 w-16 select-none [perspective:600px] sm:h-[100px] sm:w-[66px] ${picked ? "cursor-default" : "cursor-pointer"}`}
                      role="button"
                      aria-pressed={picked}
                    >
                      <motion.div
                        className="relative h-full w-full [transform-style:preserve-3d]"
                        animate={{ rotateY: picked ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      >
                        <div className="absolute inset-0 [backface-visibility:hidden]">
                          <CardBackFace compact />
                        </div>
                        <div className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                          <CardFront item={c.item} compact />
                        </div>
                      </motion.div>
                      {picked && (
                        <motion.div
                          className="pointer-events-none absolute -inset-1.5 z-10 rounded-2xl"
                          style={{ border: "2px solid rgba(251,191,36,0.9)", boxShadow: "0 0 26px rgba(245,158,11,0.45)" }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <button
                onClick={startMachine}
                disabled={!isComplete}
                className={`group relative mt-8 mb-4 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-xl py-3.5 text-base font-black transition outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a] ${
                  isComplete
                    ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-[0.99]"
                    : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-500"
                }`}
              >
                {isComplete ? (
                  <>
                    <Sparkles size={19} className="transition-transform group-hover:rotate-12" />
                    הפעל את מכונת ההדרוף
                  </>
                ) : (
                  `בחרו עוד ${SELECT_COUNT - selectedCount} קלפים`
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="machine"
              className="flex w-full flex-col items-center"
              style={{ paddingTop: ENTRY_PAD }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* drop machine */}
              <div className="relative h-[430px] w-[min(86vw,330px)]">
                {/* ambient glow */}
                <motion.div
                  className="pointer-events-none absolute -inset-4 rounded-[40px]"
                  animate={{
                    boxShadow:
                      phase === "reveal" || phase === "done"
                        ? winnerCard
                          ? `0 0 80px ${RARITIES[winnerCard.item.rarity].glow}`
                          : "0 0 60px rgba(228,174,57,0.24)"
                        : phase === "shuffle" || phase === "suspense"
                          ? "0 0 60px rgba(245,158,11,0.28)"
                          : phase === "revealSelection"
                            ? "0 0 50px rgba(228,174,57,0.2)"
                            : "0 0 40px rgba(228,174,57,0.12)",
                  }}
                  transition={{ duration: 0.8 }}
                />

                {/* machine body — solid, no shaking */}
                <div
                  className="absolute inset-0 z-[2] overflow-hidden rounded-[40px] border-2"
                  style={{
                    borderColor: "rgba(212,175,55,0.45)",
                    background: "linear-gradient(180deg, #171a23 0%, #0a0c13 60%, #06070c 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 40px rgba(0,0,0,0.55)",
                  }}
                >
                  <div
                    className="absolute left-1/2 top-0 h-12 w-64 -translate-x-1/2 rounded-b-[26px] border-x border-b"
                    style={{ borderColor: "rgba(212,175,55,0.3)", background: "linear-gradient(180deg, rgba(212,175,55,0.14), transparent)" }}
                  />
                  <div
                    className="absolute left-1/2 top-12 h-40 w-40 -translate-x-1/2 rounded-full border"
                    style={{ borderColor: "rgba(212,175,55,0.18)", background: "radial-gradient(circle, rgba(2,3,8,0.85), rgba(2,3,8,0.35) 60%, transparent 72%)" }}
                  />
                  <div
                    className="absolute left-4 top-1/2 h-32 w-2 -translate-y-1/2 rounded-full"
                    style={{ background: "repeating-linear-gradient(180deg, rgba(212,175,55,0.14) 0 2px, transparent 2px 7px)" }}
                  />
                  <div
                    className="absolute right-4 top-1/2 h-32 w-2 -translate-y-1/2 rounded-full"
                    style={{ background: "repeating-linear-gradient(180deg, rgba(212,175,55,0.14) 0 2px, transparent 2px 7px)" }}
                  />
                  <div className="absolute inset-x-12 bottom-8 flex items-center justify-between">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-pulse rounded-full bg-amber-400/70"
                        style={{ animationDelay: `${i * 0.18}s`, animationDuration: phase === "shuffle" ? "0.55s" : "1.3s" }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-x-5 bottom-14 h-20 rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
                  <div className="absolute left-1/2 bottom-6 -translate-x-1/2 text-center">
                    <span className="font-serif text-lg font-black text-amber-300/80" style={{ textShadow: "0 0 14px rgba(228,174,57,0.5)" }}>
                      MOSHA DROP
                    </span>
                  </div>
                </div>

                {/* suspense: narrowing golden beam, holding the breath */}
                {phase === "suspense" && (
                  <motion.div
                    className="pointer-events-none absolute left-1/2 top-0 z-[4] h-full w-32 -translate-x-1/2"
                    animate={{ opacity: [0.25, 0.65, 0.25], scaleX: [1, 0.92, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    style={{ background: "radial-gradient(ellipse at 50% 28%, rgba(228,174,57,0.3), transparent 68%)" }}
                  />
                )}

                {/* spotlight beam over the reveal */}
                {(phase === "reveal" || phase === "done") && (
                  <motion.div
                    className="pointer-events-none absolute left-1/2 top-0 z-[4] h-full w-36 -translate-x-1/2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 0.9, 0.45] }}
                    transition={{ duration: 1.4 }}
                    style={{ background: winnerCard ? `radial-gradient(ellipse at 50% 30%, ${RARITIES[winnerCard.item.rarity].glow}, transparent 70%)` : "transparent" }}
                  />
                )}

                {/* the chosen cards inside the machine */}
                <div className="absolute left-1/2 top-10 z-[10] flex h-48 w-64 -translate-x-1/2 items-center justify-center">
                  {selectedCards.map((c, i) => {
                    const isWinner = c.id === winnerId;
                    const tossX = (i % 2 === 0 ? -1 : 1) * (96 + i * 13);
                    const tossY = -168 - (i % 3) * 22;
                    const tossRot = (i % 2 === 0 ? -1 : 1) * (16 + i * 4);
                    const delay = i * 0.13;
                    return (
                      <motion.div key={c.id} className="absolute left-1/2 top-1/2 h-32 w-24 -ml-12 -mt-16 [transform-style:preserve-3d]" style={{ zIndex: isWinner ? 40 : 5, willChange: "transform" }}>
                        <motion.div
                          className="relative h-full w-full [transform-style:preserve-3d]"
                          initial={
                            phase === "collect"
                              ? { x: tossX, y: tossY, rotateZ: tossRot, rotateY: 0, scale: 1, opacity: 0 }
                              : { x: (i - 2) * 3, y: 0, rotateZ: (i - 2) * 4, rotateY: 0, scale: 1, opacity: 1 }
                          }
                          animate={
                            phase === "collect"
                              ? {
                                  x: [tossX, tossX * 0.4, (i - 2) * 3],
                                  y: [tossY, tossY * 0.9 - 46, 0],
                                  rotateZ: [tossRot, tossRot * 0.35, (i - 2) * 4],
                                  rotateY: 0,
                                  scale: 1,
                                  opacity: [0, 1, 1],
                                }
                              : phase === "revealSelection"
                                ? { x: (i - 2) * 44, y: -6, rotateZ: (i - 2) * 13, rotateY: 180, scale: 1.2, opacity: 1 }
                                : phase === "shuffle"
                                  ? { x: shuffleX(i), y: shuffleY(i), rotateZ: shuffleZ(i), rotateY: 0, scale: shuffleScale(), opacity: 1 }
                                  : phase === "suspense"
                                    ? { x: (i - 2) * 5, y: 0, rotateZ: (i - 2) * 6, rotateY: 0, scale: 1, opacity: 1 }
                                    : isWinner
                                      ? { x: 0, y: -56, rotateZ: 0, rotateY: 180, scale: 1.3, opacity: 1 }
                                      : { x: (i - 2) * 18, y: 46, rotateZ: (i - 2) * 12, rotateY: 0, scale: 0.68, opacity: 0.3 }
                          }
                          transition={
                            phase === "collect"
                              ? { delay, duration: 0.85, ease: "easeOut" }
                              : phase === "revealSelection"
                                ? { duration: 1.0, ease: [0.4, 0, 0.2, 1] }
                                : phase === "shuffle"
                                  ? {
                                      x: { duration: 8, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
                                      y: { duration: 8, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
                                      rotateZ: { duration: 8, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
                                      scale: { duration: 8, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
                                      rotateY: { duration: 0.6, ease: "easeOut" },
                                      opacity: { duration: 0.3 },
                                    }
                                  : phase === "suspense"
                                    ? { duration: 1.1, ease: [0.22, 1, 0.36, 1] }
                                    : isWinner
                                      ? {
                                          y: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                                          rotateY: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
                                          x: { duration: 0.55 },
                                          rotateZ: { duration: 0.55 },
                                          scale: { duration: 0.55 },
                                          opacity: { duration: 0.4 },
                                        }
                                      : { duration: 0.75, ease: "easeInOut" }
                          }
                        >
                          <div className="absolute inset-0 [transform-style:preserve-3d]">
                            <div className="absolute inset-0 [backface-visibility:hidden]">
                              <CardBackFace compact />
                            </div>
                            <div className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                              <CardFront item={c.item} />
                            </div>
                          </div>
                          {(phase === "reveal" || phase === "done") && isWinner && (
                            <motion.div
                              className="pointer-events-none absolute -inset-2 rounded-2xl"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: [0, 1, 0.6], scale: [0.9, 1.15, 1.05] }}
                              transition={{ duration: 1.1 }}
                              style={{ border: `2px solid ${RARITIES[c.item.rarity].color}`, boxShadow: `0 0 34px ${RARITIES[c.item.rarity].glow}` }}
                            />
                          )}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>

                {(phase === "reveal" || phase === "done") && winnerCard && <GoldBurst glow={RARITIES[winnerCard.item.rarity].glow} />}
              </div>

              {/* status */}
              <div className="flex min-h-[22px] items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
                </span>
                <p className="text-sm text-slate-400">
                  {phase === "collect"
                    ? "5 הקלפים שנבחרו ממהרים לתוך המכונה..."
                    : phase === "revealSelection"
                      ? "אלה הפרסים שבחרתם — המכונה שומרת את הסוד"
: phase === "shuffle"
                      ? "החפיסה נטרפת — ריפל של דילר מקצועי, קלפים זולגים הלוך ושוב..."
                        : phase === "suspense"
                          ? "רגע האמת... המכונה בוחרת את הקלף הזוכה"
                          : phase === "reveal"
                            ? "המזל נבחר!"
                            : "ההדרוף הושלם"}
                </p>
              </div>

              {/* win panel slot — reserved space keeps the layout perfectly stable */}
              <div className="mt-2 flex min-h-[252px] w-full max-w-sm flex-col items-center">
              {(phase === "reveal" || phase === "done") && winnerCard && (() => {
                const rarity = RARITIES[winnerCard.item.rarity];
                const ready = phase === "done";
                return (
                  <motion.div
                    className="relative z-20 w-full rounded-2xl border p-4 text-center"
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={phase === "reveal" ? { delay: 0.8, type: "spring", stiffness: 220, damping: 24 } : { type: "spring", stiffness: 220, damping: 24 }}
                    style={{ background: "linear-gradient(170deg, rgba(22,26,36,0.98), rgba(8,10,16,0.98))", borderColor: rarity.border, boxShadow: `0 0 55px ${rarity.glow}` }}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: rarity.color }}>
                      {rarity.label} • הזוכה!
                    </p>
                    <div
                      className="mx-auto mt-2.5 flex h-14 w-14 items-center justify-center rounded-full border"
                      style={{ borderColor: rarity.color, background: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.12), rgba(14,16,24,0.98) 78%)", boxShadow: `0 0 30px ${rarity.glow}` }}
                    >
                      <ItemIcon icon={winnerCard.item.icon} size={30} className="text-amber-300" />
                    </div>
                    <h3 className="mt-2 text-lg font-black text-white leading-snug">{winnerCard.item.name}</h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {rarity.label} • {winnerCard.item.chance} • יוכרז בהפקדה הבאה
                    </p>
                    <button
                      onClick={() => onFinished(winnerCard.item)}
                      disabled={!ready}
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-base font-black transition outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c13] ${
                        ready
                          ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 shadow-[0_0_32px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-[0.99]"
                          : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-slate-500"
                      }`}
                    >
                      {ready ? (
                        <>
                          <Check size={18} strokeWidth={3} />
                          איסוף
                        </>
                      ) : (
                        "רגע — סוגרים את ההדרוף..."
                      )}
                    </button>
                  </motion.div>
                );
              })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}