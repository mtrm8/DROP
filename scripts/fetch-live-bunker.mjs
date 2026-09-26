import { analyze } from "./bunker-model.mjs";

const BASE = "https://v3.football.api-sports.io";
const flags = { Austria: "austria", Israel: "israel", Netherlands: "netherlands", Germany: "germany" };
const starters = (lineup) => (lineup?.startXI ?? []).map((player) => player?.player?.id).filter(Number.isInteger);
const ODDS_AGE_MS = 12 * 60 * 60 * 1000;

// Leagues with reliable fixture, result, lineup and price coverage. A wider
// pool matters more than a cleverer filter: value exists on most days, it is
// just not always in the same five competitions.
export const DEFAULT_LEAGUES = [39, 61, 78, 135, 140, 88, 94, 203, 89, 40, 331, 169];

// Fixture responses already include the official API-Football team crests.
// Only pass the provider's public team-image URLs to the browser.
export function teamLogo(team) {
  if (!Number.isInteger(team?.id) || typeof team.logo !== "string") return null;
  try {
    const url = new URL(team.logo);
    return url.protocol === "https:" && url.hostname === "media.api-sports.io" &&
      url.pathname === `/football/teams/${team.id}.png` && !url.search && !url.hash ? url.href : null;
  } catch {
    return null;
  }
}

function venueForm(rows, teamName, venue) {
  const recent = rows.filter((row) => row[venue] === teamName).slice(0, 5);
  if (!recent.length) return null;
  return {
    games: recent.length,
    overTwo: recent.filter((row) => row.homeGoals + row.awayGoals >= 3).length,
    goalsFor: recent.reduce((total, row) => total + row[venue === "home" ? "homeGoals" : "awayGoals"], 0),
    goalsAgainst: recent.reduce((total, row) => total + row[venue === "home" ? "awayGoals" : "homeGoals"], 0),
  };
}

function* combinations(items, size, start = 0, prefix = []) {
  if (prefix.length === size) {
    yield prefix;
    return;
  }
  for (let i = start; i <= items.length - (size - prefix.length); i++) {
    yield* combinations(items, size, i + 1, [...prefix, items[i]]);
  }
}

