# T10 · ForecastService: read-through refresh

Day 2 · Size M (~3–4 h) · Depends on T07, T08, T09 · PRD §8, FR2, FR5–FR8

**Goal:** One call, `getWeek(place, countryCode?)`, that returns the location and its next 7 days, and goes to Open-Meteo only when it has to.

## Decided

- Forecast and marine data are checked and refreshed separately, each with its own fetch time. A marine failure keeps the last good marine rows (docs/DECISIONS.md, D5).

## Done when

- [ ] The place is resolved from the lookup cache first, then from geocoding. No match throws `LocationNotFoundError`.
- [ ] Data counts as fresh when it was fetched less than the TTL ago **and** the rows cover today to today+6 in the location's timezone. Fresh data means no upstream call.
- [ ] Otherwise the forecast and marine data are fetched in parallel and stored in one transaction.
- [ ] Single-flight: concurrent calls for the same location share one refresh.
- [ ] If the refresh fails and rows are stored, they are returned with `stale: true`. If nothing is stored, it throws `UpstreamUnavailableError`.
- [ ] A marine failure doesn't stop the other activities (FR7), and it never overwrites stored marine rows.
- [ ] `fetchedAt` is returned.
- [ ] The clock (`now()`) is passed in, and "today" is computed in the location's timezone.
- [ ] Cache hits and misses, and upstream durations, are logged (PRD §11).

## Tests first

Fake `fetch`, fake clock, real Postgres:

- Fresh data makes zero fetch calls.
- Data older than the TTL is fetched again.
- Data is fetched again once local midnight has passed. For example, at 23:30 UTC it is already tomorrow in `Pacific/Auckland`.
- Upstream down with rows stored returns `stale: true`.
- Upstream down with nothing stored throws `UpstreamUnavailableError`.
- Two concurrent calls make one fetch.
- Marine down still stores and returns the forecast.
