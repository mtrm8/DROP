import input from "@/data/analyst-picks.json";
import { analyzeAnalystInput } from "@/scripts/analyst-model.mjs";

export type VenueStats = { matches: number; goalsFor: number; goalsAgainst: number; overTwo: number };
export type AnalystPick = {
  id: string;
  home: string;
  away: string;
  kickoff: string;
  odds: number;
  analystProbability: number | null;
  competition: string;
  market: string;
  bookmaker: string;
  source: string;
  summary: string;
  factors: string[];
  risks: string[];
  stats: { home: VenueStats; away: VenueStats; headToHead: { date: string; homeGoals: number; awayGoals: number }[] };
  breakEven: number;
};
export type AnalystSlipLeg = { home: string; away: string; market: string; odds: number };
export type AnalystSlip = { label: string; legs: AnalystSlipLeg[]; totalOdds: number };
export type AnalystReport = { analyst: string; asOf: string | null; slip: AnalystSlip | null; picks: AnalystPick[] };

// This file is edited by a human and validated at build time. It is never
// populated from the AI/API report or treated as synthetic demonstration data.
const report = analyzeAnalystInput(input) as AnalystReport;
export default report;

// "Published" means the analyst actually shipped a report: a timestamped entry
// that carries picks or a slip. An empty/unset report keeps the bunker closed.
export function isBunkerPublished(value: AnalystReport): boolean {
  return value.asOf !== null && (value.picks.length > 0 || value.slip !== null);
}
