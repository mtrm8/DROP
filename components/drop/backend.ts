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
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };
      return data.success === true
        ? { status: "ok", mode: "server" }
        : { status: "already_used", code: value, mode: "server" };
    }
    // RPC not deployed yet (404) or backend hiccup: degrade to the legacy flow.
    return { status: "ok", mode: "client" };
  } catch {
    return { status: "ok", mode: "client" };
  }
}