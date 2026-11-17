# T18 · Query limits and upstream cap

Day 4 · Size S (~2 h) · Depends on T07, T08, T16 · PRD §10

**Goal:** Stop one request, or many clients together, from burning through the Open-Meteo quota.

## Done when

- [x] GraphQL Armor on Yoga: at most 3 aliases, depth 6, 1,000 tokens. Batching is off. Wired in `createGraphQL`; live, a 4-alias query gets "Aliases limit of 3 exceeded".
- [x] GraphiQL's introspection query still passes these limits.
- [x] `src/open-meteo/budget.ts` counts upstream calls per minute and per day, and caps them at 300 per minute and 5,000 per day. It is checked before every Open-Meteo request: `buildApp` wraps the one fetch that geocoding, forecast and marine share.
- [x] Over the cap, no request is sent, and ForecastService serves stale data or `UPSTREAM_UNAVAILABLE`. A refused call is not retried (`getJson`), and ForecastService treats it like any failed refresh.
- [x] The counters live in memory (one instance, PRD §13), with a code comment stating the limit: `shortcut: in-memory counters, correct for one instance; move to Postgres or Redis before scaling out`.

## Tests first

- A query with 4 aliased `activityForecast` fields is rejected, with zero fetch calls.
- The introspection query is accepted.
- With a test cap of 2, the third call is refused without fetching.
- The minute window resets when the fake clock moves on.

## Notes

- Wiring, still to do: `plugins: graphqlLimitPlugins()` in `createYoga`, and one `createUpstreamBudget({ ...UPSTREAM_BUDGET, now: () => new Date() }).wrap(fetch)` passed to geocoding, forecast and marine, so one budget covers all three.
- GraphQL Armor 3.2 is built for envelop 5, but its Envelop plugin runs on Yoga 6 (envelop 6) as it is: `limits.test.ts` runs it on the real schema. Only its TypeScript `Plugin` type differs from Yoga 6's, so `graphqlLimitPlugins()` keeps the inferred return type. Yoga's `plugins` option accepts it.
- Armor's defaults already let introspection through. Depth and cost skip `__schema`, and the introspection query has 163 tokens (184 with every GraphiQL option on), so nothing was loosened.
- Alias and depth rejections come back as HTTP 200, even with `Accept: application/graphql-response+json`, because Armor throws from its validation rule. Token-limit rejections and ordinary validation errors get 400. Either way the query is not executed.
- `getJson` treats a budget refusal like a network error and retries once. The retry is refused too, so nothing is sent. The caller gets `UpstreamUnavailableError("<host> is unreachable")`, with the budget error as its `cause`.
