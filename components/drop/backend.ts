import { moneyEmojiFor, moneyIconFor } from "./boxItems";
import type { BoxItem, RarityName } from "./boxItems";

export type DropContent = { title?: string; description?: string; analysis?: string };
export type VerifiedDrop = { prize: BoxItem; content: DropContent };
export type RedeemResult =
  | { status: "ok"; drop: VerifiedDrop }
  | { status: "already_used" }
  | { status: "invalid" }
  | { status: "error" };

type DropRow = {
  success?: boolean;
  error?: string;
  prize_id?: string | null;
  prize_name?: string | null;
  amount?: number | null;
  chance?: string | null;
  rarity?: string | null;
  icon?: string | null;
  drop_content?: unknown;
};

const rarities = ["common", "uncommon", "rare", "classified", "covert", "special"];

function toDrop(row: DropRow): VerifiedDrop | null {
  const id = row.prize_id;
  const amount = row.amount;
  if (!id || typeof amount !== "number" || !Number.isFinite(amount) || amount < 50) return null;
  const content = row.drop_content && typeof row.drop_content === "object" && !Array.isArray(row.drop_content)
    ? row.drop_content as Record<string, unknown> : {};
  const text = (key: string) => typeof content[key] === "string" ? content[key] as string : undefined;

  return {
    prize: {
      id,
      name: row.prize_name || `${amount} ₪`,
      category: "cash",
      amount,
      chance: row.chance ?? "",
      weight: 0,
      rarity: rarities.includes(row.rarity ?? "") ? row.rarity as RarityName : "common",
      // The cash tier determines its glyph even if a legacy DB icon is garbled.
      icon: moneyIconFor(amount),
      emoji: moneyEmojiFor(amount),
    },
    content: { title: text("title"), description: text("description"), analysis: text("analysis") },
  };
}

async function call(code: string, rpc: "redeem_code" | "get_drop"): Promise<RedeemResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return { status: "error" };

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_code: code.trim() }),
    });
    if (!res.ok) return { status: "error" };
    const raw: unknown = await res.json();
    const row = (Array.isArray(raw) ? raw[0] : raw) as DropRow | undefined;
    if (row?.error === "already_redeemed") return { status: "already_used" };
    if (row?.error === "not_found") return { status: "invalid" };
    const drop = row && toDrop(row);
    return drop ? { status: "ok", drop } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

// redeem_code validates the row, assigns its prize and returns its content in
// one database transaction. A failed assignment rolls back the redemption.
export function redeemCode(code: string): Promise<RedeemResult> {
  return call(code, "redeem_code");
}

// Only used to resume a code already redeemed in this browser's active session.
export function getRolledPrize(code: string): Promise<RedeemResult> {
  return call(code, "get_drop");
}
