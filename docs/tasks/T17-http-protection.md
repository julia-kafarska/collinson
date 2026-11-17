# T17 · HTTP protection

Day 4 · Size S (~1.5 h) · Depends on T03, T06 · PRD §10, FR9

**Goal:** Limit how much any one client can send.

## Done when

- [x] `@fastify/rate-limit` allows 60 requests per minute per client IP. Over the limit, it returns 429 with `Retry-After`. `/health` is exempt.
- [x] Fastify's `bodyLimit` is 16 KB, and anything larger returns 413.
- [ ] `trustProxy` is set to the hop count found in T06, not to `true`. `true` would trust an `X-Forwarded-For` header the client made up. `TRUSTED_PROXY_HOPS` is 1 until T06 measures the live hops.
- [x] The limits are passed in, so tests can use small numbers.
- [x] Rejected requests are logged (PRD §11).

## Tests first

- A request over a test limit of 3 gets 429 with `Retry-After`.
- Two IPs have separate limits.
- Changing the part of `X-Forwarded-For` that the client sends does not reset the limit.
- A 20 KB body gets 413.

## Notes

- `src/http/protection.ts` holds the limits and `registerProtection`. `protection.test.ts` tests them on small apps of its own. Still to do:
  - Wire it into `buildApp`: `Fastify({ logger, trustProxy, bodyLimit: BODY_LIMIT_BYTES })`, `await registerProtection(app)` before the routes, and `config: { rateLimit: false }` on `/health`.
  - Measure the live hop count (T06) and set `TRUSTED_PROXY_HOPS`.
- The installed Fastify (5.12.8) no longer takes a hop count for `trustProxy`. A number trusts no proxy, so `request.ip` would be the proxy's address and every client would share one bucket. Its types reject a number too. So `trustProxy` is a function: `hop < TRUSTED_PROXY_HOPS`.
- A hop count is only safe if every path to the app passes through that many proxies. If the Cloud Run URL can be reached without going through Cloudflare and Light Cloud's edge, a count above 1 lets clients on that path spoof their IP.
- The rate-limit key is the plugin's default: `request.ip`, with IPv6 grouped per /64, so a client can't dodge the limit by rotating addresses inside its own subnet.
- A rate-limit rejection is logged at `warn`, with the client IP only. A 413 is logged by Fastify's default error handler at `info`.
