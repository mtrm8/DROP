import { test } from "node:test";
import { strict as assert } from "node:assert";
import { analyze, assertPublishable } from "./bunker-model.mjs";
import { createProvider, DEFAULT_LEAGUES, gatherLiveInput, matchPriority, selectValuePicks, todayInZone, unavailableInput } from "./fetch-live-bunker.mjs";

const now = new Date("2026-09-26T12:00:00Z");
const team = (id, name) => ({ id, name, code: name.slice(0, 3).toUpperCase(), logo: `https://media.api-sports.io/football/teams/${id}.png` });
const build = (item, kickoff) => ({
  fixture: { id: item.id, date: kickoff },
  league: { id: 39, name: "Test league", season: 2026 },
  teams: { home: item.home, away: item.away },
});
const fixtures = [
  build({ id: 100, home: team(1, "Alpha"), away: team(2, "Beta") }, "2026-09-26T13:00:00Z"),
  build({ id: 200, home: team(3, "Gamma"), away: team(4, "Delta") }, "2026-09-26T13:00:00Z"),
];
// Later kickoffs, so tests can assert the watchlist leads with what is soonest.
const laterFixtures = [
  build({ id: 300, home: team(5, "Epsilon"), away: team(6, "Zeta") }, "2026-09-26T18:00:00Z"),
  build({ id: 400, home: team(7, "Eta"), away: team(8, "Theta") }, "2026-09-26T20:00:00Z"),
  build({ id: 500, home: team(9, "Iota"), away: team(10, "Kappa") }, "2026-09-26T22:00:00Z"),
];
const marquee = {
  ...build({ id: 600, home: team(11, "Spain"), away: team(12, "England") }, "2026-09-26T19:00:00Z"),
  league: { id: 5, name: "UEFA Nations League", season: 2026, round: "League A - 2" },
};
const minor = {
  ...build({ id: 700, home: team(13, "Small FC"), away: team(14, "Other FC") }, "2026-09-26T12:45:00Z"),
  league: { id: 89, name: "Eerste Divisie", season: 2026 },
};
const history = new Map();
for (const match of [...fixtures, ...laterFixtures]) {
  for (let i = 1; i <= 3; i++) {
    const date = `2026-09-${String(20 + i).padStart(2, "0")}T12:00:00Z`;
    const id = match.fixture.id * 10 + i;
    const home = { fixture: { id, date }, teams: { home: match.teams.home, away: team(100 + i, `Guest ${i}`) }, goals: { home: 3, away: 1 } };
    const away = { fixture: { id: id + 100, date }, teams: { home: team(200 + i, `Host ${i}`), away: match.teams.away }, goals: { home: 2, away: 2 } };
    history.set(match.teams.home.id, [...(history.get(match.teams.home.id) ?? []), home]);
    history.set(match.teams.away.id, [...(history.get(match.teams.away.id) ?? []), away]);
  }
}
const lineup = (teamId) => ({ team: { id: teamId }, formation: "4-3-3", startXI: Array.from({ length: 11 }, (_, n) => ({ player: { id: teamId * 100 + n, name: `Starter ${teamId}-${n}` } })) });

