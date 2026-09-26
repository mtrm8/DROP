// Session-scoped proof that this tab passed the drop code flow. The standalone
// Analyst Bunker route checks it so bookmarked/direct visits cannot bypass the
// drop requirement, while the embedded landing-page section stays open.
const DROP_ACCESS_KEY = "drop-verified";

export function markDropVerified(): void {
  try {
    window.sessionStorage.setItem(DROP_ACCESS_KEY, "1");
  } catch {
    // Storage may be disabled; the guard then simply stays closed.
  }
}

export function clearDropVerified(): void {
  try {
    window.sessionStorage.removeItem(DROP_ACCESS_KEY);
  } catch {
    // ignore private-mode / storage errors
  }
}

export function isDropVerified(): boolean {
  try {
    return window.sessionStorage.getItem(DROP_ACCESS_KEY) === "1";
  } catch {
    return false;
  }
}
