# T08 · Forecast and marine clients

Day 2 · Size M (~2–3 h) · Depends on T03 · PRD §7, §8

**Goal:** Fetch a location's 7-day forecast and marine data, and return typed daily rows in the units of PRD §8.

## Decide first

- Same-day or previous-day fresh snow (see Open decisions on the [board](README.md)). Previous-day means adding `past_days=1` here.

## Done when

- [ ] The forecast request asks for the daily fields in PRD §7 plus `snow_depth_max`, with `timezone=<location tz>` and `forecast_days=7`. No hourly data (T02).
- [ ] The marine request asks for `wave_height_max`, `swell_wave_height_max` and `swell_wave_period_max`, with the same timezone and number of days.
- [ ] zod schemas: forecast values must be numbers, marine values may be `null`.
- [ ] Snow depth is converted from metres to centimetres once, in the parser. Field names carry the unit, e.g. `snowDepthMaxCm`.
- [ ] Marine data where every value is `null` gives `marine: null` (no sea nearby). A failed marine request throws its own error, so T10 can tell the two cases apart.
- [ ] Same timeout and retry rules as T07. `fetch` is passed in.

## Tests first

Use recorded real responses as fixtures:

- Zermatt forecast gives 7 rows, and `0.39` m becomes `snowDepthMaxCm: 39`.
- Biarritz marine gives wave values.
- Madrid marine (every value `null`) gives `null`.
- A forecast with a missing field throws.

## Notes

- PRD §7 still says hourly snow depth. T02 updates it.
