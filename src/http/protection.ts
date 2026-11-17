import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { RATE_LIMIT, TRUSTED_PROXY_HOPS } from '../const/limits.js';
import { LOG_MESSAGES } from '../const/log-messages.js';

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
    onExceeded: (request) => request.log.warn({ ip: request.ip }, LOG_MESSAGES.rateLimitExceeded),
  });
}
