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
  const timeZone = text(input.timeZone ?? "Asia/Jerusalem", "timeZone");
  const localDate = (date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
  localDate(asOf); // Validate the configured IANA timezone even for empty reports.
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
      assert(Number.isFinite(Date.parse(kickoff)) && Date.parse(kickoff) > asOf &&
        localDate(kickoff) === localDate(asOf), `picks[${i}] must be upcoming today`);
      // The provider's own update stamps lag the fixture time by hours, so the
      // bound is a freshness window rather than a same-day calendar check. A
      // price older than the window cannot be published, but a price stamped
      // yesterday afternoon for tonight's match is legitimate.
      assert(Number.isFinite(Date.parse(oddsUpdatedAt)) && Date.parse(oddsUpdatedAt) <= asOf &&
        asOf - Date.parse(oddsUpdatedAt) <= 12 * 60 * 60 * 1000,
      `picks[${i}] odds must be within 12 hours of the report`);
      assert(pick.lineup && pick.lineup.homeStarters === 11 && pick.lineup.awayStarters === 11 &&
        ["confirmed", "projected"].includes(pick.lineup.homeKind) &&
        ["confirmed", "projected"].includes(pick.lineup.awayKind) &&
        Number.isInteger(pick.lineup.homeChanges) && pick.lineup.homeChanges >= 0 && pick.lineup.homeChanges <= 4 &&
        Number.isInteger(pick.lineup.awayChanges) && pick.lineup.awayChanges >= 0 && pick.lineup.awayChanges <= 4,
      `picks[${i}] requires a verified or explicitly projected starting XI`);
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
  // A flat day is not an empty day. When no accumulator clears the bar, carry
  // real matches through as a clearly-labelled watchlist so the page shows
  // today's football instead of a blank screen. A fixture that never reached the
  // model has no probability, and says so rather than borrowing a number.
  // Every edge is reported with its real sign: these are not recommendations.
  const watchlist = (Array.isArray(input.watchlist) ? input.watchlist : []).slice(0, 5).map((item, i) => {
    assert(item && typeof item === "object", `watchlist[${i}] must be an object`);
    const optional = (value, label, low, high) =>
      value === null || value === undefined ? null : number(value, label, low, high);
    const logo = (value, label) => {
      if (value === null || value === undefined) return null;
      assert(typeof value === "string", `${label} must be a provider team image URL`);
      let url;
      try { url = new URL(value); } catch { throw new Error(`Bunker input: ${label} must be a provider team image URL`); }
      assert(url.protocol === "https:" && url.hostname === "media.api-sports.io" &&
        /^\/football\/teams\/[1-9]\d*\.png$/.test(url.pathname) && !url.search && !url.hash,
      `${label} must be a provider team image URL`);
      return url.href;
    };
    const form = (value, label) => {
      if (value === null || value === undefined) return null;
      assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be recent venue results`);
      const games = number(value.games, `${label}.games`, 1, 5);
      const overTwo = number(value.overTwo, `${label}.overTwo`, 0, games);
      const goalsFor = number(value.goalsFor, `${label}.goalsFor`, 0, 150);
      const goalsAgainst = number(value.goalsAgainst, `${label}.goalsAgainst`, 0, 150);
      assert([games, overTwo, goalsFor, goalsAgainst].every(Number.isInteger), `${label} counts must be integers`);
      return { games, overTwo, goalsFor, goalsAgainst };
    };
    const probability = optional(item.probability, `watchlist[${i}].probability`, 0.001, 1);
    const quote = optional(item.odds, `watchlist[${i}].odds`, 1.01, 10000);
    // A live price is real data and is kept even when the fixture never reached
    // the model. The reverse is meaningless: a probability with no price has
    // nothing to be an edge against, so that pairing is refused.
    assert(probability === null || quote !== null, `watchlist[${i}] has a probability but no price`);
    return {
      home: text(item.home, `watchlist[${i}].home`),
      away: text(item.away, `watchlist[${i}].away`),
      homeLogo: logo(item.homeLogo, `watchlist[${i}].homeLogo`),
      awayLogo: logo(item.awayLogo, `watchlist[${i}].awayLogo`),
      homeForm: form(item.homeForm, `watchlist[${i}].homeForm`),
      awayForm: form(item.awayForm, `watchlist[${i}].awayForm`),
      competition: text(item.competition, `watchlist[${i}].competition`),
      bookmaker: item.bookmaker === null || item.bookmaker === undefined
        ? null
        : text(item.bookmaker, `watchlist[${i}].bookmaker`),
      kickoff: text(item.kickoff, `watchlist[${i}].kickoff`),
      note: item.note === null || item.note === undefined ? null : text(item.note, `watchlist[${i}].note`),
      odds: quote,
      probability,
      mean: optional(item.mean, `watchlist[${i}].mean`, 0, 12),
      fairOdds: probability && probability > 0 ? 1 / probability : null,
      edge: probability === null || quote === null ? null : probability * quote - 1,
    };
  });
  const scanNote = input.scanNote === undefined || input.scanNote === null
    ? null
    : text(input.scanNote, "scanNote");
  return {
    mode: input.mode, source, asOf: input.asOf, timeZone, picks, combinedOdds, productOdds,
    status: picks.length === 0 ? (input.status === "unavailable" ? "unavailable" : "no-picks") : "ready",
    statusMessage: input.status === "unavailable" ? text(input.statusMessage ?? "טרם התקבל דוח מאומת להיום", "statusMessage") : null,
    watchlist: picks.length === 0 ? watchlist : [],
    scanNote,
    breakEven: 1 / combinedOdds, jointProbability,
    jointFairOdds: jointProbability && jointProbability > 0 ? 1 / jointProbability : null,
    jointEdge: jointProbability === null ? null : jointProbability * combinedOdds - 1,
    methodology: "ממוצע השערים הביתיים = ממוצע שערי הבית של המארחת ושערי החובה בחוץ של האורחת, חלקי שניים; ולהפך לשערי האורחת. סך השערים מחושב במודל פואסון. הסתברות משותפת מחושבת כמכפלת הסתברויות המשחקים בהנחת אי־תלות. הרכב מאושר מושווה להרכב הקודם; כשאינו זמין, ההרכב הקודם מוצג כהערכה בלבד. נתוני השחקנים הם הקשר ואינם משנים את תוחלת השערים. אין תיקון לרמת היריבות או למרווח ההימורים.",
  };
}

/**
 * Gate for automated (daily) publication.
 *
 * A daily scan walks every one of today's fixtures sequentially, so the report
 * is normally much older than the run that requested it. What has to hold is
 * that the report is real provider data describing the current local day, and
 * that it only carries matches which have not kicked off. An earlier version
 * also demanded a report younger than fifteen minutes, which aborted long scans
 * and left the site serving the previous day's report.
 */
export function assertPublishable(report, now = new Date()) {
  const asOf = Date.parse(report.asOf);
  const timeZone = report.timeZone || "Asia/Jerusalem";
  const localDay = (value) => new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
  if (report.mode !== "live" || (report.picks.length > 0 && report.jointProbability === null)) {
    throw new Error("Automated publication requires live input and sufficient data for each selected match");
  }
  if (localDay(asOf) !== localDay(now.getTime())) {
    throw new Error(`Automated publication requires a report for the current day in ${timeZone}, got ${localDay(asOf)}`);
  }
  if (asOf - now.getTime() > 60 * 60 * 1000) {
    throw new Error("Live report timestamp is unexpectedly far in the future");
  }
  if (report.picks.some((pick) => !pick.fixture || Date.parse(pick.fixture.kickoff) <= now.getTime())) {
    throw new Error("Automated publication requires only fixtures that have not kicked off");
  }
  return report;
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
