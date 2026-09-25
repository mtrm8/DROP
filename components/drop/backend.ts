// Strictly server-authoritative one-time code validation via Supabase
// (PostgREST RPC). The drop_codes table + redeem_code RPC are the only source
// of truth: the RPC is SECURITY DEFINER and atomically sets used = true /
// used_at = now() inside a transaction with a WHERE used = false guard, so
// exactly one device ever wins and every later attempt returns
// "already_redeemed" across all browsers/devices.
//
// There is deliberately NO client-side fallback: if the server cannot confirm a
// code as unused, it is refused. (Requires these env vars at build time:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
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