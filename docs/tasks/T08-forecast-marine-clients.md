# T08 · Forecast and marine clients

Day 2 · Size M (~2–3 h) · Depends on T03 · PRD §7, §8

**Goal:** Fetch a location's 7-day forecast and marine data, and return typed daily rows in the units of PRD §8.

## Decided

- Fresh snow is the previous day's snowfall (docs/DECISIONS.md, D6). The forecast request adds `past_days=1`. The parser uses that extra first day only to fill `freshSnowCm` on the next day, then drops it, so 7 days come out.
- Snow depth comes from the daily `snow_depth_max`, converted to centimetres (D8).

## Done when

- [ ] The forecast request asks for the daily fields in PRD §7 (including `snow_depth_max`), with `timezone=<location tz>`, `forecast_days=7` and `past_days=1`. No hourly data.
- [ ] The marine request asks for `wave_height_max`, `swell_wave_height_max` and `swell_wave_period_max`, with the same timezone and `forecast_days=7`.
- [ ] zod schemas: forecast values must be numbers, marine values may be `null`.
- [ ] Snow depth is converted from metres to centimetres once, in the parser. Field names carry the unit, e.g. `snowDepthMaxCm`.
- [ ] Each forecast day carries `freshSnowCm`, the previous day's `snowfall_sum`.
- [ ] Marine data where every value is `null` gives an empty result (no sea nearby). A failed marine request throws, so T10 can tell the two cases apart.
- [ ] Same timeout and retry rules as T07. `fetch` is passed in.

## Tests first

Use recorded real responses as fixtures:

- Zermatt's forecast (8 days with `past_days=1`) gives 7 days, and day 1's `freshSnowCm` is the snowfall of the day before.
- A snow depth of `0.39` m becomes `snowDepthMaxCm: 39`.
- Biarritz marine gives wave values.
- Madrid marine (every value `null`) gives an empty result.
- A forecast with a missing field throws.
