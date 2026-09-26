import { test } from "node:test";
import { strict as assert } from "node:assert";
import { analyzeAnalystInput } from "./analyst-model.mjs";

const pick = {
  id: "example-01", home: "Home", away: "Away", competition: "Example competition",
  kickoff: "2026-09-26T19:00:00Z", market: "Over 2.5", bookmaker: "Example bookmaker",
  odds: 2.1, analystProbability: 0.52, source: "Manually reviewed score sheet",
  summary: "An analyst's manually entered rationale.",
  factors: ["Three or more goals in the reviewed sample."], risks: ["Lineups may change."],
  stats: {
    home: { matches: 5, goalsFor: 9, goalsAgainst: 4, overTwo: 3 },
    away: { matches: 5, goalsFor: 7, goalsAgainst: 6, overTwo: 2 },
    headToHead: [{ date: "2026-05-20", homeGoals: 2, awayGoals: 1 }],
  },
};

test("an empty manual report never invents analyst picks", () => {
  assert.deepEqual(analyzeAnalystInput({ analyst: "Human analyst", asOf: null, picks: [] }),
    { analyst: "Human analyst", asOf: null, picks: [] });
  assert.throws(() => analyzeAnalystInput({ analyst: "Human analyst", asOf: null, picks: [pick] }), /asOf is required/);
});

test("manual stats and reasoning produce presentation-only price metrics", () => {
  const report = analyzeAnalystInput({ analyst: "Human analyst", asOf: "2026-09-26T12:00:00Z", picks: [pick] });
  assert.equal(report.picks[0].breakEven, 1 / pick.odds);
  assert.equal(report.picks[0].analystProbability, 0.52);
  assert.deepEqual(report.picks[0].stats.headToHead, pick.stats.headToHead);
});

test("manual picks require real input, future fixtures and attributed evidence", () => {
  const base = { analyst: "Human analyst", asOf: "2026-09-26T12:00:00Z", picks: [pick] };
  assert.throws(() => analyzeAnalystInput({ ...base, picks: [{ ...pick, kickoff: "2026-09-26T10:00:00Z" }] }), /kickoff must follow/);
  assert.throws(() => analyzeAnalystInput({ ...base, picks: [{ ...pick, source: "" }] }), /source must be nonempty/);
  assert.throws(() => analyzeAnalystInput({ ...base, picks: [{ ...pick, stats: { ...pick.stats, home: { ...pick.stats.home, overTwo: 6 } } }] }), /overTwo must be between/);
  assert.throws(() => analyzeAnalystInput({ ...base, picks: [pick, pick] }), /duplicate pick id/);
});
