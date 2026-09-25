import { isValidCode, isCodeBurned, burnCode } from "./community";

// Server-authoritative one-time code validation via Supabase (PostgREST RPC).
// Disabled until these are set (e.g. in .env.local, NEVER committed):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
// While disabled, validation falls back to the legacy client-only flow and every
// device can still use the code. See supabase/schema.sql for the redeem_code RPC.
export const BACKEND_ENABLED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export type RedeemResult =
  | { status: "ok"; mode: "server" | "client" }
  | { status: "already_used"; code: string; mode: "server" | "client" }
  | { status: "invalid"; mode: "client" };

export async function redeemCode(rawInput: string): Promise<RedeemResult> {
  const value = rawInput.trim();
  if (!isValidCode(value)) {
    return { status: "invalid", mode: "client" };
  }
  // Single-use guard runs even before the network: a code accepted in fallback
  // mode is burned locally, so reusing it in a loop fails instantly.
  if (isCodeBurned(value)) {
    return { status: "already_used", code: value, mode: "client" };
  }
  if (!BACKEND_ENABLED) {
    // Legacy mode: burn locally so the code can't be replayed in loops.
    burnCode(value);
    return { status: "ok", mode: "client" };
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
        // The RPC atomically sets used = true / used_at = now() in the same
        // transaction, so the burn is permanent in Supabase; the next attempt
        // returns "already_redeemed" on every device. Mark it locally as well
        // so even this browser can never re-enter it after a reload.
        burnCode(value);
        return { status: "ok", mode: "server" };
      }
      // Code known on the client but not yet seeded in the DB (e.g. the
      // schema.sql insert hasn't been run for this code): the client-side
      // community list is the source of truth, so accept it, and burn it
      // locally so it can't be replayed in loops. Once the row exists, the
      // server takes over and enforces true global single-use.
      if (data.error === "not_found") {
        burnCode(value);
        return { status: "ok", mode: "client" };
      }
      return { status: "already_used", code: value, mode: "server" };
    }
    // RPC endpoint missing (404): no server-side tracking exists for this
    // code, so the fallback accept must burn locally to keep single-use.
    if (res.status === 404) {
      burnCode(value);
      return { status: "ok", mode: "client" };
    }
    // Backend hiccup (5xx / 429): don't consume anything, stay lenient.
    return { status: "ok", mode: "client" };
  } catch {
    // Offline / network failure: don't consume anything, stay lenient.
    return { status: "ok", mode: "client" };
  }
}