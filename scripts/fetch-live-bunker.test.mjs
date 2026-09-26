import { test } from "node:test";
import { strict as assert } from "node:assert";
import { analyze } from "./bunker-model.mjs";
import { gatherLiveInput, selectValuePicks, todayInZone } from "./fetch-live-bunker.mjs";

const now = new Date("2026-09-26T12:00:00Z");
const team = (id, name) => ({ id, name, code: name.slice(0, 3).toUpperCase() });
const fixtures = [
  { id: 100, home: team(1, "Alpha"), away: team(2, "Beta") },
  { id: 200, home: team(3, "Gamma"), away: team(4, "Delta") },
].map((item) => ({ fixture: { id: item.id, date: "2026-09-26T13:00:00Z" }, league: { id: 39, name: "Test league", season: 2026 }, teams: { home: item.home, away: item.away } }));
const history = new Map();
for (const match of fixtures) {
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

function mockProvider({ missingLineups = false, otherBook = false, missingPlayers = false, staleOdds = false, tomorrow = false } = {}) {
  return async (url) => {
    const path = url.pathname;
    const fixtureId = Number(url.searchParams.get("fixture"));
    let response;
    if (path === "/fixtures" && url.searchParams.has("date")) response = tomorrow ? fixtures.map((item) => ({ ...item, fixture: { ...item.fixture, date: "2026-09-27T13:00:00Z" } })) : fixtures;
    else if (path === "/fixtures") response = history.get(Number(url.searchParams.get("team"))) ?? [];
    else if (path === "/fixtures/lineups") {
      const match = fixtures.find((item) => item.fixture.id === fixtureId);
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
  assert.equal(input.picks[0].players.home.length, 11);
  assert.equal(report.picks[0].fixture.players.home[0].shots, 14);
  assert.equal(report.picks[0].fixture.players.home[0].shotsOnTarget, 6);
  assert.ok(report.picks.every((pick) => pick.model.edge > 0.04));
  assert.ok(report.jointEdge > 0.04);
});

test("publishes a fresh no-picks report rather than stale games when evidence is missing", async () => {
  for (const options of [{ missingLineups: true }, { otherBook: true }, { missingPlayers: true }, { staleOdds: true }, { tomorrow: true }]) {
    const input = await gatherLiveInput({ key: "test-key", now, request: mockProvider(options) });
    assert.equal(input.picks.length, 0);
    assert.equal(analyze(input).status, "no-picks");
    assert.equal(input.asOf, now.toISOString());
  }
});

test("live model rejects stale prices, departed fixtures, and unconfirmed starting elevens", async () => {
  const input = await gatherLiveInput({ key: "test-key", now, request: mockProvider() });
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], kickoff: "2026-09-26T11:00:00Z" }, input.picks[1]] }), /upcoming/);
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], oddsUpdatedAt: "2026-09-25T10:00:00Z" }, input.picks[1]] }), /odds must be recent/);
  assert.throws(() => analyze({ ...input, picks: [{ ...input.picks[0], lineup: { ...input.picks[0].lineup, awayStarters: 10 } }, input.picks[1]] }), /confirmed, stable/);
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
