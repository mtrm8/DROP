import { BOX_ITEMS, moneyEmojiFor, moneyIconFor, pickWeighted } from "./boxItems";
import type { BoxItem, RarityName } from "./boxItems";

export type DropContent = { title?: string; description?: string; analysis?: string };
export type VerifiedDrop = { prize: BoxItem; content: DropContent; provisional?: boolean };
export type RedeemResult =
  | { status: "ok"; drop: VerifiedDrop }
  | { status: "already_used" }
  | { status: "invalid" }
  | { status: "error" };
export type VerifyResult = { status: "valid" | "already_used" | "expired" | "invalid" | "error" };

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
const EXPIRY_FIELDS = ["expires_at", "expire_at", "expiry", "valid_until", "expires"] as const;

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

// Expiry may be a full timestamp or a plain date; a date-only value stays
// valid through the end of that day. A missing or unreadable value never
// expires a code on its own — only a readable past moment does.
function isExpired(row: Record<string, unknown>): boolean {
  const now = Date.now();
  for (const name of EXPIRY_FIELDS) {
    if (!(name in row)) continue;
    const value = row[name];
    if (value === null || value === undefined) return false;
    if (typeof value === "number") return Number.isFinite(value) && value <= now;
    const text = String(value).trim();
    if (!text) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const endOfDay = Date.parse(`${text}T23:59:59.999Z`);
      return Number.isFinite(endOfDay) && endOfDay <= now;
    }
    const time = Date.parse(text);
    return Number.isFinite(time) ? time <= now : false;
  }
  return false;
}

type RowVerdict = "valid" | "used" | "expired" | "inactive" | null;

// Classifies one returned row against the requested code. `null` means the row
// is not that code at all, so an ILIKE wildcard in user input can never borrow
// somebody else's row.
function evaluateCodeRow(raw: unknown, normalized: string): RowVerdict {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const stored = storedCode(row);
  if (!stored || normalizeCode(stored) !== normalized) return null;
  if (readFlag(row, ACTIVE_FIELDS) === false) return "inactive";
  if (isExpired(row)) return "expired";
  if (readFlag(row, USED_FIELDS) === true) return "used";
  return "valid";
}

// Picks the verdict for the requested code. A valid row always wins, so a
// deactivated duplicate can never mask an active one with the same code.
function promoVerdict(rows: unknown[], normalized: string): "valid" | "already_used" | "expired" | "invalid" | null {
  let firstProblem: "already_used" | "expired" | "invalid" | null = null;
  for (const row of rows) {
    const verdict = evaluateCodeRow(row, normalized);
    if (verdict === "valid") return "valid";
    if (verdict === null) continue;
    const problem = verdict === "used" ? "already_used" : verdict === "expired" ? "expired" : "invalid";
    if (!firstProblem) firstProblem = problem;
  }
  return firstProblem;
}

type RowsResult = { ok: true; rows: unknown[] } | { ok: false; network: boolean };

async function fetchRows(base: string, key: string, table: string, select: string, params: [string, string][]): Promise<RowsResult> {
  const url = new URL(`${base.replace(/\/+$/, "")}/rest/v1/${table}`);
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
      console.warn(`[drop] ${table} lookup rejected`, response.status, select);
      return { ok: false, network: false };
    }
    const body: unknown = await response.json().catch(() => null);
    return { ok: true, rows: Array.isArray(body) ? body : [] };
  } catch (error) {
    console.warn(`[drop] ${table} lookup unavailable`, error);
    return { ok: false, network: true };
  }
}

export type PromoVerdict = "valid" | "already_used" | "expired" | "invalid" | "absent" | "error" | "unreachable";

