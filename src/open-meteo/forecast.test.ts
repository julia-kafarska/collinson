import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, loadFixture } from '../../test/helpers/fixtures.js';
import { UpstreamUnavailableError } from '../errors.js';
import { fetchForecast } from './forecast.js';
import type { Fetch } from './http.js';

const ZERMATT = { latitude: 46.01998, longitude: 7.74863, timezone: 'Europe/Zurich' };

// Recorded with past_days=1, so it holds 8 days and the first one is yesterday.
const zermatt = loadFixture('forecast-zermatt.json') as {
  daily: { time: string[]; snowfall_sum: number[] };
};

const respondWith = (body: unknown) => vi.fn<Fetch>().mockResolvedValueOnce(jsonResponse(body));

/** The Zermatt response with some daily fields replaced. JSON drops a field set to undefined. */
const zermattWith = (fields: Record<string, unknown>) => ({
  ...zermatt,
  daily: { ...zermatt.daily, ...fields },
});

describe('fetchForecast', () => {
  it('returns the 7 days after yesterday', async () => {
    const days = await fetchForecast(respondWith(zermatt), ZERMATT);

    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe(zermatt.daily.time[1]);
  });

  it("gives each day the previous day's snowfall as fresh snow", async () => {
    const days = await fetchForecast(respondWith(zermatt), ZERMATT);
    const snowfall = zermatt.daily.snowfall_sum;

    expect(days[0]?.freshSnowCm).toBe(snowfall[0]);
    // snowfall[0] is 0 in this recording, so check every day to rule out a default of 0.
    expect(days.map((day) => day.freshSnowCm)).toEqual(snowfall.slice(0, 7));
    expect(days.map((day) => day.snowfallCm)).toEqual(snowfall.slice(1));
  });

  it('converts snow depth from metres to centimetres', async () => {
    // A plain * 100 turns 0.29 m into 28.999999999999996 cm.
    const body = zermattWith({ snow_depth_max: [0, 0.39, 0.29, 0, 0, 0, 0, 0] });
    const days = await fetchForecast(respondWith(body), ZERMATT);

    expect(days.map((day) => day.snowDepthMaxCm)).toEqual([39, 29, 0, 0, 0, 0, 0]);
  });

  it.each([
    ['a field is missing', { weather_code: undefined }],
    ['a value is null', { weather_code: [0, 0, 0, null, 0, 0, 0, 0] }],
    ['a field has fewer values than days', { weather_code: [0, 0, 0, 0, 0, 0, 0] }],
  ])('rejects a response where %s', async (_, fields) => {
    await expect(fetchForecast(respondWith(zermattWith(fields)), ZERMATT)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });

  it("asks for yesterday and the next 7 days, in the location's timezone", async () => {
    const fetch = respondWith(zermatt);
    await fetchForecast(fetch, ZERMATT);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      latitude: '46.01998',
      longitude: '7.74863',
      timezone: 'Europe/Zurich',
      forecast_days: '7',
      past_days: '1',
    });
    expect(url.searchParams.get('daily')?.split(',')).toContain('snow_depth_max');
    expect(url.searchParams.has('hourly')).toBe(false);
  });
});
