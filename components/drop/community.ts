export const COMMUNITY_CODES = ["DROP-M-1"];

export const WHATSAPP_URL = "https://chat.whatsapp.com/L4vkNyD9fOFIe1PN5Gp1aq";

const CLAIM_KEY = "drop-last-claim";

function todayKey(): string {
  return new Date().toDateString();
}

export function isValidCode(input: string): boolean {
  const value = input.trim();
  return COMMUNITY_CODES.some((code) => code.toLowerCase() === value.toLowerCase());
}

export function hasClaimedToday(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLAIM_KEY) === todayKey();
}

export function claimToday(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAIM_KEY, todayKey());
}