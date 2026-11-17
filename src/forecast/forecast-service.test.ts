import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMigratedTestDb, type TestDb } from '../../test/helpers/db.js';
import type { ForecastDay, Location, MarineDay } from '../domain.js';
import { LocationNotFoundError, UpstreamUnavailableError } from '../errors.js';
import { createLocationRepo } from '../storage/location-repo.js';
import { createWeatherRepo } from '../storage/weather-repo.js';
import { addDays, localDate } from './dates.js';
import { createForecastService, type ForecastServiceDeps } from './forecast-service.js';

const TTL_MS = 3 * 60 * 60 * 1000;

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
const AUCKLAND: Location = {
  ...ZERMATT,
  id: 2193733,
  name: 'Auckland',
  timezone: 'Pacific/Auckland',
};

function forecastWeek(start: string, tempMaxC = 1): ForecastDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(start, i),
    tempMaxC,
    tempMinC: -5,
    apparentTempMaxC: -2,
    precipitationMm: 0,
    precipitationProbabilityPct: 10,
    snowfallCm: 0,
    freshSnowCm: 0,
    snowDepthMaxCm: 80,
    weatherCode: 0,
    windSpeedMaxKmh: 10,
    windGustsMaxKmh: 20,
    sunshineSeconds: 20_000,
    daylightSeconds: 32_000,
  }));
}

function marineWeek(start: string, waveHeightMaxM = 1.5): MarineDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(start, i),
    waveHeightMaxM,
    swellWaveHeightMaxM: waveHeightMaxM,
    swellWavePeriodMaxS: 11,
  }));
}

let db: TestDb;
let clock: Date;
let deps: ForecastServiceDeps;
let geocode: ReturnType<typeof vi.fn<ForecastServiceDeps['geocode']>>;
let fetchForecast: ReturnType<typeof vi.fn<ForecastServiceDeps['fetchForecast']>>;
let fetchMarine: ReturnType<typeof vi.fn<ForecastServiceDeps['fetchMarine']>>;

beforeEach(async () => {
  db = await createMigratedTestDb();
  clock = new Date('2026-11-17T09:00:00Z');
  geocode = vi.fn<ForecastServiceDeps['geocode']>(async (place) =>
    place === 'Auckland' ? AUCKLAND : place === 'Zermatt' ? ZERMATT : null,
  );
  // The fakes answer like Open-Meteo: 7 days from today in the location's timezone.
  fetchForecast = vi.fn<ForecastServiceDeps['fetchForecast']>(async (location) =>
    forecastWeek(localDate(clock, location.timezone)),
  );
  fetchMarine = vi.fn<ForecastServiceDeps['fetchMarine']>(async () => []);
  deps = {
    locations: createLocationRepo(db.pool),
    weather: createWeatherRepo(db.pool),
    geocode,
    fetchForecast,
    fetchMarine,
    now: () => clock,
    ttlMs: TTL_MS,
    log: { info: () => {}, warn: () => {} },
  };
});
afterEach(async () => {
  await db.drop();
});

const minutes = (n: number) => n * 60 * 1000;
const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};

