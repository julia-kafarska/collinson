# PRD: Activity Weather Ranking Service

Status: Draft v0.2 · 2026-11-17
Source brief: [`lead-snr-engineer-test-062026.docx`](./lead-snr-engineer-test-062026.docx)

Change log:
- v0.2 (2026-11-17): storage moved from SQLite to PostgreSQL, because the service will be deployed to Light Cloud, which provides managed Postgres. Added basic security (section 10) and the Light Cloud deployment (section 13).

## 1. Context

Take-home exercise for a Senior/Lead Engineer role. The brief is deliberately loose. Reviewers care most about **how the work was done** (decisions, assumptions, trade-offs), then about the service itself.

Hard constraints from the brief and the recruiter:

- Backend only. No front end.
- Node.js + GraphQL, written in **TypeScript**.
- Weather data comes from Open-Meteo and must be **persisted**, not fetched on every request.
- Public GitHub repo with a short README: what was built, how to run it, assumptions.
- Process must be visible: commits, notes, AI usage. Unpolished is fine.
- Deadline: within 5 working days of receipt.
- Follow-up: 1.5 h interview with a screen-shared walkthrough and possibly some live coding.

Our own choice on top of the brief: the service is deployed to **Light Cloud**, with a managed **PostgreSQL** database.

## 2. Goal

Given a city or town, return a ranking of how good the **next 7 days** will be for:

1. Skiing
2. Surfing
3. Outdoor sightseeing
4. Indoor sightseeing

Success means a reviewer can open the live URL, send one GraphQL query, and get a ranking that makes sense and explains itself. They can also follow every non-obvious decision back to a written reason. Running it locally takes Docker and three commands.

## 3. Open questions and the assumptions I went with

These are the questions I would normally put to a product manager. Each one has the assumption I'm committing to, so the work isn't blocked.

| # | Question | Assumption | If wrong |
|---|----------|------------|----------|
| Q1 | What does "rank" mean: rank the 4 activities against each other, or rank the 7 days within each activity? | **Both.** Every activity gets a weekly score (0–100) and the activities are sorted by it. Each activity also has a score for each of the 7 days and a `bestDay`. | Removing a field is cheap. The data is already computed. |
| Q2 | Ambiguous names ("Paris" in France or in Texas)? | Take the top Open-Meteo geocoding match, which is ordered by relevance and population. Accept an optional `countryCode` to narrow it down. The response always returns the location that was resolved, so the client can see what was chosen. | Add a `searchLocations` query so the client can choose. Out of scope for now. |
| Q3 | Surfing for an inland city? | Score is 0 with the reason "no marine data for this location". It still appears in the ranking, at the bottom. | Make the score nullable or leave the activity out. A small schema change. |
| Q4 | What makes a day "good" for indoor sightseeing? | Indoor is always possible. It has a baseline score and goes up when outdoor conditions are poor: rain, cold, heat, wind. | Swap the scorer. It's one file. |
| Q5 | How is the weekly score built from 7 daily scores? | Mean of the daily scores. `bestDay` is shown alongside so a single great powder day isn't hidden. | Change the aggregation function. Max, top-N mean, etc. |
| Q6 | How fresh must the data be? | Forecasts are refreshed when they are older than **3 h** (configurable). Open-Meteo models update every 1–6 h, so refreshing more often adds little. | Change the TTL in config. |
| Q7 | What does "next 7 days" mean? | Today plus 6 days, in the **location's** timezone, not the server's. | — |
| Q8 | Skiing in a valley town (Chamonix sits at 1,035 m while the slopes are much higher)? | Use the coordinates and elevation from geocoding. This is a known limitation and is written up in the README. | Resolve to resort coordinates or use a mountain elevation. Out of scope. |
| Q9 | Expected traffic, auth, rate limiting of our API? | Low traffic, one app instance. No auth, because the data is public and read-only. Basic abuse protection: a rate limit per client, GraphQL query limits, and a cap on Open-Meteo calls. | Move the in-memory limits to Postgres or Redis and allow more instances. See sections 10 and 13. |
| Q10 | Units? | Metric everywhere: °C, mm, cm, km/h, m. | — |

## 4. Scope

**In scope**

