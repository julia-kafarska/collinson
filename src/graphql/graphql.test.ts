import { describe, expect, it, vi } from 'vitest';
import { ACTIVITIES, type Activity, type DailyWeather, type Location } from '../domain.js';
import { LocationNotFoundError, UpstreamUnavailableError } from '../errors.js';
import type { ForecastService, Week } from '../forecast/forecast-service.js';
import type { Scorer } from '../scoring/types.js';
import { createGraphQL } from './graphql.js';

const ZERMATT: Location = {
  id: 2657928,
  name: 'Zermatt',
  country: 'Switzerland',
  region: 'Valais',
  latitude: 46.02,
  longitude: 7.75,
  elevationM: 1608,
  timezone: 'Europe/Zurich',
};

const day = (date: string): DailyWeather => ({
  date,
  tempMaxC: 0,
  tempMinC: -5,
  apparentTempMaxC: -3,
  precipitationMm: 0,
  precipitationProbabilityPct: 0,
  snowfallCm: 0,
  freshSnowCm: 0,
  snowDepthMaxCm: 80,
  weatherCode: 0,
  windSpeedMaxKmh: 5,
  windGustsMaxKmh: 10,
  sunshineSeconds: 30_000,
  daylightSeconds: 32_000,
  marine: null,
});

const WEEK: Week = {
  location: ZERMATT,
  days: ['2026-11-17', '2026-11-18'].map(day),
  fetchedAt: new Date('2026-11-17T09:00:00Z'),
  stale: false,
};

// Fixed scores, so the ranking order is known: skiing 90, outdoor 60, indoor 40, surfing 0.
const FIXED: Record<Activity, number> = {
  SKIING: 90,
  SURFING: 0,
  OUTDOOR_SIGHTSEEING: 60,
  INDOOR_SIGHTSEEING: 40,
};
const scorers = Object.fromEntries(
  ACTIVITIES.map((a) => [a, (() => ({ score: FIXED[a], reasons: [`${a} reason`] })) as Scorer]),
) as Record<Activity, Scorer>;

const QUERY = `query ($place: String!, $countryCode: String) {
  activityForecast(place: $place, countryCode: $countryCode) {
    location { name country region elevation timezone }
    fetchedAt
    stale
    activities { activity rank score bestDay days { date score reasons } }
  }
}`;

function setup(getWeek: ForecastService['getWeek']) {
  const forecasts = { getWeek: vi.fn(getWeek) };
  const yoga = createGraphQL({ forecasts, scorers, logging: false });
  const run = async (variables: Record<string, unknown>) => {
    const res = await yoga.fetch('http://test/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables }),
    });
    return (await res.json()) as {
      data?: { activityForecast: Record<string, unknown> } | null;
      errors?: { message: string; extensions?: { code?: string } }[];
    };
  };
  return { forecasts, run };
}

const codeOf = (body: Awaited<ReturnType<ReturnType<typeof setup>['run']>>) =>
  body.errors?.[0]?.extensions?.code;

describe('activityForecast', () => {
  it('returns the location, freshness and the ranked activities', async () => {
    const { run } = setup(async () => WEEK);
    const body = await run({ place: 'Zermatt' });
    expect(body.errors).toBeUndefined();
    const result = body.data?.activityForecast;
    expect(result?.location).toEqual({
      name: 'Zermatt',
      country: 'Switzerland',
      region: 'Valais',
      elevation: 1608,
      timezone: 'Europe/Zurich',
    });
    expect(result?.fetchedAt).toBe('2026-11-17T09:00:00.000Z');
    expect(result?.stale).toBe(false);
    const activities = result?.activities as { activity: string; rank: number; days: unknown[] }[];
    expect(activities.map((a) => [a.activity, a.rank])).toEqual([
      ['SKIING', 1],
      ['OUTDOOR_SIGHTSEEING', 2],
      ['INDOOR_SIGHTSEEING', 3],
      ['SURFING', 4],
    ]);
    expect(activities[0]?.days).toHaveLength(2);
  });

  it('trims the place and passes the country code on', async () => {
    const { forecasts, run } = setup(async () => WEEK);
    await run({ place: '  Zermatt  ', countryCode: 'CH' });
    expect(forecasts.getWeek).toHaveBeenCalledWith('Zermatt', 'CH');
  });

  it.each([
    ['an empty place', { place: '' }],
    ['a blank place', { place: '   ' }],
    ['a place over 100 characters', { place: 'x'.repeat(101) }],
    ['a three-letter country code', { place: 'Paris', countryCode: 'FRA' }],
    ['a lower-case country code', { place: 'Paris', countryCode: 'fr' }],
  ])('rejects %s with BAD_USER_INPUT', async (_label, variables) => {
    const { forecasts, run } = setup(async () => WEEK);
    expect(codeOf(await run(variables))).toBe('BAD_USER_INPUT');
    expect(forecasts.getWeek).not.toHaveBeenCalled();
  });

  it('maps an unknown place to LOCATION_NOT_FOUND', async () => {
    const { run } = setup(async (place) => {
      throw new LocationNotFoundError(place);
    });
    expect(codeOf(await run({ place: 'Nowhere' }))).toBe('LOCATION_NOT_FOUND');
  });

  it('maps an Open-Meteo failure to UPSTREAM_UNAVAILABLE', async () => {
    const { run } = setup(async () => {
      throw new UpstreamUnavailableError('api.open-meteo.com is unreachable');
    });
    expect(codeOf(await run({ place: 'Zermatt' }))).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('masks unexpected errors, so internals never reach the client', async () => {
    const { run } = setup(async () => {
      throw new Error('connection to db at 10.0.0.5 failed');
    });
    const body = await run({ place: 'Zermatt' });
    expect(body.errors?.[0]?.message).toBe('Unexpected error.');
    expect(JSON.stringify(body)).not.toContain('10.0.0.5');
  });
});
