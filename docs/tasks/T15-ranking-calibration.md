# T15 · Ranking calibration with real weeks

Day 3 · Size S (~2 h) · Depends on T08, T12, T13, T14 · PRD §9

**Goal:** Check that the right activity wins for well-known places, and tune the thresholds until it does.

## Done when

- [ ] Real weeks recorded as fixtures: a snowy Zermatt week, a Biarritz swell week, a rainy London week, and a mild, sunny city week.
- [ ] One test per fixture checks the expected winner: SKIING, SURFING, INDOOR_SIGHTSEEING, OUTDOOR_SIGHTSEEING.
- [ ] One test over all fixtures checks that every score is an integer from 0 to 100 with at least one reason.
- [ ] Every threshold change is recorded in `docs/DECISIONS.md` with its reason.

## Notes

- Each scorer's own tests can pass while the ranking across activities is still wrong. This task is the check for that.
- This week's live data may not show the conditions you want, e.g. a snowy Zermatt in November. If so, edit a recorded week and say so in the file name, e.g. `zermatt-snowy-edited.json`.
