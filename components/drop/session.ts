// Session-scoped proof that this tab finished a drop. The standalone Analyst
// Bunker route and the embedded landing-page section both check it, so
// bookmarked/direct visits, shared URLs and saved links cannot bypass the drop.
// The flag is written only when a drop completes, and a reload of the site
// drops it again: the bunker stays reachable only right after that drop.
const DROP_ACCESS_KEY = "drop-verified";

// sessionStorage survives a reload, so the flag is invalidated as soon as this
// bundle notices that the current document was opened by a refresh.
function clearOnReload(): void {
  if (typeof window === "undefined") return;
  try {
    const entries = window.performance?.getEntriesByType?.("navigation") as
      | PerformanceNavigationTiming[]
      | undefined;
    const isReload = entries?.[0]?.type === "reload" || window.performance?.navigation?.type === 1;
    if (isReload) window.sessionStorage.removeItem(DROP_ACCESS_KEY);
  } catch {
    // ignore private-mode / storage errors
  }
}

clearOnReload();

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
