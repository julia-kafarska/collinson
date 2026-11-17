import type { ZodType } from 'zod';
import { UpstreamUnavailableError } from '../errors.js';

export type Fetch = typeof fetch;

const TIMEOUT_MS = 5_000;
const ATTEMPTS = 2;

/**
 * GETs JSON from Open-Meteo and validates it. Network errors, timeouts and 5xx are retried once;
 * anything else fails at once. Every failure becomes UpstreamUnavailableError.
 */
export async function getJson<T>(fetchFn: Fetch, url: URL, schema: ZodType<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      // Refused before it was sent (the call cap), so a retry would only be refused again.
      if (error instanceof UpstreamUnavailableError) throw error;
      lastError = error;
      continue;
    }
    if (response.status >= 500) {
      lastError = new Error(`HTTP ${response.status}`);
      continue;
    }
    if (!response.ok) {
      throw new UpstreamUnavailableError(`${url.host} answered HTTP ${response.status}`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new UpstreamUnavailableError(`${url.host} sent invalid JSON`, { cause: error });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamUnavailableError(`${url.host} sent an unexpected response`, {
        cause: parsed.error,
      });
    }
    return parsed.data;
  }
  throw new UpstreamUnavailableError(`${url.host} is unreachable`, { cause: lastError });
}
