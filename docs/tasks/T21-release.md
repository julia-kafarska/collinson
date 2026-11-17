# T21 · Release

Day 5 · Size S (~1 h) · Depends on T20 · PRD §13, §16

**Goal:** The finished service is live, the repo is public, and the recruiter knows.

## Done when

- [ ] `main` is deployed to Light Cloud, and `bru run --env light-cloud` passes.
- [ ] `min_instances: 1` for the review window. Set it back to 0 afterwards.
- [ ] Files and `git log` are checked for anything that must not be public, and then the repo is made public.
- [ ] The recruiter has been told the work is done, with the repo link and the live URL.
- [ ] Less than 3 h before the interview, the database is warmed by running the Bruno collection against the live URL. The data is then inside the refresh window, so the demo works even if Open-Meteo is down.