function mockProvider({ missingLineups = false, otherBook = false, missingPlayers = false, staleOdds = false, tomorrow = false, manyFixtures = false, marqueeMatch = false, minorMatch = false } = {}) {
  const listed = [...fixtures, ...(manyFixtures ? laterFixtures : []), ...(marqueeMatch ? [marquee] : []), ...(minorMatch ? [minor] : [])];
  return async (url) => {
    const path = url.pathname;
    const fixtureId = Number(url.searchParams.get("fixture"));
    let response;
    if (path === "/fixtures" && url.searchParams.has("date")) response = tomorrow ? listed.map((item) => ({ ...item, fixture: { ...item.fixture, date: "2026-09-27T13:00:00Z" } })) : listed;
    else if (path === "/fixtures/headtohead") response = url.searchParams.get("h2h") === "1-2" ? [{
      fixture: { date: "2025-09-20T13:00:00Z", status: { short: "FT" } },
      teams: { home: team(2, "Beta"), away: team(1, "Alpha") }, goals: { home: 2, away: 1 },
    }] : [];
    else if (path === "/fixtures") response = history.get(Number(url.searchParams.get("team"))) ?? [];
    else if (path === "/fixtures/lineups") {
      const match = listed.find((item) => item.fixture.id === fixtureId);
      if (match) response = missingLineups ? [] : [lineup(match.teams.home.id), lineup(match.teams.away.id)];
      else {
        const pastMatch = [...history.values()].flat().find((item) => item.fixture.id === fixtureId);
        response = pastMatch ? [lineup(pastMatch.teams.home.id), lineup(pastMatch.teams.away.id)] : [];
      }
    } else if (path === "/odds") {
      response = [{ update: staleOdds ? "2026-09-25T11:00:00Z" : "2026-09-26T11:00:00Z", bookmakers: [{ id: otherBook ? fixtureId : 1, name: "Test book",
        bets: [{ id: 5, name: "Goals Over/Under", values: [{ value: "Over 2.5", odd: "2.10" }] }] }] }];
    } else if (path === "/players") {
      const teamId = Number(url.searchParams.get("team"));
      response = missingPlayers ? [] : Array.from({ length: 11 }, (_, n) => ({
        player: { id: teamId * 100 + n, name: `Player ${teamId}-${n}` },
        statistics: [{ league: { id: 39, season: 2026 }, games: { minutes: 900 },
          goals: { total: 3, assists: 2 }, shots: { total: 14, on: 6 }, passes: { key: 6 } }],
      }));
    } else throw new Error(`Unexpected request ${url}`);
    return { ok: true, json: async () => ({ response, paging: { total: 1 }, errors: [] }) };
  };
}

test("fetches fixtures, verified XIs, historical scores and one-book odds to select two positive-EV legs", async () => {
  const input = await gatherLiveInput({ key: "test-key", now, request: mockProvider() });
  const report = analyze(input);
  assert.equal(report.mode, "live");
  assert.equal(input.picks.length, 2);
  assert.equal(input.picks[0].bookmaker, input.picks[1].bookmaker);
  assert.equal(input.picks[0].lineup.homeChanges, 0);
  assert.equal(input.picks[0].lineup.homeKind, "confirmed");
  assert.equal(input.picks[0].players.home.length, 11);
  assert.equal(report.picks[0].fixture.players.home[0].shots, 14);
  assert.equal(report.picks[0].fixture.players.home[0].shotsOnTarget, 6);
  assert.ok(report.picks.every((pick) => pick.model.edge > 0.04));
  assert.ok(report.jointEdge > 0.04);
});

test("daily scan labels missing confirmed XIs as projections from the previous match", async () => {
  const input = await gatherLiveInput({ key: "test-key", now, request: mockProvider({ missingLineups: true }) });
  assert.equal(input.picks.length, 2);
  assert.equal(input.picks[0].lineup.homeKind, "projected");
  assert.equal(input.picks[0].lineup.awayKind, "projected");
  assert.equal(analyze(input).status, "ready");
});

test("publishes a fresh no-picks report rather than stale games when evidence is missing", async () => {
  for (const options of [{ otherBook: true }, { missingPlayers: true }, { staleOdds: true }, { tomorrow: true }]) {
    const input = await gatherLiveInput({ key: "test-key", now, request: mockProvider(options) });
    assert.equal(input.picks.length, 0);
    assert.equal(analyze(input).status, "no-picks");
    assert.equal(input.asOf, now.toISOString());
  }
});

test("live model rejects stale prices, departed fixtures, and unconfirmed starting elevens", async () => {
  const input = await gatherLiveInput({ key: "test-key", now, request: mockProvider() });
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], kickoff: "2026-09-26T11:00:00Z" }, input.picks[1]] }), /upcoming today/);
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], kickoff: "2026-09-27T13:00:00Z" }, input.picks[1]] }), /upcoming today/);
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], oddsUpdatedAt: "2026-09-25T10:00:00Z" }, input.picks[1]] }), /within 12 hours/);
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], lineup: { ...input.picks[0].lineup, awayStarters: 10 } }, input.picks[1]] }), /verified or explicitly projected/);
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], players: { ...input.picks[0].players, home: [] } }, input.picks[1]] }), /player statistics/);
});

