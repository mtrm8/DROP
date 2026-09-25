// Strictly server-authoritative one-time code validation via Supabase
// (PostgREST RPC). The drop_codes table + redeem_code RPC are the only source
// of truth: the RPC is SECURITY DEFINER and atomically sets used = true /
// used_at = now() inside a transaction with a WHERE used = false guard, so
// exactly one device ever wins and every later attempt returns
// "already_redeemed" across all browsers/devices.
//
// The cash prize is rolled server-side too (roll_prize): the winning amount is
// decided inside Postgres using the pool weights and persisted on the code row,
// so the client cannot influence, re-roll or edit what was won — the browser
// only ever renders the amount the server already committed to.
//
// There is deliberately NO client-side fallback: if the server cannot confirm a
// code as unused, it is refused. (Requires these env vars at build time:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
import type { BoxItem, ItemIconName, RarityName } from "./boxItems";

export const BACKEND_ENABLED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export type RedeemResult =
  | { status: "ok" } // verified & atomically marked used in Supabase
  | { status: "already_used" } // valid row exists but used=true -> blocked
  | { status: "invalid" }; // unknown code, or backend unreachable -> refused

export async function redeemCode(rawInput: string): Promise<RedeemResult> {
  const value = rawInput.trim();
  if (!BACKEND_ENABLED) {
    // Backend not configured: nothing can be verified, so strictly refuse.
    return { status: "invalid" };
  }
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL as string).replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  try {
    const res = await fetch(`${base}/rest/v1/rpc/redeem_code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ p_code: value }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: "not_found" | "already_redeemed" | string;
      };
      if (data.success === true) {
        return { status: "ok" };
      }
      if (data.error === "already_redeemed") {
        return { status: "already_used" };
      }
      // not_found or any other server answer: code does not exist (or state
      // cannot be confirmed) -> generic invalid, never a bypass.
      return { status: "invalid" };
    }
    // RPC missing (404), backend hiccup (5xx/429): cannot verify -> refuse.
    return { status: "invalid" };
  } catch {
    // Offline / network failure: cannot verify -> strictly refuse.
    return { status: "invalid" };
  }
}

export type PrizeResult =
  | { status: "ok"; prize: BoxItem } // prize decided & persisted by the server
  | { status: "unavailable" }; // RPC missing / errored / backend off -> no roll

type PrizeRow = {
  prize_id?: string | null;
  prize_name?: string | null;
  amount?: number | null;
  chance?: string | null;
  rarity?: string | null;
  icon?: string | null;
};

function toPrize(row: PrizeRow | null | undefined): BoxItem | null {
  if (!row || !row.prize_id || !row.prize_name || typeof row.amount !== "number") {
    return null;
  }
  return {
    id: row.prize_id,
    name: row.prize_name,
    category: "cash",
    icon: (row.icon ?? "chip") as ItemIconName,
    amount: row.amount,
    chance: row.chance ?? "",
    weight: 0,
    rarity: (row.rarity ?? "common") as RarityName,
  };
}

async function callPrizeRpc(
  rpc: "roll_prize" | "get_prize",
  rawInput: string,
  returnsArray: boolean
): Promise<BoxItem | null> {
  if (!BACKEND_ENABLED) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  const base = url.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ p_code: rawInput.trim() }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as PrizeRow | PrizeRow[] | null;
    if (returnsArray) {
      const first = Array.isArray(data) ? data[0] : null;
      return toPrize(first);
    }
    return toPrize(Array.isArray(data) ? data[0] : data);
  } catch {
    return null;
  }
}

// Rolls (or returns the already-rolled) prize for a freshly redeemed code.
export async function rollPrize(rawInput: string): Promise<PrizeResult> {
  const prize = await callPrizeRpc("roll_prize", rawInput, false);
  return prize ? { status: "ok", prize } : { status: "unavailable" };
}

// Read-only: the persisted prize for an already-used code, or null. Used to
// resume an interrupted drop — it can never produce a new roll.
export async function getRolledPrize(rawInput: string): Promise<BoxItem | null> {
  return callPrizeRpc("get_prize", rawInput, true);
}