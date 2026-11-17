# T14 · Outdoor and indoor sightseeing scorers

Day 3 · Size S (~1.5 h) · Depends on T11 · PRD §9, Q4

**Goal:** Score one day for outdoor and for indoor sightseeing, with reasons.

## Decided

- Indoor is `100 − outdoor` (docs/DECISIONS.md, D7). T15 checks it against real weeks.

## Done when

- [x] Outdoor factors and weights from PRD §9: apparent temperature 16–26 °C (0.3), rain probability and amount (0.35), sunny share of daylight (0.15), gusts (0.1), weather (0.1).
- [x] Outdoor cap: a thunderstorm gives at most 20.
- [x] The sunny share is 0 when daylight is 0 (polar night, T02). It is never `NaN`.
- [x] Indoor is `100 − outdoor`.
- [x] Thresholds are named constants, and every score has at least one reason.

## Tests first

- A mild, sunny day scores high outdoors.
- Heavy rain scores low outdoors.
- A thunderstorm scores 20 or less outdoors.
- `daylight_duration: 0` still gives a valid integer score.
- Indoor moves the opposite way to outdoor.

## Notes

- Rain is the mean of two bands: probability (ideal up to 20%, zero at 90%) and amount (ideal up to 0.5 mm, zero at 10 mm). Not the minimum: the probability is the day's highest hourly chance, so a passing shower can read 80% and would wipe out the factor.
- Other limits: feels-like zero at 0 °C and at 38 °C; gusts ideal up to 25 km/h, zero at 70 km/h. The sunny share is used as it is: a clear day logs about 95% of daylight (Zermatt fixture).
- Indoor reasons: from an outdoor score of 75, "Good weather outside: indoor sightseeing can wait". Below 75, every condition off its ideal is listed (thunderstorm, rain, feels-like, gusts, polar night). Precipitation includes snow, so a snowy day says "Rain or snow likely".
- For T15: under the PRD weights, a warm, calm downpour still scores about 41 outdoors, and a dry, calm polar-night day at −14 °C about 51, so it beats indoor (49). Fixing either needs a new cap or new weights, which is a PRD change.
