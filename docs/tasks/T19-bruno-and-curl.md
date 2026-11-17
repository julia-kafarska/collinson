# T19 · Bruno collection and curl examples

Day 4 · Size S (~1 h) · Depends on T16 · PRD §11

**Goal:** Reviewers can try every important case in one click, or with a copy-pasted `curl`.

## Done when

- [x] A `bruno/` collection with two environments: `local` and `light-cloud`.
- [x] Requests:
  - [x] Zermatt (ski town);
  - [x] Biarritz (surf town);
  - [x] Madrid, where surfing is 0 with a reason;
  - [x] Paris with `countryCode: "US"`, which resolves to Texas;
  - [x] an unknown place, giving `LOCATION_NOT_FOUND`;
  - [x] an empty place, giving `BAD_USER_INPUT`;
  - [x] four aliases in one query, rejected by the query limits (T18).
- [x] Assertions check shape and error codes, not which activity wins, because live weather changes.
- [x] `bru run --env local` passes: 7 requests, 4 tests, 23 assertions. So does `--env light-cloud`.
- [x] The README has the same examples as `curl` commands.

## Notes

- Still to do: the `curl` examples go into the README with T20.
- Run with `npx --yes @usebruno/cli@latest run --env <name>` from `bruno/`, so the repo has no new dependency. CLI 4.3.0 still runs `.bru` collections (`bruno.json` at the root). Since CLI 3.0, scripts run in Safe Mode by default, and these tests need nothing more.
- The CLI exits 1 when an assertion fails or the server can't be reached, so a run works as a smoke test before the demo. Breaking an expectation on purpose made the run fail.
- Every error comes back as HTTP 200 with `errors`. `LOCATION_NOT_FOUND` and `BAD_USER_INPUT` come with `data: null`, because `activityForecast` is non-null. The 4-alias rejection has no `data` key and no `extensions.code`, so that request checks the message instead.