- GraphQL query: city name in, ranked activities out, with daily breakdown and reasons.
- Geocoding a free-text place name to coordinates, via Open-Meteo Geocoding.
- Fetching daily forecasts (Forecast API) and marine data (Marine API).
- Persistence in PostgreSQL, and the refresh strategy.
- Transparent, rule-based scoring with a human-readable reason for every score.
- Basic security: rate limiting, GraphQL query limits, input validation, a cap on Open-Meteo calls.
- Deployment to Light Cloud.
- Tests for scoring, refresh logic and the GraphQL resolver.
- README, decision log, AI usage notes.

**Non-goals** (cut on purpose; each has a reason)

- Front end. The brief excludes it.
- Auth (accounts, API keys). The data is public and read-only.
- ML or learned scoring. Rules are explainable and easy to test, and there is no data to train on.
- Hourly granularity and user preferences ("I'm a beginner surfer"). Not asked for.
- Wind direction relative to the coastline for surfing. It needs coastline data we don't have.
- Background or scheduled refresh. Lazy refresh is enough at this scale. See section 8.
- Historical forecast storage. Rows are replaced on each refresh.
- A Dockerfile for the app. Light Cloud builds from the repo, and locally only Postgres runs in Docker.

## 5. Functional requirements

- **FR1:** Accept `place` (1–100 characters, trimmed) and an optional `countryCode` (ISO 3166-1 alpha-2).
- **FR2:** Resolve the place to a single location. Return `LOCATION_NOT_FOUND` if there is no match.
- **FR3:** Return all 4 activities, sorted by weekly score (descending), each with a 1-based `rank`.
- **FR4:** For each activity return 7 days, each with `date`, `score` (0–100) and `reasons`.
- **FR5:** Use persisted data when it is fresh. Call Open-Meteo only when data is missing or older than the TTL.
- **FR6:** If Open-Meteo fails and stale data exists, serve the stale data with `stale: true`. If no data exists, return `UPSTREAM_UNAVAILABLE`.
- **FR7:** If the Marine API fails or returns no data, still return the other 3 activities (degrade gracefully).
- **FR8:** Return `fetchedAt` so the client knows how old the forecast is.
- **FR9:** Protect the service and the shared Open-Meteo quota from abuse (section 10). A client over the rate limit gets HTTP 429 with `Retry-After`.

## 6. API (draft)

```graphql
type Query {
  activityForecast(place: String!, countryCode: String): ActivityForecast!
}

type ActivityForecast {
  location: Location!
  fetchedAt: String!          # ISO 8601, when the forecast was pulled from Open-Meteo
  stale: Boolean!             # true if a refresh failed and older data is being served
  activities: [ActivityRanking!]!   # sorted best first
}

type Location {
  name: String!
  country: String
  region: String
  latitude: Float!
  longitude: Float!
  elevation: Float
  timezone: String!
}

enum Activity { SKIING SURFING OUTDOOR_SIGHTSEEING INDOOR_SIGHTSEEING }

type ActivityRanking {
  activity: Activity!
  rank: Int!
  score: Int!                 # weekly, 0-100
  bestDay: String             # YYYY-MM-DD
  days: [DayScore!]!
}

type DayScore {
  date: String!               # YYYY-MM-DD, location-local
  score: Int!
  reasons: [String!]!         # e.g. "Fresh snow: 12 cm", "Gusts 70 km/h: lifts likely closed"
}
```

Example:

```graphql
query { activityForecast(place: "Biarritz", countryCode: "FR") {
  location { name country }
  stale
  activities { activity rank score bestDay days { date score reasons } }
} }
```

Errors use `extensions.code`: `BAD_USER_INPUT`, `LOCATION_NOT_FOUND`, `UPSTREAM_UNAVAILABLE`. A request over the rate limit gets HTTP 429 before GraphQL runs. A query over the GraphQL limits (section 10) is rejected before it executes.

## 7. Data sources (Open-Meteo, free tier)

| API | Endpoint | Fields used |
|-----|----------|-------------|
| Geocoding | `geocoding-api.open-meteo.com/v1/search` | id, name, country, admin1, latitude, longitude, elevation, timezone |
| Forecast | `api.open-meteo.com/v1/forecast` | daily: `temperature_2m_max/min`, `apparent_temperature_max`, `precipitation_sum`, `precipitation_probability_max`, `snowfall_sum`, `weather_code`, `wind_speed_10m_max`, `wind_gusts_10m_max`, `sunshine_duration`, `daylight_duration`; hourly: `snow_depth`, aggregated to a daily max |
| Marine | `marine-api.open-meteo.com/v1/marine` | daily: `wave_height_max`, `swell_wave_height_max`, `swell_wave_period_max` |

