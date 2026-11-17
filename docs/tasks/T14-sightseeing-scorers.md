# T14 · Outdoor and indoor sightseeing scorers

Day 3 · Size S (~1.5 h) · Depends on T11 · PRD §9, Q4

**Goal:** Score one day for outdoor and for indoor sightseeing, with reasons.

## Decide first

- The indoor formula (see Open decisions on the [board](README.md)).

## Done when

- [ ] Outdoor factors and weights from PRD §9: apparent temperature 16–26 °C (0.3), rain probability and amount (0.35), sunny share of daylight (0.15), gusts (0.1), weather (0.1).
- [ ] Outdoor cap: a thunderstorm gives at most 20.
- [ ] The sunny share is 0 when daylight is 0 (polar night, T02). It is never `NaN`.
- [ ] Indoor is derived from outdoor, using the chosen formula.
- [ ] Thresholds are named constants, and every score has at least one reason.

## Tests first

- A mild, sunny day scores high outdoors.
- Heavy rain scores low outdoors.
- A thunderstorm scores 20 or less outdoors.
- `daylight_duration: 0` still gives a valid integer score.
- Indoor moves the opposite way to outdoor.