// Current source of truth: the read-only `promo_codes` lookup. It never
// consumes a code; a row verifies only when it is active, has not expired and
// is not flagged as used. Queries start from the canonical schema and narrow
// when one is rejected, so a renamed column degrades instead of failing.
async function queryPromoCode(code: string): Promise<PromoVerdict> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return "error";

  const normalized = normalizeCode(code);
  if (!normalized) return "absent";

  const byCode: [string, string] = ["code", `ilike.${normalized}`];
  const active: [string, string] = ["is_active", "eq.true"];
  // Server-side expiry window: no expiry, or one still in the future. A row
  // excluded here is read again below so an expired code is reported as such.
  const live: [string, string] = ["or", `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`];
  const read = (select: string, params: [string, string][]) => fetchRows(base, key, "promo_codes", select, params);

  let select = "code,is_active,expires_at,used";
  let result = await read(select, [byCode, active, live]);
  if (!result.ok && result.network) return "unreachable";
  if (!result.ok) {
    // A column in the select was renamed or is not granted here.
    select = "code,is_active,expires_at";
    result = await read(select, [byCode, active, live]);
    if (!result.ok && result.network) return "unreachable";
  }
  if (result.ok && result.rows.length > 0) return promoVerdict(result.rows, normalized) ?? "absent";

  // 2. Read the same code without the active/expiry filters so an expired or
  //    deactivated row is classified instead of looking like a typo.
  const loose = result.ok ? await read(select, [byCode]) : await read("code", [byCode]);
  if (loose.ok) return promoVerdict(loose.rows, normalized) ?? "absent";
  if (loose.network) return "unreachable";

  // 3. The columns themselves were rejected: fall back to the usual
  //    alternative name for the code column.
  const byDropCode: [string, string] = ["drop_code", `ilike.${normalized}`];
  for (const attempt of [
    { select: "drop_code,is_active,expires_at,used", params: [byDropCode, active, live] },
    { select: "drop_code,is_active,expires_at", params: [byDropCode, active, live] },
    { select: "drop_code", params: [byDropCode] },
  ]) {
    const step = await read(attempt.select, attempt.params);
    if (step.ok) return promoVerdict(step.rows, normalized) ?? "absent";
    if (step.network) return "unreachable";
  }
  return "error";
}

// Legacy read-only check for deployments whose codes still live in
// `drop_codes` with an outdated/missing RPC. Reads by `code` and requires
// `used = false`; when a query is rejected (renamed/ungranted column) it
// narrows the select and retries with the common alternative column names.
async function queryActiveCode(code: string): Promise<"valid" | "absent" | "error"> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!base || !key) return "error";

  const normalized = normalizeCode(code);
  if (!normalized) return "absent";
  const byCode: [string, string] = ["code", `ilike.${normalized}`];
  const verdict = (rows: unknown[]) => (rows.some((row) => evaluateCodeRow(row, normalized) === "valid") ? "valid" : "absent");

  // 1. Canonical read: the schema's own active + unused rows.
  const canonical = await fetchRows(base, key, "drop_codes", "code,is_active,used", [byCode, ["is_active", "eq.true"], ["used", "eq.false"]]);
  if (canonical.ok) {
    if (canonical.rows.length > 0) return verdict(canonical.rows);
    // 2. Nothing matched the strict filters: read the same code without them
    //    so a text-typed flag or an unexpected default is interpreted, not
    //    mistaken for a missing code.
    const permissive = await fetchRows(base, key, "drop_codes", "code,used,is_active", [byCode]);
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
    const result = await fetchRows(base, key, "drop_codes", step.select, [step.param]);
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

  // 1. promo_codes decides first: trimmed, case-insensitive input checked
  //    against active rows that have not expired. This path is read-only.
  const promo = await queryPromoCode(normalized);
  if (promo === "valid") return { status: "valid" };
  if (promo === "already_used") return { status: "already_used" };
  if (promo === "expired") return { status: "expired" };
  if (promo === "invalid") return { status: "invalid" };
  // The host did not answer at all: retrying the same host through other
  // endpoints would only stall the player on a dead connection.
  if (promo === "unreachable") return { status: "error" };

  // 2. Deployments whose codes still live in drop_codes answer via their RPC.
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
