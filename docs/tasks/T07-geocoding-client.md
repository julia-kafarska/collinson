# T07 · Geocoding client

Day 2 · Size S (~1 h) · Depends on T03 · PRD §7, §10, FR1, FR2

**Goal:** `geocode(place, countryCode?)` returns the top match, or `null` when there is none.

## Done when

- [ ] The URL is built with `URLSearchParams`: `name`, `count=1`, `language=en`, `format=json`, and `countryCode` when given.
- [ ] The response is parsed with zod. `results` is optional, and a missing key means "not found" (T02).
- [ ] It returns `{ id, name, country, region, latitude, longitude, elevation, timezone }`, with `region` taken from `admin1`.
- [ ] 5 s timeout and one retry on network errors and 5xx. Any other failure throws `UpstreamUnavailableError`.
- [ ] `fetch` is passed in.

## Tests first

Use recorded real responses as fixtures:

- "Paris" gives Paris, France.
- "Paris" with `US` gives Paris, Texas.
- An unknown name (the real response with no `results` key) gives `null`.
- Malformed JSON throws.
- A 503 followed by a 200 retries once and succeeds.

## Notes

- Save the fixtures as `test/fixtures/geocoding-*.json` from real calls. Hand-written fixtures hid the missing-`results` case.
