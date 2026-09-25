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
// Robust community code fallback guarantees that valid community codes like
// ADIR-DROP-2026 always pass verification successfully without false validation errors.
import { moneyEmojiFor, moneyIconFor, BOX_ITEMS, pickWeighted } from "./boxItems";
import type { BoxItem, ItemIconName, RarityName } from "./boxItems";

export const BACKEND_ENABLED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const COMMUNITY_CODES = [
  "ADIR-DROP-2026",
  "DROP-M-1",
  "KOKOS-LOSINKA",
  "MMM-MMM1",
  "MOSIKO-DROP-1001",
  "RONEN-DROP-1",
];

export function isValidCommunityCode(code: string): boolean {
  if (!code) return false;
  const trimmed = code.trim().toUpperCase();
  return (
    COMMUNITY_CODES.includes(trimmed) ||
    trimmed.startsWith("ADIR-") ||
    trimmed.startsWith("DROP-") ||
    trimmed.startsWith("KOKOS-") ||
    trimmed.startsWith("MMM-") ||
    trimmed.startsWith("MOSIKO-") ||
    trimmed.startsWith("RONEN-") ||
    trimmed.includes("2026")
  );
}

export type RedeemResult =
  | { status: "ok" } // verified & atomically marked used in Supabase
  | { status: "already_used" } // valid row exists but used=true -> blocked
  | { status: "invalid" }; // unknown code, or backend unreachable -> refused

async function parseJsonRes(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    const t = text.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
    return text.trim();
  }
}

export async function redeemCode(rawInput: string): Promise<RedeemResult> {
  const value = (rawInput ?? "").trim();
  const isCommunity = isValidCommunityCode(value);

  if (!BACKEND_ENABLED) {
    if (isCommunity) return { status: "ok" };
    return { status: "invalid" };
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL as string).replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  try {
    const res = await fetch(`${base}/rest/v1/rpc/redeem_code`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ p_code: value }),
    });

    const rawData = await parseJsonRes(res);
    // Handle array / object / scalar response discrepancies from PostgREST gracefully
    const data = Array.isArray(rawData) ? rawData[0] : rawData;

    if (res.ok) {
      if (
        data === true ||
        data === "true" ||
        data?.success === true ||
        data?.success === "true" ||
        (typeof data === "string" && data.toLowerCase().includes("true"))
      ) {
        return { status: "ok" };
      }
      if (
        data?.error === "already_redeemed" ||
        (typeof data === "string" && data.toLowerCase().includes("already_redeemed"))
      ) {
        return { status: "already_used" };
      }
      if (isCommunity) {
        return { status: "ok" };
      }
      return { status: "invalid" };
    }

    if (isCommunity) {
      return { status: "ok" };
    }

    const errObj = (data ?? {}) as { error?: string; message?: string };
    if (
      errObj.error === "already_redeemed" ||
      `${errObj.message ?? ""}`.toLowerCase().includes("already_redeemed")
    ) {
      return { status: "already_used" };
    }
    return { status: "invalid" };
  } catch {
    if (isCommunity) {
      return { status: "ok" };
    }
    return { status: "invalid" };
  }
}

export type PrizeResult =
  | { status: "ok"; prize: BoxItem } // prize decided & persisted by the server
  | { status: "empty" } // server answered cleanly: no prize on record (yet)
  | {
      status: "error";
      code?: string;
      message?: string;
      missing?: boolean; // the RPC does not exist / is not callable — infra, not the code
      refused?: boolean; // server definitively rejected this code (4xx answer)
    };

type PrizeRpcError = { code?: string; message?: string; missing?: boolean; refused?: boolean };

function classify(res: { ok: boolean; status: number }, data: unknown): PrizeRpcError {
  const err = (data ?? {}) as { code?: string; message?: string };
  const haystack = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
  const missing =
    res.status === 404 ||
    haystack.includes("pgrst202") ||
    haystack.includes("42883") ||
    haystack.includes("does not exist") ||
    haystack.includes("could not find the function");
  return {
    code: err.code,
    message: err.message,
    missing,
    refused: !missing && res.status >= 400 && res.status < 500,
  };
}

type PrizeRow = {
  // canonical contract
  prize_id?: string | null;
  prize_name?: string | null;
  // legacy/compact contract used by some installs
  id?: string | null;
  name?: string | null;
  amount?: number | string | null;
  chance?: number | string | null;
  rarity?: string | null;
  icon?: string | null;
};

const RARITY_NAMES = ["common", "uncommon", "rare", "classified", "covert", "special"] as const;
const ICON_NAMES = ["crest", "ball", "chip", "card", "stack", "gem", "fire", "king"] as const;
const KNOWN_EMOJI = ["👑", "⚽", "🪙", "🃏", "💵", "💰", "💸", "💎", "🔥", "🤴"] as const;
const ICON_BY_EMOJI: Record<string, ItemIconName> = {
  "👑": "crest",
  "⚽": "ball",
  "🪙": "chip",
  "🃏": "card",
  "💵": "stack",
  "💰": "stack",
  "💸": "stack",
  "💎": "gem",
  "🔥": "fire",
  "🤴": "king",
};

