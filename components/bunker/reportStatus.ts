import type { Pick, Report } from "./reportData";

// The published site is a static snapshot. The committed workflow runs every
// six hours in UTC; an open tab only sees a newer scan after it is deployed.
export const REFRESH_INTERVAL_HOURS = 6;
export const DEFAULT_TIME_ZONE = "Asia/Jerusalem";

export type ReportState =
  | "demo"        // synthetic demo data, never a real forecast
  | "ready"       // today's report, every selected match is still upcoming
  | "partial"     // today's report, some matches already kicked off
  | "started"     // today's report, every selected match already kicked off
  | "no-picks"    // today's scan completed, nothing cleared the analysis bar
  | "unavailable" // today's scan did not complete
  | "stale";      // the published report belongs to an earlier day

export type ReportStatus = {
  state: ReportState;
  timeZone: string;
  reportDate: string;
  today: string;
  isToday: boolean;
  nextRefresh: Date;
  activePicks: Pick[];
  kickedOff: Pick[];
  /** True when the report is the freshest processed analysis of the current day. */
  isLive: boolean;
};

const localDay = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);

/** Next scheduled run of the currently committed GitHub Actions workflow. */
export function nextScheduledRun(now: Date): Date {
  const nextHour = Math.floor(now.getUTCHours() / REFRESH_INTERVAL_HOURS + 1) * REFRESH_INTERVAL_HOURS;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), nextHour));
}

/** A pick is actionable only while its fixture has not kicked off yet. */
export const isKickoffPending = (pick: Pick, now: number) =>
  Boolean(pick.fixture) && Date.parse(pick.fixture!.kickoff) > now;

/**
 * Decide what the Bunker should show from the published report alone.
 *
 * Expiry is decided per match, never for the whole report: a daily report whose
 * first match has kicked off still carries a valid, unplayed second match, and
 * hiding the entire report there made the page claim it was waiting for data
 * that had already been processed and published.
 */
export function evaluateReport(report: Report, now: Date = new Date()): ReportStatus {
  const timeZone = report.timeZone || DEFAULT_TIME_ZONE;
  const at = now.getTime();
  const reportDate = localDay(new Date(report.asOf), timeZone);
  const today = localDay(now, timeZone);
  const isToday = reportDate === today;
  // Demo fixtures carry no kickoff, so they are never filtered by the clock.
  const demo = report.mode === "demo";
  const activePicks = demo ? report.picks : report.picks.filter((pick) => isKickoffPending(pick, at));
  const kickedOff = demo ? [] : report.picks.filter((pick) => !isKickoffPending(pick, at));

  const state: ReportState = demo ? "demo"
    : !isToday ? "stale"
      : report.picks.length === 0 ? (report.status === "unavailable" ? "unavailable" : "no-picks")
        : activePicks.length === 0 ? "started"
          : kickedOff.length === 0 ? "ready" : "partial";

  return {
    state,
    timeZone,
    reportDate,
    today,
    isToday,
    nextRefresh: nextScheduledRun(now),
    activePicks,
    kickedOff,
    isLive: report.mode === "live" && isToday && state !== "unavailable",
  };
}

const formatTime = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("he-IL", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);

const formatDay = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("he-IL", { timeZone, day: "numeric", month: "long" }).format(date);

const day = (status: ReportStatus, report: Report) => formatDay(new Date(report.asOf), status.timeZone);

/** Short label for the header status pill. */
export function statusLabel(status: ReportStatus, report: Report): string {
  switch (status.state) {
    case "demo": return "סביבת הדגמה";
    case "ready": return `סריקת ${formatDay(new Date(report.asOf), status.timeZone)} · משחקים עדכניים`;
    case "partial": return `סריקת ${formatDay(new Date(report.asOf), status.timeZone)} · ${status.activePicks.length} משחקים עדיין ממתינים`;
    case "started": return `סריקת ${formatDay(new Date(report.asOf), status.timeZone)} · כל המשחקים התחילו`;
    case "no-picks": return report.watchlist?.length
      ? `סריקת ${formatDay(new Date(report.asOf), status.timeZone)} · מעקב יומי · ${report.watchlist.length} משחקים`
      : `סריקת ${formatDay(new Date(report.asOf), status.timeZone)} · אין כיום משחקים להצגה`;
    case "unavailable": return `סריקת ${formatDay(new Date(report.asOf), status.timeZone)} · הנתונים טרם התקבלו`;
    case "stale": return `דוח מ־${formatDay(new Date(report.asOf), status.timeZone)} · ממתין לסריקה הבאה`;
  }
}

