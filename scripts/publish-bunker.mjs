import { execFileSync } from "node:child_process";
import { cp, readFile } from "node:fs/promises";

// Compatibility with the existing bunker.yml: it invokes bunker-model.mjs
// and publishes ./public. Build the verified live report first, then mirror
// the Next static export into that directory. Any upstream failure aborts the
// workflow before the deployment action can publish stale files.
await import("./run-live-bunker.mjs");
process.env.BUNKER_DATA_FILE = "data/bunker-live.json";
process.env.BUNKER_REQUIRE_LIVE = "1";
await import("./generate-bunker.mjs");
execFileSync("npm", ["run", "build:static"], { stdio: "inherit", timeout: 180_000 });
for (const path of ["out/index.html", "out/bunker/index.html", "out/404.html"]) {
  if (!(await readFile(path)).length) throw new Error(`Missing Pages export: ${path}`);
}
await cp("out", "public", { recursive: true, force: true });
if (!(await readFile("public/index.html")).length) throw new Error("Pages publish directory has no index.html");
console.log("Live Bunker Pages export ready in public/ for the existing deployment workflow");
