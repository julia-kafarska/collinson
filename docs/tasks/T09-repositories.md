# T09 · Repositories

Day 2 · Size M (~2–3 h) · Depends on T04 · PRD §8, §10

**Goal:** Read and write locations, place lookups and daily weather in Postgres.

## Decide first

- How marine data is stored (see Open decisions on the [board](README.md)).

## Done when

- [ ] `location-repo.findByLookup(query, countryCode)` normalises the query (trimmed, lower-cased) and stores "no country" as `''`.
- [ ] `location-repo.save(location, query, countryCode)` upserts the location and its lookup.
- [ ] `weather-repo.replaceWeek(locationId, rows, fetchedAt)` deletes and inserts the location's rows and sets `forecast_fetched_at`, all in one transaction.
- [ ] `weather-repo.readFrom(locationId, today)` returns rows with `date >= today`, ordered by date.
- [ ] Parameterised SQL only.

## Tests first

Integration tests on a fresh schema:

- A lookup without a country is found on the second call, with no duplicate row.
- Calling `replaceWeek` twice still leaves 7 rows.
- A failing insert leaves the old week intact.
- `readFrom` skips days before today.

## Notes

- `readFrom(today)` stops yesterday from appearing when stale data is served after local midnight.
