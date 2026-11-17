import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export const BODY_LIMIT_BYTES = 16 * 1024;

export const RATE_LIMIT = { max: 60, timeWindow: '1 minute' } as const;

// 1 until T06 measures Light Cloud's hops. Too few puts every client in one proxy's bucket. Too
// many, on any path to the app, lets a client pick its own IP with a made-up X-Forwarded-For.
export const TRUSTED_PROXY_HOPS = 1;

/**
 * Fastify's `trustProxy` option. Fastify no longer takes a hop count there (a number now trusts
 * no proxy), so the count is applied here: `request.ip` is the address the outermost trusted
 * proxy saw.
 */
export function trustProxy(_address: string, hop: number): boolean {
  return hop < TRUSTED_PROXY_HOPS;
}

/**
 * Rate-limits each client IP (`request.ip`, so `trustProxy` decides who the client is) on every
 * route added after this call, so await it before adding routes. A route opts out with
 * `config: { rateLimit: false }`.
 */
export async function registerProtection(
  app: FastifyInstance,
  options: { max?: number; timeWindow?: number | string } = {},
): Promise<void> {
  await app.register(rateLimit, {
    max: options.max ?? RATE_LIMIT.max,
    timeWindow: options.timeWindow ?? RATE_LIMIT.timeWindow,
    onExceeded: (request) => request.log.warn({ ip: request.ip }, 'rate limit exceeded'),
  });
}
