# T09 · Repositories

Day 2 · Size M (~2–3 h) · Depends on T04 · PRD §8, §10

**Goal:** Read and write locations, place lookups, daily weather and daily marine data in Postgres.

## Decided

- Forecast and marine rows live in separate tables, each with its own fetch time (docs/DECISIONS.md, D5).

## Done when

- [x] `location-repo.findByLookup(query, countryCode)` normalises the query (trimmed, lower-cased) and stores "no country" as `''`.
- [x] `location-repo.save(location, query, countryCode)` upserts the location and its lookup.
- [x] `weather-repo.replaceForecast(locationId, days, fetchedAt)` replaces the location's `daily_weather` rows and sets `forecast_fetched_at`, in one transaction.
- [x] `weather-repo.replaceMarine(locationId, days, fetchedAt)` does the same for `daily_marine` and `marine_fetched_at`.
- [x] Reads return rows with `date >= today`, ordered by date, together with the fetch times.
- [x] Parameterised SQL only.

## Tests first

Integration tests on a fresh schema:

- A lookup without a country is found on the second call, with no duplicate row.
- Replacing a week twice still leaves 7 rows.
- A failing insert leaves the old week intact.
- Replacing marine rows leaves the forecast rows alone, and the other way round.
- Reads skip days before today.

## Notes

- Reading from today stops yesterday from appearing when stale data is served after local midnight.
- Checked by hand: with the location row locked, two `replaceForecast` calls for one location both succeed, because each sets its fetch time first and so waits for the other. With the fetch time set last, the second one failed on the primary key. No test covers this; it only matters once two refreshes of one location can overlap (more than one instance).
