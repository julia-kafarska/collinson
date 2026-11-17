# T02 · Open-Meteo spike

Day 1 · Size S · Depends on — · PRD §7

Status: done on 2026-11-17 against the live API. Results are in PRD §7 (v0.3).

**Goal:** Answer the PRD's open questions about Open-Meteo before writing the clients.

## Results

Geocoding (`geocoding-api.open-meteo.com/v1/search`):

- "Paris" returns Paris, France first (population 2.1 M), then Paris, Texas. Assumption Q2 holds.
- `countryCode=US` filters the results, so Paris, Texas comes first.
- "Paris, France" also returns Paris, France first.
- An unknown name returns `{"generationtime_ms": …}` with **no `results` key**, not an empty list. A one-letter name returns the same.

Forecast (`api.open-meteo.com/v1/forecast`):

- Every daily field in PRD §7 exists. With `timezone=Europe/Zurich`, the first day is today in local time.
- Units: `snowfall_sum` is in **cm**, snow depth is in **m** (Zermatt: `0.39`).
- A daily `snow_depth_max` exists, so no hourly data or aggregation is needed.
- Polar night: Longyearbyen returns `daylight_duration: 0` and `sunshine_duration: 0` for all 7 days. Tromsø does the same from 30 November.
- No nulls in Zermatt's 7-day window.

Marine (`marine-api.open-meteo.com/v1/marine`):

- Inland places (Madrid, Zermatt, London) get HTTP 200 with every wave value `null`.
- Coastal towns snap to a nearby sea cell and get data: Biarritz, Hossegor, Newquay, Nazaré, Ericeira, Malibu, Honolulu.

## Found later, while building T07 and T08

- Geocoding leaves out keys it has no value for: `country` and `admin1` for places like Antarctica, `elevation` for some US places. The client maps them to `null`.
- Geocoding can also leave out `timezone` (e.g. "Gibraltar Range National Park"). No top match without one was found, but such a match would surface as `UPSTREAM_UNAVAILABLE`. This is a known limitation.
- An elevation of `-9999` is a "no data" placeholder. It is only echoed back to the client, never used in scoring.
- Snow depth can rise on a day with no reported snowfall (Zermatt: 0.01 m to 0.35 m on 19 November with `snowfall_sum` 0). The models disagree with each other, so T15 must not expect them to agree.
- Floating point: `0.29 * 100 = 28.999999999999996`, so the cm conversion rounds to 0.1 cm.

## What this changes

- T07: a missing `results` key means "not found".
- T08: request daily `snow_depth_max`, convert metres to centimetres, and keep marine nulls.
- T13: all-null marine data means "no sea here". A failed request is a different case.
- T14: daylight can be 0, so the sunny share must not divide by zero.

## Done when

- [x] The three questions in PRD §7 are answered.
- [x] PRD §7: the "Spike needed" list is replaced with these results, with a dated change-log note.
