// One navigation handoff, never a persistent access flag. Consuming it on the
// Bunker route means reloads and bookmarked URLs return to the code screen.
const ENTRY_KEY = "bunker-entry-once";

export function prepareBunkerEntry() {
  window.sessionStorage.setItem(ENTRY_KEY, `${Date.now()}:${window.crypto.randomUUID()}`);
}

export function consumeBunkerEntry() {
  try {
    const token = window.sessionStorage.getItem(ENTRY_KEY);
    window.sessionStorage.removeItem(ENTRY_KEY);
    if (!token) return false;
    const [issued, nonce] = token.split(":");
    return /^\d+$/.test(issued) && Date.now() - Number(issued) >= 0 &&
      Date.now() - Number(issued) < 60_000 && /^[0-9a-f-]{36}$/i.test(nonce);
  } catch {
    return false;
  }
}