Calls use `timezone=<location tz>` and `forecast_days=7`. Free tier limits are roughly 10k calls/day and 600/min, and only for non-commercial use. Persistence keeps us well under these limits.

**Spike needed on day 1.** These are API behaviours I haven't confirmed yet:

- What the Marine API returns for inland coordinates: nulls, an error, or the nearest ocean cell.
- Whether `snow_depth` is hourly only.
- Whether geocoding ranks "Paris" as Paris, France.

## 8. Persistence and refresh

**Storage: PostgreSQL.** The service is deployed to Light Cloud, which provides managed Postgres, so development and production run the same engine. Locally, Postgres runs in Docker (`docker-compose.yml`, the database only). An earlier draft picked SQLite for zero setup. It was dropped once Light Cloud became the target: container disks are temporary, so a SQLite file would be wiped on every redeploy. Trade-off: running locally now needs Docker. In return, local and production match, and running more than one instance becomes possible later.

- **Driver:** `pg` (node-postgres) with a pool of 5 connections. Plain parameterised SQL, no ORM: three tables and a handful of queries don't need one.
- **Migrations:** numbered SQL files in `migrations/`, applied at startup by a ~20-line runner that records each file in a `schema_migrations` table. That is too little code to justify a migration library. Running them at startup is safe because there is one instance (section 13).

**What is stored: normalised weather, not scores.** Scores are computed when a request comes in, from the stored weather. This means scoring rules can change without fetching anything again or migrating data, and the scoring logic stays pure and testable.

Schema (`migrations/001_init.sql`):

```sql
CREATE TABLE locations (
  id                  bigint PRIMARY KEY,          -- GeoNames id from Open-Meteo geocoding
  name                text NOT NULL,
  country             text,
  region              text,
  latitude            double precision NOT NULL,
  longitude           double precision NOT NULL,
  elevation           real,                        -- m
  timezone            text NOT NULL,               -- IANA name, e.g. Europe/Zurich
  forecast_fetched_at timestamptz,                 -- NULL until the first fetch
  marine_available    boolean                      -- NULL until the first marine fetch
);

-- Caches geocoding. Places don't move, so rows never expire.
CREATE TABLE place_lookups (
  query_normalised text NOT NULL,                  -- trimmed, lower-cased
  country_code     text NOT NULL DEFAULT '',       -- '' = no filter; primary-key columns can't be NULL
  location_id      bigint NOT NULL REFERENCES locations (id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (query_normalised, country_code)
);

CREATE TABLE daily_weather (
  location_id                   bigint NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  date                          date NOT NULL,     -- local date at the location
  temp_max                      real NOT NULL,     -- °C
  temp_min                      real NOT NULL,     -- °C
  apparent_temp_max             real NOT NULL,     -- °C
  precipitation_sum             real NOT NULL,     -- mm
  precipitation_probability_max smallint NOT NULL, -- %
  snowfall_sum                  real NOT NULL,     -- cm
  snow_depth_max                real NOT NULL,     -- cm (Open-Meteo sends metres; converted when parsed)
  weather_code                  smallint NOT NULL, -- WMO code
  wind_speed_max                real NOT NULL,     -- km/h
  wind_gusts_max                real NOT NULL,     -- km/h
  sunshine_duration             real NOT NULL,     -- s
  daylight_duration             real NOT NULL,     -- s
  wave_height_max               real,              -- m; NULL without marine data
  swell_wave_height_max         real,              -- m; NULL without marine data
  swell_wave_period_max         real,              -- s; NULL without marine data
  PRIMARY KEY (location_id, date)
);
```

