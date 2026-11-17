# T10 · ForecastService: read-through refresh

Day 2 · Size M (~3–4 h) · Depends on T07, T08, T09 · PRD §8, FR2, FR5–FR8

**Goal:** One call, `getWeek(place, countryCode?)`, that returns the location and its next 7 days, and goes to Open-Meteo only when it has to.

## Decided

- Forecast and marine data are checked and refreshed separately, each with its own fetch time. A marine failure keeps the last good marine rows (docs/DECISIONS.md, D5).

## Done when

- [x] The place is resolved from the lookup cache first, then from geocoding. No match throws `LocationNotFoundError`.
- [x] Data counts as fresh when it was fetched less than the TTL ago **and** the rows cover today to today+6 in the location's timezone. Fresh data means no upstream call.
- [x] Otherwise the stale sources are fetched in parallel, and each one is stored in its own transaction (`replaceForecast`, `replaceMarine`; D5).
- [x] Single-flight: concurrent calls for the same location share one refresh.
- [x] If the refresh fails and rows are stored, they are returned with `stale: true`. If nothing is stored, it throws `UpstreamUnavailableError`.
- [x] A marine failure doesn't stop the other activities (FR7), and it never overwrites stored marine rows.
- [x] `fetchedAt` is returned.
- [x] The clock (`now()`) is passed in, and "today" is computed in the location's timezone.
- [x] Cache hits and misses, and upstream durations, are logged (PRD §11).

## Tests first

Fake `fetch`, fake clock, real Postgres:

- Fresh data makes zero fetch calls.
- Data older than the TTL is fetched again.
- Data is fetched again once local midnight has passed. For example, at 23:30 UTC it is already tomorrow in `Pacific/Auckland`.
- Upstream down with rows stored returns `stale: true`.
- Upstream down with nothing stored throws `UpstreamUnavailableError`.
- Two concurrent calls make one fetch.
- Marine down still stores and returns the forecast.

## Notes

- `src/forecast/dates.ts` computes "today" in a timezone with `Intl.DateTimeFormat('en-CA')`, which formats dates as YYYY-MM-DD. No date library is needed.
- Freshness is decided per source. Inside the TTL, a marine source with no rows means "no sea nearby", so it isn't fetched again.
- `stale` is true only when older stored data is served. Missing marine data (a first fetch that failed) gives `marine: null`, not `stale`.
- Known gap: a request that joins a refresh already running for the same location waits for it, and doesn't start a second one for a source the first didn't cover. It may then serve that source as stale until the next request.
