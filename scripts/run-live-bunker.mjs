import { writeFile } from "node:fs/promises";
import { gatherLiveInput, unavailableInput } from "./fetch-live-bunker.mjs";

const leagues = process.env.BUNKER_LEAGUES?.split(",").map(Number);
if (leagues && (!leagues.length || leagues.some((id) => !Number.isInteger(id) || id <= 0))) {
  throw new Error("BUNKER_LEAGUES must be comma-separated positive league IDs");
}

const target = new URL("../data/bunker-live.json", import.meta.url);
const timeZone = process.env.BUNKER_TIMEZONE || "Asia/Jerusalem";
const publish = async (input) => {
  await writeFile(target, `${JSON.stringify(input, null, 2)}\n`, { mode: 0o600 });
  return input;
};

try {
  const input = await gatherLiveInput({ key: process.env.API_FOOTBALL_KEY, leagues, timeZone });
  await publish(input);
  console.log(`Analyzed today's fixtures: ${input.picks.length} verified selections at ${input.source}`);
} catch (error) {
  // A scheduled run must never leave the site without today's date. Publishing
  // the dated status keeps the failure visible and self-clearing on the next
  // successful daily scan; local runs still fail loudly by default.
  if (process.env.BUNKER_ALLOW_UNAVAILABLE !== "1") throw error;
  console.error("Today's provider data is unavailable; publishing a dated status instead of stale picks:", error);
  await publish(unavailableInput(new Date(), timeZone));
  console.log("Published a dated unavailable status for today.");
}
