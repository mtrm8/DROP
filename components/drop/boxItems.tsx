"use client";

import {
  BallIcon,
  CardIcon,
  ChipIcon,
  CrestIcon,
  KingIcon,
  StackIcon,
} from "./sportsIcons";

export type RarityName = "common" | "uncommon" | "rare" | "classified" | "covert" | "special";
export type ItemCategory = "bonus" | "cash";
export type ItemIconName = "crest" | "ball" | "chip" | "card" | "stack" | "gem" | "fire" | "king";

// Emoji glyphs shown on the card-reveal front faces
export const ITEM_EMOJI: Record<ItemIconName, string> = {
  crest: "👑",
  ball: "⚽",
  chip: "🪙",
  card: "🃏",
  stack: "💵",
  gem: "💎",
  fire: "🔥",
  king: "🤴",
};

// Money tiers — the glyph a cash prize wears is derived from its amount, so the
// card always looks richer as the amount climbs: notes -> cash bag -> gem -> fire -> crown.
const MONEY_TIERS: { min: number; emoji: string; icon: ItemIconName }[] = [
  { min: 500, emoji: "🔥", icon: "fire" },
  { min: 200, emoji: "💎", icon: "gem" },
  { min: 100, emoji: "💸", icon: "stack" },
  { min: 50, emoji: "💰", icon: "stack" },
  { min: 0, emoji: "💵", icon: "chip" },
];

export function moneyEmojiFor(amount: number | string): string {
  const n =
    typeof amount === "number" ? amount : Number(String(amount).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return MONEY_TIERS[MONEY_TIERS.length - 1].emoji;
  return (MONEY_TIERS.find((tier) => n >= tier.min) ?? MONEY_TIERS[MONEY_TIERS.length - 1]).emoji;
}

export function moneyIconFor(amount: number | string): ItemIconName {
  const n =
    typeof amount === "number" ? amount : Number(String(amount).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return "chip";
  return (MONEY_TIERS.find((tier) => n >= tier.min) ?? MONEY_TIERS[MONEY_TIERS.length - 1]).icon;
}

export interface RarityStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
}

// Pure black & gold casino palette — rarity reads as golden intensity, never neon.
export const RARITIES: Record<RarityName, RarityStyle> = {
  common: {
    label: "נפוץ",
    color: "#98a2b3",
    bg: "rgba(152,162,179,0.07)",
    border: "rgba(152,162,179,0.45)",
    glow: "rgba(152,162,179,0.25)",
  },
  uncommon: {
    label: "לא נפוץ",
    color: "#c9a25a",
    bg: "rgba(201,162,90,0.09)",
    border: "rgba(201,162,90,0.55)",
    glow: "rgba(201,162,90,0.32)",
  },
  rare: {
    label: "נדיר",
    color: "#e0b03f",
    bg: "rgba(224,176,63,0.1)",
    border: "rgba(224,176,63,0.6)",
    glow: "rgba(224,176,63,0.36)",
  },
  classified: {
    label: "מסווג",
    color: "#eec154",
    bg: "rgba(238,193,84,0.1)",
    border: "rgba(238,193,84,0.65)",
    glow: "rgba(238,193,84,0.4)",
  },
  covert: {
    label: "סודי",
    color: "#f6d479",
    bg: "rgba(246,212,121,0.1)",
    border: "rgba(246,212,121,0.7)",
    glow: "rgba(246,212,121,0.46)",
  },
  special: {
    label: "מיוחד",
    color: "#ffc93c",
    bg: "rgba(255,201,60,0.12)",
    border: "rgba(255,201,60,0.8)",
    glow: "rgba(255,201,60,0.55)",
  },
};

export interface BoxItem {
  id: string;
  name: string;
  category: ItemCategory;
  icon: ItemIconName;
  // Money glyph for this prize (derived from the amount tier) — what the card
  // face and the win panel actually render.
  emoji: string;
  amount: number | string;
  chance: string;
  weight: number;
  rarity: RarityName;
}

// Active client prize pool. Displayed odds are normalized over the remaining
// weights after retiring the 20₪ tier and match the server-derived percentages.
export const BOX_ITEMS: BoxItem[] = [
  {
    id: "cash-30",
    name: "30 ₪",
    category: "cash",
    icon: "chip",
    emoji: "💵",
    amount: 30,
    chance: "43.1%",
    weight: 2500,
    rarity: "common",
  },
  {
    id: "cash-50",
    name: "50 ₪",
    category: "cash",
    icon: "stack",
    emoji: "💰",
    amount: 50,
    chance: "27.59%",
    weight: 1600,
    rarity: "uncommon",
  },
  {
    id: "cash-100",
    name: "100 ₪",
    category: "cash",
    icon: "stack",
    emoji: "💸",
    amount: 100,
    chance: "17.24%",
    weight: 1000,
    rarity: "rare",
  },
  {
    id: "cash-200",
    name: "200 ₪",
    category: "cash",
    icon: "gem",
    emoji: "💎",
    amount: 200,
    chance: "8.62%",
    weight: 500,
    rarity: "classified",
  },
  {
    id: "cash-350",
    name: "350 ₪",
    category: "cash",
    icon: "gem",
    emoji: "💎",
    amount: 350,
    chance: "2.59%",
    weight: 150,
    rarity: "covert",
  },
  {
    id: "cash-500",
    name: "500 ₪",
    category: "cash",
    icon: "fire",
    emoji: "🔥",
    amount: 500,
    chance: "0.86%",
    weight: 50,
    rarity: "special",
  },
];

export function pickWeighted(items: BoxItem[]): BoxItem {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return items[items.length - 1];
}

export function ItemIcon({
  icon,
  size = 32,
  className,
}: {
  icon: ItemIconName;
  size?: number;
  className?: string;
}) {
  switch (icon) {
    case "crest":
      return <CrestIcon size={size} className={className} />;
    case "ball":
      return <BallIcon size={size} className={className} />;
    case "chip":
      return <ChipIcon size={size} className={className} />;
    case "card":
      return <CardIcon size={size} className={className} />;
    case "stack":
      return <StackIcon size={size} className={className} />;
    case "gem":
    case "fire":
      return (
        <span
          className={className}
          style={{ fontSize: size * 1.15, lineHeight: 1 }}
          aria-hidden="true"
        >
          {ITEM_EMOJI[icon]}
        </span>
      );
    case "king":
      return <KingIcon size={size} className={className} />;
  }
}
