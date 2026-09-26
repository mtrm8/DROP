import { test } from "node:test";
import { strict as assert } from "node:assert";
import { analyze, assertPublishable } from "./bunker-model.mjs";
import { gatherLiveInput, selectValuePicks, todayInZone, unavailableInput } from "./fetch-live-bunker.mjs";

const now = new Date("2026-09-26T12:00:00Z");
const team = (id, name) => ({ id, name, code: name.slice(0, 3).toUpperCase() });
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
const lineup = (teamId) => ({ team: { id: teamId }, startXI: Array.from({ length: 11 }, (_, n) => ({ player: { id: teamId * 100 + n } })) });

function mockProvider({ missingLineups = false, otherBook = false, missingPlayers = false, staleOdds = false, tomorrow = false, manyFixtures = false } = {}) {
  const listed = manyFixtures ? [...fixtures, ...laterFixtures] : fixtures;
  return async (url) => {
    const path = url.pathname;
    const fixtureId = Number(url.searchParams.get("fixture"));
    let response;
    if (path === "/fixtures" && url.searchParams.has("date")) response = tomorrow ? listed.map((item) => ({ ...item, fixture: { ...item.fixture, date: "2026-09-27T13:00:00Z" } })) : listed;
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

test("a report with picks never carries a watchlist", () => {
  const chosen = selectValuePicks([leg(1, 7, 0.2), leg(2, 7, 0.2), leg(3, 7, -0.2)], now);
  assert.equal(chosen.picks.length, 2);
  assert.equal(chosen.watchlist, undefined);
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
});

test("the watchlist never repeats a match and is capped", async () => {
  const report = analyze(await gatherLiveInput({ key: "test-key", now, request: mockProvider({ missingPlayers: true, manyFixtures: true }) }));
  const keys = report.watchlist.map((item) => `${item.home}|${item.away}`);
  assert.equal(new Set(keys).size, keys.length, "no duplicate matches");
  assert.ok(report.watchlist.length <= 5);
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
