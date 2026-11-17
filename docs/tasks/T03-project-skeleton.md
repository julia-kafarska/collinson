# T03 · Project skeleton

Day 1 · Size M (~2–3 h) · Depends on T01 · PRD §11, §12, §14

**Goal:** A TypeScript server (Fastify with Yoga) that starts, answers `/health`, and passes `npm run check`.

## Done when

- [ ] `package.json` scripts: `dev` (tsx watch), `build` (tsc), `start`, `test`, `lint`, `typecheck`, and `check`, which runs typecheck, lint and tests.
- [ ] `tsconfig.json` with `strict` and `noUncheckedIndexedAccess`, ESM output.
- [ ] ESLint (`typescript-eslint`) and Prettier set up, and `npm run check` is clean.
- [ ] Node 24 pinned in `.nvmrc` and `engines`. Lockfile committed.
- [ ] `src/config.ts` parses environment variables with zod: `PORT` (default 4000), `DATABASE_URL`, `FORECAST_TTL_MINUTES` (default 180). A bad value stops startup with a clear message.
- [ ] `src/server.ts` exports `buildApp(deps)`, which builds the Fastify app without listening or connecting to anything, so tests can create it. A small `src/main.ts` wires the real dependencies and calls `listen`.
- [ ] Fastify's logger is on (JSON).
- [ ] `GET /health` returns 200.
- [ ] Yoga is mounted at `/graphql` with a placeholder schema, and GraphiQL opens in the browser.
- [ ] `.env.example` lists every setting, with no real values.

## Tests first

- `app.inject()` on `/health` returns 200.
- Config rejects a non-numeric `PORT`.

## Notes

- T16 replaces the placeholder schema.
