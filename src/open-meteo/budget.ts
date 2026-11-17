import { UPSTREAM_MESSAGES } from '../const/errors.js';
import { UpstreamUnavailableError } from '../errors.js';
import type { Fetch } from './http.js';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * Caps Open-Meteo calls per clock minute and per UTC day. A call over either cap fails with
 * UpstreamUnavailableError and is never sent. Wrap the one fetch that geocoding, forecast and marine
 * share, so a single budget covers them all.
 */
export function createUpstreamBudget({
  perMinute,
  perDay,
  now,
}: {
  perMinute: number;
  perDay: number;
  now: () => Date;
}): { wrap(fetch: Fetch): Fetch } {
  // shortcut: in-memory counters, correct for one instance; move to Postgres or Redis before scaling out
  const counters = [
    { per: 'minute', ms: MINUTE_MS, cap: perMinute, window: 0, calls: 0 },
    { per: 'day', ms: DAY_MS, cap: perDay, window: 0, calls: 0 },
  ];

  return {
    wrap: (fetch) => async (input, init) => {
      const time = now().getTime();
      for (const counter of counters) {
        // Unix time has no leap seconds, so these windows are exactly the UTC minutes and days.
        const current = Math.floor(time / counter.ms);
        if (current !== counter.window) {
          counter.window = current;
          counter.calls = 0;
        }
        if (counter.calls >= counter.cap) {
          throw new UpstreamUnavailableError(
            UPSTREAM_MESSAGES.budgetUsedUp(counter.cap, counter.per),
          );
        }
      }
      // Counted before sending: a call that then fails may still have reached Open-Meteo.
      for (const counter of counters) counter.calls++;
      return fetch(input, init);
    },
  };
}
