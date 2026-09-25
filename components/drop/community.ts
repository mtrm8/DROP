export const COMMUNITY_CODES = ["DROP-M-1", "KOKOS-LOSINKA"];

export const WHATSAPP_URL = "https://chat.whatsapp.com/L4vkNyD9fOFIe1PN5Gp1aq";

export function isValidCode(input: string): boolean {
  const value = input.trim();
  return COMMUNITY_CODES.some((code) => code.toLowerCase() === value.toLowerCase());
}

const BURNED_KEY = "drop-burned";
const burnedMemory = new Set<string>();

// Client-side single-use registry for codes accepted in fallback mode (row not
// seeded in Supabase yet). Prevents reusing the same code in loops until the
// seed is applied and the server becomes the authoritative burn point.
// The in-memory set guards the current page even when storage is unavailable
// (private browsing), and localStorage makes the burn persist across reloads.
export function isCodeBurned(code: string): boolean {
  const key = code.trim().toUpperCase();
  if (burnedMemory.has(key)) return true;
  if (typeof window === "undefined") return false;
  try {
    const list = JSON.parse(window.localStorage.getItem(BURNED_KEY) ?? "[]") as string[];
    return list.includes(key);
  } catch {
    return false;
  }
}

export function burnCode(code: string): void {
  const key = code.trim().toUpperCase();
  burnedMemory.add(key);
  if (typeof window === "undefined") return;
  try {
    const list = JSON.parse(window.localStorage.getItem(BURNED_KEY) ?? "[]") as string[];
    if (!list.includes(key)) {
      window.localStorage.setItem(BURNED_KEY, JSON.stringify([...list, key]));
    }
  } catch {
    // Private mode: the in-memory set still blocks reuse for this session.
  }
}