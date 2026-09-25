// The Supabase drop_codes table + redeem_code RPC are the single source of
// truth for code validity and single-use. The client holds no local code list,
// no test bypass and no burn registry — every attempt is verified server-side,
// so no code can ever bypass the real backend check.
export const WHATSAPP_URL = "https://chat.whatsapp.com/L4vkNyD9fOFIe1PN5Gp1aq";