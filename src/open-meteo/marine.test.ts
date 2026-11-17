import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, loadFixture } from '../../test/helpers/fixtures.js';
import { UpstreamUnavailableError } from '../errors.js';
import type { Fetch } from './http.js';
import { fetchMarine } from './marine.js';

const BIARRITZ = { latitude: 43.48055, longitude: -1.55684, timezone: 'Europe/Paris' };
const MADRID = { latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' };

const biarritz = loadFixture('marine-biarritz.json') as { daily: object };
// Inland: HTTP 200 with every wave value null.
const madrid = loadFixture('marine-madrid.json');

const respondWith = (body: unknown) => vi.fn<Fetch>().mockResolvedValueOnce(jsonResponse(body));

describe('fetchMarine', () => {
  it('returns 7 days of wave data for a coastal town', async () => {
    const days = await fetchMarine(respondWith(biarritz), BIARRITZ);

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({
      date: '2026-11-17',
      waveHeightMaxM: 2.14,
      swellWaveHeightMaxM: 2.14,
      swellWavePeriodMaxS: 7.95,
    });
  });

  it('keeps the nulls when only some values are null', async () => {
    const noWaves = [null, null, null, null, null, null, null];
    const periods = [8, 12, null, 10, 9, 9, 9];
    const body = {
      ...biarritz,
      daily: { ...biarritz.daily, wave_height_max: noWaves, swell_wave_period_max: periods },
    };
    const days = await fetchMarine(respondWith(body), BIARRITZ);

    expect(days.map((day) => day.waveHeightMaxM)).toEqual(noWaves);
    expect(days.map((day) => day.swellWavePeriodMaxS)).toEqual(periods);
  });

  it('returns no days inland, where every value is null', async () => {
    await expect(fetchMarine(respondWith(madrid), MADRID)).resolves.toEqual([]);
  });

  it('rejects a failed request, so the caller can tell it from no sea', async () => {
    const fetch = vi.fn<Fetch>().mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchMarine(fetch, BIARRITZ)).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('asks for the daily wave and swell maxima for 7 days, in local time', async () => {
    const fetch = respondWith(biarritz);
    await fetchMarine(fetch, BIARRITZ);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe('https://marine-api.open-meteo.com/v1/marine');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '43.48055',
      longitude: '-1.55684',
      timezone: 'Europe/Paris',
      forecast_days: '7',
      daily: 'wave_height_max,swell_wave_height_max,swell_wave_period_max',
    });
  });
});
