# T11 · Scoring foundation and ranking

Day 3, can start any time after T03 · Size S (~1.5 h) · Depends on T03 · PRD §9, Q1, Q5

**Goal:** The shared pieces every scorer uses, plus the ranking across activities.

## Done when

- [x] A `DailyWeather` type in PRD units, with marine fields typed `number | null`. Already in `src/domain.ts`, written with the shared types before the parallel tasks.
- [x] `band(value, { zeroBelow, idealMin, idealMax, zeroAbove })` returns 0–1: 1 inside the ideal range, 0 at and beyond the limits, linear in between.
- [ ] A scorer type, `(day) => { score: number; reasons: string[] }`, and a single list of scorers keyed by `Activity`. The `Scorer` type is in `src/scoring/types.ts`. The list waits for T12–T14; until then `rankActivities` takes the scorers as a parameter.
- [x] `rankActivities(days, scorers)` scores every day, then:
  - [x] the weekly score is the rounded mean of the daily scores (0 with no days);
  - [x] `bestDay` is the highest-scoring day, taking the earlier date on a tie (`null` with no days);
  - [x] activities are sorted by weekly score, highest first, with ranks 1 to n;
  - [x] ties are broken by the best day's score, then by `ACTIVITIES` order, so the order is stable.

## Tests first

- `band`: inside the range, at each limit, beyond each limit, and halfway.
- Ranking: order, ranks, tie-break, rounding of the mean, and a `bestDay` tie.

## Notes

- Adding an activity later means one scorer file, one entry in the list and one enum value (PRD §9).
- Helpers for T12–T14 in `src/scoring/`: `band` (`band.ts`), `weightedScore` and `capScore` (`score.ts`), and `isThunderstorm`, `weatherQuality` and `describeWeather` for WMO codes (`weather-code.ts`).
- `band` throws a `RangeError` when the limits are out of order, or when an open end has only one infinite limit (that slope would compute ∞/∞). Where an ideal limit meets a zero limit, the ideal wins, so a band from 0 km/h scores calm air as 1. NaN gives 0, never 1.
- `weightedScore` throws a `RangeError` when the weights add up to 0 or less, so it never returns `NaN`.
