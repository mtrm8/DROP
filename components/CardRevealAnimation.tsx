"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, Sparkles } from "lucide-react";
import { BOX_ITEMS, BoxItem, ItemIcon, RARITIES, pickWeighted } from "./drop/boxItems";

const CARDS_COUNT = 10;
const SELECT_COUNT = 5;

// Stage layout + safety envelope. The collect/shuffle/reveal animations
// translate cards up to ~±240px sideways and ~-300px above the card tray, so
// the machine stage reserves that room and `fit` scales against the envelope —
// the whole animation stays fully visible and centered, never clipped at the
// edge. The selection grid gets its own (shorter) height budget so the cards
// can be as large as the screen allows instead of being shrunk to fit room the
// selection view never uses.
const STAGE_W = 960;
const MACHINE_STAGE_W = 668; /* 620px body plus 24px glow on each side */
const GRID_H = 880;
const MACHINE_H = 1140; /* animated entry headroom + machine + result */
const ENTRY_PAD = 260;
const ACTIVE_KEY = "drop-in-progress";

type Phase = "grid" | "collect" | "revealSelection" | "shuffle" | "suspense" | "reveal" | "done";
const TIMELINE: { at: number; phase: Phase }[] = [
  { at: 0, phase: "collect" },
  { at: 1400, phase: "revealSelection" },
  { at: 2800, phase: "shuffle" },
  { at: 7500, phase: "suspense" },
  { at: 8600, phase: "reveal" },
  { at: 10300, phase: "done" },
];

interface DealCard {
  id: number;
  item: BoxItem;
  selected: boolean;
}

interface CardRevealProps {
  onFinished: (winner: BoxItem) => void;
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

function CardBackFace() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-3.5"
      style={{ boxShadow: "0 0 35px rgba(34,211,238,0.24), inset 0 0 22px rgba(34,211,238,0.08)" }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(34,211,238,0.12), transparent 62%)" }} />
      <div className="pointer-events-none absolute inset-0 card-sheen" style={{ background: "linear-gradient(115deg, transparent 28%, rgba(165,243,252,0.14) 42%, rgba(165,243,252,0.05) 52%, transparent 62%)" }} />
      <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-cyan-500/25" />
      <div className="flex w-full justify-between text-xs font-black text-cyan-300">
        <span>K</span>
        <span>♠</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl leading-none">♛</span>
        <span className="font-serif font-black tracking-wider text-cyan-300 text-xl" style={{ textShadow: "0 0 12px rgba(34,211,238,0.65)" }}>
          EINSTEIN
        </span>
        <span className="text-[8px] font-extrabold uppercase tracking-[0.28em] text-amber-400/60">הדרוף היומי</span>
      </div>
      <div className="flex w-full rotate-180 justify-between text-xs font-black text-cyan-300">
        <span>K</span>
        <span>♠</span>
      </div>
    </div>
  );
}

