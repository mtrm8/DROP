const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the same pure TypeScript calculations imported by the report.
const source = fs.readFileSync(path.join(__dirname, "../components/bunker/reportMath.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const exportsObject = {};
vm.runInNewContext(compiled.outputText, { exports: exportsObject });
const { goalDistribution, overTwoProbability, impliedProbability, accumulatorValuation, EXACT_PRODUCT } = exportsObject;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

near(EXACT_PRODUCT, 2.3244);
near(impliedProbability(1.56), 25 / 39);
near(impliedProbability(1.49), 100 / 149);
near(impliedProbability(2.32), 25 / 58);
near(accumulatorValuation(100, 1).grossReturn, 232);
near(accumulatorValuation(100, 1).netProfit, 132);
near(accumulatorValuation(100, 0).expectedProfit, -100);
near(accumulatorValuation(100, 1 / 2.32).expectedProfit, 0);
near(accumulatorValuation(0, 0.5).expectedProfit, 0);

let lastOver = -1;
for (let step = 0; step <= 50; step++) {
  const mean = step / 10;
  const buckets = goalDistribution(mean);
  assert.equal(buckets.length, 7);
  assert.ok(buckets.every((p) => p >= 0 && p <= 1));
  near(buckets.reduce((sum, p) => sum + p, 0), 1);
  const over = overTwoProbability(mean);
  near(buckets.slice(3).reduce((sum, p) => sum + p, 0), over);
  assert.ok(over >= lastOver);
  lastOver = over;
}
near(overTwoProbability(2.5), 1 - Math.exp(-2.5) * 6.625);
for (const invalid of [-1, NaN, Infinity]) assert.throws(() => goalDistribution(invalid));
for (const invalid of [0, 1, NaN, Infinity]) assert.throws(() => impliedProbability(invalid));
assert.throws(() => accumulatorValuation(-1, 0.5));
assert.throws(() => accumulatorValuation(100, 1.1));
console.log("Bunker math verified: quote/payout precision, break-even, 51 distributions, tails, and input bounds.");
