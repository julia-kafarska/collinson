# Decision log

Decisions in the order they were made. Each entry gives the decision, the options considered and why this one won. When a decision changes the PRD, the PRD's change log says so.

## D1 · TypeScript on Node 24 (2026-11-17)

- **Decision:** TypeScript in `strict` mode, on Node 24 (an LTS line), pinned in `.nvmrc` and `engines`.
- **Options:** plain JavaScript; TypeScript on Node 22.
- **Why:** The recruiter requires TypeScript. Node 24 is installed locally and is a current LTS line, so local, CI and Light Cloud can all run the same major version.

## D2 · PostgreSQL on Light Cloud instead of SQLite (2026-11-17)

- **Decision:** PostgreSQL through `pg`, with plain SQL and no ORM. Locally it runs in Docker.
- **Options:** a SQLite file (no setup); an in-memory cache; JSON files; PostgreSQL.
- **Why:** The service is deployed to Light Cloud, which provides managed Postgres. Container disks are temporary, so a SQLite file would be wiped on every redeploy. An in-memory cache doesn't survive restarts and skips the "model and store" part the brief assesses.

## D3 · Fastify under GraphQL Yoga (2026-11-17)

- **Decision:** GraphQL Yoga, mounted on Fastify.
- **Options:** Yoga's own Node server; Apollo Server; Mercurius.
- **Why:** Fastify brings a tested rate limiter, a body limit, trusted-proxy handling and JSON logging, which would otherwise be hand-written. Light Cloud has a Fastify preset. Yoga keeps the schema SDL-first and works with GraphQL Armor.

## D4 · The brief stays out of git (2026-11-17)

- **Decision:** `docs/lead-snr-engineer-test-062026.docx` is git-ignored. The PRD summarises its requirements.
- **Options:** commit it; ask the recruiter first.
- **Why:** The repo will be public, the document is the company's assessment, and its metadata names two of their staff. Leaving it out can be undone later; publishing it can't.

## D5 · Marine data in its own table (2026-11-17)

- **Decision:** a `daily_marine` table with its own `marine_fetched_at`. The forecast and the marine data are each refreshed and replaced separately.
- **Options:** one `daily_weather` table and one timestamp for both sources (PRD v0.2).
- **Why:** With one table and one timestamp, a refresh where only the Marine API fails would save empty wave values as fresh data. A surf town would then show "no marine data" for 3 hours. Separate rows keep the last good waves.

## D6 · Fresh snow is the previous day's snowfall (2026-11-17)

- **Decision:** the skiing "fresh snow" factor uses the previous day's `snowfall_sum`. The forecast call sends `past_days=1`, and the parser turns each day's predecessor into `freshSnowCm`, so 7 days come out.
- **Options:** the same day's snowfall (PRD v0.2).
- **Why:** With same-day snowfall, a day with 30 cm falling scores at least 80 even with zero for wind and visibility, while the clear day after it scores at most 75. Skiers want the day after.

## D7 · Indoor sightseeing is 100 − outdoor (2026-11-17; T15 confirms)

- **Decision:** `indoor = 100 − outdoor`.
- **Options:** `50 + 0.5 × (100 − outdoor)` (PRD v0.2); a separate indoor model.
- **Why:** The floor of 50 let indoor beat skiing on an ordinary overcast day in Zermatt (about 81 against 70). Without the floor, the same day gives about 62 and skiing wins. T15 checks this against real weeks.

## D8 · Daily snow_depth_max, converted to centimetres (2026-11-17)

- **Decision:** request the daily `snow_depth_max`, and convert it from metres to centimetres in the parser.
- **Options:** the hourly `snow_depth`, aggregated to a daily max (PRD v0.2).
- **Why:** The spike showed the daily field exists, so the aggregation code isn't needed. The API sends metres while the thresholds use centimetres. Converting once at the boundary avoids a silent 100× error.

## D9 · Listen on 0.0.0.0, port from PORT, default 8080 (2026-11-17)

- **Decision:** the server listens on `0.0.0.0`, on `PORT`, defaulting to 8080.
- **Why:** Light Cloud's Node.js runtime defaults to port 8080. Inside a container, a server listening on `localhost` can't be reached from outside.

## D10 · All planned dependencies installed in T03 (2026-11-17)

- **Decision:** install every planned dependency in the skeleton task, including the ones later tasks use.
- **Why:** Independent tasks run in parallel on separate branches. One shared dependency set means no merge conflicts in `package.json` and the lockfile.

## D11 · SSL to Light Cloud Postgres: libpq `require` semantics (2026-11-17)

- **Decision:** `DATABASE_URL` on Light Cloud ends in `?uselibpqcompat=true&sslmode=require`. The connection is encrypted, but the server certificate is not verified.
- **Options:** `sslmode=require` as given. node-postgres 8 treats that as `verify-full`, so the container crashed at startup with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Or full verification, which needs the instance's private "Cloud SQL Server CA" certificate, and that certificate's CN doesn't match the hostname anyway.
- **Why:** It is what `psql` does with `sslmode=require`, and node-postgres 9 makes it the default. The remaining risk is a man-in-the-middle between Light Cloud and the database. Using the database's private IP would remove it; this is listed as a limitation.

## D12 · Postgres 15 everywhere, to match Light Cloud (2026-11-17)

- **Decision:** local Docker and CI run Postgres 15, the version of Light Cloud's shared instance (15.19).
- **Why:** Tests should run on the same major version as production. The schema uses nothing newer than 15.

## D13 · Pool of 5 connections (2026-11-17)

- **Decision:** keep the `pg` pool at 5.
- **Why:** The shared instance limits our database role to 10 connections. With one app instance, 5 leaves room for migrations and manual access.

## D14 · Trust 2 proxy hops (2026-11-17)

- **Decision:** Fastify's `trustProxy` is `2`.
- **Evidence:** a request logged on Light Cloud with `X-Forwarded-For: <client>, <Cloudflare IP>`; the socket itself comes from Cloud Run's proxy. A request sent with a forged `X-Forwarded-For: 203.0.113.77` arrived as `203.0.113.77, <client>, <Cloudflare IP>`. Two trusted hops give the real client, and forged entries stay on the left, where they are ignored.
- **Options:** `true`, which trusts the leftmost entry, so any client could fake its IP to dodge the rate limit; `1`, which would rate-limit Cloudflare's IP, i.e. everyone at once.
- **Limit:** a request sent straight to the Cloud Run URL, bypassing Cloudflare, has one hop fewer, and its client could choose its IP. That URL isn't published.
