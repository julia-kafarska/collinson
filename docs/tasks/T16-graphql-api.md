# T16 · GraphQL schema and resolver

Day 4 · Size M (~3 h) · Depends on T10, T11–T14 · PRD §6, §10, §11, FR1–FR8

**Goal:** The `activityForecast` query works end to end, with clear errors.

## Done when

- [ ] `src/graphql/schema.graphql` matches PRD §6, with a `"""description"""` on every type, field and enum value (units, ranges, timezone).
- [ ] The resolver validates input and returns `BAD_USER_INPUT` when it fails: `place` must be 1–100 characters after trimming, and `countryCode` must match `^[A-Z]{2}$`.
- [ ] The resolver calls ForecastService, then `rankActivities`, and returns the location, `fetchedAt`, `stale` and the activities.
- [ ] Domain errors are mapped in one place: `LocationNotFoundError` becomes `LOCATION_NOT_FOUND` and `UpstreamUnavailableError` becomes `UPSTREAM_UNAVAILABLE`. Anything else is masked.
- [ ] GraphiQL opens with the example query from PRD §6 filled in.

## Tests first

Using `app.inject()` and a fake `fetch`:

- Zermatt returns 4 activities ranked 1 to 4, each with 7 days.
- An empty place returns `BAD_USER_INPUT`.
- `countryCode: "fra"` returns `BAD_USER_INPUT`.
- An unknown place returns `LOCATION_NOT_FOUND`.
- Upstream down with nothing stored returns `UPSTREAM_UNAVAILABLE`.
- An unexpected error returns "Unexpected error", with no stack trace in the response.
