# T18 · Query limits and upstream cap

Day 4 · Size S (~2 h) · Depends on T07, T08, T16 · PRD §10

**Goal:** Stop one request, or many clients together, from burning through the Open-Meteo quota.

## Done when

- [ ] GraphQL Armor on Yoga: at most 3 aliases, depth 6, 1,000 tokens. Batching is off.
- [ ] GraphiQL's introspection query still passes these limits.
- [ ] `src/open-meteo/budget.ts` counts upstream calls per minute and per day, and caps them at 300 per minute and 5,000 per day. It is checked before every Open-Meteo request: geocoding, forecast and marine.
- [ ] Over the cap, no request is sent, and ForecastService serves stale data or `UPSTREAM_UNAVAILABLE`.
- [ ] The counters live in memory (one instance, PRD §13), with a code comment stating the limit: `shortcut: in-memory counters, correct for one instance; move to Postgres or Redis before scaling out`.

## Tests first

- A query with 4 aliased `activityForecast` fields is rejected, with zero fetch calls.
- The introspection query is accepted.
- With a test cap of 2, the third call is refused without fetching.
- The minute window resets when the fake clock moves on.
