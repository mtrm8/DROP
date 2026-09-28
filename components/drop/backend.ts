import { BOX_ITEMS, moneyEmojiFor, moneyIconFor, pickWeighted } from "./boxItems";
import type { BoxItem, RarityName } from "./boxItems";

export type DropContent = { title?: string; description?: string; analysis?: string };
export type VerifiedDrop = { prize: BoxItem; content: DropContent; provisional?: boolean };
export type RedeemResult =
  | { status: "ok"; drop: VerifiedDrop }
  | { status: "already_used" }
  | { status: "invalid" }
  | { status: "error" };
export type VerifyResult = { status: "valid" | "already_used" | "invalid" | "error" };

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
const FALLBACK_CODES = new Set([
  "EINSTEIN2026", "MOSIKO-DROP-2026", "DROP-M-1", "KOKOS-LOSINKA",
  "MMM-MMM1", "MOSIKO-DROP-1001", "RONEN-DROP-1",
  "ADIR-DROP-2026", "MOSIKO-COIN-2026",
]);
const LOCAL_REDEMPTIONS_KEY = "drop-local-redemptions";
const localRedemptions = new Map<string, VerifiedDrop>();

const normalizeCode = (code: string) => code.trim().toUpperCase();

function rememberedDrop(code: string): VerifiedDrop | null {
  const normalized = normalizeCode(code);
  if (localRedemptions.has(normalized)) return localRedemptions.get(normalized)!;
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_REDEMPTIONS_KEY) || "{}");
    const record = saved?.[normalized];
    const item = BOX_ITEMS.find((prize) => prize.id === record?.prizeId);
    if (item) {
      // Browser storage alone cannot prove that a prize was confirmed by the
      // server; only a live RPC response can remove the provisional label.
      const drop: VerifiedDrop = { prize: item, content: {}, provisional: true };
      localRedemptions.set(normalized, drop);
      return drop;
    }
  } catch { /* Browser storage can be disabled. */ }
  return null;
}

function rememberDrop(code: string, drop: VerifiedDrop): void {
  const normalized = normalizeCode(code);
  localRedemptions.set(normalized, drop);
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_REDEMPTIONS_KEY) || "{}");
    window.localStorage.setItem(LOCAL_REDEMPTIONS_KEY, JSON.stringify({
      ...saved, [normalized]: { prizeId: drop.prize.id, provisional: drop.provisional === true },
    }));
  } catch { /* In-memory protection still works for this tab. */ }
}

function localCheck(code: string): VerifyResult {
  const normalized = normalizeCode(code);
  if (!FALLBACK_CODES.has(normalized)) return { status: "invalid" };
  return rememberedDrop(normalized) ? { status: "already_used" } : { status: "valid" };
}

// Only call after a code has passed the verification screen. This provides a
// clearly provisional animation if the confirmation RPC cannot be completed.
export function provisionalDrop(code: string): VerifiedDrop {
  const existing = rememberedDrop(code);
  if (existing) return existing;
  const drop: VerifiedDrop = { prize: pickWeighted(BOX_ITEMS), content: {}, provisional: true };
  rememberDrop(code, drop);
  return drop;
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

async function call(code: string, rpc: "verify_drop_code" | "redeem_code" | "get_drop"): Promise<VerifyResult | RedeemResult> {
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
      body: JSON.stringify({ p_code: code.trim() }),
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
    if (rpc === "verify_drop_code") {
      if (row?.status === "valid" || row?.status === "already_used" || row?.status === "invalid") {
        return { status: row.status };
      }
      return { status: "error" };
    }
    if (row?.error === "already_redeemed") return { status: "already_used" };
    if (row?.error === "not_found") return { status: "invalid" };
    if (rpc === "get_drop" && !row) return { status: "invalid" };
    const drop = row && toDrop(row);
    return drop ? { status: "ok", drop } : { status: "error" };
  } catch (error) {
    console.warn("[drop] Supabase request failed", rpc, error);
    return { status: "error" };
  }
}

// Validation must not consume a code. The browser redeems only when the player
// activates the drop, after the checkmark screen has completed.
export async function verifyCode(code: string): Promise<VerifyResult> {
  const result = await call(code, "verify_drop_code") as VerifyResult;
  return result.status === "error" ? localCheck(code) : result;
}

// redeem_code validates the row, assigns its prize and returns its content in
// one database transaction. A failed assignment rolls back the redemption.
export async function redeemCode(code: string, verified = false): Promise<RedeemResult> {
  let result = await call(code, "redeem_code") as RedeemResult;
  if (result.status === "error") {
    // The server might have committed despite a lost response. Prefer its
    // persisted result before drawing a provisional local prize.
    const saved = await call(code, "get_drop") as RedeemResult;
    if (saved.status === "ok") result = saved;
  }
  if (result.status !== "ok") {
    if (verified) {
      result = { status: "ok", drop: provisionalDrop(code) };
    } else if (result.status === "error") {
      const local = localCheck(code);
      if (local.status === "valid") {
        result = { status: "ok", drop: provisionalDrop(code) };
      } else if (local.status === "already_used") {
        result = { status: "already_used" };
      } else {
        result = { status: "invalid" };
      }
    }
  }
  if (result.status === "ok") rememberDrop(code, result.drop);
  return result;
}

// Only used to resume a code already redeemed in this browser's active session.
export async function getRolledPrize(code: string): Promise<RedeemResult> {
  const result = await call(code, "get_drop") as RedeemResult;
  if (result.status === "ok") {
    rememberDrop(code, result.drop);
    return result;
  }
  const local = rememberedDrop(code);
  return local ? { status: "ok", drop: local } : result;
}
