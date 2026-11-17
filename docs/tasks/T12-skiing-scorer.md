# T12 · Skiing scorer

Day 3 · Size S (~1 h) · Depends on T11 · PRD §9

**Goal:** Score one day for skiing, with reasons.

## Decided

- Fresh snow is the day's `freshSnowCm`: the previous day's snowfall, filled in by the parser (docs/DECISIONS.md, D6).

## Done when

- [ ] Factors and weights from PRD §9: snow depth (0.4), fresh snowfall (0.25), max temperature (0.15), gusts (0.1), weather and visibility (0.1).
- [ ] Caps: snow depth under 10 cm gives at most 10; gusts over 60 km/h give at most 30.
- [ ] Thresholds are named constants in the scorer's file.
- [ ] Every score has at least one reason, e.g. "Snow depth 39 cm" or "Gusts 70 km/h: lifts likely closed".

## Tests first

- No snow scores 10 or less.
- Deep snow, fresh snow, cold and calm scores 80 or more.
- Gusts of 65 km/h score 30 or less.
- A day at +8 °C scores lower than the same day at −5 °C.
