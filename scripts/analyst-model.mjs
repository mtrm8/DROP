const requireValue = (condition, message) => {
  if (!condition) throw new Error(`Analyst report: ${message}`);
};

const text = (value, label, max = 300) => {
  requireValue(typeof value === "string" && value.trim().length > 0 && value.length <= max,
    `${label} must be nonempty text (max ${max} characters)`);
  return value.trim();
};

const number = (value, label, minimum, maximum) => {
  requireValue(typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum,
    `${label} must be between ${minimum} and ${maximum}`);
  return value;
};

const results = (value, label) => {
  requireValue(value && typeof value === "object" && !Array.isArray(value), `${label} is required`);
  const matches = number(value.matches, `${label}.matches`, 1, 20);
  const goalsFor = number(value.goalsFor, `${label}.goalsFor`, 0, 30 * matches);
  const goalsAgainst = number(value.goalsAgainst, `${label}.goalsAgainst`, 0, 30 * matches);
  const overTwo = number(value.overTwo, `${label}.overTwo`, 0, matches);
  requireValue([matches, goalsFor, goalsAgainst, overTwo].every(Number.isInteger), `${label} counts must be integers`);
  return { matches, goalsFor, goalsAgainst, overTwo };
};

const isoTime = (value, label) => {
  requireValue(typeof value === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)),
    `${label} must be an ISO timestamp with a timezone`);
  return value;
};

/** Validate human-authored picks and derive presentation-only metrics. */
export function analyzeAnalystInput(input) {
  requireValue(input && typeof input === "object" && !Array.isArray(input), "expected a JSON object");
  const analyst = text(input.analyst, "analyst", 100);
  requireValue(Array.isArray(input.picks) && input.picks.length <= 10, "picks must be an array (max 10)");
  if (input.asOf === null) {
    requireValue(input.picks.length === 0, "asOf is required before publishing picks");
    return { analyst, asOf: null, picks: [] };
  }
  const asOf = isoTime(input.asOf, "asOf");
  const seen = new Set();
  const picks = input.picks.map((pick, i) => {
    const label = `picks[${i}]`;
    requireValue(pick && typeof pick === "object" && !Array.isArray(pick), `${label} must be an object`);
    const id = text(pick.id, `${label}.id`, 60);
    requireValue(!seen.has(id), `duplicate pick id ${id}`);
    seen.add(id);
    const home = text(pick.home, `${label}.home`, 100);
    const away = text(pick.away, `${label}.away`, 100);
    requireValue(home !== away, `${label} teams must differ`);
    const kickoff = isoTime(pick.kickoff, `${label}.kickoff`);
    requireValue(Date.parse(kickoff) > Date.parse(asOf), `${label} kickoff must follow the report timestamp`);
    const odds = number(pick.odds, `${label}.odds`, 1.01, 100);
    const analystProbability = pick.analystProbability == null ? null :
      number(pick.analystProbability, `${label}.analystProbability`, 0.001, 0.999);
    requireValue(Array.isArray(pick.factors) && pick.factors.length >= 1 && pick.factors.length <= 5,
      `${label}.factors must have 1–5 explanations`);
    requireValue(Array.isArray(pick.risks) && pick.risks.length >= 1 && pick.risks.length <= 5,
      `${label}.risks must have 1–5 caveats`);
    requireValue(pick.stats && typeof pick.stats === "object", `${label}.stats is required`);
    const headToHead = pick.stats.headToHead ?? [];
    requireValue(Array.isArray(headToHead) && headToHead.length <= 5, `${label}.stats.headToHead must have at most five games`);
    return {
      id, home, away, kickoff, odds, analystProbability,
      competition: text(pick.competition, `${label}.competition`, 120),
      market: text(pick.market, `${label}.market`, 120),
      bookmaker: text(pick.bookmaker, `${label}.bookmaker`, 100),
      source: text(pick.source, `${label}.source`, 200),
      summary: text(pick.summary, `${label}.summary`, 600),
      factors: pick.factors.map((value, j) => text(value, `${label}.factors[${j}]`, 300)),
      risks: pick.risks.map((value, j) => text(value, `${label}.risks[${j}]`, 300)),
      stats: {
        home: results(pick.stats.home, `${label}.stats.home`),
        away: results(pick.stats.away, `${label}.stats.away`),
        headToHead: headToHead.map((game, j) => {
          const date = text(game?.date, `${label}.stats.headToHead[${j}].date`, 10);
          requireValue(/^\d{4}-\d{2}-\d{2}$/.test(date) &&
            !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
            new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date &&
            Date.parse(`${date}T00:00:00Z`) < Date.parse(asOf), `${label} head-to-head dates must precede the report`);
          const homeGoals = number(game.homeGoals, `${label}.stats.headToHead[${j}].homeGoals`, 0, 30);
          const awayGoals = number(game.awayGoals, `${label}.stats.headToHead[${j}].awayGoals`, 0, 30);
          requireValue(Number.isInteger(homeGoals) && Number.isInteger(awayGoals), `${label} head-to-head goals must be integers`);
          return { date, homeGoals, awayGoals };
        }),
      },
      breakEven: 1 / odds,
    };
  });
  return { analyst, asOf, picks };
}
