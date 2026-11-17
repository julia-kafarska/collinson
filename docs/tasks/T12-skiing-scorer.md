# T12 · Skiing scorer

Day 3 · Size S (~1 h) · Depends on T11 · PRD §9

**Goal:** Score one day for skiing, with reasons.

## Decided

- Fresh snow is the day's `freshSnowCm`: the previous day's snowfall, filled in by the parser (docs/DECISIONS.md, D6).

## Done when

- [x] Factors and weights from PRD §9: snow depth (0.4), fresh snowfall (0.25), max temperature (0.15), gusts (0.1), weather and visibility (0.1).
- [x] Caps: snow depth under 10 cm gives at most 10; gusts over 60 km/h give at most 30.
- [x] Thresholds are named constants in the scorer's file.
- [x] Every score has at least one reason, e.g. "Snow depth 39 cm" or "Gusts 70 km/h: lifts likely closed".

## Tests first

- No snow scores 10 or less.
- Deep snow, fresh snow, cold and calm scores 80 or more.
- Gusts of 65 km/h score 30 or less.
- A day at +8 °C scores lower than the same day at −5 °C.
- Also: the caps start strictly under 10 cm and over 60 km/h; a blizzard doesn't beat the clear day after it (D6); a cap's reason is given; reasons put the weak factors first; every score is an integer from 0 to 100 with a reason.

## Notes

- `scoreSkiing` is in `src/scoring/skiing.ts`. It isn't in a scorer list yet.
- Zero limits, ours for T15 to tune: snow depth and fresh snow at 0 cm, max temperature at −25 °C and +8 °C, gusts at 60 km/h.
- Reasons: a cap's reason stands alone. Otherwise there are three: the factors under half marks, costliest first, then the rest, biggest first.
- Values print as Open-Meteo sends them, e.g. "Fresh snow 2.73 cm". Rounding could make a cap's reason contradict it, e.g. 9.6 cm shown as "Thin snow: 10 cm".
- The blizzard regression scores 67 for the blizzard and 100 for the clear day after. Counting same-day snowfall instead would give 92 and 75.
