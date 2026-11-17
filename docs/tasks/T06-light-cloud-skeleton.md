# T06 · Light Cloud walking skeleton

Day 1 · Size S (~1.5 h) · Depends on T04, T05 · PRD §13

**Goal:** The skeleton runs on Light Cloud against its own Postgres, and the open questions in PRD §13 are answered.

## Decided

- Workspace `prod-team`, which is already on the paid Starter plan. App `collinson`, database `collinson-weather-db`, region `europe-west1`.

## Done when

- [x] A Postgres database exists on the `shared-dev` tier.
- [x] Its connection string is set as the `DATABASE_URL` environment variable on the app. It never goes into the repo, the logs or the docs.
- [x] The app is created from the GitHub repo: branch `main`, container, Node.js runtime, build `npm run build`, start `npm start`, port from `PORT`, redeploy on push.
- [x] Scaling is `max_instances: 1`, and `min_instances: 0` for now.
- [x] The live `/health` returns 200, and the migrations ran against the Light Cloud database: https://main-collinson-prod-team.light-cloud.io
- [ ] Recorded in `docs/DECISIONS.md` and applied (D11–D13):
  - [ ] Postgres major version, matched in `docker-compose.yml`: Light Cloud runs 15.19 (D12). Switch local and CI once the T09 agent has finished with the local database.
  - [x] Connection limit of the shared tier, matched in the pool size: 10 per role, so the pool stays at 5 (D13).
  - [x] Whether the connection needs SSL: yes. node-postgres needs `uselibpqcompat=true&sslmode=require` (D11).
  - [x] How many proxies add to `X-Forwarded-For` (T17 needs this): 2 trusted hops (D14). The chain is client, then Cloudflare, then Cloud Run's proxy as the socket.
  - [x] Node version of the runtime, matched in `engines`: Light Cloud runs v24.22.3, and `engines` says `24.x`.

## Notes

- The first two deploys failed: the first had no `DATABASE_URL` yet, and the second failed on SSL certificate verification (D11). Light Cloud shows no runtime logs for a container that never started, so the failure was reproduced locally with the same connection string.

- To count the proxy hops, log `X-Forwarded-For` for one request from a known IP, then remove the log line.
