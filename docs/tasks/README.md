# Tasks

The work in [`docs/PRD.md`](../PRD.md) (v0.3), split into tasks of about 30 minutes to 4 hours. There is one file per task. The days follow the delivery plan in PRD §15.

## Progress

**97% done** · 143 of 145 checklist items · 21 of 22 tasks · updated 2026-11-17

- **Public repo:** https://github.com/julia-kafarska/collinson. CI is green on every push.
- **Live:** https://main-collinson-prod-team.light-cloud.io/graphql. The Bruno collection passes against it (23/23).
- **Done:** T01–T20 and T22. Every hardcoded text and limit is in `src/const/` (D15).
- **T21, left for you:**
  - tell the recruiter (repo plus live URL);
  - one instance is kept running for the review window (`min_instances: 1`, since 2026-11-17); set it back to 0 afterwards;
  - run the Bruno collection less than 3 h before the interview, so the database is warm.

## How to work a task

1. Read the task and the PRD sections it points to.
2. Write the tests under "Tests first" and watch them fail. Make them pass, then tidy up.
3. Commit in small steps, with the task ID in the message, e.g. `feat: geocoding client (T07)`. Push a failing-test commit together with the commit that makes it pass.
4. A task is done when every box is ticked and `npm run check` is clean. Update its status on the board.
5. Any decision made along the way goes in `docs/DECISIONS.md`.

## Board

| ID | Task | Day | Size | Depends on | Status |
|----|------|-----|------|------------|--------|
| [T01](T01-repo-setup.md) | Repo setup and hygiene | 1 | S · 30 min | — | done |
| [T02](T02-open-meteo-spike.md) | Open-Meteo spike | 1 | S | — | done |
| [T03](T03-project-skeleton.md) | Project skeleton | 1 | M · 2–3 h | T01 | done |
| [T04](T04-postgres-and-migrations.md) | Local Postgres and migrations | 1 | M · 2–3 h | T03 | done |
| [T05](T05-ci.md) | CI pipeline | 1 | S · 45 min | T04 | done |
| [T06](T06-light-cloud-skeleton.md) | Light Cloud walking skeleton | 1 | S · 1.5 h | T04, T05 | done |
| [T07](T07-geocoding-client.md) | Geocoding client | 2 | S · 1 h | T03 | done |
| [T08](T08-forecast-marine-clients.md) | Forecast and marine clients | 2 | M · 2–3 h | T03 | done |
| [T09](T09-repositories.md) | Repositories | 2 | M · 2–3 h | T04 | done |
| [T10](T10-forecast-service.md) | ForecastService: read-through refresh | 2 | M · 3–4 h | T07, T08, T09 | done |
| [T11](T11-scoring-foundation.md) | Scoring foundation and ranking | 3 | S · 1.5 h | T03 | done |
| [T12](T12-skiing-scorer.md) | Skiing scorer | 3 | S · 1 h | T11 | done |
| [T13](T13-surfing-scorer.md) | Surfing scorer | 3 | S · 1 h | T11 | done |
| [T14](T14-sightseeing-scorers.md) | Outdoor and indoor sightseeing scorers | 3 | S · 1.5 h | T11 | done |
| [T15](T15-ranking-calibration.md) | Ranking calibration with real weeks | 3 | S · 2 h | T08, T12, T13, T14 | done |
| [T16](T16-graphql-api.md) | GraphQL schema and resolver | 4 | M · 3 h | T10, T11–T14 | done |
| [T17](T17-http-protection.md) | HTTP protection | 4 | S · 1.5 h | T03, T06 | done |
| [T18](T18-query-limits-upstream-cap.md) | Query limits and upstream cap | 4 | S · 2 h | T07, T08, T16 | done |
| [T19](T19-bruno-and-curl.md) | Bruno collection and curl examples | 4 | S · 1 h | T16 | done |
| [T20](T20-readme-and-docs.md) | README and process docs | 5 | S · 2 h | T15–T19 | done |
| [T21](T21-release.md) | Release | 5 | S · 1 h | T20 | mostly done: telling the recruiter and the warm-up are yours |
| [T22](T22-constants-folder.md) | Hardcoded constants in `src/const` | 5 | M · 2 h | T15 (part B) | done |

Sizes: S is up to 2 hours, M is 2–4 hours.

## Order

- Critical path: T03 → T04 → T09 → T10 → T16 → T18 → T20 → T21.
- T07 and T08 can run alongside T04.
- T11–T14 are pure code with no I/O, so they can start any time after T03.
- Day 2 is the fullest (about 9 hours). Day 5 has about 4 hours of slack to absorb overruns.

## Decisions

Each decision is recorded in [`docs/DECISIONS.md`](../DECISIONS.md), and the PRD's change log notes when it changes the PRD.

| Decision | Blocks | Outcome |
|----------|--------|---------|
| Light Cloud workspace and plan. | T06 | `prod-team`, already on the paid Starter plan. |
| Publish the brief `.docx`? Its metadata names two of the company's staff, and the file is their assessment. | T01 | Kept out of git (D4). |
| How a Marine API failure is stored. | T04, T09, T10 | Marine data in its own table with its own fetch time (D5). |
| Same-day or previous-day fresh snow. | T08, T12 | The previous day's snowfall, via `past_days=1` (D6). |
| Indoor sightseeing formula. | T14 | `100 − outdoor`, which T15 confirms (D7). |