test("selector never combines prices from different books or duplicates one fixture", () => {
  const candidate = (id, book) => ({ fixtureId: id, bookmaker: { id: book }, edge: 0.2, odds: 2.2, probability: 0.6, kickoff: now.toISOString() });
  assert.equal(selectValuePicks([candidate(1, 1), candidate(2, 2)], now).picks.length, 0);
  assert.equal(selectValuePicks([candidate(1, 1), candidate(1, 1)], now).picks.length, 0);
});

test("today respects the chosen timezone across the UTC date boundary", () => {
  assert.equal(todayInZone(new Date("2026-09-26T22:00:00Z"), "Asia/Jerusalem"), "2026-09-27");
  assert.equal(todayInZone(new Date("2026-09-26T22:00:00Z"), "UTC"), "2026-09-26");
});

test("major competitions lead the default pool, without Dutch second-division fixtures", () => {
  assert.ok(DEFAULT_LEAGUES.includes(5));
  assert.ok([39, 140, 78, 135, 61].every((id) => DEFAULT_LEAGUES.includes(id)));
  assert.ok(!DEFAULT_LEAGUES.includes(89));
  assert.ok(matchPriority(5, "League A - 2", "Spain", "England") > matchPriority(39, "Regular Season", "Arsenal", "Chelsea"));
});

const leg = (id, book, edge, extra = {}) => ({
  fixtureId: id, bookmaker: { id: book, name: `Book${book}` }, edge,
  // Keep the fixture self-consistent: the accumulator maths uses probability x
  // odds, so derive the probability from the edge the test wants to assert.
  odds: 1.9, probability: (1 + edge) / 1.9, mean: 2.7,
  kickoff: "2026-09-26T16:00:00Z", competition: "Premier League",
  home: { name: `Home ${id}` }, away: { name: `Away ${id}` },
  oddsUpdatedAt: "2026-09-26T12:00:00Z", lineup: null, players: null, results: [], ...extra,
});
const jointEdgeOf = (candidates) => candidates
  .reduce((value, item) => value * item.probability * item.odds, 1) - 1;

test("a qualifying accumulator no longer needs every leg at 4% on its own", () => {
  // Each leg is only 2.2% positive, which is how a real book looks, but the
  // pair compounds past the 4% bar. The old rule rejected both legs.
  const legs = [leg(1, 7, 0.022), leg(2, 7, 0.022)];
  const chosen = selectValuePicks(legs, now);
  assert.equal(chosen.picks.length, 2);
  assert.ok(legs.every((item) => item.edge < 0.04), "no single leg clears 4%");
  assert.ok(jointEdgeOf(legs) >= 0.04, `joint edge ${jointEdgeOf(legs)}`);
});

test("the selector searches wider combinations when no pair qualifies", () => {
  // Every pair sits under the bar, so only a three-leg search can find value.
  const legs = [leg(1, 7, 0.0135), leg(2, 7, 0.0135), leg(3, 7, 0.0135)];
  assert.ok(jointEdgeOf(legs.slice(0, 2)) < 0.04, "no pair qualifies");
  assert.ok(jointEdgeOf(legs) >= 0.04, "the triple qualifies");
  assert.equal(selectValuePicks(legs, now).picks.length, 3);
});

test("legs are never mixed across bookmakers", () => {
  const chosen = selectValuePicks([leg(1, 7, 0.2), leg(2, 9, 0.2), leg(3, 9, 0.2)], now);
  assert.deepEqual([...new Set(chosen.picks.map((pick) => pick.bookmaker))], ["Book9"]);
});

test("qualified marquee legs beat lower-tier legs without bypassing the value gate", () => {
  const legs = [
    leg(1, 7, 0.03, { leagueId: 5 }), leg(2, 7, 0.03, { leagueId: 5 }),
    leg(3, 7, 0.12, { leagueId: 89 }), leg(4, 7, 0.12, { leagueId: 89 }),
  ];
  assert.deepEqual(selectValuePicks(legs, now).picks.map((pick) => pick.home), ["Home 1", "Home 2"]);
  assert.equal(selectValuePicks([leg(1, 7, -0.02, { leagueId: 5 }), leg(2, 7, -0.02, { leagueId: 5 })], now).picks.length, 0);
});