function CardFront({ item }: { item: BoxItem }) {
  const rarity = RARITIES[item.rarity];
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-2xl text-center"
      style={{
        background: "linear-gradient(170deg, #171a22 0%, #0c0f17 55%, #090b11 100%)",
        border: `2px solid ${rarity.border}`,
        boxShadow: `0 0 35px ${rarity.glow}, 0 16px 36px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <div className="absolute inset-x-4 top-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${rarity.color}, transparent)` }} />
      <div className="flex h-full flex-col items-center justify-between px-3 py-3.5">
        <span className="rounded-full px-3.5 py-1 text-xs font-extrabold" style={{ background: rarity.bg, color: rarity.color, border: `1px solid ${rarity.border}` }}>
          {item.chance}
        </span>
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full border-2"
          style={{ borderColor: rarity.color, background: "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.15), rgba(15,17,24,0.98) 78%)", boxShadow: `0 0 35px ${rarity.glow}` }}
        >
          <span
            className="leading-none drop-shadow-[0_0_16px_rgba(255,214,102,0.5)] text-5xl"
            aria-hidden="true"
          >
            {item.emoji}
          </span>
        </div>
        <div className="line-clamp-2 font-black leading-tight text-base" style={{ color: rarity.color, textShadow: `0 0 16px ${rarity.glow}` }}>
          {item.name}
        </div>
      </div>
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

// Pick which locked card will visually carry the server-rolled prize and move
// the prize into that slot. Pure, and it always returns a winner id, so the
// reveal can never end up without a card to show. The prize itself is never
// re-rolled: the amount was already decided by the server.
function placePrize(cards: DealCard[], prize: BoxItem): { cards: DealCard[]; winnerId: number } {
  const selected = cards.filter((card) => card.selected);
  const fallback = selected[0] ?? cards[0];
  if (!fallback) return { cards, winnerId: -1 };
  const holder = selected.find((card) => card.item.id === prize.id);
  if (holder) return { cards, winnerId: holder.id };
  const original = cards.find((card) => card.item.id === prize.id);
  const target = selected[Math.floor(Math.random() * selected.length)] ?? fallback;
  if (!original) return { cards, winnerId: target.id };
  return {
    winnerId: target.id,
    cards: cards.map((card) => card.id === target.id
      ? { ...card, item: prize }
      : card.id === original.id ? { ...card, item: target.item } : card),
  };
}

// Resolve the phase from elapsed time alone, so the machine state can always be
// recovered from the clock instead of depending on a chain of timers landing.
function phaseAt(elapsed: number): Phase {
  let current: Phase = TIMELINE[0].phase;
  for (const step of TIMELINE) {
    if (elapsed < step.at) break;
    current = step.phase;
  }
  return current;
}

export function CardRevealAnimation({ onFinished, prize }: CardRevealProps) {
  const [cards, setCards] = useState<DealCard[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || "null");
      if (saved?.prize?.id === prize.id && Array.isArray(saved.cards) && saved.cards.length === CARDS_COUNT &&
        saved.cards.every((card: DealCard, index: number) => card?.id === index && typeof card.selected === "boolean" && card.item?.id) &&
        saved.cards.filter((card: DealCard) => card.selected).length <= SELECT_COUNT &&
        saved.cards.some((card: DealCard) => card.item.id === prize.id)) {
        return saved.cards;
      }
    } catch {
      // Private browsing may disable storage; generate a fresh in-memory deck.
    }
    return buildDeck(prize);
  });
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("grid");
  // Single source of truth for "the machine is running". A state value (not a
  // ref) so the guard, the button and the timeline can never disagree, and a
  // dropped click cannot start a second run on top of the first.
  const [machine, setMachine] = useState<"idle" | "running">("idle");
  const startedAt = useRef(0);
  const finished = useRef(false);

  const selectedCount = cards.filter((c) => c.selected).length;
  const selectedCards = cards.filter((c) => c.selected);
  const winnerCard = cards.find((c) => c.id === winnerId) ?? null;
  const isComplete = selectedCount === SELECT_COUNT;

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || "null");
      if (saved?.prize?.id === prize.id) {
        window.localStorage.setItem(ACTIVE_KEY, JSON.stringify({ ...saved, cards }));
      }
    } catch {
      // The game remains playable if storage is unavailable.
    }
  }, [cards, prize.id]);

  // Scale the whole game to fit the viewport — never scrolls, never clipped, and
  // the selection grid only pays for the height it actually uses.
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const compute = () => {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const needed = phase === "grid" ? GRID_H : MACHINE_H;
      const width = phase === "grid" ? STAGE_W : MACHINE_STAGE_W;
      const scale = Math.min(1, (vh - 72) / needed, (vw - 16) / width);
      setFit(Math.max(0.1, scale));
    };
    compute();
    let frame = 0;
    const onResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(compute);
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(frame);
    };
  }, [phase]);

  // Rule 1 — Selection Lock: once a card is selected it can never be unselected.
  // The machine lock is checked here too, so a click that lands after the run
  // began can never add a sixth card to the tray the machine is animating.
  const toggle = (id: number) => {
    if (machine !== "idle" || phase !== "grid") return;
    setCards((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target || target.selected) return prev;
      if (prev.filter((c) => c.selected).length >= SELECT_COUNT) return prev;
      return prev.map((c) => (c.id === id ? { ...c, selected: true } : c));
    });
  };

  const startMachine = () => {
    if (machine !== "idle" || !isComplete) return;
    // The result was already rolled by the server. Resolve the winning slot and
    // the clock in the same batch, so from here on the reveal is fully
    // determined and cannot stall waiting for a prize that is not on the tray.
    const prepared = placePrize(cards, prize);
    if (prepared.winnerId < 0) return;
    startedAt.current = Date.now();
    setWinnerId(prepared.winnerId);
    setCards(prepared.cards);
    setMachine("running");
    setPhase("collect");
  };

  const collectPrize = (item: BoxItem) => {
    if (finished.current) return;
    finished.current = true;
    onFinished(item);
  };

  // The timeline is re-derived from elapsed time on every tick, so a throttled,
  // clamped or dropped timer (background tab, locked screen, long main-thread
  // task) can never strand the machine between phases.
  useEffect(() => {
    if (machine !== "running") return;
    const apply = () => setPhase((current) => {
      const next = phaseAt(Date.now() - startedAt.current);
      return current === next ? current : next;
    });
    apply();
    const tick = window.setInterval(apply, 120);
    const onVisibility = () => {
      if (!document.hidden) apply();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [machine]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#050b12]">
      {/* Midnight lab ambience */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[44vw] w-[74vw] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(34,211,238,0.12), transparent 72%)" }} />
        <div className="absolute bottom-0 left-1/2 h-64 w-[84vw] -translate-x-1/2" style={{ background: "radial-gradient(closest-side, rgba(132,204,22,0.06), transparent 72%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      </div>

      {/* header */}
      <div className="relative z-20 flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-gradient-to-br from-[#102431] to-[#0c0f16] shadow-[0_0_16px_rgba(34,211,238,0.2)]">
            <span className="text-base text-cyan-300">∑</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">Einstein Drop Lab</p>
            <p className="text-sm font-bold text-white leading-tight">איינשטיין דרופ — מעבדת הקלפים</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-visible px-3">
        <div
          className="relative flex flex-col items-center justify-center"
          style={{ width: phase === "grid" ? STAGE_W : MACHINE_STAGE_W, height: phase === "grid" ? GRID_H : MACHINE_H, transform: `scale(${fit})`, transformOrigin: "center center" }}
        >
        {/* The machine overlays the selection grid instead of waiting for its
            exit to finish, so the run always begins on the click that started
            it even on a slow frame budget. */}
        <AnimatePresence>
          {phase === "grid" ? (
            <motion.div
              key="grid"
              className="flex w-full flex-col items-center"
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.3 }}
            >
              <p className="mb-4 max-w-lg text-center text-[15px] leading-relaxed text-slate-300">
                <span className="font-bold text-amber-300">10 קלפים</span> לפניכם — כל אחד מסתיר פרס אמיתי. בחרו בדיוק{" "}
                <span className="font-bold text-amber-300">{SELECT_COUNT}</span> והמכונה תערבב אותם כדי לחשוף את המזל.
              </p>
              <p className="mb-5 flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-1.5 text-xs font-semibold text-amber-300/90">
                <Lock size={12} />
                בחירה נעולה — קלף שנבחר לא ניתן לביטול
              </p>

              <div className="mb-7 flex items-center gap-3.5">
                <span
                  className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                    isComplete ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {isComplete ? "הבחירה הושלמה" : `נבחרו ${selectedCount}/${SELECT_COUNT}`}
                </span>
                <div className="flex gap-2">
                  {Array.from({ length: SELECT_COUNT }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-7 rounded-full transition ${
                        i < selectedCount ? "bg-gradient-to-r from-amber-300 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid w-full max-w-[960px] grid-cols-5 place-items-center gap-4 sm:gap-6">
                {cards.map((c) => {
                  const picked = c.selected;
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      whileHover={picked ? undefined : { y: -10, scale: 1.06 }}
                      whileTap={picked ? undefined : { scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      disabled={picked || isComplete}
                      className={`relative aspect-[5/7] w-full select-none appearance-none border-0 bg-transparent p-0 [perspective:600px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${picked ? "cursor-default" : "cursor-pointer"}`}
                      aria-pressed={picked}
                    >
                      <motion.div
                        className="relative h-full w-full [transform-style:preserve-3d]"
                        animate={{ rotateY: picked ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      >
                        <div className="absolute inset-0 [backface-visibility:hidden]">
                          <CardBackFace />
                        </div>
                        <div className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                          <CardFront item={c.item} />
                        </div>
                      </motion.div>
                      {picked && (
                        <motion.div
                          className="pointer-events-none absolute -inset-2 z-10 rounded-2xl"
                          style={{ border: "2px solid rgba(251,191,36,0.95)", boxShadow: "0 0 32px rgba(245,158,11,0.5)" }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={startMachine}
                disabled={!isComplete}
                className={`group relative mt-9 mb-4 flex w-full max-w-md items-center justify-center gap-3 rounded-2xl py-4 text-lg font-black transition outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a] ${
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
              className="absolute inset-0 flex w-full flex-col items-center justify-center"
              style={{ paddingTop: ENTRY_PAD }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* drop machine */}
              <div data-testid="drop-machine-body" className="relative h-[570px] w-[620px]">
                {/* ambient glow */}
                <motion.div
                  className="pointer-events-none absolute -inset-6 rounded-[44px]"
                  animate={{
                    boxShadow:
                      phase === "reveal" || phase === "done"
                        ? winnerCard
                          ? `0 0 90px ${RARITIES[winnerCard.item.rarity].glow}`
                          : "0 0 70px rgba(34,211,238,0.28)"
                        : phase === "shuffle" || phase === "suspense"
                          ? "0 0 70px rgba(245,158,11,0.32)"
                          : phase === "revealSelection"
                            ? "0 0 60px rgba(34,211,238,0.24)"
                            : "0 0 45px rgba(34,211,238,0.18)",
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
                    <span className="font-serif text-lg font-black text-cyan-300/80" style={{ textShadow: "0 0 14px rgba(34,211,238,0.5)" }}>
                       EINSTEIN DROP
                    </span>
                  </div>
                </div>

                {/* suspense: narrowing golden beam, holding the breath */}
                {phase === "suspense" && (
                  <motion.div
                    className="pointer-events-none absolute left-1/2 top-0 z-[4] h-full w-32 -translate-x-1/2"
                    animate={{ opacity: [0.25, 0.65, 0.25], scaleX: [1, 0.92, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    style={{ background: "radial-gradient(ellipse at 50% 28%, rgba(34,211,238,0.3), transparent 68%)" }}
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
                <div className="absolute left-1/2 top-12 z-[10] flex h-56 w-72 -translate-x-1/2 items-center justify-center">
                  {selectedCards.map((c, i) => {
                    const isWinner = (phase === "reveal" || phase === "done") && c.id === winnerId;
                    const tossX = (i % 2 === 0 ? -1 : 1) * (110 + i * 15);
                    const tossY = -196 - (i % 3) * 24;
                    const tossRot = (i % 2 === 0 ? -1 : 1) * (16 + i * 4);
                    const delay = i * 0.13;
                    return (
                      <motion.div key={c.id} data-testid={isWinner ? "winning-selected-card" : undefined} className="absolute left-1/2 top-1/2 h-[235px] w-[170px] -ml-[85px] -mt-[117px] [transform-style:preserve-3d]" style={{ zIndex: isWinner ? 40 : 5, willChange: "transform" }}>
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
                                  ? { x: (i - 2) * 50, y: -6, rotateZ: (i - 2) * 13, rotateY: 180, scale: 1.2, opacity: 1 }
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
                                       x: { duration: 4.6, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
                                       y: { duration: 4.6, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
                                       rotateZ: { duration: 4.6, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
                                       scale: { duration: 4.6, repeat: Infinity, ease: "easeInOut", times: SHUFFLE_TIMES },
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
                              <CardBackFace />
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

              </div>

              {/* status */}
              <div className="flex min-h-[26px] items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
                </span>
                <p className="text-center text-[15px] text-slate-300">
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
              <div className="mt-2 flex min-h-[210px] w-full max-w-sm flex-col items-center">
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
                      type="button"
                      onClick={() => collectPrize(winnerCard.item)}
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
