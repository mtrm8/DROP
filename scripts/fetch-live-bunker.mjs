import { analyze } from "./bunker-model.mjs";

const BASE = "https://v3.football.api-sports.io";
const flags = { Austria: "austria", Israel: "israel", Netherlands: "netherlands", Germany: "germany" };
const starters = (lineup) => (lineup?.startXI ?? []).map((player) => player?.player?.id).filter(Number.isInteger);
const ODDS_AGE_MS = 12 * 60 * 60 * 1000;

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

export function createProvider(key, request = fetch) {
  if (!key) throw new Error("API_FOOTBALL_KEY is required for live data");
  return async function api(path, params) {
    const url = new URL(path, BASE);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
    const response = await request(url, {
      headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(15000), cache: "no-store",
    });
    if (!response.ok) throw new Error(`Football provider ${path}: HTTP ${response.status}`);
    const body = await response.json();
    if (body.errors && Object.keys(body.errors).length) throw new Error(`Football provider ${path}: ${JSON.stringify(body.errors)}`);
    if (!Array.isArray(body.response)) throw new Error(`Football provider ${path}: invalid response`);
    // Fixture-scoped endpoints usually have one page, but odds can be paginated.
    const pages = Number(body.paging?.total ?? 1);
    if (pages > 10) throw new Error(`Football provider ${path}: too many result pages`);
    const items = [...body.response];
    for (let page = 2; page <= pages; page++) {
      const next = await request(new URL(`${url}&page=${page}`), {
        headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(15000), cache: "no-store",
      });
      if (!next.ok) throw new Error(`Football provider ${path}: page ${page} HTTP ${next.status}`);
      const more = await next.json();
      if (more.errors && Object.keys(more.errors).length) throw new Error(`Football provider ${path}: ${JSON.stringify(more.errors)}`);
      if (!Array.isArray(more.response)) throw new Error(`Football provider ${path}: invalid page ${page}`);
      items.push(...more.response);
    }
    return items;
  };
}

export function selectValuePicks(candidates, asOf, minEdge = 0.04, timeZone = "Asia/Jerusalem") {
  // Accumulator legs must be offered by one bookmaker; combining prices from
  // different books would advertise a payout that cannot be placed.
  const byBook = new Map();
  for (const candidate of candidates) {
    if (candidate.edge < minEdge) continue;
    const group = byBook.get(candidate.bookmaker.id) ?? new Map();
    const previous = group.get(candidate.fixtureId);
    if (!previous || candidate.edge > previous.edge) group.set(candidate.fixtureId, candidate);
    byBook.set(candidate.bookmaker.id, group);
  }
  let best = null;
  for (const group of byBook.values()) {
    const top = [...group.values()].sort((a, b) => b.edge - a.edge || (b.mean ?? 0) - (a.mean ?? 0) || a.kickoff.localeCompare(b.kickoff)).slice(0, 2);
    if (top.length < 2 || new Set(top.map((item) => item.fixtureId)).size < 2) continue;
    const product = top.reduce((value, item) => value * item.odds, 1);
    const quoted = Number(product.toFixed(2));
    const probability = top.reduce((value, item) => value * item.probability, 1);
    const edge = probability * quoted - 1;
    if (edge < minEdge || (best && edge <= best.edge)) continue;
    best = { top, edge, quoted };
  }
  if (!best) return {
    mode: "live", source: "API-Football · סריקה יומית ללא שתי בחירות בעלות יתרון מבוסס",
    asOf: asOf.toISOString(), timeZone, combinedOdds: 1.01, picks: [], results: [],
  };
  const { top, quoted } = best;
  return {
    mode: "live",
    source: `API-Football · ${top[0].bookmaker.name} · תוצאות, הרכבים ונתוני שחקנים`,
    asOf: asOf.toISOString(),
    timeZone,
    combinedOdds: quoted,
    picks: top.map((item, index) => ({
      id: String(index + 1).padStart(2, "0"),
      home: item.home.name, away: item.away.name,
      homeCode: item.home.code || item.home.name.slice(0, 3).toUpperCase(),
      awayCode: item.away.code || item.away.name.slice(0, 3).toUpperCase(),
      homeFlag: flags[item.home.name] || "", awayFlag: flags[item.away.name] || "",
      odds: item.odds, kickoff: item.kickoff, competition: item.competition,
      bookmaker: item.bookmaker.name, oddsUpdatedAt: item.oddsUpdatedAt,
      lineup: item.lineup, players: item.players,
    })),
    results: [...new Map(top.flatMap((item) => item.results).map((row) => [row.fixtureId, row])).values()]
      .map(({ date, home, away, homeGoals, awayGoals }) => ({ date, home, away, homeGoals, awayGoals })),
  };
}

