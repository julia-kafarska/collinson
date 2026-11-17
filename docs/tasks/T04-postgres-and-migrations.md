# T04 · Local Postgres and migrations

Day 1 · Size M (~2–3 h) · Depends on T03 · PRD §8

**Goal:** The app connects to Postgres and creates its tables from SQL migration files.

## Decide first

- How marine data is stored, because it changes the first migration (see Open decisions on the [board](README.md)).

## Done when

- [ ] `docker-compose.yml` runs Postgres only, with a named volume. Use the current stable major version until T06 finds out which one Light Cloud runs.
- [ ] `src/storage/db.ts` creates a `pg` pool of 5 from `DATABASE_URL`.
- [ ] `src/storage/migrate.ts` applies `migrations/*.sql` in name order, each in its own transaction, and records each file in `schema_migrations`. Running it twice changes nothing.
- [ ] `migrations/001_init.sql` holds the schema from PRD §8, adjusted for the marine decision.
- [ ] `npm start` runs the migrations, then the server.
- [ ] Integration tests get a fresh schema per run (for example, `CREATE SCHEMA` with a random name plus `search_path`), dropped afterwards.

## Tests first

- Migrating twice gives the tables and exactly one `schema_migrations` row per file.
- A broken migration rolls back and stops startup.

## Notes

- Parameterised queries only, from the very first query (PRD §10).
