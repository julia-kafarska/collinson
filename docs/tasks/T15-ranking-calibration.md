# T15 · Ranking calibration with real weeks

Day 3 · Size S (~2 h) · Depends on T08, T12, T13, T14 · PRD §9

**Goal:** Check that the right activity wins for well-known places, and tune the thresholds until it does.

## Done when

- [x] Real weeks recorded as fixtures: a ski resort with deep snow (Olympic Valley), a surf spot (Malibu), a rainy city (Brussels), and a mild, sunny city (Málaga). Why not Zermatt, Biarritz and London: see Notes.
- [x] One test per fixture checks the expected winner: SKIING, SURFING, INDOOR_SIGHTSEEING, OUTDOOR_SIGHTSEEING.
- [x] One test over all fixtures checks that every score is an integer from 0 to 100 with at least one reason.
- [ ] Every threshold change is recorded in `docs/DECISIONS.md` with its reason. The three changes are listed below, for the lead to record.

## Notes

- Each scorer's own tests can pass while the ranking across activities is still wrong. This task is the check for that.
- Fixtures: `test/fixtures/week-<place>-{forecast,marine}.json`, raw responses recorded with curl on 2026-11-17 at 10:29 UTC, using the exact URLs `fetchForecast` and `fetchMarine` build. None is edited. The test is `src/scoring/calibration.test.ts`.
- Places, from a survey of 51 live weeks:
  - **Olympic Valley** (Palisades Tahoe, 1,894 m): 13 cm of snow, then a storm adds 84 cm over two days with the lifts shut, then 1.03–1.29 m. No resort had 50 cm on the first day this week. Zermatt village has 0–42 cm of wet early snow, so INDOOR wins there, which is fair.
  - **Malibu**: waves of 0.8–2.3 m at 7–13 s. Biarritz has a 4–5.4 m swell, too big for most surfers, so it can't be the SURFING week.
  - **Brussels**: four wet days (2–24 mm, 10–16 mm of it in daytime on two) with gusts up to 76 km/h. London's 38 mm falls mostly at night (no more than 2.5 mm a day between 08:00 and 18:00), so it isn't a rainy week by day, and its near-tie (OUTDOOR 51, INDOOR 48) is fair. Daily totals can't tell night rain from day rain.
  - **Málaga**: dry and mostly sunny, feeling like 19–27 °C.
- Red before tuning: Olympic Valley ranked `INDOOR_SIGHTSEEING 72 > SKIING 60`. Indoor is `100 − outdoor`, and outdoors in a ski resort is cold and snowy, so indoor scored 96–98 on the storm days and 55–76 on the powder days. Two storm days outweighed four ski days of 63–91. Every surveyed resort with 25 cm of snow or more on some day ranked INDOOR first, except Snowbird (SKIING 62, INDOOR 61).

## Tuning

PRD §9's weights are unchanged. Each change has a test in the scorer's own test file.

| Change | Old | New | Why |
|--------|-----|-----|-----|
| Indoor sightseeing cap | none: `100 − outdoor` | at most 65 | A day indoors is a fallback, not a highlight. 65 is the least a day scores when its main conditions suit an outdoor activity: skiing on a deep base in cold, calm air, or mild, dry sightseeing. The cap only applies when outdoors scores under 35, so it never changes which sightseeing wins a day. |
| Outdoor sightseeing cap for heavy rain | none | at most 30 when rain is likely (50%+) and 10 mm or more | A likely soaking rules out a day on foot, however warm and calm. The weights gave a warm, calm 18 mm downpour 41, and 45 mm in Peniche 44. Both limits already existed: "likely" and the rain band's soaking limit. |
| Surfing: wave height zero limit, and a new cap | zero at 5 m, no cap | zero at 4 m, at most 30 from 4 m | From 4 m most breaks close out and the waves are too big for most surfers. Swell period and wind alone still gave such a day 50–60, e.g. 5.4 m at 12 s. 30 leaves room for experts at a sheltered break. |

| Fixture | Before | After |
|---------|--------|-------|
| Olympic Valley | INDOOR 72 > SKIING 60 > OUTDOOR 28 > SURFING 0 | SKIING 60 > INDOOR 59 > OUTDOOR 28 > SURFING 0 |
| Malibu | SURFING 83 > OUTDOOR 79 > INDOOR 21 > SKIING 10 | SURFING 83 > OUTDOOR 78 > INDOOR 21 > SKIING 10 |
| Brussels | INDOOR 57 > OUTDOOR 43 > SKIING 7 > SURFING 0 | INDOOR 53 > OUTDOOR 43 > SKIING 7 > SURFING 0 |
| Málaga | OUTDOOR 90 > SURFING 23 > INDOOR 10 > SKIING 10 | OUTDOOR 90 > SURFING 23 > INDOOR 10 > SKIING 10 |

- Across the 51 surveyed weeks, five winners change: Mammoth Lakes and Olympic Valley to SKIING, Newquay (huge, stormy surf) to INDOOR, Peniche (4–4.7 m days) to OUTDOOR, and Manchester (two wet days, three dry ones) to OUTDOOR, 49 against 48.
- Limits:
  - Olympic Valley wins by 1 point, so a small change to any scorer can flip it. The test is there to catch that.
  - Weeks that are mostly storm still rank INDOOR first, e.g. Val Thorens (INDOOR 64, SKIING 59) and Tignes.
  - A more principled fix would make indoor `100 −` the best outdoor activity's score, but that couples the scorers. It isn't done.
  - T14's polar-night weak spot is unchanged: a dry, calm day at −14 °C scores about 51 outdoors.