/**
 * The dated status published when a scheduled scan cannot reach the provider.
 * It carries the current day so the page reports an outage for today instead of
 * leaving yesterday's finished matches on screen, and it is a valid live
 * report, so the daily build can still publish it.
 */
export function unavailableInput(now = new Date(), timeZone = "Asia/Jerusalem") {
  return {
    mode: "live",
    status: "unavailable",
    statusMessage: "לא ניתן להשלים את עדכון הנתונים היום. הבנקר יתעדכן שוב בסריקה היומית הבאה.",
    source: "עדכון נתוני הספק לא הושלם",
    asOf: now.toISOString(),
    timeZone,
    combinedOdds: 1.01,
    picks: [],
    results: [],
  };
}

export async function gatherLiveInput({ key, leagues = [39, 61, 78, 135, 140], timeZone = "Asia/Jerusalem", now = new Date(), request = fetch }) {
  const api = createProvider(key, request);
  const today = todayInZone(now, timeZone);
  const fixtures = await api("/fixtures", { date: today, status: "NS", timezone: timeZone });
  const upcoming = fixtures.filter((match) =>
    leagues.includes(match.league?.id) && match.fixture?.id &&
    Date.parse(match.fixture.date) >= now.getTime() + 15 * 60 * 1000 &&
    todayInZone(new Date(match.fixture.date), timeZone) === today && match.teams?.home?.id && match.teams?.away?.id)
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date));

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
  for (const match of upcoming) {
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
      now.getTime() - Date.parse(oddsUpdatedAt) <= ODDS_AGE_MS &&
      todayInZone(new Date(oddsUpdatedAt), timeZone) === today);
    if (!quotes.length) continue;

    const [homeResults, awayResults] = await Promise.all([
      teamHistory(match.teams.home), teamHistory(match.teams.away),
    ]);
    if (homeResults.filter((row) => row.home === match.teams.home.name).length < 3 ||
        awayResults.filter((row) => row.away === match.teams.away.name).length < 3) continue;
    const previousHome = homeResults[0]?.fixtureId;
    const previousAway = awayResults[0]?.fixtureId;
    if (!previousHome || !previousAway) continue;
    const [oldHome, oldAway] = await Promise.all([lineupFor(previousHome), lineupFor(previousAway)]);
    const lastHomeIds = starters(oldHome.find((entry) => entry.team?.id === match.teams.home.id));
    const lastAwayIds = starters(oldAway.find((entry) => entry.team?.id === match.teams.away.id));
    if (new Set(lastHomeIds).size !== 11 || new Set(lastAwayIds).size !== 11) continue;
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
    if (lineup.homeChanges > 4 || lineup.awayChanges > 4) continue;

    const [homeSeason, awaySeason] = await Promise.all([
      playerSeason(match.teams.home, match.league), playerSeason(match.teams.away, match.league),
    ]);
    const homePlayers = startingPlayerStats(homeSeason, homeIds, match.league.id, match.league.season);
    const awayPlayers = startingPlayerStats(awaySeason, awayIds, match.league.id, match.league.season);
    if (!homePlayers || !awayPlayers) continue;
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
    if (!model) continue;
    for (const { bookmaker, odds, oddsUpdatedAt } of quotes) {
      candidates.push({ fixtureId: match.fixture.id, home: match.teams.home, away: match.teams.away,
        kickoff: match.fixture.date, competition: match.league.name, bookmaker: { id: bookmaker.id, name: bookmaker.name },
        oddsUpdatedAt, odds, probability: model.probability, mean: model.mean,
        edge: model.probability * odds - 1, lineup, players, results });
    }
  }
  const input = selectValuePicks(candidates, now, 0.04, timeZone);
  // Validate the exact payload that will be published, not just intermediate estimates.
  const report = analyze(input);
  if (report.picks.length > 0 && (!report.picks.every((pick) => pick.model && pick.model.edge >= 0.04) || report.jointEdge < 0.04)) {
    throw new Error("Selected value failed final report validation");
  }
  return input;
}
