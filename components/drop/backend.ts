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
  "VIP-2026-DROP", "EINSTEIN2026", "MOSIKO-DROP-2026", "DROP-M-1", "KOKOS-LOSINKA",
  "MMM-MMM1", "MOSIKO-DROP-1001", "RONEN-DROP-1",
  "ADIR-DROP-2026", "MOSIKO-COIN-2026",
]);
const normalizeCode = (code: string) => code.trim().toUpperCase();

// Flags may arrive as JSON booleans, text or 0/1 depending on how the column
// was declared. Reading them by name also survives the usual renames instead
// of rejecting a code because a column is missing.
const CODE_FIELDS = ["code", "drop_code", "access_code", "dropCode"] as const;
const USED_FIELDS = ["used", "is_used", "redeemed", "consumed"] as const;
const ACTIVE_FIELDS = ["is_active", "active", "enabled"] as const;

function readFlag(row: Record<string, unknown>, names: readonly string[]): boolean | undefined {
  for (const name of names) {
    if (!(name in row)) continue;
    const value = row[name];
    if (value === null || value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1 ? true : value === 0 ? false : undefined;
    if (typeof value === "string") {
      const flag = value.trim().toLowerCase();
      if (flag === "true" || flag === "t" || flag === "1") return true;
      if (flag === "false" || flag === "f" || flag === "0") return false;
      return undefined;
    }
    return undefined;
  }
  return undefined;
}

function storedCode(row: Record<string, unknown>): string | undefined {
  for (const name of CODE_FIELDS) {
    const value = row[name];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

// A row verifies only when its own code matches exactly (so an ILIKE wildcard
// in user input cannot borrow another code) and it is not flagged as used. An
// unreadable flag stays permissive; a readable `used` never does.
function matchesActiveCode(raw: unknown, normalized: string): boolean {
  if (!raw || typeof raw !== "object") return false;
  const row = raw as Record<string, unknown>;
  const stored = storedCode(row);
  if (!stored || normalizeCode(stored) !== normalized) return false;
  if (readFlag(row, USED_FIELDS) === true) return false;
  if (readFlag(row, ACTIVE_FIELDS) === false) return false;
  return true;
}

type RowsResult = { ok: true; rows: unknown[] } | { ok: false; network: boolean };

async function fetchCodeRows(base: string, key: string, select: string, params: [string, string][]): Promise<RowsResult> {
  const url = new URL(`${base.replace(/\/+$/, "")}/rest/v1/drop_codes`);
  url.searchParams.set("select", select);
  url.searchParams.set("limit", "10");
  for (const [name, value] of params) url.searchParams.set(name, value);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      // Rejected usually means a column was renamed or is not granted here.
      console.warn("[drop] Active-code lookup rejected", response.status, select);
      return { ok: false, network: false };
    }
    const body: unknown = await response.json().catch(() => null);
    return { ok: true, rows: Array.isArray(body) ? body : [] };
  } catch (error) {
    console.warn("[drop] Active-code lookup unavailable", error);
    return { ok: false, network: true };
  }
}

// Independent read-only check for deployments with an outdated/missing RPC.
// Reads `drop_codes` by `code` and requires `used = false`; when a query is
// rejected (renamed/ungranted column) it narrows the select and retries with
// the common alternative column names so verification keeps working.
async function queryActiveCode(code: string): Promise<"valid" | "absent" | "error"> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return "error";

  const normalized = normalizeCode(code);
  if (!normalized) return "absent";
  const byCode: [string, string] = ["code", `ilike.${normalized}`];
  const verdict = (rows: unknown[]) => (rows.some((row) => matchesActiveCode(row, normalized)) ? "valid" : "absent");

  // 1. Canonical read: the schema's own active + unused rows.
  const canonical = await fetchCodeRows(base, key, "code,is_active,used", [byCode, ["is_active", "eq.true"], ["used", "eq.false"]]);
  if (canonical.ok) {
    if (canonical.rows.length > 0) return verdict(canonical.rows);
    // 2. Nothing matched the strict filters: read the same code without them
    //    so a text-typed flag or an unexpected default is interpreted, not
    //    mistaken for a missing code.
    const permissive = await fetchCodeRows(base, key, "code,used,is_active", [byCode]);
    if (permissive.ok) return verdict(permissive.rows);
    if (permissive.network) return "error";
  } else if (canonical.network) {
    return "error";
  }

  // 3. The canonical columns were rejected: try narrower selects and the usual
  //    alternative names until one of them answers.
  const fallbacks: { select: string; param: [string, string] }[] = [
    { select: "code,used", param: byCode },
    { select: "code", param: byCode },
    { select: "drop_code,used,is_active", param: ["drop_code", `ilike.${normalized}`] },
    { select: "drop_code", param: ["drop_code", `ilike.${normalized}`] },
  ];
  for (const step of fallbacks) {
    const result = await fetchCodeRows(base, key, step.select, [step.param]);
    if (result.ok) return verdict(result.rows);
    if (result.network) return "error";
  }
  return "error";
}

function localCheck(code: string): VerifyResult {
  return { status: FALLBACK_CODES.has(normalizeCode(code)) ? "valid" : "invalid" };
}

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

async function call(code: string, rpc: "verify_drop_code" | "redeem_code" | "get_drop" | "complete_drop", prizeId?: string): Promise<VerifyResult | RedeemResult> {
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
  const normalized = normalizeCode(code);
  if (!normalized) return { status: "invalid" };
  const result = await call(normalized, "verify_drop_code") as VerifyResult;
  if (result.status === "valid") return result;
  // Do not wait for a second failing network request for known fallback codes.
  if (result.status === "error" && FALLBACK_CODES.has(normalized)) return { status: "valid" };

  const table = await queryActiveCode(normalized);
  if (table === "valid") return { status: "valid" };
  if (table === "absent" && (result.status === "already_used" || result.status === "invalid")) return result;
  if (result.status === "already_used") return result;
  // An unreachable RPC and an inaccessible table cannot establish that an
  // unfamiliar code is wrong; bundled codes can still enter provisionally.
  return localCheck(normalized).status === "valid" ? { status: "valid" } : { status: "error" };
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
      result = { status: "ok", drop: provisionalDrop() };
    } else if (result.status === "error") {
      const local = localCheck(code);
      if (local.status === "valid") {
        result = { status: "ok", drop: provisionalDrop() };
      } else {
        result = { status: "invalid" };
      }
    }
  }
  return result;
}

// Only used to resume a code already redeemed in this browser's active session.
export async function getRolledPrize(code: string): Promise<RedeemResult> {
  return call(code, "get_drop") as Promise<RedeemResult>;
}

// The winning card's ID must equal the stored prize. Supabase records used and
// used_at only when the player actually collects the finished drop.
export async function completeDrop(code: string, prizeId: string): Promise<RedeemResult> {
  return call(code, "complete_drop", prizeId) as Promise<RedeemResult>;
}
