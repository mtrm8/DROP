"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Legacy entry point kept only so old bookmarks keep working: the automated
// report is gone, so every visit is forwarded to the human analyst bunker.
export default function BunkerForward() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/bunker");
  }, [router]);
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-sm font-bold text-slate-400" role="status">
      מעבירים לבאנקר האנליסט…
    </main>
  );
}
