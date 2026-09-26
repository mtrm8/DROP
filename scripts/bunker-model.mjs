import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const assert = (condition, message) => { if (!condition) throw new Error(`Bunker input: ${message}`); };
const text = (value, label) => {
  assert(typeof value === "string" && value.trim().length > 0 && value.length <= 160, `${label} must be nonempty text (max 160 chars)`);
  return value.trim();
};
const number = (value, label, minimum, maximum) => {
  assert(typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum, `${label} must be between ${minimum} and ${maximum}`);
  return value;
};

export function overTwo(mean) {
  return 1 - Math.exp(-mean) * (1 + mean + mean * mean / 2);
}

export function goalBuckets(mean) {
  const buckets = [Math.exp(-mean)];
  for (let i = 1; i <= 5; i++) buckets.push(buckets[i - 1] * mean / i);
  return [...buckets, Math.max(0, 1 - buckets.reduce((sum, p) => sum + p, 0))];
}

export function analyze(input) {
  assert(input && typeof input === "object" && !Array.isArray(input), "expected a JSON object");
  assert(input.mode === "demo" || input.mode === "live", "mode must be demo or live");
  const source = text(input.source, "source");
  assert(!Number.isNaN(Date.parse(input.asOf)) && /(?:Z|[+-]\d\d:\d\d)$/.test(input.asOf), "asOf must be an ISO timestamp with timezone");
  const asOf = Date.parse(input.asOf);
  const combinedOdds = number(input.combinedOdds, "combinedOdds", 1.01, 10000);
  assert(Array.isArray(input.picks) && input.picks.length <= 10 && (input.picks.length > 0 || input.mode === "live"), "provide 1–10 picks (or a live no-picks report)");
  assert(input.status !== "unavailable" || (input.mode === "live" && input.picks.length === 0), "unavailable status cannot contain selections");
  assert(Array.isArray(input.results) && input.results.length <= 5000, "results must be an array (max 5000)");

  const results = input.results.map((row, i) => {
    assert(row && typeof row === "object", `results[${i}] must be an object`);
    assert(typeof row.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
      !Number.isNaN(Date.parse(`${row.date}T00:00:00Z`)) &&
      new Date(`${row.date}T00:00:00Z`).toISOString().slice(0, 10) === row.date &&
      Date.parse(`${row.date}T00:00:00Z`) <= asOf,
    `results[${i}].date must be a valid date on or before asOf`);
    const home = text(row.home, `results[${i}].home`);
    const away = text(row.away, `results[${i}].away`);
    assert(home !== away, `results[${i}] teams must differ`);
    const homeGoals = number(row.homeGoals, `results[${i}].homeGoals`, 0, 30);
    const awayGoals = number(row.awayGoals, `results[${i}].awayGoals`, 0, 30);
    assert(Number.isInteger(homeGoals) && Number.isInteger(awayGoals), `results[${i}] goals must be integers`);
    return { date: row.date, home, away, homeGoals, awayGoals };
  });

  const seen = new Set();
  const picks = input.picks.map((pick, i) => {
    assert(pick && typeof pick === "object", `picks[${i}] must be an object`);
    const id = text(pick.id, `picks[${i}].id`);
    assert(!seen.has(id), `duplicate pick id ${id}`);
    seen.add(id);
    const home = text(pick.home, `picks[${i}].home`);
    const away = text(pick.away, `picks[${i}].away`);
    assert(home !== away, `picks[${i}] teams must differ`);
    const odds = number(pick.odds, `picks[${i}].odds`, 1.01, 10000);
    const homeCode = text(pick.homeCode, `picks[${i}].homeCode`);
    const awayCode = text(pick.awayCode, `picks[${i}].awayCode`);
    assert(typeof pick.homeFlag === "string" && pick.homeFlag.length <= 40 &&
      typeof pick.awayFlag === "string" && pick.awayFlag.length <= 40, `picks[${i}] flags must be strings`);
    const homeFlag = pick.homeFlag;
    const awayFlag = pick.awayFlag;
    let fixture = null;
    if (input.mode === "live") {
      const kickoff = text(pick.kickoff, `picks[${i}].kickoff`);
      const oddsUpdatedAt = text(pick.oddsUpdatedAt, `picks[${i}].oddsUpdatedAt`);
      assert(Number.isFinite(Date.parse(kickoff)) && Date.parse(kickoff) > asOf, `picks[${i}] must be upcoming`);
      assert(Number.isFinite(Date.parse(oddsUpdatedAt)) && Date.parse(oddsUpdatedAt) <= asOf &&
        asOf - Date.parse(oddsUpdatedAt) <= 2 * 60 * 60 * 1000, `picks[${i}] odds must be recent`);
      assert(pick.lineup && pick.lineup.homeStarters === 11 && pick.lineup.awayStarters === 11 &&
        Number.isInteger(pick.lineup.homeChanges) && pick.lineup.homeChanges >= 0 && pick.lineup.homeChanges <= 4 &&
        Number.isInteger(pick.lineup.awayChanges) && pick.lineup.awayChanges >= 0 && pick.lineup.awayChanges <= 4,
      `picks[${i}] requires confirmed, stable starting lineups`);
      assert(pick.players && Number.isInteger(pick.players.season) &&
        Array.isArray(pick.players.home) && Array.isArray(pick.players.away) &&
        pick.players.home.length >= 9 && pick.players.away.length >= 9 &&
        [...pick.players.home, ...pick.players.away].every((player) =>
          typeof player.name === "string" && player.name.trim().length > 0 && player.name.length <= 100 &&
          [player.minutes, player.goals, player.assists].every((stat) => Number.isFinite(stat) && stat >= 0) &&
          [player.shots, player.shotsOnTarget, player.keyPasses, player.rating].every((stat) => stat === null || (Number.isFinite(stat) && stat >= 0))),
      `picks[${i}] requires verified starter-level player statistics for both sides`);
      fixture = {
        kickoff, oddsUpdatedAt, competition: text(pick.competition, `picks[${i}].competition`),
        bookmaker: text(pick.bookmaker, `picks[${i}].bookmaker`),
        lineup: pick.lineup,
        players: pick.players,
      };
    }
    const homeSample = results.filter((row) => row.home === home);
    const awaySample = results.filter((row) => row.away === away);
    // Refuse to infer strength from a token sample. No invented forecast when data is absent.
    let model = null;
    if (homeSample.length >= 3 && awaySample.length >= 3) {
      const average = (rows, field) => rows.reduce((sum, row) => sum + row[field], 0) / rows.length;
      const lambdaHome = (average(homeSample, "homeGoals") + average(awaySample, "homeGoals")) / 2;
      const lambdaAway = (average(awaySample, "awayGoals") + average(homeSample, "awayGoals")) / 2;
      const mean = lambdaHome + lambdaAway;
      const probability = overTwo(mean);
      model = {
        homeGames: homeSample.length, awayGames: awaySample.length,
        lambdaHome, lambdaAway, mean, probability,
        buckets: goalBuckets(mean),
        fairOdds: probability > 0 ? 1 / probability : null,
        edge: probability * odds - 1,
      };
    }
    return { id, home, away, homeCode, awayCode, homeFlag, awayFlag, market: "מעל 2.5 שערים", odds, breakEven: 1 / odds, model, fixture };
  });

  const productOdds = picks.reduce((product, pick) => product * pick.odds, 1);
  // The price actually quoted for the accumulator takes precedence over a rounded product.
  assert(picks.length === 0 || Math.abs(productOdds - combinedOdds) / productOdds <= 0.01, "combinedOdds differs from leg product by more than 1%");
  const complete = picks.length > 0 && picks.every((pick) => pick.model !== null);
  const jointProbability = complete ? picks.reduce((product, pick) => product * pick.model.probability, 1) : null;
  return {
    mode: input.mode, source, asOf: input.asOf, picks, combinedOdds, productOdds,
    status: picks.length === 0 ? (input.status === "unavailable" ? "unavailable" : "no-picks") : "ready",
    breakEven: 1 / combinedOdds, jointProbability,
    jointFairOdds: jointProbability && jointProbability > 0 ? 1 / jointProbability : null,
    jointEdge: jointProbability === null ? null : jointProbability * combinedOdds - 1,
    methodology: "ממוצע השערים הביתיים = ממוצע שערי הבית של המארחת ושערי החובה בחוץ של האורחת, חלקי שניים; ולהפך לשערי האורחת. סך השערים מחושב במודל פואסון. הסתברות משותפת מחושבת כמכפלת הסתברויות המשחקים בהנחת אי־תלות. הרכבים מאושרים מושווים להרכב הקודם; נתוני השחקנים הם הקשר בלבד ואינם משנים את תוחלת השערים. אין תיקון לרמת היריבות או מרווח ההימורים.",
  };
}

// The existing GitHub Actions workflow executes this file directly. When it is
// imported by the fetcher or tests, do not run the publication pipeline.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  // Do not await during module evaluation: the fetcher imports analyze() from
  // this module, and an awaited dynamic import would deadlock that cycle.
  import("./publish-bunker.mjs").catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