export function todayInZone(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function startingPlayerStats(rows, lineupIds, leagueId, season) {
  const byId = new Map(rows.map((row) => [row.player?.id, row]));
  const players = lineupIds.map((id) => {
    const row = byId.get(id);
    const stats = row?.statistics?.find((entry) => entry.league?.id === leagueId && entry.league?.season === season);
    const minutes = stats?.games?.minutes;
    if (!row?.player?.name || !Number.isFinite(minutes) || minutes < 90) return null;
    const rating = stats.games?.rating == null ? null : Number(stats.games.rating);
    return {
      name: row.player.name, minutes,
      goals: stats.goals?.total ?? 0, assists: stats.goals?.assists ?? 0,
      shots: stats.shots?.total ?? null, shotsOnTarget: stats.shots?.on ?? null,
      keyPasses: stats.passes?.key ?? null, rating: Number.isFinite(rating) ? rating : null,
    };
  }).filter(Boolean);
  return players.length >= 9 ? players : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A daily scan issues dozens of sequential calls, so a single rate-limited or
// 5xx response used to abort the whole day and leave the site on a waiting
// state. Transient failures are retried a few times with a growing pause, which
// is what "not immediately fetched" usually turns out to be.
const TRANSIENT = (status) => status === 429 || status >= 500;
const RETRY_DELAYS = [1000, 4000, 12000];

export function createProvider(key, request = fetch, { retries = RETRY_DELAYS } = {}) {
  if (!key) throw new Error("API_FOOTBALL_KEY is required for live data");
  const call = async (url) => {
    for (let attempt = 0; ; attempt++) {
      let response;
      try {
        response = await request(url, {
          headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(15000), cache: "no-store",
        });
      } catch (error) {
        // Network and timeout blips are transient too.
        if (attempt >= retries.length) throw error;
        await sleep(retries[attempt]);
        continue;
      }
      if (response.ok) return response;
      if (!TRANSIENT(response.status) || attempt >= retries.length) {
        throw new Error(`Football provider ${url.pathname}: HTTP ${response.status}`);
      }
      await sleep(retries[attempt]);
    }
  };
  return async function api(path, params) {
    const url = new URL(path, BASE);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
    const body = await (await call(url)).json();
    if (body.errors && Object.keys(body.errors).length) throw new Error(`Football provider ${path}: ${JSON.stringify(body.errors)}`);
    if (!Array.isArray(body.response)) throw new Error(`Football provider ${path}: invalid response`);
    // Fixture-scoped endpoints usually have one page, but odds can be paginated.
    const pages = Number(body.paging?.total ?? 1);
    if (pages > 10) throw new Error(`Football provider ${path}: too many result pages`);
    const items = [...body.response];
    for (let page = 2; page <= pages; page++) {
      const more = await (await call(new URL(`${url}&page=${page}`))).json();
      if (more.errors && Object.keys(more.errors).length) throw new Error(`Football provider ${path}: ${JSON.stringify(more.errors)}`);
      if (!Array.isArray(more.response)) throw new Error(`Football provider ${path}: invalid page ${page}`);
      items.push(...more.response);
    }
    return items;
  };
}

/**
 * Choose the best same-bookmaker accumulator from the evaluated candidates.
 *
 * An accumulator is worth offering when the *product* of its legs has positive
 * expected value, so that is what the threshold is applied to. Requiring every
 * individual leg to clear the same bar as well was far stricter than the maths
 * requires and is the main reason flat days produced nothing: a 2-leg book
 * almost never has two legs at 4% each. Legs are now only required to be
 * individually positive, and the search ranges over 2..maxLegs legs so a day
 * with several marginal matches can still form a qualifying combination.
 */
export function selectValuePicks(candidates, asOf, minEdge = 0.04, timeZone = "Asia/Jerusalem", options = {}) {
  const { maxLegs = 4, poolSize = 12, watchlistSize = 5 } = options;
  // Accumulator legs must be offered by one bookmaker; combining prices from
  // different books would advertise a payout that cannot be placed.
  const byBook = new Map();
  for (const candidate of candidates) {
    if (candidate.edge <= 0) continue;
    const group = byBook.get(candidate.bookmaker.id) ?? new Map();
    const previous = group.get(candidate.fixtureId);
    if (!previous || candidate.edge > previous.edge) group.set(candidate.fixtureId, candidate);
    byBook.set(candidate.bookmaker.id, group);
  }
  const quote = (legs) => {
    const product = legs.reduce((value, item) => value * item.odds, 1);
    const quoted = Number(product.toFixed(2));
    const probability = legs.reduce((value, item) => value * item.probability, 1);
    return { legs, quoted, edge: probability * quoted - 1 };
  };
  let best = null;
  for (const group of byBook.values()) {
    const pool = [...group.values()]
      .sort((a, b) => b.edge - a.edge || (b.mean ?? 0) - (a.mean ?? 0) || a.kickoff.localeCompare(b.kickoff))
      .slice(0, poolSize);
    for (let size = 2; size <= Math.min(maxLegs, pool.length); size++) {
      for (const legs of combinations(pool, size)) {
        const option = quote(legs);
        if (option.edge < minEdge) continue;
        if (!best || option.edge > best.edge ||
          (option.edge === best.edge && option.quoted > best.quoted)) best = option;
      }
    }
  }
  // A flat day still has fixtures. Take the closest evaluated matches first,
  // then top up with the day's remaining upcoming fixtures so the report always
  // shows real, live matches rather than a blank screen. Fixtures that never
  // reached the model carry no probability and no edge, and say why instead.
  const modelled = [...candidates]
    .filter((item) => item.home?.name && item.away?.name && item.bookmaker?.name)
    .sort((a, b) => b.edge - a.edge || (b.mean ?? 0) - (a.mean ?? 0) || a.kickoff.localeCompare(b.kickoff))
    .filter((candidate, index, all) => all.findIndex((item) => item.fixtureId === candidate.fixtureId) === index)
    .map((item) => ({
      home: item.home.name, away: item.away.name, competition: item.competition,
      homeLogo: teamLogo(item.home), awayLogo: teamLogo(item.away),
      homeForm: item.homeForm ?? null, awayForm: item.awayForm ?? null,
      bookmaker: item.bookmaker.name, kickoff: item.kickoff, odds: item.odds,
      probability: item.probability, mean: item.mean, note: null,
    }));
  const chosen = modelled.map((item) => `${item.home}|${item.away}`);
  const upcomingOnly = (options.fallbackFixtures ?? [])
    .filter((item) => item.home && item.away && !chosen.includes(`${item.home}|${item.away}`))
    // Soonest first: the point of a daily watchlist is what is coming up next.
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .map((item) => ({
      home: item.home, away: item.away, competition: item.competition,
      homeLogo: item.homeLogo ?? null, awayLogo: item.awayLogo ?? null,
      homeForm: item.homeForm ?? null, awayForm: item.awayForm ?? null,
      bookmaker: item.bookmaker, kickoff: item.kickoff,
      odds: item.odds, probability: item.probability, mean: item.mean, note: item.note,
    }));
  const watchlist = [...modelled, ...upcomingOnly].slice(0, watchlistSize);
  if (!best) return {
    mode: "live", source: "API-Football · סריקה יומית ללא צבר מאומת",
    asOf: asOf.toISOString(), timeZone, combinedOdds: 1.01, picks: [], results: [],
    watchlist,
  };
  const { legs, quoted } = best;
  return {
    mode: "live",
    source: `API-Football · ${legs[0].bookmaker.name} · תוצאות, הרכבים ונתוני שחקנים`,
    asOf: asOf.toISOString(),
    timeZone,
    combinedOdds: quoted,
    picks: legs.map((item, index) => ({
      id: String(index + 1).padStart(2, "0"),
      home: item.home.name, away: item.away.name,
      homeCode: item.home.code || item.home.name.slice(0, 3).toUpperCase(),
      awayCode: item.away.code || item.away.name.slice(0, 3).toUpperCase(),
      homeFlag: flags[item.home.name] || "", awayFlag: flags[item.away.name] || "",
      odds: item.odds, kickoff: item.kickoff, competition: item.competition,
      bookmaker: item.bookmaker.name, oddsUpdatedAt: item.oddsUpdatedAt,
      lineup: item.lineup, players: item.players,
    })),
    results: [...new Map(legs.flatMap((item) => item.results).map((row) => [row.fixtureId, row])).values()]
      .map(({ date, home, away, homeGoals, awayGoals }) => ({ date, home, away, homeGoals, awayGoals })),
  };
}

/**
 * The dated status published when a scheduled scan cannot reach the provider.
 * It carries the current day so the page reports an outage for today instead of
 * leaving yesterday's finished matches on screen, and it is a valid live
 * report, so the daily build can still publish it.
 */
export function unavailableInput(now = new Date(), timeZone = "Asia/Jerusalem", reason = "") {
  // Say *why* the scan could not finish. "Data not completed" on its own gives
  // a reader nothing to act on, and a wrong key looks identical to a provider
  // outage unless the message carries the cause.
  const why = reason ? ` (${reason.slice(0, 90)})` : "";
  return {
    mode: "live",
    status: "unavailable",
    statusMessage: `לא ניתן להשלים את עדכון הנתונים היום${why}. הבנקר יתעדכן שוב בסריקה היומית הבאה.`,
    source: "עדכון נתוני הספק לא הושלם",
    asOf: now.toISOString(),
    timeZone,
    combinedOdds: 1.01,
    picks: [],
    results: [],
  };
}

export async function gatherLiveInput({ key, leagues = DEFAULT_LEAGUES, timeZone = "Asia/Jerusalem", now = new Date(), request = fetch }) {
  const api = createProvider(key, request);
  const today = todayInZone(now, timeZone);
  const fixtures = await api("/fixtures", { date: today, status: "NS", timezone: timeZone });
  const upcoming = fixtures.filter((match) =>
    leagues.includes(match.league?.id) && match.fixture?.id &&
    Date.parse(match.fixture.date) >= now.getTime() + 15 * 60 * 1000 &&
    todayInZone(new Date(match.fixture.date), timeZone) === today && match.teams?.home?.id && match.teams?.away?.id)
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));
  // "No picks" and "nothing could be evaluated" look identical on the page
  // unless the scan says which one happened, so every early exit is counted.
  const scan = { seen: fixtures.length, eligible: upcoming.length, evaluated: 0, quotes: 0, errors: 0 };
  const dropped = { league: 0, noQuote: 0, noHistory: 0, noPriorXI: 0, noPlayers: 0, tooManyChanges: 0, noModel: 0 };

  const past = new Map();
  const lineups = new Map();
  const playerSeasons = new Map();
  const teamHistory = async (team) => {
    if (!past.has(team.id)) {
      const matches = await api("/fixtures", { team: team.id, last: 20, status: "FT" });
      past.set(team.id, matches.filter((match) => match.fixture?.id && match.teams?.home?.name && match.teams?.away?.name &&
        Number.isInteger(match.goals?.home) && Number.isInteger(match.goals?.away) &&
        Date.parse(match.fixture.date) < now.getTime() && now.getTime() - Date.parse(match.fixture.date) <= 365 * 24 * 60 * 60 * 1000)
        .sort((a, b) => Date.parse(b.fixture.date) - Date.parse(a.fixture.date)).map((match) => ({
        fixtureId: match.fixture.id, date: match.fixture.date.slice(0, 10),
        home: match.teams.home.name, away: match.teams.away.name,
        homeGoals: match.goals.home, awayGoals: match.goals.away,
      })));
    }
    return past.get(team.id);
  };
  const lineupFor = async (id) => {
    if (!lineups.has(id)) lineups.set(id, await api("/fixtures/lineups", { fixture: id }));
    return lineups.get(id);
  };
  const playerSeason = async (team, league) => {
    const cacheKey = `${team.id}/${league.id}/${league.season}`;
    if (!playerSeasons.has(cacheKey)) playerSeasons.set(cacheKey, await api("/players", { team: team.id, league: league.id, season: league.season }));
    return playerSeasons.get(cacheKey);
  };

  const candidates = [];
  // Every eligible fixture is remembered even when a data gate rejects it, so a
  // day where the gates drop everything still has real matches to show. These
  // are today's fixtures from the provider, not invented rows.
  const fixtures_ = [];
  for (const match of upcoming) {
    scan.evaluated++;
    // Keep the fixture even if its first enrichment request fails. Logos are
    // carried from the fixture response; form/odds are added only when fetched.
    const fixture = {
      home: match.teams.home.name, away: match.teams.away.name,
      homeLogo: teamLogo(match.teams.home), awayLogo: teamLogo(match.teams.away),
      homeForm: null, awayForm: null,
      competition: match.league.name, kickoff: match.fixture.date,
      odds: null, bookmaker: null,
      probability: null, mean: null, edge: null, note: null,
    };
    fixtures_.push(fixture);
    try {
      const current = await lineupFor(match.fixture.id);
      const confirmedHomeIds = starters(current.find((entry) => entry.team?.id === match.teams.home.id));
      const confirmedAwayIds = starters(current.find((entry) => entry.team?.id === match.teams.away.id));

      const listings = await api("/odds", { fixture: match.fixture.id });
      const quotes = listings.flatMap((listing) => (listing.bookmakers ?? []).flatMap((bookmaker) =>
        (bookmaker.bets ?? []).filter((bet) => bet.id === 5 || bet.name === "Goals Over/Under").map((bet) => ({
          bookmaker, odds: Number(bet.values?.find((value) => value.value === "Over 2.5")?.odd),
          oddsUpdatedAt: listing.update ?? bet.update,
        })))).filter(({ bookmaker, odds, oddsUpdatedAt }) =>
        Number.isInteger(bookmaker.id) && bookmaker.name && Number.isFinite(odds) && odds > 1.01 && odds <= 100 &&
        oddsUpdatedAt && Number.isFinite(Date.parse(oddsUpdatedAt)) && Date.parse(oddsUpdatedAt) <= now.getTime() &&
        now.getTime() - Date.parse(oddsUpdatedAt) <= ODDS_AGE_MS);
      const bestQuote = quotes.reduce((best, item) => (!best || item.odds > best.odds ? item : best), null);
      fixture.odds = bestQuote?.odds ?? null;
      fixture.bookmaker = bestQuote?.bookmaker.name ?? null;
      const reject = (reason) => {
        fixture.note = reason;
        return reason;
      };
      if (!quotes.length) {
        dropped.noQuote++;
        reject("אין מחיר Over 2.5 עדכני");
        // Enrich only the first few unpriced matches: these may be all that
        // reaches today's watchlist, without doubling calls for every fixture.
        if (fixtures_.length <= 5) {
          const [home, away] = await Promise.allSettled([
            teamHistory(match.teams.home), teamHistory(match.teams.away),
          ]);
          if (home.status === "fulfilled") fixture.homeForm = venueForm(home.value, fixture.home, "home");
          if (away.status === "fulfilled") fixture.awayForm = venueForm(away.value, fixture.away, "away");
        }
        continue;
      }
      scan.quotes += quotes.length;

      const [homeResults, awayResults] = await Promise.all([
        teamHistory(match.teams.home), teamHistory(match.teams.away),
      ]);
      fixture.homeForm = venueForm(homeResults, fixture.home, "home");
      fixture.awayForm = venueForm(awayResults, fixture.away, "away");
      if (homeResults.filter((row) => row.home === match.teams.home.name).length < 3 ||
          awayResults.filter((row) => row.away === match.teams.away.name).length < 3) {
        dropped.noHistory++;
        reject("אין מספיק היסטוריית שערים");
        continue;
      }
      // Use the most recent match that actually published a starting XI. A single
      // fixture with missing lineup data was enough to discard the whole day.
      const priorXI = async (rows, teamId) => {
        for (const row of rows.slice(0, 5)) {
          const entries = await lineupFor(row.fixtureId);
          const ids = starters(entries.find((entry) => entry.team?.id === teamId));
          if (new Set(ids).size === 11) return { ids, fixtureId: row.fixtureId };
        }
        return null;
      };
      const [priorHome, priorAway] = await Promise.all([
        priorXI(homeResults, match.teams.home.id), priorXI(awayResults, match.teams.away.id),
      ]);
      if (!priorHome || !priorAway) {
        dropped.noPriorXI++;
        reject("אין הרכב מאומת בהיסטוריה");
        continue;
      }
      const lastHomeIds = priorHome.ids;
      const lastAwayIds = priorAway.ids;
      const homeConfirmed = new Set(confirmedHomeIds).size === 11;
      const awayConfirmed = new Set(confirmedAwayIds).size === 11;
      const homeIds = homeConfirmed ? confirmedHomeIds : lastHomeIds;
      const awayIds = awayConfirmed ? confirmedAwayIds : lastAwayIds;
      const lineup = {
        homeStarters: 11, awayStarters: 11,
        homeKind: homeConfirmed ? "confirmed" : "projected",
        awayKind: awayConfirmed ? "confirmed" : "projected",
        homeChanges: homeConfirmed ? homeIds.filter((id) => !lastHomeIds.includes(id)).length : 0,
        awayChanges: awayConfirmed ? awayIds.filter((id) => !lastAwayIds.includes(id)).length : 0,
      };
      if (lineup.homeChanges > 4 || lineup.awayChanges > 4) {
        dropped.tooManyChanges++;
        reject("יותר מ־4 שינויים בהרכב המשוער");
        continue;
      }

      const [homeSeason, awaySeason] = await Promise.all([
        playerSeason(match.teams.home, match.league), playerSeason(match.teams.away, match.league),
      ]);
      const homePlayers = startingPlayerStats(homeSeason, homeIds, match.league.id, match.league.season);
      const awayPlayers = startingPlayerStats(awaySeason, awayIds, match.league.id, match.league.season);
      if (!homePlayers || !awayPlayers) {
        dropped.noPlayers++;
        reject("אין נתוני שחקנים מלאים");
        continue;
      }
      const players = { season: match.league.season, home: homePlayers, away: awayPlayers };

      const results = [...new Map([...homeResults, ...awayResults].map((row) => [row.fixtureId, row])).values()];
      const base = {
        mode: "demo", source: "חישוב ביניים", asOf: now.toISOString(), combinedOdds: quotes[0].odds,
        picks: [{ id: "01", home: match.teams.home.name, away: match.teams.away.name,
          homeCode: match.teams.home.code ?? "TEAM", awayCode: match.teams.away.code ?? "TEAM",
          homeFlag: "", awayFlag: "", odds: quotes[0].odds }],
        results: results.map(({ date, home, away, homeGoals, awayGoals }) => ({ date, home, away, homeGoals, awayGoals })),
      };
      const model = analyze(base).picks[0].model;
      if (!model) {
        dropped.noModel++;
        reject("אין מספיק נתונים למודל");
        continue;
      }
      // Fully evaluated: the watchlist row can now carry real model numbers.
      fixture.probability = model.probability;
      fixture.mean = model.mean;
      fixture.edge = model.probability * bestQuote.odds - 1;
      fixture.note = null;
      for (const { bookmaker, odds, oddsUpdatedAt } of quotes) {
        candidates.push({ fixtureId: match.fixture.id, home: match.teams.home, away: match.teams.away,
          kickoff: match.fixture.date, competition: match.league.name, bookmaker: { id: bookmaker.id, name: bookmaker.name },
          oddsUpdatedAt, odds, probability: model.probability, mean: model.mean,
          edge: model.probability * odds - 1, lineup, players, results,
          homeForm: fixture.homeForm, awayForm: fixture.awayForm });
      }
    } catch (error) {
      // One unreachable fixture, a rate-limited odds call or a lineup
      // that never arrived must not throw away the rest of the day. The
      // fixture keeps its place in the watchlist and the scan continues.
      scan.errors++;
      fixture.note ??= "נתוני הספק למשחק זה לא הושלמו";
      console.warn(`Skipped ${match.teams.home.name} v ${match.teams.away.name}: ${error.message}`);
    }
  }
  const input = selectValuePicks(candidates, now, 0.04, timeZone, { fallbackFixtures: fixtures_ });
  // Validate the exact payload that will be published, not just intermediate estimates.
  const report = analyze(input);
  if (report.picks.length > 0 && (!report.picks.every((pick) => pick.model && pick.model.edge > 0) || report.jointEdge < 0.04)) {
    throw new Error("Selected value failed final report validation");
  }
  input.scanNote = scanNote(scan, dropped, candidates.length, report.picks.length);
  return input;
}

