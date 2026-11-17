# T19 · Bruno collection and curl examples

Day 4 · Size S (~1 h) · Depends on T16 · PRD §11

**Goal:** Reviewers can try every important case in one click, or with a copy-pasted `curl`.

## Done when

- [ ] A `bruno/` collection with two environments: `local` and `light-cloud`.
- [ ] Requests:
  - [ ] Zermatt (ski town);
  - [ ] Biarritz (surf town);
  - [ ] Madrid, where surfing is 0 with a reason;
  - [ ] Paris with `countryCode: "US"`, which resolves to Texas;
  - [ ] an unknown place, giving `LOCATION_NOT_FOUND`;
  - [ ] an empty place, giving `BAD_USER_INPUT`.
- [ ] Assertions check shape and error codes, not which activity wins, because live weather changes.
- [ ] `bru run --env local` passes.
- [ ] The README has the same examples as `curl` commands.
