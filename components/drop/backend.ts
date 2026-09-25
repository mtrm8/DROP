import { isValidCode } from "./community";

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
  | { status: "already_used"; code: string; mode: "server" }
  | { status: "invalid"; mode: "client" };

export async function redeemCode(rawInput: string): Promise<RedeemResult> {
  const value = rawInput.trim();
  if (!isValidCode(value)) {
    return { status: "invalid", mode: "client" };
  }
  if (!BACKEND_ENABLED) {
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
        return { status: "ok", mode: "server" };
      }
      // Code known on the client but not yet seeded in the DB (e.g. the
      // schema.sql insert hasn't been run for this code): the client-side
      // community list is the source of truth, so accept it. This keeps codes
      // working immediately without manual Supabase SQL. Once the row exists,
      // the server enforces true single-use ("already_redeemed").
      if (data.error === "not_found") {
        return { status: "ok", mode: "client" };
      }
      return { status: "already_used", code: value, mode: "server" };
    }
    // RPC not deployed yet (404) or backend hiccup: degrade to the legacy flow.
    return { status: "ok", mode: "client" };
  } catch {
    return { status: "ok", mode: "client" };
  }
}