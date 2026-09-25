export const COMMUNITY_CODES = ["DROP-M-1", "KOKOS-LOSINKA"];

export const WHATSAPP_URL = "https://chat.whatsapp.com/L4vkNyD9fOFIe1PN5Gp1aq";

export function isValidCode(input: string): boolean {
  const value = input.trim();
  return COMMUNITY_CODES.some((code) => code.toLowerCase() === value.toLowerCase());
}