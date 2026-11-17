// Input (PRD FR1).
export const MAX_PLACE_LENGTH = 100;
/** ISO 3166-1 alpha-2, upper case, e.g. "FR". */
export const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

// HTTP (PRD §10).
export const RATE_LIMIT = { max: 60, timeWindow: '1 minute' } as const;
export const BODY_LIMIT_BYTES = 16 * 1024;
// Measured on Light Cloud (DECISIONS D14): Cloud Run's proxy, then Cloudflare's entry. Too few puts
// every client in one proxy's bucket; too many lets a client pick its own IP via X-Forwarded-For.
export const TRUSTED_PROXY_HOPS = 2;

/** PRD §10. Three aliases plus one unaliased field let a request resolve at most 4 places. */
export const GRAPHQL_LIMITS = { maxAliases: 3, maxDepth: 6, maxTokens: 1000 } as const;

/** Half of Open-Meteo's free tier (600 calls a minute, 10,000 a day), for margin (PRD §10). */
export const UPSTREAM_BUDGET = { perMinute: 300, perDay: 5000 } as const;
export const UPSTREAM_TIMEOUT_MS = 5_000;
export const UPSTREAM_ATTEMPTS = 2;

// The shared database tier allows 10 connections per role (DECISIONS D13).
export const DB_POOL_SIZE = 5;

/** Used when FORECAST_TTL_MINUTES is not set (PRD Q6). */
export const DEFAULT_FORECAST_TTL_MINUTES = 180;