test("a losing day publishes an honest watchlist instead of a bare empty report", () => {
  const report = analyze(selectValuePicks([leg(1, 7, -0.03), leg(2, 7, -0.05), leg(3, 7, -0.08)], now));
  assert.equal(report.status, "no-picks");
  assert.equal(report.picks.length, 0);
  assert.equal(report.watchlist.length, 3);
  // Edges keep their real sign. A near-miss must never read as a recommendation.
  assert.ok(report.watchlist.every((item) => item.edge < 0));
  assert.ok(report.watchlist.every((item) => item.fairOdds > 0 && Number.isFinite(item.mean)));
  // Ordered by how close each match came to qualifying.
  assert.ok(report.watchlist[0].edge >= report.watchlist[2].edge);
  assert.deepEqual(report.watchlist.map((item) => item.away), ["Away 1", "Away 2", "Away 3"]);
});

test("a report with picks can spotlight other headline matches without repeating selected fixtures", () => {
  const chosen = selectValuePicks([leg(1, 7, 0.2, { leagueId: 5 }), leg(2, 7, 0.2, { leagueId: 5 }), leg(3, 7, -0.2, { leagueId: 5 })], now);
  assert.equal(chosen.picks.length, 2);
  assert.deepEqual(chosen.watchlist.map((item) => item.home), ["Home 3"]);
});

test("the scan reports what it covered so an empty day is explainable", async () => {
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: mockProvider() }));
  assert.match(report.scanNote, /סריקה: \d+ פריצים/);
});

test("when every data gate drops the day, the top upcoming fixtures still publish", async () => {
  // staleOdds strips every price, so nothing can be modelled or selected. The
  // report must still list today's matches instead of rendering nothing.
  const input = await gatherLiveInput({ key: "test-key", now, request: mockProvider({ staleOdds: true, manyFixtures: true }) });
  const report = analyze(input);
  assert.equal(report.picks.length, 0);
  assert.equal(report.status, "no-picks");
  assert.ok(report.watchlist.length >= 3, `watchlist had ${report.watchlist.length}`);
  // Nothing was modelled, so nothing may claim a probability or an edge.
  assert.ok(report.watchlist.every((item) => item.probability === null && item.edge === null));
  assert.ok(report.watchlist.every((item) => item.home && item.away && item.kickoff && item.competition));
  // The rule is "top upcoming", so the soonest kickoffs lead.
  const kickoffs = report.watchlist.map((item) => item.kickoff);
  assert.deepEqual(kickoffs, [...kickoffs].sort());
  assert.equal(kickoffs[0], "2026-09-26T13:00:00Z");
  assert.equal(report.watchlist[0].homeLogo, "https://media.api-sports.io/football/teams/1.png");
  assert.equal(report.watchlist[0].awayLogo, "https://media.api-sports.io/football/teams/2.png");
  assert.deepEqual(report.watchlist[0].homeForm, { games: 3, overTwo: 3, goalsFor: 9, goalsAgainst: 3, recentTotals: [4, 4, 4] });
  assert.deepEqual(report.watchlist[0].awayForm, { games: 3, overTwo: 3, goalsFor: 6, goalsAgainst: 6, recentTotals: [4, 4, 4] });
});

test("the watchlist falls back to fixtures that only reached the price stage", async () => {
  // missingPlayers keeps live prices but drops the fixture before the model, so
  // the row must keep its real price and explain itself instead of inventing numbers.
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: mockProvider({ missingPlayers: true, manyFixtures: true }) }));
  assert.ok(report.watchlist.length >= 3);
  const dropped = report.watchlist.filter((item) => item.probability === null);
  assert.ok(dropped.length > 0, "expected at least one unmodelled fixture");
  assert.ok(dropped.every((item) => item.note && item.note.length > 0), "each unmodelled row explains itself");
  // A price is real data and survives even with no model behind it.
  assert.ok(dropped.every((item) => item.odds === null || item.odds > 1.01));
  assert.ok(dropped.every((item) => item.homeForm?.games === 3 && item.awayForm?.games === 3));
});