The primary keys cover every query (a place lookup, and a location's rows by date range), so there are no extra indexes.

**Refresh strategy: read-through cache with a TTL.**

1. Request comes in. Resolve the place, using `place_lookups` first and the Geocoding API on a miss.
2. If `forecast_fetched_at` is less than 3 h old and the stored days cover today through today+6 (location time), serve from the database.
3. Otherwise call the Forecast and Marine APIs in parallel, then replace that location's `daily_weather` rows and update `forecast_fetched_at` in a single transaction. Readers see either the old week or the new one, never a mix.
4. Concurrent requests for the same location share one in-flight upstream call (single-flight), so there is no stampede. This works per instance, which covers every request while there is only one (section 13).
5. If the upstream call fails, fall back to stale rows (FR6).

Why lazy refresh and not a cron job: we don't know in advance which places will be requested, and refreshing every location ever seen wastes calls. A scheduled job that warms popular locations can come later.

## 9. Scoring model

Every activity is a pure function: `(day: DailyWeather) => { score: 0–100, reasons: string[] }`. Each scorer combines a few weighted factors. Every factor is a piecewise-linear "comfort band" that maps a value to 0–1: full marks inside the ideal range, falling to 0 at hard limits. Hard caps handle conditions that rule an activity out, such as no snow or a thunderstorm.

The thresholds below are starting heuristics, not researched truths. They are tuned by checking results against known places, e.g. Zermatt in January, Biarritz in a swell, London in November.

| Activity | Factors (weight) | Hard caps |
|----------|------------------|-----------|
| Skiing | snow depth, 50 cm+ ideal (0.4) · fresh snowfall, 10 cm+ ideal (0.25) · max temp −10..0 °C (0.15) · gusts < 30 km/h (0.1) · weather/visibility (0.1) | snow depth < 10 cm → max 10 · gusts > 60 km/h → max 30 |
| Surfing | wave height 1–2.5 m (0.4) · swell period 10 s+ (0.3) · wind < 15 km/h (0.2) · weather (0.1) | no marine data → 0 · thunderstorm → max 10 · waves < 0.3 m → max 10 |
| Outdoor sightseeing | apparent temp 16–26 °C (0.3) · rain probability and amount (0.35) · sunshine share of daylight (0.15) · gusts (0.1) · weather (0.1) | thunderstorm → max 20 |
| Indoor sightseeing | `50 + 0.5 × (100 − outdoorScore)`, which ranges 50–100 | — |

Weekly score is the mean of the 7 daily scores. Activities are sorted by weekly score; ties are broken by the best day's score.

**Design for change.** Adding an activity means adding one scorer file and one enum value, registered in a single list. This is the most likely live-coding ask in the interview ("add hiking"), so it should take minutes.

## 10. Security

The API is public and read-only, and stores no user data. So the main risks are abuse that burns through the shared Open-Meteo quota, which would get the server's IP blocked for every user, and bad input that crashes the service or leaks internals. These are the basic controls:

| Risk | Control |
|------|---------|
| One client floods the API | Rate limit per client IP: 60 requests per minute (`@fastify/rate-limit`). Over the limit: HTTP 429 with `Retry-After`. |
| One request asks for many cities at once using GraphQL aliases (`a: activityForecast(...) b: activityForecast(...)`) | GraphQL Armor: at most 3 aliases, depth 6, 1,000 tokens. Batching stays off. A request can resolve at most 4 places. |
| Many clients together exhaust the Open-Meteo free tier (600 calls/min, 10,000/day) | A cap on our own upstream calls at half of that: 300/min and 5,000/day. Over the cap: serve stale data, or `UPSTREAM_UNAVAILABLE` if there is none. |
| Faked client IPs to dodge the rate limit | `trustProxy` set to Light Cloud's real number of proxy hops (checked on the first deploy), so a client can't spoof `X-Forwarded-For`. |
| Huge request bodies | Body limit of 16 KB (Fastify `bodyLimit`). Real queries are well under 1 KB. |
| Bad input | Validated in the resolver: `place` 1–100 characters after trimming, `countryCode` matches `^[A-Z]{2}$`. Open-Meteo URLs are built with `URLSearchParams`. |
| SQL injection | Parameterised queries only (`$1`, `$2`). SQL is never built from strings. |
| Malformed data from Open-Meteo | Parsed with zod (section 11). |
| Leaking internals in errors | Yoga masks unexpected errors: the client sees "Unexpected error", the log keeps the details. |
| Secrets in git | The only secret is `DATABASE_URL`. It is an environment variable on Light Cloud and lives in a git-ignored `.env` locally. |
| Vulnerable dependencies | `npm audit --omit=dev --audit-level=high` in CI. |

Deliberate choices:

- **No auth.** The data is public and read-only. API keys per client would be the next step for a real product.
- **CORS stays open.** There are no cookies or sessions, so a request from another site can't act on anyone's behalf.
- **GraphiQL and introspection stay on** in the Light Cloud deployment. It is a demo for reviewers, and the schema holds nothing secret. A real production API would turn them off.
- **Limits are kept in memory.** That is correct with one instance (section 13). This is a known shortcut: before running more than one instance, move the counters to Postgres or Redis.

## 11. Non-functional requirements

- **Performance:** a cached request takes under 50 ms on the server. A cold request is bounded by Open-Meteo, with a 5 s timeout per call.
- **Resilience:** one retry on network errors and 5xx responses. Stale fallback. Marine degrades on its own (FR6, FR7).
- **Validation:** GraphQL input is validated at the resolver. Open-Meteo responses are parsed with a schema validator (zod), because they are a trust boundary. Bad upstream data fails loudly instead of producing silent `NaN` scores.
- **Security:** see section 10.
- **Observability:** Fastify's built-in logger (pino) writes JSON logs: upstream calls (duration, status), cache hits and misses, rate-limit rejections. No metrics stack.
- **Type safety:** TypeScript `strict`. No `any` in domain code.
- **API documentation:** the GraphQL schema is the contract (the equivalent of an OpenAPI spec). Every type, field and enum value has a `"""description"""` giving units, ranges and timezone. The schema is committed as `schema.graphql` so changes show up in diffs. GraphiQL is served at `/graphql` (built into Yoga) with a pre-filled example query, playing the role of Swagger UI. The README has copy-paste `curl` and query examples, plus the error codes. Postman users can import the `curl` commands directly. A Bruno collection lives in `bruno/`: plain-text `.bru` files that sit in git and diff cleanly, unlike Postman's JSON exports. It covers these scenarios: ski town (Zermatt), surf town (Biarritz), inland surfing (Madrid), an ambiguous name (`Paris` + `countryCode: "US"`), place not found, and invalid input. Each request has assertions, so `bru run` also works as a smoke test before the demo. No generated docs site; the schema is small enough without one. GraphiQL stays on in the Light Cloud deployment so reviewers can use it there (section 10).
- **Code documentation:** comments explain *why*, not *what*: scoring thresholds, cache rules, workarounds for upstream API quirks. TSDoc only on the public functions of each module.
- **Testing:** see section 14.

## 12. Architecture

```
HTTP ── Fastify: rate limit, body limit, trusted proxy
         └── Yoga + GraphQL Armor: alias, depth and token limits
              └── resolver ── ForecastService ──┬── repositories ── PostgreSQL (pg)
                                   │             └── OpenMeteoClient (geocode, forecast, marine) + upstream cap
                                   └── scoring/ (pure: one scorer per activity + rank())
```

Proposed stack: Node 24 LTS, TypeScript, Fastify, GraphQL Yoga (SDL-first), GraphQL Armor, `@fastify/rate-limit`, PostgreSQL with `pg`, zod, vitest, ESLint, Prettier, tsx for dev. Each choice gets a line in the decision log when it's locked in.

Why Fastify under Yoga: it brings a tested rate limiter, a body limit, trusted-proxy handling and JSON logging, which would otherwise be hand-written. Light Cloud also recognises it as a framework.

Folder layout. Each folder is one concern and each file one idea:

```
src/
  server.ts          composition root: Fastify (rate limit, body limit), Yoga (GraphQL Armor), dependencies
  config.ts          environment variables parsed with zod, with defaults
  graphql/           schema.graphql, resolvers.ts, error mapping
  forecast/          forecast-service.ts (refresh, single-flight, stale fallback)
  open-meteo/        geocoding.ts, forecast.ts, marine.ts, schemas.ts (zod), budget.ts (upstream cap)
  storage/           db.ts (pg pool), migrate.ts, location-repo.ts, weather-repo.ts
  scoring/           band.ts, skiing.ts, surfing.ts, outdoor.ts, indoor.ts, rank.ts
migrations/          001_init.sql
test/fixtures/       recorded Open-Meteo responses
bruno/               API collection
docker-compose.yml   local PostgreSQL
```

## 13. Deployment (Light Cloud)

- **Topology:** one Light Cloud container app (Node.js runtime) and one managed PostgreSQL database (`shared-dev` tier), in the same workspace.
- **App:** created from the GitHub repo, branch `main`, redeployed on every push. Build with `npm run build` (`tsc`). Start with `npm start`, which runs the migrations and then the server. The app listens on `PORT`.
- **Pushing:** Light Cloud deploys on push without waiting for CI, so push only after `npm run check` passes locally.
- **Scaling:** `max_instances: 1`. The rate limits, the upstream cap and single-flight live in memory, which is only correct with one instance. `min_instances: 1` during the review window, so the first request isn't a cold start; 0 otherwise.
- **Config:** `DATABASE_URL` is Light Cloud's connection string for the database, set as an environment variable on the app. It is a secret, so it never appears in the repo, logs or docs.
- **Plan:** Light Cloud databases need a paid plan. Lite includes one shared database; Free has none.
- **Check on the first deploy:**
  - the Postgres major version, so `docker-compose.yml` can use the same one;
  - the connection limit of the shared tier, which sets the pool size;
  - whether the connection string requires SSL;
  - how many proxies add to `X-Forwarded-For`, which sets `trustProxy` (section 10);
  - which Node version the runtime uses, to match `engines`.
- **Demo:** the README links the live URL, so reviewers can use GraphiQL without cloning anything.

## 14. Engineering approach

### Clean code principles

- **Small, single-purpose units.** One scorer per activity and one client per Open-Meteo API. A function does one thing, and its name says what that thing is.
- **Readable first.** Use the words of the domain from the brief: `DailyWeather`, `ActivityScore`, `rankActivities`. Prefer clear names over comments. Comments explain *why*, never *what*.
- **Pure core, thin edges.** Scoring and ranking are pure functions with no I/O. HTTP, Postgres and the clock live at the edges, so most of the logic can be tested without mocks.
- **Explicit dependencies.** `fetch`, the database and `now()` are passed in through factory parameters. No hidden globals, no DI framework. This is what makes tests deterministic.
- **Types model the domain.** `Activity` is a closed union. Missing marine data is `null`, never `0` or `NaN`. TypeScript runs with `strict` and `noUncheckedIndexedAccess`.
- **Named constants instead of magic numbers.** Scoring thresholds are named constants that sit next to the scorer using them.
- **Errors in one place.** Typed domain errors (`LocationNotFoundError`, `UpstreamUnavailableError`) are mapped to GraphQL error codes once, in the GraphQL layer.
- **No premature abstraction.** No base classes, no generic repository, no plugin system beyond a list of scorers. Code is added when a real need appears.

### TDD

- **Red, green, refactor for domain logic:** scoring, ranking, and the refresh decision (fresh, stale or missing). The test is written first.
- **TDD shows in the git history.** A failing test is committed before the code that makes it pass, e.g. `test: skiing caps score below 10 cm snow depth` followed by `feat: ...`. Reviewers can follow the cycle commit by commit.
- **Pragmatic, not dogmatic.** Thin glue code (wiring, SQL) is covered by integration tests written afterwards, where test-first adds little.

### Testing strategy

| Level | What | How |
|-------|------|-----|
| Unit (most tests) | scorers, `band()`, ranking, response parsing, upstream cap | pure functions, no I/O, milliseconds |
| Integration | ForecastService with the repositories and clients | real Postgres (Docker locally, a service container in CI), fresh schema per run, fake `fetch` serving recorded fixtures, fake clock |
| API | GraphQL queries and HTTP limits end to end | `app.inject()` (Fastify) in process, no network |
| Smoke | the running server, locally or on Light Cloud | Bruno collection (`bru run`) |

The tests that matter most:

- **`band()` helper:** returns 1 inside the ideal range, 0 at and beyond the limits, and moves linearly in between. Boundary values are tested.
- **Skiing:** no snow caps the score at 10 or less. Deep fresh snow, cold and calm scores 80 or more. Strong gusts cap the score. Warm, slushy days are penalised.
- **Surfing:** no marine data gives 0 with a reason. A flat sea is capped. A good swell scores high. A thunderstorm is capped.
- **Outdoor and indoor sightseeing:** a thunderstorm caps outdoor. A mild sunny day scores high. Heavy rain scores low. Indoor moves opposite to outdoor and stays between 50 and 100.
- **Invariants across all fixtures:** every score is an integer from 0 to 100, and every score has at least one reason.
- **Ranking:**
  - Activities are sorted descending with ranks 1 to 4, and ties are broken by best day.
  - The weekly score is the mean of the daily scores.
  - `bestDay` is the highest-scoring day, taking the earlier date on a tie.
- **Refresh:**
  - Fresh data makes no upstream call.
  - Data older than the TTL is fetched again.
  - Data that no longer covers today (local midnight has passed) is fetched again.
  - Upstream failure with stale data serves it with `stale: true`.
  - Upstream failure with no data returns `UPSTREAM_UNAVAILABLE`.
  - Concurrent requests make exactly one upstream call.
  - A marine failure still returns the other activities.
- **Timezones:** "today" is computed in the location's timezone. For example, at 23:30 UTC it is already tomorrow in `Pacific/Auckland`.
- **Upstream parsing:**
  - zod rejects malformed responses.
  - Hourly `snow_depth` becomes a daily max.
  - Nulls are preserved.
- **Input:**
  - Empty or too-long `place` returns `BAD_USER_INPUT`.
  - An invalid `countryCode` is rejected.
  - An unknown place returns `LOCATION_NOT_FOUND`.
  - A repeated place is served from the geocoding cache without a second call.
- **Security** (limits are passed in, so tests use small numbers):
  - The request after the limit gets HTTP 429 with `Retry-After`.
  - A query with too many aliases is rejected before any Open-Meteo call.
  - Over the upstream cap, the service serves stale data, or `UPSTREAM_UNAVAILABLE`, without calling Open-Meteo.
  - A body over 16 KB gets HTTP 413.
  - The GraphiQL introspection query still passes the GraphQL limits.

Coverage is a signal, not a goal. Expect high coverage in `scoring/` and `forecast/`, and don't chase 100% on the glue code.

### Tooling and hygiene

- `npm run check` runs typecheck, lint and tests together. CI runs the same command.
- **GitHub Actions** runs `npm run check` on every push, with a Postgres service container for the integration tests, then `npm audit`. It takes minutes to set up and keeps `main` green.
- Prettier for formatting, ESLint with `typescript-eslint`, conventional commits.
- Node version pinned with `.nvmrc` and `engines`. The lockfile is committed.
- `.env.example` documents every setting: `PORT`, `DATABASE_URL`, TTL. The only secret is `DATABASE_URL`: an environment variable on Light Cloud, and a git-ignored `.env` locally.

### Definition of done (per change)

- Tests pass, and `npm run check` is clean.
- `docs/DECISIONS.md` is updated if a decision was made.
- The README is updated if behaviour or setup changed.

## 15. Delivery plan (5 working days)

| Day | Outcome |
|-----|---------|
| 1 | This PRD. API spike to resolve the section 7 unknowns. Private GitHub repo. Skeleton: TS, Fastify + Yoga, health check, vitest, ESLint, Prettier, `npm run check`, CI. Local Postgres in Docker. Skeleton deployed to Light Cloud with its database, and the section 13 checks done. |
| 2 | Open-Meteo client with zod parsing. Postgres schema and migrations. Read-through refresh with single-flight and stale fallback. |
| 3 | Scorers, ranking, unit tests. Sanity-check results against real places. |
| 4 | GraphQL schema, resolver, error codes, integration test. Security controls from section 10. Bruno collection. |
| 5 | README (live URL, how to run, assumptions, limitations, what I'd do next). Clean up the decision log. Check the live deployment end to end. Make the repo public. |

## 16. Risks

| Risk | Mitigation |
|------|------------|
| Scoring thresholds feel arbitrary to reviewers | Every score returns reasons. Thresholds live in one place. The README calls them heuristics. |
| Marine API behaviour inland is unclear | Day-1 spike. Surfing degrades on its own whatever the answer. |
| Ambiguous geocoding gives a surprising city | The resolved location is echoed back. `countryCode` filter. |
| Open-Meteo is down during the review demo | Stale fallback. Recorded fixtures for tests. Warm the database before the interview. |
| Abuse burns the Open-Meteo quota and gets the server's IP blocked | Rate limit, alias limit and upstream cap (section 10). |
| Light Cloud's Free plan has no database | The Lite plan (paid) includes one shared Postgres database. Decide before day 1. |
| The first demo request hits a cold start | `min_instances: 1` during the review window. |
| The shared database tier limits connections | Pool of 5. Check the real limit on the first deploy. |
| Scope creep | The non-goals list. Timebox each day. |

## 17. How the work is shown

The brief values process over polish, so the repo itself should show it:

- **Small, frequent commits** with messages that say why, not only what.
- **`docs/DECISIONS.md`:** a running log written as I go. Each entry gives the decision, the options considered and why this one won.
- **`docs/AI-NOTES.md`:** how AI was used, where it helped, and where it was wrong and I overrode it.
- **This PRD stays as written.** Assumptions that change get a dated note here instead of a silent edit.
