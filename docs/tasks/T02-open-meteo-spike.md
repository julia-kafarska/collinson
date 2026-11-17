# T02 · Open-Meteo spike

Day 1 · Size S · Depends on — · PRD §7

Status: done on 2026-11-17 against the live API. PRD update pending.

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

## What this changes

- T07: a missing `results` key means "not found".
- T08: request daily `snow_depth_max`, convert metres to centimetres, and keep marine nulls.
- T13: all-null marine data means "no sea here". A failed request is a different case.
- T14: daylight can be 0, so the sunny share must not divide by zero.

## Done when

- [x] The three questions in PRD §7 are answered.
- [ ] PRD §7: the "Spike needed" list is replaced with these results, with a dated change-log note.