/** Headline + explanation for the report body. */
export function statusHeadline(status: ReportStatus, report: Report): { title: string; body: string } {
  const next = formatTime(status.nextRefresh, status.timeZone);
  const day = formatDay(new Date(report.asOf), status.timeZone);
  switch (status.state) {
    case "demo":
      return report.picks.length ? { title: "", body: "" } : {
        title: "אין נתוני הדגמה להצגה",
        body: "קובץ ההדגמה המקומי אינו מכיל בחירות. הדוח החי מתפרסם בסריקה המתוזמנת.",
      };
    case "stale":
      return {
        title: `הדוח המוצג הוא סריקת ${day}`,
        body: `הבנקר מתעדכן בסריקות מתוזמנות. הסריקה הבאה צפויה ב־${next}, ואז יוצגו כאן נתוני היום העדכניים שפורסמו.`,
      };
    case "started":
      return {
        title: "הבחירות של היום כבר יצאו לפועל",
        body: `סריקת ${day} הסתיימה והמשחקים בה כבר התחילו. הסריקה הבאה מתקבלת ב־${next}.`,
      };
    case "unavailable":
      return {
        title: `סריקת ${day} טרם הושלמה`,
        body: `${report.statusMessage || "עדיין לא התקבלה סריקת משחקים מאומתת להיום."} ניסיון הסריקה הבא צפוי ב־${next}.`,
      };
    case "no-picks": {
      const near = report.watchlist?.length ?? 0;
      return {
        title: near
          ? `סריקת ${day} · מעקב יומי של ${near} המשחקים הקרובים`
          : `סריקת ${day} · אין משחקים להצגה`,
        body: near
          ? `הסריקה רצה על משחקי היום אך אף שילוב לא הגיע לפער מצטבר של 4%, ולכן אין צבר מומלץ. במקום זאת מוצגים למטה ${near} המשחקים הקרובים עם המחירים והנתונים החיים שנאספו עבורם, כולל הפער האמיתי כשחושב — וכן הסיבה שמשחק מסוים לא נכלל בחישוב. זהו מידע למעקב בלבד ולא המלצה. הסריקה הבאה מתקבלת ב־${next}.`
          : `הסריקה רצה על משחקי היום אך לא נמצאו משחקים מתאימים להצגה. הסריקה הבאה מתקבלת ב־${next}.`,
      };
    }
    default:
      return { title: "", body: "" };
  }
}

/** One-line explanation for the report header. */
export function statusSummary(status: ReportStatus, report: Report): string {
  const next = formatTime(status.nextRefresh, status.timeZone);
  const source = `מקור הנתונים: ${report.source}.`;
  switch (status.state) {
    case "demo": return "נתוני הדגמה סינתטיים.";
    case "ready": return `${source} זו סריקת משחקי היום, והמחירים עודכנו היום.`;
    case "partial": return `${source} מחירי הסריקה הם צילום יומי, ורק המשחקים שטרם נגעו מוצגים.`;
    case "started": return `${source} כל משחקי הסריקה של היום כבר התחילו; הסריקה הבאה מתקבלת ב־${next}.`;
    case "no-picks": return report.watchlist?.length
      ? `${source} המשחקים למעקב אינם צבר מומלץ; הנתונים הזמינים והפערים מוצגים בכרטיסים למטה.`
      : `${source} הסריקה הסתיימה, אך לא נמצאו היום שתי בחירות שעומדות בתנאי הניתוח.`;
    case "unavailable": return `${source} סריקת היום טרם הושלמה; הניסיון הבא מתקבל ב־${next}.`;
    case "stale": return `${source} זהו דוח ${day(status, report)}, והסריקה הבאה מתקבלת ב־${next}.`;
  }
}

/**
 * Decide whether a freshly fetched snapshot should replace the one on screen.
 * A newer build always wins; so does a usable report replacing one that has
 * nothing to show, which is what lets a recovered daily scan clear a stuck
 * "waiting for data" page.
 */
export function supersedes(current: Report, next: Report): boolean {
  if (!Number.isFinite(Date.parse(next.asOf))) return false;
  const currentAt = Date.parse(current.asOf);
  if (!Number.isFinite(currentAt)) return true;
  if (Date.parse(next.asOf) > currentAt) {
    // A failed retry later today must not erase still-upcoming, already
    // verified fixtures from an open tab. A new local day always takes over.
    if (next.status === "unavailable" && current.mode === "live" && current.status !== "unavailable" &&
      localDay(new Date(current.asOf), current.timeZone || DEFAULT_TIME_ZONE) ===
        localDay(new Date(next.asOf), current.timeZone || DEFAULT_TIME_ZONE) &&
      [...current.picks.map((pick) => pick.fixture?.kickoff), ...(current.watchlist ?? []).map((item) => item.kickoff)]
        .some((kickoff) => kickoff && Date.parse(kickoff) > Date.now())) return false;
    return true;
  }
  if (Date.parse(next.asOf) < currentAt) return false;
  const usable = (report: Report) => report.mode === "live" &&
    report.status !== "unavailable" && (report.picks.length > 0 || (report.watchlist?.length ?? 0) > 0);
  return usable(next) && !usable(current);
}
