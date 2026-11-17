# T04 · Local Postgres and migrations

Day 1 · Size M (~2–3 h) · Depends on T03 · PRD §8

**Goal:** The app connects to Postgres and creates its tables from SQL migration files.

## Decided

- Marine data goes in its own table, `daily_marine`, with its own `marine_fetched_at` (docs/DECISIONS.md, D5). The schema in PRD §8 already shows this.

## Done when

- [x] `docker-compose.yml` runs Postgres only, with a named volume. Postgres 18 for now; T06 aligns it with Light Cloud.
- [x] `src/storage/db.ts` creates a `pg` pool of 5 from `DATABASE_URL`.
- [x] `src/storage/migrate.ts` applies `migrations/*.sql` in name order, each in its own transaction, and records each file in `schema_migrations`. Running it twice changes nothing.
- [x] `migrations/001_init.sql` holds the schema from PRD §8, adjusted for the marine decision.
- [x] `npm start` runs the migrations, then the server.
- [x] Integration tests get a fresh schema per run (for example, `CREATE SCHEMA` with a random name plus `search_path`), dropped afterwards.

## Tests first

- Migrating twice gives the tables and exactly one `schema_migrations` row per file.
- A broken migration rolls back and stops startup.

## Notes

- Local Postgres listens on port 5433, so it doesn't clash with another Postgres on 5432.
- Checked by hand: `npm start` applied `001_init.sql` to the local database and served `/health`.

- Parameterised queries only, from the very first query (PRD §10).