describe('ForecastService.getWeek', () => {
  it('resolves a place through geocoding once, then from the lookup cache', async () => {
    const service = createForecastService(deps);
    const first = await service.getWeek('Zermatt');
    const second = await service.getWeek('  zermatt ');
    expect(first.location).toEqual(ZERMATT);
    expect(second.location).toEqual(ZERMATT);
    expect(geocode).toHaveBeenCalledTimes(1);
  });

  it('throws LocationNotFoundError for an unknown place', async () => {
    await expect(createForecastService(deps).getWeek('Nowhere')).rejects.toBeInstanceOf(
      LocationNotFoundError,
    );
  });

  it('returns 7 days from today, each with its marine data, and when it was fetched', async () => {
    fetchMarine.mockImplementation(async (location) =>
      marineWeek(localDate(clock, location.timezone)),
    );
    const week = await createForecastService(deps).getWeek('Zermatt');
    expect(week.days.map((d) => d.date)).toEqual(forecastWeek('2026-11-17').map((d) => d.date));
    expect(week.days[0]?.marine?.waveHeightMaxM).toBe(1.5);
    expect(week.fetchedAt).toEqual(clock);
    expect(week.stale).toBe(false);
  });

  it('makes no upstream call while the data is fresh', async () => {
    const service = createForecastService(deps);
    await service.getWeek('Zermatt');
    advance(minutes(90));
    await service.getWeek('Zermatt');
    expect(fetchForecast).toHaveBeenCalledTimes(1);
    expect(fetchMarine).toHaveBeenCalledTimes(1);
  });

  it('fetches again once the data is older than the TTL', async () => {
    const service = createForecastService(deps);
    await service.getWeek('Zermatt');
    advance(TTL_MS + minutes(1));
    await service.getWeek('Zermatt');
    expect(fetchForecast).toHaveBeenCalledTimes(2);
    expect(fetchMarine).toHaveBeenCalledTimes(2);
  });

  it('fetches again after local midnight, even inside the TTL', async () => {
    clock = new Date('2026-11-17T10:50:00Z'); // 23:50 on 17 November in Auckland
    const service = createForecastService(deps);
    await service.getWeek('Auckland');
    advance(minutes(40)); // 00:30 on 18 November in Auckland
    const week = await service.getWeek('Auckland');
    expect(fetchForecast).toHaveBeenCalledTimes(2);
    expect(week.days[0]?.date).toBe('2026-11-18');
    expect(week.days).toHaveLength(7);
  });

  it('serves the stored week as stale when the refresh fails', async () => {
    const service = createForecastService(deps);
    await service.getWeek('Zermatt');
    advance(TTL_MS + minutes(1));
    fetchForecast.mockRejectedValueOnce(new UpstreamUnavailableError('down'));
    const week = await service.getWeek('Zermatt');
    expect(week.stale).toBe(true);
    expect(week.days).toHaveLength(7);
    expect(week.fetchedAt).toEqual(new Date('2026-11-17T09:00:00Z'));
  });

  it('only shows days from today when serving stale data after midnight', async () => {
    const service = createForecastService(deps);
    await service.getWeek('Zermatt');
    clock = new Date('2026-11-18T09:00:00Z');
    fetchForecast.mockRejectedValueOnce(new UpstreamUnavailableError('down'));
    const week = await service.getWeek('Zermatt');
    expect(week.stale).toBe(true);
    expect(week.days[0]?.date).toBe('2026-11-18');
    expect(week.days).toHaveLength(6);
  });

  it('throws UpstreamUnavailableError when the refresh fails and nothing is stored', async () => {
    fetchForecast.mockRejectedValueOnce(new UpstreamUnavailableError('down'));
    await expect(createForecastService(deps).getWeek('Zermatt')).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });

  it('shares one refresh between concurrent requests for the same place', async () => {
    const service = createForecastService(deps);
    await service.getWeek('Zermatt'); // stores the location, so both calls skip geocoding
    advance(TTL_MS + minutes(1));
    await Promise.all([service.getWeek('Zermatt'), service.getWeek('Zermatt')]);
    expect(fetchForecast).toHaveBeenCalledTimes(2);
    expect(fetchMarine).toHaveBeenCalledTimes(2);
  });

  it('keeps the last good marine rows when only the marine refresh fails', async () => {
    fetchMarine.mockImplementation(async (location) =>
      marineWeek(localDate(clock, location.timezone)),
    );
    const service = createForecastService(deps);
    await service.getWeek('Zermatt');
    advance(TTL_MS + minutes(1));
    fetchMarine.mockRejectedValueOnce(new UpstreamUnavailableError('down'));
    fetchForecast.mockImplementationOnce(async () => forecastWeek('2026-11-17', 5));
    const week = await service.getWeek('Zermatt');
    expect(week.days[0]?.tempMaxC).toBe(5);
    expect(week.days[0]?.marine?.waveHeightMaxM).toBe(1.5);
    expect(week.stale).toBe(true);
  });

  it('gives inland days no marine data, without refetching it inside the TTL', async () => {
    const service = createForecastService(deps);
    const week = await service.getWeek('Zermatt');
    advance(minutes(30));
    await service.getWeek('Zermatt');
    expect(week.days.every((d) => d.marine === null)).toBe(true);
    expect(fetchMarine).toHaveBeenCalledTimes(1);
  });
});
