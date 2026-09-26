# Analyst Bunker: manually authored picks

`/bunker/` reads `data/analyst-picks.json`. It starts with an empty report and never fills a missing pick from the AI/API feed. A human analyst edits this JSON, reviews the underlying evidence, and publishes a new static build. `npm run bunker:test` verifies the manual report schema, and `npm run build:static` validates the file used by the site.

## Active combined slip (Combine / משולב)

The page can show the analyst's active combined ticket above the deep-analysis picks. It is a separate optional `slip` object and requires the same review `asOf`:

```json
{
  "analyst": "צוות האנליסטים",
  "asOf": "2026-09-26T22:30:00Z",
  "slip": {
    "label": "Combine · משולב",
    "legs": [
      { "home": "Charlotte", "away": "Chicago Fire", "market": "Total Goals Over 2.5", "odds": 1.42 },
      { "home": "CF Montreal", "away": "Cincinnati", "market": "Total Yellow Cards Over 3.5", "odds": 1.69 }
    ],
    "totalOdds": 2.39
  },
  "picks": []
}
```

Legs are 1–10 selections with quotes between 1.01 and 100; `totalOdds` must match the product of the leg odds within 0.05 (bookmakers round combined quotes). The slip is presentation-only: it never feeds the AI model, and `picks` may stay empty while only the active ticket is live.

To publish a pick, set `asOf` to the timestamp of the manual review (with timezone), then add up to ten picks. The following is a **schema example with fictional teams**, not a published recommendation:

```json
{
  "analyst": "צוות האנליסטים",
  "asOf": "2026-09-26T12:00:00Z",
  "picks": [
    {
      "id": "example-01",
      "home": "Example Home",
      "away": "Example Away",
      "competition": "Example Competition",
      "kickoff": "2026-09-26T19:00:00Z",
      "market": "Over 2.5",
      "bookmaker": "Example bookmaker",
      "odds": 2.1,
      "analystProbability": 0.52,
      "source": "Manually reviewed match and bookmaker records",
      "summary": "A short explanation of the human analyst's pick.",
      "factors": ["A verified home/away scoring trend in the sample."],
      "risks": ["Lineups may change before kickoff."],
      "stats": {
        "home": { "matches": 5, "goalsFor": 9, "goalsAgainst": 4, "overTwo": 3 },
        "away": { "matches": 5, "goalsFor": 7, "goalsAgainst": 6, "overTwo": 2 },
        "headToHead": [{ "date": "2026-05-20", "homeGoals": 2, "awayGoals": 1 }]
      }
    }
  ]
}
```

`home` stats are from home fixtures and `away` stats from away fixtures. `headToHead` is optional (up to five dated results) and scorelines are recorded from the perspective of the currently listed home and away teams. `analystProbability` may be `null` if the analyst has not supplied a numerical estimate; when present it is explicitly labelled as a human estimate, alongside the break-even threshold implied by the quoted odds. `factors`, `risks`, `source` and the statistics are required so the report cannot publish an unexplained selection. An empty report keeps `asOf: null` and `picks: []`.

This is a static site: manual file changes take effect only after a new build/deployment. The `/ai-bunker/` member-code screen is a client-side preview gate; its generated API data is still a public static asset. Hosting genuinely private member reports requires server-side authorization.
