# Bunker data pipeline

`npm run bunker:fetch` queries API-Football (API-Sports v3) for today's not-started fixtures, recent historical results, confirmed lineups, season statistics for starting players and the `Goals Over/Under → Over 2.5` market. It requires `API_FOOTBALL_KEY` and writes private working input to ignored `data/bunker-live.json`. `BUNKER_TIMEZONE` defaults to `Asia/Jerusalem` and defines "today"; `BUNKER_LEAGUES` optionally selects comma-separated league IDs (default: 39, 61, 78, 135, 140). The search covers *all fixtures in these leagues today* and all provider-returned bookmakers; it cannot guarantee the best price outside the provider's coverage. Availability of odds, confirmed lineups and player season stats depends on the provider's coverage and subscription.

The selector requires at least three home/away results per team from the past year, confirmed starting XIs (11 each), at most four changes per side from their previous starting XI, and season stats for at least nine starters per side. It requires odds captured *today* and updated within two hours, an estimated expected return of at least 4% per selection **and** for the two-leg combination, and prices both legs at the **same bookmaker**. Goals/assists, minutes, shots and key passes appear in the report as player context. The model uses historical goals and Poisson probabilities; player stats and lineups are evidence and stability filters, **not** an uncalibrated player-strength adjustment. If no pair qualifies, the job publishes a fresh dated "no selections today" page instead of keeping old games visible. The browser also hides picks immediately when a kickoff passes or a quote is more than two hours old.

`BUNKER_DATA_FILE=data/bunker-live.json BUNKER_REQUIRE_LIVE=1 npm run bunker:generate` validates the fetched input and writes `components/bunker/generatedReport.json`. `npm run build:static` exports to `out/`; `npm run bunker:test` verifies the model and selection rules. `npm run build` uses the synthetic local demo input by default; it **must not** be used for live publication.

The already-installed GitHub Actions workflow executes `node scripts/bunker-model.mjs` and publishes `public/`. Executing that module directly now runs the live fetcher, validates the fresh report, builds `out/`, and mirrors the verified export into `public/` for that workflow. Importing the model from tests or other scripts does **not** trigger publication. No eligible pair produces a dated no-picks report; a provider/API/build error fails the job before publishing. The prepared workflow in `.github/workflows/bunker.yml` instead publishes `out/` directly when repository credentials permit updating workflows.

The checked-in input is **synthetic demo data**, not historical results. The report labels it as such. As an alternative to the built-in fetcher, `BUNKER_DATA_URL` (optional `BUNKER_DATA_TOKEN` bearer token) or `BUNKER_DATA_FILE` can supply a prepared JSON payload with this schema:

```json
{
  "mode": "live",
  "source": "Verified provider / dataset name",
  "asOf": "2026-09-26T12:00:00Z",
  "combinedOdds": 2.32,
  "picks": [
    { "id": "01", "home": "אוסטריה", "away": "ישראל", "homeCode": "AUT", "awayCode": "ISR", "homeFlag": "austria", "awayFlag": "israel", "odds": 1.56, "kickoff": "2026-09-26T14:00:00Z", "competition": "תחרות", "bookmaker": "מפעיל הימורים", "oddsUpdatedAt": "2026-09-26T12:00:00Z", "lineup": { "homeStarters": 11, "awayStarters": 11, "homeChanges": 1, "awayChanges": 2 } }
  ],
  "results": [
    { "date": "2026-09-25", "home": "אוסטריה", "away": "נבחרת אחרת", "homeGoals": 2, "awayGoals": 1 }
  ]
}
```

Supply at least three **home** results for every pick's home team and three **away** results for every pick's away team. Dates must precede `asOf`, which must be less than 15 minutes old for automatic publishing. Live picks also require a current kickoff, confirmed lineup and `players` summaries for nine starters per team; the built-in fetcher supplies these. Use exact team names in `picks` and `results`. Data preparation, licensing, odds availability and opponent-strength adjustments depend on the upstream provider; the current model does not infer player-level quality. The model takes the average of home goals scored and away goals conceded for the host's Poisson mean, and the converse for the visitor; it assumes independence between fixtures for accumulator probability. The combined price is a two-decimal rounding of one bookmaker's leg product, **not an independently verified offered accumulator price**. `goalBuckets` groups six or more goals in its final bin.

The currently published `.github/workflows/bunker.yml` runs every six hours (UTC) and publishes `public/`; the CLI compatibility path above supplies that folder with a fresh static export on each successful run. A prepared workflow in the local workspace can publish `out/` directly and run hourly, but changing the repository workflow requires GitHub credentials authorized to update workflows. Configure repository secret `API_FOOTBALL_KEY`, enable Actions with write access to repository contents, and keep GitHub Pages set to the `gh-pages` branch root. No provider credentials are stored in the static site or repository. The generated client JSON is public: **never put API tokens or private data in source fields**.
