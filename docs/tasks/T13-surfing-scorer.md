# T13 · Surfing scorer

Day 3 · Size S (~1 h) · Depends on T11 · PRD §9, Q3

**Goal:** Score one day for surfing, with reasons.

## Done when

- [ ] Factors and weights from PRD §9: wave height 1–2.5 m (0.4), swell period 10 s or more (0.3), wind under 15 km/h (0.2), weather (0.1).
- [ ] Caps:
  - [ ] no marine data gives 0, with the reason "no marine data for this location";
  - [ ] a thunderstorm (WMO codes 95–99) gives at most 10;
  - [ ] waves under 0.3 m give at most 10.
- [ ] Thresholds are named constants, and every score has at least one reason.

## Tests first

- Marine data `null` gives 0 with the reason.
- 0.2 m waves score 10 or less.
- 1.5 m waves at 12 s with light wind score high.
- A thunderstorm scores 10 or less.

## Notes

- T02: inland places get a normal response with every wave value `null`, and coastal towns snap to a nearby sea cell.
