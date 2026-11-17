# T17 · HTTP protection

Day 4 · Size S (~1.5 h) · Depends on T03, T06 · PRD §10, FR9

**Goal:** Limit how much any one client can send.

## Done when

- [ ] `@fastify/rate-limit` allows 60 requests per minute per client IP. Over the limit, it returns 429 with `Retry-After`. `/health` is exempt.
- [ ] Fastify's `bodyLimit` is 16 KB, and anything larger returns 413.
- [ ] `trustProxy` is set to the hop count found in T06, not to `true`. `true` would trust an `X-Forwarded-For` header the client made up.
- [ ] The limits are passed in, so tests can use small numbers.
- [ ] Rejected requests are logged (PRD §11).

## Tests first

- A request over a test limit of 3 gets 429 with `Retry-After`.
- Two IPs have separate limits.
- Changing the part of `X-Forwarded-For` that the client sends does not reset the limit.
- A 20 KB body gets 413.
