export const COMMUNITY_CODES = ["DROP-M-1", "KOKOS-LOSINKA"];

export const WHATSAPP_URL = "https://chat.whatsapp.com/L4vkNyD9fOFIe1PN5Gp1aq";

export function isValidCode(input: string): boolean {
  const value = input.trim();
  return COMMUNITY_CODES.some((code) => code.toLowerCase() === value.toLowerCase());
}

const BURNED_KEY = "drop-burned";

// Client-side single-use registry for codes accepted in fallback mode (row not
// seeded in Supabase yet). Prevents reusing the same code in loops until the
// seed is applied and the server becomes the authoritative burn point.
export function isCodeBurned(code: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const list = JSON.parse(window.localStorage.getItem(BURNED_KEY) ?? "[]") as string[];
    return list.includes(code.trim().toUpperCase());
  } catch {
    return false;
  }
}

export function burnCode(code: string): void {
  if (typeof window === "undefined") return;
  const key = code.trim().toUpperCase();
  try {
    const list = JSON.parse(window.localStorage.getItem(BURNED_KEY) ?? "[]") as string[];
    if (!list.includes(key)) {
      window.localStorage.setItem(BURNED_KEY, JSON.stringify([...list, key]));
    }
  } catch {
    window.localStorage.setItem(BURNED_KEY, JSON.stringify([key]));
  }
}