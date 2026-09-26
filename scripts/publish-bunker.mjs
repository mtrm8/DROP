import { execFileSync } from "node:child_process";
import { cp, readFile, rm } from "node:fs/promises";

// Compatibility with the existing bunker.yml: it invokes bunker-model.mjs
// and publishes ./public. Build the verified live report first, then mirror
// the Next static export into that directory. Any upstream failure aborts the
// workflow before the deployment action can publish stale files.
process.env.BUNKER_DATA_FILE = "data/bunker-live.json";
process.env.BUNKER_REQUIRE_LIVE = "1";
// A failed provider scan publishes today's dated status rather than aborting,
// so the deployment always carries the current date.
process.env.BUNKER_ALLOW_UNAVAILABLE = "1";
await import("./run-live-bunker.mjs");
await import("./generate-bunker.mjs");
// A rerun in the same workspace must not feed a previous export's _next assets
// back into Next's public/ directory (Next rejects public/_next outright).
for (const name of ["_next", "404", "404.html", "bunker", "bunker.html", "bunker-data.json", "drop", "index.html", "index.txt"]) {
  await rm(`public/${name}`, { recursive: true, force: true });
}
execFileSync("npm", ["run", "build:static"], { stdio: "inherit", timeout: 180_000 });
for (const path of ["out/index.html", "out/bunker/index.html", "out/404.html"]) {
  if (!(await readFile(path)).length) throw new Error(`Missing Pages export: ${path}`);
}
await cp("out", "public", { recursive: true, force: true });
if (!(await readFile("public/index.html")).length) throw new Error("Pages publish directory has no index.html");
console.log("Live Bunker Pages export ready in public/ for the existing deployment workflow");
