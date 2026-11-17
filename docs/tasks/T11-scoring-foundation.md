# T11 · Scoring foundation and ranking

Day 3, can start any time after T03 · Size S (~1.5 h) · Depends on T03 · PRD §9, Q1, Q5

**Goal:** The shared pieces every scorer uses, plus the ranking across activities.

## Done when

- [ ] A `DailyWeather` type in PRD units, with marine fields typed `number | null`.
- [ ] `band(value, { zeroBelow, idealMin, idealMax, zeroAbove })` returns 0–1: 1 inside the ideal range, 0 at and beyond the limits, linear in between.
- [ ] A scorer type, `(day) => { score: number; reasons: string[] }`, and a single list of scorers keyed by `Activity`.
- [ ] `rankActivities(days, scorers)` scores every day, then:
  - [ ] the weekly score is the rounded mean of the daily scores;
  - [ ] `bestDay` is the highest-scoring day, taking the earlier date on a tie;
  - [ ] activities are sorted by weekly score, highest first, with ranks 1 to n;
  - [ ] ties are broken by the best day's score.

## Tests first

- `band`: inside the range, at each limit, beyond each limit, and halfway.
- Ranking: order, ranks, tie-break, rounding of the mean, and a `bestDay` tie.

## Notes

- Adding an activity later means one scorer file, one entry in the list and one enum value (PRD §9).
