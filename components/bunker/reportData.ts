import generated from "./generatedReport.json";

export type Model = {
  homeGames: number;
  awayGames: number;
  lambdaHome: number;
  lambdaAway: number;
  mean: number;
  probability: number;
  buckets: number[];
  fairOdds: number | null;
  edge: number;
};

export type Pick = {
  id: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  homeFlag: string;
  awayFlag: string;
  market: string;
  odds: number;
  breakEven: number;
  model: Model | null;
  fixture: {
    kickoff: string;
    oddsUpdatedAt: string;
    competition: string;
    bookmaker: string;
    lineup: { homeKind: "confirmed" | "projected"; awayKind: "confirmed" | "projected"; homeStarters: number; awayStarters: number; homeChanges: number; awayChanges: number };
    players: { season: number; home: PlayerSummary[]; away: PlayerSummary[] };
  } | null;
};

export type PlayerSummary = { name: string; minutes: number; goals: number; assists: number; shots: number | null; shotsOnTarget: number | null; keyPasses: number | null; rating: number | null };

// A match the scan saw today but did not recommend. Shown only when no
// accumulator qualified, and always with its real (often negative) edge so a
// near-miss cannot be mistaken for a recommendation. A fixture that never
// reached the model has no probability, edge or fair odds, and `note` says
// which data gate dropped it.
export type VenueForm = {
  games: number;
  overTwo: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Total goals per venue fixture, newest first. */
  recentTotals: number[];
};

export type LineupEvidence = {
  status: "confirmed" | "projected" | "unavailable";
  starters: number;
  changes: number | null;
  formation: string | null;
  keyPlayers: string[];
};

export type Meeting = { date: string; homeGoals: number; awayGoals: number };

export type WatchItem = {
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeForm: VenueForm | null;
  awayForm: VenueForm | null;
  lineup: { home: LineupEvidence; away: LineupEvidence } | null;
  headToHead: Meeting[];
  priorityLabel: string | null;
  round: string | null;
  competition: string;
  bookmaker: string | null;
  kickoff: string;
  odds: number | null;
  probability: number | null;
  mean: number | null;
  fairOdds: number | null;
  edge: number | null;
  note: string | null;
};

export type Report = {
  mode: "demo" | "live";
  source: string;
  asOf: string;
  timeZone: string;
  picks: Pick[];
  combinedOdds: number;
  productOdds: number;
  breakEven: number;
  jointProbability: number | null;
  jointFairOdds: number | null;
  jointEdge: number | null;
  status: "ready" | "no-picks" | "unavailable";
  statusMessage: string | null;
  watchlist: WatchItem[];
  scanNote: string | null;
  methodology: string;
};

// Runtime validation is performed by generate-bunker.mjs before writing this file.
const report: Report = generated as Report;
export default report;
