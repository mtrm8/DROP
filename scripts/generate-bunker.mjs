import { readFile, writeFile } from "node:fs/promises";
import { analyze, assertPublishable } from "./bunker-model.mjs";

const url = process.env.BUNKER_DATA_URL;
let raw;
if (url) {
  if (!url.startsWith("https://")) throw new Error("BUNKER_DATA_URL must use HTTPS");
  const headers = process.env.BUNKER_DATA_TOKEN ? { Authorization: `Bearer ${process.env.BUNKER_DATA_TOKEN}` } : {};
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) throw new Error(`Data source returned HTTP ${response.status}`);
  raw = await response.text();
  if (raw.length > 1_000_000) throw new Error("Data source exceeds 1 MB");
} else {
  raw = await readFile(process.env.BUNKER_DATA_FILE || new URL("../data/bunker-input.json", import.meta.url), "utf8");
}

const report = analyze(JSON.parse(raw));
if (process.env.BUNKER_REQUIRE_LIVE === "1") assertPublishable(report);
await writeFile(new URL("../components/bunker/generatedReport.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated Bunker report: ${report.mode}, ${report.picks.length} picks, model ${report.jointProbability === null ? "unavailable" : "ready"}`);
