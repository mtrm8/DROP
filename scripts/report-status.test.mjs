import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// The site compiles this TypeScript helper through Next. Transpile the same
// source for Node's test runner; its reportData import is type-only.
const source = await readFile(new URL("../components/bunker/reportStatus.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { nextScheduledRun, supersedes, evaluateReport, statusHeadline } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("the published six-hour workflow's next run is shown accurately", () => {
  assert.equal(nextScheduledRun(new Date("2026-09-26T12:15:00Z")).toISOString(), "2026-09-26T18:00:00.000Z");
  assert.equal(nextScheduledRun(new Date("2026-09-26T17:59:00Z")).toISOString(), "2026-09-26T18:00:00.000Z");
  assert.equal(nextScheduledRun(new Date("2026-09-26T18:00:00Z")).toISOString(), "2026-09-27T00:00:00.000Z");
});

test("an open tab keeps a same-day upcoming watchlist through a failed retry", () => {
  const kickoff = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const current = { mode: "live", status: "no-picks", timeZone: "Asia/Jerusalem", asOf: "2026-09-26T12:00:00Z",
    picks: [], watchlist: [{ kickoff }] };
  const failed = { ...current, status: "unavailable", asOf: "2026-09-26T12:05:00Z", watchlist: [] };
  assert.equal(supersedes(current, failed), false);
  assert.equal(supersedes(current, { ...failed, asOf: "2026-09-27T12:05:00Z" }), true);
  assert.equal(supersedes({ ...current, watchlist: [{ kickoff: "2026-09-26T11:00:00Z" }] }, failed), true);
  assert.equal(supersedes(failed, { ...current, asOf: failed.asOf }), true);
});

test("the unavailable headline is fixed clean copy, never the raw provider payload", () => {
  const raw = 'טרם התקבל דוח מאומת להיום - ספק הנתונים מושה או לא זמין (Football provider /fixtures: {"access":"Your account is suspended, check on https://dashboard.api-sports.io/"}';
  const report = { mode: "live", status: "unavailable", statusMessage: raw, timeZone: "Asia/Jerusalem",
    asOf: "2026-09-26T12:00:00Z", picks: [], watchlist: [] };
  const { title, body } = statusHeadline(evaluateReport(report, new Date("2026-09-26T13:00:00Z")), report);
  assert.ok(title.length > 0);
  assert.ok(!body.includes("{"));
  assert.ok(!body.includes("suspended"));
  assert.ok(!body.includes("https://"));
  assert.match(body, /טרם התקבל דוח מאומת להיום/);
  assert.match(body, /\d{2}:\d{2}/, "the next scheduled attempt time is shown");
});
