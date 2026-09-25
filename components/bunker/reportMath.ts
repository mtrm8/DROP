// Supplied slip prices. The accepted accumulator price is distinct from the
// unrounded product; all payout calculations use the supplied 2.32 quote.
export const LEG_ODDS = [1.56, 1.49] as const;
export const ACCUMULATOR_ODDS = 2.32;
export const EXACT_PRODUCT = LEG_ODDS.reduce((product, odds) => product * odds, 1);

export function impliedProbability(odds: number): number {
  if (!Number.isFinite(odds) || odds <= 1) throw new RangeError("Invalid decimal odds");
  return 1 / odds;
}

// A hypothetical Poisson total-goals model, not a fitted team xG forecast.
export function overTwoProbability(mean: number): number {
  if (!Number.isFinite(mean) || mean < 0) throw new RangeError("Invalid goal mean");
  return 1 - Math.exp(-mean) * (1 + mean + mean * mean / 2);
}

export function goalDistribution(mean: number): number[] {
  overTwoProbability(mean); // Validate the model input.
  const buckets = [Math.exp(-mean)];
  for (let goals = 1; goals <= 5; goals++) {
    buckets.push(buckets[goals - 1] * mean / goals);
  }
  // Final bucket includes ALL outcomes of six or more goals.
  return [...buckets, Math.max(0, 1 - buckets.reduce((sum, value) => sum + value, 0))];
}

export function accumulatorValuation(stake: number, assumedWinProbability: number) {
  if (!Number.isFinite(stake) || stake < 0 || !Number.isFinite(assumedWinProbability)
    || assumedWinProbability < 0 || assumedWinProbability > 1) {
    throw new RangeError("Invalid valuation input");
  }
  const grossReturn = stake * ACCUMULATOR_ODDS;
  return {
    grossReturn,
    netProfit: grossReturn - stake,
    loss: -stake,
    expectedProfit: stake * (assumedWinProbability * ACCUMULATOR_ODDS - 1),
  };
}
