import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMigratedTestDb, type TestDb } from '../../test/helpers/db.js';
import type { ForecastDay, MarineDay } from '../domain.js';
import { createWeatherRepo, type WeatherRepo } from './weather-repo.js';

const LOCATION_ID = 2657928;
const t1 = new Date('2026-11-17T06:00:00Z');
const t2 = new Date('2026-11-17T09:00:00Z');
const t3 = new Date('2026-11-17T12:00:00Z');
const BEFORE_EVERY_ROW = '2026-11-01';

/** Seven days from 2026-11-<firstDay>. Each column holds a different value, so a swap shows up. */
function forecastWeek(firstDay: number, tempMaxC = 10): ForecastDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${firstDay + i}`,
    tempMaxC: tempMaxC + i,
    tempMinC: -2.5,
    apparentTempMaxC: 0.5,
    precipitationMm: 3.25,
    precipitationProbabilityPct: 40,
    snowfallCm: 12.5,
    freshSnowCm: 8.75,
    snowDepthMaxCm: 120,
    weatherCode: 73,
    windSpeedMaxKmh: 18.5,
    windGustsMaxKmh: 42.25,
    sunshineSeconds: 21600,
    daylightSeconds: 34200,
  }));
}

function marineWeek(firstDay: number): MarineDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${firstDay + i}`,
    waveHeightMaxM: 1 + i / 4,
    swellWaveHeightMaxM: 0.75,
    swellWavePeriodMaxS: null,
  }));
}

let db: TestDb;
let repo: WeatherRepo;
beforeEach(async () => {
  db = await createMigratedTestDb();
  await db.pool.query(
    `INSERT INTO locations (id, name, latitude, longitude, timezone)
     VALUES ($1, 'Zermatt', 46.02, 7.75, 'Europe/Zurich')`,
    [LOCATION_ID],
  );
  repo = createWeatherRepo(db.pool);
});
afterEach(async () => {
  await db.drop();
});

describe('weather repo', () => {
  it('reads nothing for a location that was never fetched', async () => {
    expect(await repo.read(LOCATION_ID, BEFORE_EVERY_ROW)).toEqual({
      forecast: [],
      marine: [],
      forecastFetchedAt: null,
      marineFetchedAt: null,
    });
  });

  it('replaces the forecast week and sets forecast_fetched_at', async () => {
    await repo.replaceForecast(LOCATION_ID, forecastWeek(17), t1);
    await repo.replaceForecast(LOCATION_ID, forecastWeek(18, 20), t2);

    const stored = await repo.read(LOCATION_ID, BEFORE_EVERY_ROW);
    expect(stored.forecast).toEqual(forecastWeek(18, 20));
    expect(stored.forecastFetchedAt).toEqual(t2);
  });

  it('keeps the old week and fetch time when an insert fails', async () => {
    await repo.replaceForecast(LOCATION_ID, forecastWeek(17), t1);
    const broken = forecastWeek(18).map((day, i) =>
      i === 6 ? { ...day, tempMaxC: null } : day,
    ) as unknown as ForecastDay[];

    await expect(repo.replaceForecast(LOCATION_ID, broken, t2)).rejects.toThrow(
      /violates not-null constraint/,
    );

    const stored = await repo.read(LOCATION_ID, BEFORE_EVERY_ROW);
    expect(stored.forecast).toEqual(forecastWeek(17));
    expect(stored.forecastFetchedAt).toEqual(t1);
  });

  it('replaces marine rows without touching the forecast, and the other way round', async () => {
    await repo.replaceForecast(LOCATION_ID, forecastWeek(17), t1);
    await repo.replaceMarine(LOCATION_ID, marineWeek(17), t2);
    expect(await repo.read(LOCATION_ID, BEFORE_EVERY_ROW)).toEqual({
      forecast: forecastWeek(17),
      marine: marineWeek(17),
      forecastFetchedAt: t1,
      marineFetchedAt: t2,
    });

    await repo.replaceForecast(LOCATION_ID, forecastWeek(18), t3);
    expect(await repo.read(LOCATION_ID, BEFORE_EVERY_ROW)).toEqual({
      forecast: forecastWeek(18),
      marine: marineWeek(17),
      forecastFetchedAt: t3,
      marineFetchedAt: t2,
    });
  });

  it('clears the marine rows when given no days, and still sets marine_fetched_at', async () => {
    await repo.replaceMarine(LOCATION_ID, marineWeek(17), t1);
    await repo.replaceMarine(LOCATION_ID, [], t2);

    const stored = await repo.read(LOCATION_ID, BEFORE_EVERY_ROW);
    expect(stored.marine).toEqual([]);
    expect(stored.marineFetchedAt).toEqual(t2);
  });

  it('reads from today onwards, in date order, with YYYY-MM-DD dates and numbers', async () => {
    await repo.replaceForecast(LOCATION_ID, forecastWeek(15).reverse(), t1);
    await repo.replaceMarine(LOCATION_ID, marineWeek(15).reverse(), t2);

    const stored = await repo.read(LOCATION_ID, '2026-11-17');
    expect(stored.forecast).toEqual(forecastWeek(15).slice(2));
    expect(stored.marine).toEqual(marineWeek(15).slice(2));
    expect(stored.forecast[0]?.date).toBe('2026-11-17');
  });
});
