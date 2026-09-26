import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { analyze, goalBuckets, overTwo } from "./bunker-model.mjs";

const input = JSON.parse(await readFile(new URL("../data/bunker-input.json", import.meta.url), "utf8"));

test("Poisson buckets partition all goal counts and over 2.5 matches their sum", () => {
  for (const mean of [0, 1.2, 2.5, 5, 10]) {
    const buckets = goalBuckets(mean);
    assert.ok(Math.abs(buckets.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    assert.ok(Math.abs(buckets.slice(3).reduce((a, b) => a + b, 0) - overTwo(mean)) < 1e-12);
  }
});

test("quoted accumulator price governs payout, threshold and expected value", () => {
  const report = analyze(input);
  assert.ok(Math.abs(report.productOdds - 2.3244) < 1e-12);
  assert.equal(report.combinedOdds, 2.32);
  assert.ok(Math.abs(report.breakEven - 1 / 2.32) < 1e-12);
  assert.ok(Math.abs(report.jointProbability - report.picks.reduce((p, pick) => p * pick.model.probability, 1)) < 1e-12);
  assert.ok(Math.abs(report.jointEdge - (report.jointProbability * 2.32 - 1)) < 1e-12);
});

test("no forecast is invented for insufficient data", () => {
  const report = analyze({ ...input, results: [] });
  assert.equal(report.jointProbability, null);
  assert.ok(report.picks.every((pick) => pick.model === null));
});

test("an unavailable live feed never masquerades as a completed scan", async () => {
  const awaiting = JSON.parse(await readFile(new URL("../data/bunker-awaiting.json", import.meta.url), "utf8"));
  assert.equal(analyze(awaiting).status, "unavailable");
  assert.throws(() => analyze({ ...awaiting, picks: input.picks }), /unavailable status/);
});

test("malformed results and mismatched accumulator prices fail before publication", () => {
  assert.throws(() => analyze({ ...input, results: [{ date: "2026-09-01", home: "א", away: "ב", homeGoals: -1, awayGoals: 0 }] }), /homeGoals/);
  assert.throws(() => analyze({ ...input, results: [{ ...input.results[0], date: "2027-01-01" }] }), /date/);
  assert.throws(() => analyze({ ...input, combinedOdds: 3 }), /combinedOdds differs/);
});