test("modelled near-misses retain official crests and real home/away samples", async () => {
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: mockProvider({ otherBook: true }) }));
  assert.equal(report.watchlist.length, 2);
  assert.equal(report.watchlist[0].homeLogo, "https://media.api-sports.io/football/teams/1.png");
  assert.deepEqual(report.watchlist[0].homeForm, { games: 3, overTwo: 3, goalsFor: 9, goalsAgainst: 3, recentTotals: [4, 4, 4] });
  assert.ok(report.watchlist[0].probability > 0);
  assert.deepEqual(report.watchlist[0].headToHead, [{ date: "2025-09-20", homeGoals: 1, awayGoals: 2 }]);
  assert.equal(report.watchlist[0].lineup.home.status, "confirmed");
  assert.equal(report.watchlist[0].lineup.home.starters, 11);
  assert.equal(report.watchlist[0].lineup.home.formation, "4-3-3");
  assert.deepEqual(report.watchlist[0].lineup.home.keyPlayers, ["Starter 1-0", "Starter 1-1", "Starter 1-2"]);
});

test("Spain vs England Nations League leads even when top-league matches have more evidence", async () => {
  const base = mockProvider({ otherBook: true, marqueeMatch: true, minorMatch: true });
  const input = await gatherLiveInput({ key: "test-key", now, leagues: [89], request: async (url) => {
    if (url.pathname === "/odds" && url.searchParams.get("fixture") === "600") {
      return { ok: true, json: async () => ({ response: [], paging: { total: 1 }, errors: [] }) };
    }
    return base(url);
  } });
  const report = analyze(input);
  assert.equal(report.status, "no-picks");
  assert.equal(report.watchlist[0].home, "Spain");
  assert.equal(report.watchlist[0].away, "England");
  assert.equal(report.watchlist[0].priorityLabel, "UEFA Nations League");
  assert.equal(report.watchlist[0].probability, null);
  assert.ok(report.watchlist.some((item) => item.probability !== null));
  assert.ok(report.watchlist.every((item) => item.competition !== "Eerste Divisie"));
});

test("a marquee match remains visible when other matches qualify as picks", async () => {
  const base = mockProvider({ marqueeMatch: true });
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: async (url) => {
    if (url.pathname === "/odds" && url.searchParams.get("fixture") === "600") {
      return { ok: true, json: async () => ({ response: [], paging: { total: 1 }, errors: [] }) };
    }
    return base(url);
  } }));
  assert.equal(report.status, "ready");
  assert.equal(report.picks.length, 2);
  assert.deepEqual(report.watchlist.map((item) => item.home), ["Spain"]);
});

test("default scan omits the Eerste Divisie even when it starts earlier", async () => {
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: mockProvider({ staleOdds: true, marqueeMatch: true, minorMatch: true }) }));
  assert.equal(report.watchlist[0].home, "Spain");
  assert.ok(report.watchlist.every((item) => item.competition !== "Eerste Divisie"));
});

test("configured secondary leagues fill genuinely empty headline days", async () => {
  const base = mockProvider({ minorMatch: true });
  const report = analyze(await gatherLiveInput({ key: "test-key", now, leagues: [89], request: async (url) => {
    const response = await base(url);
    if (url.pathname !== "/fixtures" || !url.searchParams.has("date")) return response;
    const body = await response.json();
    return { ok: true, json: async () => ({ ...body, response: body.response.filter((match) => match.league.id === 89) }) };
  } }));
  assert.equal(report.watchlist[0].competition, "Eerste Divisie");
});

test("only the provider's own team crests are published", async () => {
  const base = mockProvider({ staleOdds: true });
  const input = await gatherLiveInput({ key: "test-key", now, request: async (url) => {
    const response = await base(url);
    if (url.pathname !== "/fixtures" || !url.searchParams.has("date")) return response;
    const body = await response.json();
    const responseRows = [...body.response];
    responseRows[0] = { ...responseRows[0], teams: {
      ...responseRows[0].teams,
      home: { ...responseRows[0].teams.home, logo: "https://example.com/track.png" },
    } };
    return { ok: true, json: async () => ({ ...body, response: responseRows }) };
  } });
  const report = analyze(input);
  assert.equal(report.watchlist[0].homeLogo, null);
  assert.equal(report.watchlist[0].awayLogo, "https://media.api-sports.io/football/teams/2.png");
  assert.throws(() => analyze({ ...input, watchlist: [{ ...input.watchlist[0], homeLogo: "https://example.com/track.png" }] }), /provider team image URL/);
});