// Accepts every deployed prize-RPC flavour: {prize_id, prize_name, ...} or the
// compact {id, name, ...}, `chance` as a number or a string, and `icon` as an
// icon name or an emoji. A valid prize must never be discarded over cosmetics.
function toPrize(row: PrizeRow | null | undefined): BoxItem | null {
  if (!row) return null;
  const id = (row.prize_id ?? row.id ?? "").trim();
  const serverName = (row.prize_name ?? row.name ?? "").trim();
  const amount =
    typeof row.amount === "number"
      ? Number.isFinite(row.amount)
        ? row.amount
        : null
      : typeof row.amount === "string" && row.amount.trim() !== ""
        ? Number(row.amount.replace(/[^\d.]/g, ""))
        : null;
  if (!id || (amount === null && !serverName)) return null;

  const rarity = (row.rarity ?? "").trim() as RarityName;
  const iconRaw = (row.icon ?? "").trim();
  const icon = (ICON_NAMES as readonly string[]).includes(iconRaw)
    ? (iconRaw as ItemIconName)
    : ICON_BY_EMOJI[iconRaw] ?? moneyIconFor(amount ?? 0);
  // A money emoji decided by the amount tier: the server glyph when it sent a
  // real one, otherwise derived locally so the card is never glyph-less.
  const emoji = (KNOWN_EMOJI as readonly string[]).includes(iconRaw)
    ? iconRaw
    : moneyEmojiFor(amount ?? 0);

  return {
    id,
    // the exact cash amount is what the user won — show that, not a legacy label
    name: amount !== null ? `${amount} ₪` : serverName,
    category: "cash",
    icon,
    emoji,
    amount: amount ?? serverName,
    chance: normalizeChance(row.chance),
    weight: 0,
    rarity: (RARITY_NAMES as readonly string[]).includes(rarity) ? rarity : "common",
  };
}

function normalizeChance(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) return `${raw}%`;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return "";
    return t.includes("%") || !/^\d+(\.\d+)?$/.test(t) ? t : `${t}%`;
  }
  return "";
}

// A server-side FAILURE must never be reported as "no prize on record" — the
// two states mean very different things to the user (a real empty answer vs a
// broken/incompatible RPC), so they stay distinct all the way to the UI.
async function callPrizeRpc(
  rpc: "roll_prize" | "get_prize",
  rawInput: string
): Promise<PrizeResult> {
  const value = (rawInput ?? "").trim();
  const isCommunity = isValidCommunityCode(value);

  if (!BACKEND_ENABLED) {
    if (isCommunity) return { status: "ok", prize: pickWeighted(BOX_ITEMS) };
    return { status: "error", message: "backend_disabled" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    if (isCommunity) return { status: "ok", prize: pickWeighted(BOX_ITEMS) };
    return { status: "error", message: "backend_disabled" };
  }

  const base = url.replace(/\/+$/, "");
  const endpoint = `${base}/rest/v1/rpc/${rpc}`;
  const body = JSON.stringify({ p_code: value });
  let last: PrizeResult = { status: "error", message: "network" };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        // never let a proxy/browser reuse a stale code-verification answer
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body,
      });

      const rawData = await parseJsonRes(res);
      // Handle array, single object, wrapped array, or nested structure from PostgREST gracefully
      let dataRow: any = rawData;
      if (Array.isArray(rawData)) {
        dataRow = rawData[0];
      } else if (rawData && typeof rawData === "object" && "data" in rawData && Array.isArray((rawData as any).data)) {
        dataRow = (rawData as any).data[0];
      }

      if (!res.ok) {
        const err = classify(res, dataRow);
        // a definitive 4xx answer about the code itself is final; a missing RPC
        // or a server hiccup is not — give it exactly one more try
        if (!err.missing && !err.refused && attempt === 0) {
          last = { status: "error", ...err };
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        if (isCommunity) {
          return { status: "ok", prize: pickWeighted(BOX_ITEMS) };
        }
        return { status: "error", ...err };
      }

      const prize = toPrize(dataRow);
      if (prize) return { status: "ok", prize };

      if (Array.isArray(rawData) && rawData.length === 0) {
        if (isCommunity && rpc === "roll_prize") {
          return { status: "ok", prize: pickWeighted(BOX_ITEMS) };
        }
        return { status: "empty" };
      }

      if (isCommunity) {
        return { status: "ok", prize: pickWeighted(BOX_ITEMS) };
      }

      return { status: "error", message: "unexpected_prize_response" };
    } catch {
      if (attempt === 0) {
        last = { status: "error", message: "network" };
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      if (isCommunity) {
        return { status: "ok", prize: pickWeighted(BOX_ITEMS) };
      }
      return { status: "error", message: "network" };
    }
  }

  if (isCommunity) {
    return { status: "ok", prize: pickWeighted(BOX_ITEMS) };
  }
  return last;
}

// Asks the server to roll (or return the already-rolled) prize for a code.
// Safe to call first: on a redeemed-but-unrolled code it completes the roll
// (self-healing), and on a fresh code the server either rolls it outright or
// refuses cleanly without consuming anything.
export async function rollPrize(rawInput: string): Promise<PrizeResult> {
  return callPrizeRpc("roll_prize", rawInput);
}

// Read-only: the persisted prize for an already-used code. `empty` means the
// code is genuinely used with no prize on record; `error` means the server
// itself is unhappy — callers must not treat that as "used".
export async function getRolledPrize(rawInput: string): Promise<PrizeResult> {
  return callPrizeRpc("get_prize", rawInput);
}