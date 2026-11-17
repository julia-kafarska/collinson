# Tasks

The work in [`docs/PRD.md`](../PRD.md) (v0.2), split into tasks of about 30 minutes to 4 hours. There is one file per task. The days follow the delivery plan in PRD §15.

## How to work a task

1. Read the task and the PRD sections it points to.
2. Write the tests under "Tests first" and watch them fail. Make them pass, then tidy up.
3. Commit in small steps, with the task ID in the message, e.g. `feat: geocoding client (T07)`. Push a failing-test commit together with the commit that makes it pass.
4. A task is done when every box is ticked and `npm run check` is clean. Update its status on the board.
5. Any decision made along the way goes in `docs/DECISIONS.md`.

## Board

| ID | Task | Day | Size | Depends on | Status |
|----|------|-----|------|------------|--------|
| [T01](T01-repo-setup.md) | Repo setup and hygiene | 1 | S · 30 min | — | todo |
| [T02](T02-open-meteo-spike.md) | Open-Meteo spike | 1 | S | — | done, PRD update pending |
| [T03](T03-project-skeleton.md) | Project skeleton | 1 | M · 2–3 h | T01 | todo |
| [T04](T04-postgres-and-migrations.md) | Local Postgres and migrations | 1 | M · 2–3 h | T03 | todo |
| [T05](T05-ci.md) | CI pipeline | 1 | S · 45 min | T04 | todo |
| [T06](T06-light-cloud-skeleton.md) | Light Cloud walking skeleton | 1 | S · 1.5 h | T04, T05 | todo |
| [T07](T07-geocoding-client.md) | Geocoding client | 2 | S · 1 h | T03 | todo |
| [T08](T08-forecast-marine-clients.md) | Forecast and marine clients | 2 | M · 2–3 h | T03 | todo |
| [T09](T09-repositories.md) | Repositories | 2 | M · 2–3 h | T04 | todo |
| [T10](T10-forecast-service.md) | ForecastService: read-through refresh | 2 | M · 3–4 h | T07, T08, T09 | todo |
| [T11](T11-scoring-foundation.md) | Scoring foundation and ranking | 3 | S · 1.5 h | T03 | todo |
| [T12](T12-skiing-scorer.md) | Skiing scorer | 3 | S · 1 h | T11 | todo |
| [T13](T13-surfing-scorer.md) | Surfing scorer | 3 | S · 1 h | T11 | todo |
| [T14](T14-sightseeing-scorers.md) | Outdoor and indoor sightseeing scorers | 3 | S · 1.5 h | T11 | todo |
| [T15](T15-ranking-calibration.md) | Ranking calibration with real weeks | 3 | S · 2 h | T08, T12, T13, T14 | todo |
| [T16](T16-graphql-api.md) | GraphQL schema and resolver | 4 | M · 3 h | T10, T11–T14 | todo |
| [T17](T17-http-protection.md) | HTTP protection | 4 | S · 1.5 h | T03, T06 | todo |
| [T18](T18-query-limits-upstream-cap.md) | Query limits and upstream cap | 4 | S · 2 h | T07, T08, T16 | todo |
| [T19](T19-bruno-and-curl.md) | Bruno collection and curl examples | 4 | S · 1 h | T16 | todo |
| [T20](T20-readme-and-docs.md) | README and process docs | 5 | S · 2 h | T15–T19 | todo |
| [T21](T21-release.md) | Release | 5 | S · 1 h | T20 | todo |

Sizes: S is up to 2 hours, M is 2–4 hours.

## Order

- Critical path: T03 → T04 → T09 → T10 → T16 → T18 → T20 → T21.
- T07 and T08 can run alongside T04.
- T11–T14 are pure code with no I/O, so they can start any time after T03.
- Day 2 is the fullest (about 9 hours). Day 5 has about 4 hours of slack to absorb overruns.

## Open decisions

Settle each one before the task it blocks. Then record it in the PRD change log with a date (PRD §17).

| Decision | Blocks | Recommendation |
|----------|--------|----------------|
| Light Cloud plan. Databases need a paid plan: Lite includes one shared database, Free has none. | T06 | Lite |
| Publish the brief `.docx`? Its metadata names two of the company's staff, and the file is their assessment. | T01 | Keep it out of git and summarise the brief in the PRD. |
| How a Marine API failure is stored. As planned, a refresh where only Marine fails saves empty wave values with a fresh timestamp, so a surf town shows "no marine data" until the next refresh. | T04, T09, T10 | Store marine days in their own table with their own fetch time, and refresh each source separately. |
| Same-day or previous-day fresh snow. Counting the snow that falls on the day itself makes a blizzard the best ski day. | T08, T12 | Count the previous day's snowfall (`past_days=1`). |
| Indoor sightseeing formula. `50 + 0.5 × (100 − outdoor)` never drops below 50, so on cold, grey days it beats skiing in a ski resort. | T14 | `100 − outdoor`, then let T15 confirm. |
