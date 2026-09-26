import { readFile, writeFile } from "node:fs/promises";
import { analyze } from "./bunker-model.mjs";

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
if (process.env.BUNKER_REQUIRE_LIVE === "1" && (report.mode !== "live" || report.status === "unavailable" || (report.picks.length > 0 && report.jointProbability === null))) {
  throw new Error("Automated publication requires live input and sufficient data for each selected match");
}
if (process.env.BUNKER_REQUIRE_LIVE === "1" && (Date.now() - Date.parse(report.asOf) > 15 * 60 * 1000 || Date.parse(report.asOf) - Date.now() > 5 * 60 * 1000 ||
  report.picks.some((pick) => !pick.fixture || Date.parse(pick.fixture.kickoff) <= Date.now()))) {
  throw new Error("Live report must be generated within 15 minutes and contain only future fixtures");
}
await writeFile(new URL("../components/bunker/generatedReport.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated Bunker report: ${report.mode}, ${report.picks.length} picks, model ${report.jointProbability === null ? "unavailable" : "ready"}`);
