export const COMMUNITY_CODES = ["DROP-M-1"];

export const WHATSAPP_URL = "https://chat.whatsapp.com/L4vkNyD9fOFIe1PN5Gp1aq";

const CLAIM_KEY = "drop-claim";

// Local date as YYYY-MM-DD (matches the user's local day, resets at local midnight).
function dateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidCode(input: string): boolean {
  const value = input.trim();
  return COMMUNITY_CODES.some((code) => code.toLowerCase() === value.toLowerCase());
}

// Reads + validates the stored completion. If the stored date is stale
// (midnight passed), the record is automatically cleared.
export function syncClaim(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(CLAIM_KEY);
  if (!stored) return false;
  if (stored === dateKey()) return true;
  window.localStorage.removeItem(CLAIM_KEY);
  return false;
}

export function hasClaimedToday(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLAIM_KEY) === dateKey();
}

export function claimToday(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAIM_KEY, dateKey());
}