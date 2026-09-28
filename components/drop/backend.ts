import { BOX_ITEMS, moneyEmojiFor, moneyIconFor, pickWeighted } from "./boxItems";
import type { BoxItem, RarityName } from "./boxItems";

export type DropContent = { title?: string; description?: string; analysis?: string };
export type VerifiedDrop = { prize: BoxItem; content: DropContent; provisional?: boolean };
export type RedeemResult =
  | { status: "ok"; drop: VerifiedDrop }
  | { status: "invalid" }
  | { status: "error" };
export type VerifyResult = { status: "valid" | "invalid" | "error" };

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
const normalizeCode = (code: string) => code.trim().toUpperCase();

// Only call after a code has passed the verification screen. This provides a
// clearly provisional animation if the confirmation RPC cannot be completed.
export function provisionalDrop(): VerifiedDrop {
  return { prize: pickWeighted(BOX_ITEMS), content: {}, provisional: true };
}

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

async function call(code: string, rpc: "redeem_code" | "get_drop" | "complete_drop", prizeId?: string): Promise<RedeemResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.warn("[drop] Supabase public URL or anon key is missing from the site build");
    return { status: "error" };
  }

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      // Every RPC receives the same trimmed, upper-cased form the verification
      // screen uses, so pasted whitespace or lower case never reach the server.
      body: JSON.stringify({ p_code: normalizeCode(code), ...(prizeId ? { p_prize_id: prizeId } : {}) }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => null) as { code?: string; message?: string } | null;
      console.warn("[drop] Supabase RPC failed", rpc, res.status, error?.code, error?.message);
      return { status: "error" };
    }
    let raw: unknown = await res.json();
    // PostgREST JSON RPCs are usually objects, but older deployments may
    // return a JSON-encoded string. Normalize either before interpreting it.
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch { return { status: "error" }; }
    }
    const row = (Array.isArray(raw) ? raw[0] : raw) as (DropRow & { status?: string }) | undefined;
    if (row?.error === "not_found") return { status: "invalid" };
    if (row?.error) return { status: "error" };
    if (rpc === "get_drop" && !row) return { status: "invalid" };
    const drop = row && toDrop(row);
    return drop ? { status: "ok", drop } : { status: "error" };
  } catch (error) {
    console.warn("[drop] Supabase request failed", rpc, error);
    return { status: "error" };
  }
}

// Read active codes from drop_codes and compare normalized values in JavaScript.
export async function verifyCode(code: string): Promise<VerifyResult> {
  const normalized = normalizeCode(code);
  if (!normalized) return { status: "invalid" };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return { status: "error" };

  try {
    const response = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/drop_codes?select=code&is_active=eq.true`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      console.warn("[drop] code lookup failed:", response.status);
      return { status: "error" };
    }
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) return { status: "error" };
    const matches = rows.some((row) => typeof row?.code === "string" && normalizeCode(row.code) === normalized);
    return { status: matches ? "valid" : "invalid" };
  } catch (error) {
    console.warn("[drop] code lookup failed:", error);
    return { status: "error" };
  }
}

// Prepare the reusable code's prize; eligibility depends only on is_active.
// Verification itself is always a read-only active-code lookup.
export async function redeemCode(code: string, verified = false): Promise<RedeemResult> {
  if (!verified) {
    const verification = await verifyCode(code);
    if (verification.status !== "valid") return { status: verification.status };
  }
  let result = await call(code, "redeem_code") as RedeemResult;
  if (result.status === "error") {
    // The server might have committed despite a lost response. Prefer its
    // persisted result before drawing a provisional local prize.
    const saved = await call(code, "get_drop") as RedeemResult;
    if (saved.status === "ok") result = saved;
  }
  if (result.status === "error") {
    result = { status: "ok", drop: provisionalDrop() };
  }
  return result;
}

// Only used to resume a code already redeemed in this browser's active session.
export async function getRolledPrize(code: string): Promise<RedeemResult> {
  return call(code, "get_drop") as Promise<RedeemResult>;
}

// Read-only confirmation of the winning card against the active code's prize.
// The reusable-code migration makes this RPC leave all code fields unchanged.
export async function completeDrop(code: string, prizeId: string): Promise<RedeemResult> {
  return call(code, "complete_drop", prizeId) as Promise<RedeemResult>;
}