/** One short line explaining what the scan actually covered. */
function scanNote(scan, dropped, legs, selected) {
  const note = buildScanNote(scan, dropped, legs, selected);
  // The report field is length-capped, and a diagnostic must never be the
  // reason an otherwise valid daily scan fails to publish.
  return note.length > 150 ? `${note.slice(0, 147)}…` : note;
}

function buildScanNote(scan, dropped, legs, selected) {
  if (scan.eligible === 0) return `סריקה: ${scan.seen} משחקים ביום, אף אחד לא היה פריץ מתאים`;
  if (selected > 0) return `סריקה: ${scan.eligible} פריצים · ${scan.evaluated} נבדקו · ${legs} שערים`;
  const reasons = [
    dropped.noQuote && `${dropped.noQuote} ללא מחיר עדכני`,
    dropped.noHistory && `${dropped.noHistory} ללא היסטוריית שערים`,
    dropped.noPriorXI && `${dropped.noPriorXI} ללא הרכב קודם`,
    dropped.noPlayers && `${dropped.noPlayers} ללא נתוני שחקנים`,
    dropped.tooManyChanges && `${dropped.tooManyChanges} עם יותר מ־4 שינויי הרכב`,
  ].filter(Boolean);
  const failed = scan.errors ? ` · ${scan.errors} נכשלו בשלב אחד` : "";
  const why = reasons.length ? ` · ${reasons.join(" · ")}` : legs ? ` · ${legs} שערים ללא יתרון` : "";
  return `סריקה: ${scan.eligible} פריצים · ${scan.evaluated} נבדקו${why}${failed}`;
}
