import { writeFile } from "node:fs/promises";
import { gatherLiveInput } from "./fetch-live-bunker.mjs";

const leagues = process.env.BUNKER_LEAGUES?.split(",").map(Number);
if (leagues && (!leagues.length || leagues.some((id) => !Number.isInteger(id) || id <= 0))) {
  throw new Error("BUNKER_LEAGUES must be comma-separated positive league IDs");
}
const input = await gatherLiveInput({ key: process.env.API_FOOTBALL_KEY, leagues, timeZone: process.env.BUNKER_TIMEZONE || "Asia/Jerusalem" });
await writeFile(new URL("../data/bunker-live.json", import.meta.url), `${JSON.stringify(input, null, 2)}\n`, { mode: 0o600 });
console.log(`Analyzed today's fixtures: ${input.picks.length} verified selections at ${input.source}`);
