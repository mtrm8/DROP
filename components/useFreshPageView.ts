"use client";

import { useLayoutEffect } from "react";

// A result may remain in storage for access control, but the view itself is
// never restored from a fragment, browser scroll position or bfcache snapshot.
export function useFreshPageView() {
  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
    const reset = () => {
      if (window.location.hash || window.location.search) {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
      window.scrollTo(0, 0);
    };
    reset();
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
}
