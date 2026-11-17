# T22 · Hardcoded constants in src/const

Day 5 · Size M (~2 h, two agents in parallel) · Depends on T15 (part B only) · PRD §12, §14

**Goal:** All hardcoded texts, names and limits live in `src/const/`, one file per kind. Wording and limits can then be reviewed and changed in one place.

Requested on 2026-11-17, after the code was written. See docs/DECISIONS.md, D15.

## Layout

| File | Holds |
|------|-------|
| `src/const/errors.ts` | GraphQL error codes; user-facing error and validation messages; internal Open-Meteo error messages |
| `src/const/limits.ts` | input limits (place length, country-code pattern); HTTP (rate limit, body limit, trusted proxy hops); GraphQL (aliases, depth, tokens); Open-Meteo (call budget, timeout, attempts); database pool size; default cache TTL |
| `src/const/open-meteo.ts` | endpoint URLs and request parameters (forecast days, past days, language, match count) |
| `src/const/server.ts` | host, default port, health path, the GraphiQL example query |
| `src/const/log-messages.ts` | log message texts |
| `src/const/scoring.ts` | per activity: weights, bands and caps |
| `src/const/reasons.ts` | reason texts, as small functions where they include values |
| `src/const/weather-codes.ts` | the WMO code table (description, quality) and the thunderstorm codes |

## Rules

- Plain `export const … as const`. No classes, no barrel file, no i18n framework.
- Behaviour doesn't change. The existing tests stay green, and only their imports may change.
- Tests keep literal strings where they check wording, so a wording change is a deliberate test change.
- What moves: user-facing texts, log messages, URLs and numeric limits.
- What stays in place: SQL, zod field names and request parameter keys. Those are code, not settings.

## Done when

Part A (everything outside `src/scoring/`):

- [ ] `errors.ts`, `limits.ts`, `open-meteo.ts`, `server.ts` and `log-messages.ts` exist, and every use outside `src/scoring/` imports from them.
- [ ] No user-facing string, URL or numeric limit is left inline outside `src/const/` and `src/scoring/`.

Part B (`src/scoring/`, after T15 merges):

- [ ] `scoring.ts`, `reasons.ts` and `weather-codes.ts` exist, and the scorers import from them.
- [ ] No reason text or threshold is left inline in `src/scoring/`.

Both:

- [ ] `npm run check` passes with no behaviour change. The live Bruno collection still passes after deploy.
- [ ] PRD §12 (folder layout) and §14 (where constants live) are updated.
