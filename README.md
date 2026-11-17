# Activity Weather Ranking

A GraphQL service that takes a city or town and ranks how good the next 7 days will be for **skiing, surfing, outdoor sightseeing and indoor sightseeing**, using [Open-Meteo](https://open-meteo.com) weather. Weather is stored in PostgreSQL and refreshed only when it goes stale, so most requests never call Open-Meteo.

**Live:** https://main-collinson-prod-team.light-cloud.io/graphql. Open it in a browser for GraphiQL, with an example query ready to run.

## Screenshots

![Screenshot 2026-11-17 at 12.18.20.png](docs/Screenshot%202026-11-17%20at%2012.18.20.png)
![Screenshot 2026-11-17 at 11.31.02.png](docs/Screenshot%202026-11-17%20at%2011.31.02.png)

## How it works

```
GraphQL query ──► Fastify (rate limit, body limit) ──► Yoga (query limits) ──► resolver
                                                                                 │
             ┌───────────────────────────────────────────────────────────────────┘
             ▼
     ForecastService ──── fresh in Postgres? ──── yes ──► rows from today
             │ no
             ▼
     Open-Meteo: geocoding (cached for good), forecast, marine ──► Postgres
             │
             ▼
     scoring: one pure scorer per activity ──► ranking with daily scores and reasons
```

- **Ranking:** every activity gets a score from 0 to 100 for each day, with human-readable reasons, e.g. "Fresh snow 12 cm" or "Waves 5.4 m: too big for most surfers". The weekly score is the mean of the daily scores. Activities are sorted by it, with the best day for each.
- **Persistence:** `locations`, `place_lookups` (the geocoding cache), `daily_weather` and `daily_marine`. Forecast and marine data each have their own fetch time, so a failed marine call never overwrites good wave data.
- **Refresh:** data is fetched again when it's older than 3 h or no longer covers today to today+6 in the place's own timezone. Concurrent requests share one refresh. If Open-Meteo is down, the last stored week is served with `stale: true`.
- **Stack:** Node 24, TypeScript (strict), Fastify 5, GraphQL Yoga 6, PostgreSQL 15 (`pg`, plain SQL), zod, vitest.

## Try it

```bash
curl -s https://main-collinson-prod-team.light-cloud.io/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{ activityForecast(place: \"Zermatt\") { location { name country } stale activities { activity rank score bestDay days { date score reasons } } } }"}'
```

Narrow an ambiguous name with a country code, e.g. `activityForecast(place: "Paris", countryCode: "US")` for Paris, Texas. The response always includes the resolved location.

Errors come back with HTTP 200 and an `errors` array, as usual in GraphQL:

```bash
curl -s https://main-collinson-prod-team.light-cloud.io/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"query ($place: String!) { activityForecast(place: $place) { location { name } } }","variables":{"place":"Xyzxyzq"}}'
# {"errors":[{"message":"No location found for \"Xyzxyzq\"", … "extensions":{"code":"LOCATION_NOT_FOUND"}}],"data":null}
```

| Error code (`errors[0].extensions.code`) | When |
|---|---|
| `BAD_USER_INPUT` | `place` is empty or over 100 characters, or `countryCode` isn't two capital letters |
| `LOCATION_NOT_FOUND` | Open-Meteo knows no such place |
| `UPSTREAM_UNAVAILABLE` | Open-Meteo is down and nothing is stored yet |

Over 60 requests a minute from one IP gets HTTP 429. A query with more than 3 aliases, or one that is too deep or too long, is rejected before it runs.

A [Bruno](https://www.usebruno.com) collection in [`bruno/`](bruno/) covers 7 scenarios with assertions: ski town, surf town, inland surfing, an ambiguous name, an unknown place, empty input, and too many aliases. Run it against the live service without installing anything:

```bash
cd bruno && npx --yes @usebruno/cli@latest run   # live by default; add --env local for your server
```

## Run it locally

You need Node 24 (`nvm use`) and Docker.

```bash
docker compose up -d        # PostgreSQL 15 on localhost:5433
cp .env.example .env
npm ci
npm run dev                 # http://localhost:8080/graphql
```

`npm run check` runs typecheck, lint, formatting and all tests. The tests use the Docker database, with a fresh schema per test file, and recorded Open-Meteo responses, so they make no network calls. `npm run build && npm start` runs the production build, which applies migrations on startup.

## Assumptions

The brief is open on purpose. These are the calls I made where I'd normally ask a product manager. The reasoning is in [PRD §3](docs/PRD.md):

- **"Rank" means both:** the 4 activities are ranked against each other by weekly score, and each also has a score per day and a `bestDay`.
- **Ambiguous names:** the top Open-Meteo match wins. An optional `countryCode` narrows it, and the resolved location is always echoed back.
- **Surfing inland** scores 0 with the reason "No marine data for this location". It isn't left out.
- **Indoor sightseeing** is the fallback: `100 − outdoor score`, capped at 65, because a day indoors is never a highlight.
- **Fresh snow** is the previous day's snowfall. Snow falling today means poor visibility, so a blizzard isn't the best ski day.
- **"Next 7 days"** is today plus 6, in the place's timezone. Units are metric.
- **Scale:** low traffic and one instance. No accounts, because the data is public and read-only.

## Known limitations

- **Thresholds:** the scoring thresholds are heuristics, not researched values. They were checked against four real weeks (Olympic Valley, Malibu, Brussels, Málaga) and a survey of 51 live weeks (T15). Skiing beats indoor at Olympic Valley by only one point, and a week that is mostly storm at a resort still ranks indoor first.
- **Ski towns** are scored at the town's coordinates and elevation, not at the slopes.
- **Surfing** ignores wind direction: an offshore wind counts the same as an onshore one.
- **One instance only:** the rate limit, the Open-Meteo call cap and the shared refresh live in memory, so the app runs as a single instance (`max_instances: 1`).
- **Database TLS:** the connection to Light Cloud's Postgres is encrypted but doesn't verify the server certificate, which comes from a private Cloud SQL CA ([D11](docs/DECISIONS.md)).
- **Missing timezone:** a geocoding match without a timezone would show up as `UPSTREAM_UNAVAILABLE`. I haven't seen it happen for a top match.

## Cut, and why

- **No `searchLocations` query:** the top match plus an optional `countryCode` covers the brief, and the resolved place is echoed back.
- **Bruno doesn't test `UPSTREAM_UNAVAILABLE` or HTTP 429:** neither can be triggered safely against the live service. Both are covered by tests (`src/server.test.ts`, `src/http/protection.test.ts`).
- **No background refresh:** we can't know which places will be asked for, so the data is refreshed when it is read.
- **GraphiQL stays on in production:** this is a demo for reviewers, and the schema holds nothing secret. A real API would turn it off.

## What I'd do next

- A `searchLocations` query, so clients can pick between places with the same name.
- Moving the counters and the shared refresh to Postgres or Redis, to run more than one instance.
- Warming popular places on a schedule, and adding metrics: Open-Meteo latency, cache hit rate, rejections.
- Resort coordinates or a mountain elevation for skiing, and coastline orientation for surf wind.

## How I worked

The brief asks to see the process, so the repo keeps it:

- [`docs/PRD.md`](docs/PRD.md): the plan, with the open questions and the assumptions I committed to. A change log records every revision.
- [`docs/tasks/`](docs/tasks/README.md): the PRD split into 21 tasks, with a progress board and a checklist per task.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): each decision, the options considered, and why it won.
- [`docs/AI-NOTES.md`](docs/AI-NOTES.md): how AI was used, including where it was wrong.
- **Commits:** test-first. A `test:` commit with failing tests comes before the `feat:` or `fix:` commit that makes them pass. Independent tasks were built by parallel AI agents on separate branches, each limited to its own files, then reviewed and merged (`Merge T07: …`).
