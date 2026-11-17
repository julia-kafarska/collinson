# T05 · CI pipeline

Day 1 · Size S (~45 min) · Depends on T04 · PRD §10, §14

**Goal:** Every push runs the same checks as `npm run check` does locally, against a real Postgres.

## Done when

- [ ] `.github/workflows/ci.yml` uses the Node version from `.nvmrc`, then runs `npm ci`, `npm run check`, and `npm audit --omit=dev --audit-level=high`.
- [ ] A Postgres service container is available, with `DATABASE_URL` pointing at it.
- [ ] The first run is green on GitHub.

## Notes

- CI checks only the latest commit of each push. Push a failing-test commit together with the commit that makes it pass, so the history shows no red marks.
- Light Cloud deploys on push without waiting for CI (PRD §13), so run `npm run check` before pushing.
