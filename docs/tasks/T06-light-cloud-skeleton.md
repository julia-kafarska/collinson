# T06 · Light Cloud walking skeleton

Day 1 · Size S (~1.5 h) · Depends on T04, T05 · PRD §13

**Goal:** The skeleton runs on Light Cloud against its own Postgres, and the open questions in PRD §13 are answered.

## Decide first

- The Light Cloud plan. Databases need a paid plan: Lite includes one shared database, Free has none.

## Done when

- [ ] A Postgres database exists on the `shared-dev` tier.
- [ ] Its connection string is set as the `DATABASE_URL` environment variable on the app. It never goes into the repo, the logs or the docs.
- [ ] The app is created from the GitHub repo: branch `main`, container, Node.js runtime, build `npm run build`, start `npm start`, port from `PORT`, redeploy on push.
- [ ] Scaling is `max_instances: 1`, and `min_instances: 0` for now.
- [ ] The live `/health` returns 200, and the migrations ran against the Light Cloud database.
- [ ] Recorded in `docs/DECISIONS.md` and applied:
  - [ ] Postgres major version, matched in `docker-compose.yml`.
  - [ ] Connection limit of the shared tier, matched in the pool size.
  - [ ] Whether the connection needs SSL.
  - [ ] How many proxies add to `X-Forwarded-For` (T17 needs this).
  - [ ] Node version of the runtime, matched in `engines`.

## Notes

- To count the proxy hops, log `X-Forwarded-For` for one request from a known IP, then remove the log line.
