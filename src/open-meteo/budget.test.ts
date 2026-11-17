import { describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../test/helpers/fixtures.js';
import { UpstreamUnavailableError } from '../errors.js';
import { createUpstreamBudget } from './budget.js';
import type { Fetch } from './http.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/** A budgeted fetch on a fake clock; `at` moves the clock. */
function setup(caps: { perMinute: number; perDay: number }) {
  let time = new Date('2026-11-17T10:00:00Z');
  const fetch = vi.fn<Fetch>(async () => jsonResponse({}));
  const budgeted = createUpstreamBudget({ ...caps, now: () => time }).wrap(fetch);
  return {
    fetch,
    call: () => budgeted(FORECAST_URL),
    at: (iso: string) => {
      time = new Date(iso);
    },
  };
}

describe('createUpstreamBudget', () => {
  it('refuses the third call in a minute with UpstreamUnavailableError, without fetching', async () => {
    const { fetch, call } = setup({ perMinute: 2, perDay: 100 });
    await call();
    await call();

    await expect(call()).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('starts a new minute window when the clock moves on', async () => {
    const { fetch, call, at } = setup({ perMinute: 2, perDay: 100 });
    await call();
    await call();
    at('2026-11-17T10:01:00Z');

    await expect(call()).resolves.toBeInstanceOf(Response);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('holds the day cap across minutes, until midnight UTC', async () => {
    const { fetch, call, at } = setup({ perMinute: 2, perDay: 3 });
    await call();
    await call();
    at('2026-11-17T10:01:00Z');
    await call();

    at('2026-11-17T23:59:00Z');
    await expect(call()).rejects.toBeInstanceOf(UpstreamUnavailableError);
    at('2026-11-18T00:00:00Z');
    await expect(call()).resolves.toBeInstanceOf(Response);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('counts a failed upstream call', async () => {
    const { fetch, call } = setup({ perMinute: 2, perDay: 100 });
    fetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(call()).rejects.toThrow('fetch failed');
    await call();

    await expect(call()).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