test("a fixture whose first enrichment request fails still has its crests and a reason", async () => {
  const base = mockProvider();
  const input = await gatherLiveInput({ key: "test-key", now, request: async (url) => {
    if (url.pathname === "/fixtures/lineups" && url.searchParams.get("fixture") === "100") {
      return { ok: false, status: 403 };
    }
    return base(url);
  } });
  const report = analyze(input);
  const first = report.watchlist.find((item) => item.home === "Alpha");
  assert.ok(first);
  assert.equal(first.homeLogo, "https://media.api-sports.io/football/teams/1.png");
  assert.equal(first.probability, null);
  assert.match(first.note, /נתוני הספק/);
});

test("the watchlist never repeats a match and is capped", async () => {
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: mockProvider({ missingPlayers: true, manyFixtures: true }) }));
  const keys = report.watchlist.map((item) => `${item.home}|${item.away}`);
  assert.equal(new Set(keys).size, keys.length, "no duplicate matches");
  assert.ok(report.watchlist.length <= 5);
});

test("one failing fixture does not discard the rest of the day's scan", async () => {
  // The odds call throws for a single fixture, as a rate limit or timeout would.
  const base = mockProvider();
  let seen = 0;
  const flaky = async (url) => {
    if (url.pathname === "/odds") {
      seen++;
      if (seen === 1) throw new Error("socket hang up");
    }
    return base(url);
  };
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: flaky }));
  // The surviving fixture must still be reported, not lost with the failed one.
  assert.ok(report.picks.length > 0, "a single failure should not void the day");
  assert.match(report.scanNote, /סריקה: \d+ פריצים/);
});

test("a rate-limited provider is retried instead of failing the day", async () => {
  let attempts = 0;
  const base = mockProvider();
  const throttled = async (url) => {
    if (url.pathname === "/fixtures" && url.searchParams.has("date")) {
      attempts++;
      if (attempts === 1) return { ok: false, status: 429, json: async () => ({}) };
    }
    return base(url);
  };
  const api = createProvider("test-key", throttled, { retries: [0] });
  const fixtures = await api("/fixtures", { date: "2026-09-26" });
  assert.equal(attempts, 2, "the call was retried once");
  assert.ok(Array.isArray(fixtures));
});

test("a permanent failure is retried only a bounded number of times", async () => {
  let attempts = 0;
  const broken = async () => {
    attempts++;
    return { ok: false, status: 500, json: async () => ({}) };
  };
  const api = createProvider("test-key", broken, { retries: [0, 0] });
  await assert.rejects(() => api("/fixtures", { date: "2026-09-26" }), /HTTP 500/);
  assert.equal(attempts, 3, "one attempt plus two retries, then it gives up");
});

test("an unavailable report names the reason instead of a bare waiting notice", () => {
  const report = analyze(unavailableInput(now, "Asia/Jerusalem", "Football provider /fixtures: HTTP 401"));
  assert.equal(report.status, "unavailable");
  assert.match(report.statusMessage, /HTTP 401/);
  assert.match(report.statusMessage, /הבנקר יתעדכן שוב/);
});

test("the daily build publishes a long scan of the current day and refuses older ones", async () => {
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: mockProvider() }));
  // A sequential scan of every fixture easily outlives the fifteen-minute window
  // the old gate imposed, which used to abort the run and freeze the site on the
  // previous day's report.
  assert.equal(assertPublishable(report, new Date("2026-09-26T12:50:00Z")), report);
  assert.throws(() => assertPublishable(report, new Date("2026-09-27T09:00:00Z")), /current day/);
  assert.throws(() => assertPublishable({ ...report, mode: "demo" }, now), /live input/);
  assert.throws(() => assertPublishable({ ...report, asOf: "2026-09-26T20:00:00Z" }, now), /future/);
  assert.throws(() => assertPublishable({ ...report, picks: [{ ...report.picks[0], fixture: { ...report.picks[0].fixture, kickoff: "2026-09-26T11:00:00Z" } }, report.picks[1]] }, now), /kicked off/);
});

test("a failed scan still publishes today's dated status instead of stale picks", () => {
  const report = analyze(unavailableInput(now));
  assert.equal(report.status, "unavailable");
  assert.equal(report.picks.length, 0);
  assert.equal(report.timeZone, "Asia/Jerusalem");
  // Dated today it publishes, so the page names an outage for the current day...
  assert.equal(assertPublishable(report, now), report);
  // ...but it can never masquerade as a later day's completed scan.
  assert.throws(() => assertPublishable(report, new Date("2026-09-27T09:00:00Z")), /current day/);
});
