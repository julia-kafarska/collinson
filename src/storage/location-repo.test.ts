import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMigratedTestDb, type TestDb } from '../../test/helpers/db.js';
import type { Location } from '../domain.js';
import { createLocationRepo, type LocationRepo } from './location-repo.js';

const zermatt: Location = {
  id: 2657928,
  name: 'Zermatt',
  country: 'Switzerland',
  region: 'Valais',
  latitude: 46.02126,
  longitude: 7.74912,
  elevationM: 1608,
  timezone: 'Europe/Zurich',
};

let db: TestDb;
let repo: LocationRepo;
beforeEach(async () => {
  db = await createMigratedTestDb();
  repo = createLocationRepo(db.pool);
});
afterEach(async () => {
  await db.drop();
});

async function lookups(): Promise<unknown[]> {
  const { rows } = await db.pool.query('SELECT query_normalised, country_code FROM place_lookups');
  return rows;
}

describe('location repo', () => {
  it('finds a lookup saved without a country on the second call, with no duplicate row', async () => {
    expect(await repo.findByLookup('Zermatt')).toBeNull();

    await repo.save(zermatt, 'Zermatt');
    await repo.save(zermatt, ' ZERMATT ');

    expect(await repo.findByLookup('  zermatt ')).toEqual(zermatt);
    expect(await lookups()).toEqual([{ query_normalised: 'zermatt', country_code: '' }]);
  });

  it('matches the country code case-insensitively', async () => {
    await repo.save(zermatt, 'Zermatt', 'ch');

    expect(await repo.findByLookup('Zermatt', 'CH')).toEqual(zermatt);
    expect(await repo.findByLookup('Zermatt', 'ch')).toEqual(zermatt);
    expect(await repo.findByLookup('Zermatt', 'IT')).toBeNull();
    expect(await repo.findByLookup('Zermatt')).toBeNull();
    expect(await lookups()).toEqual([{ query_normalised: 'zermatt', country_code: 'CH' }]);
  });

  it('updates the location on a second save and leaves its fetch times alone', async () => {
    await repo.save(zermatt, 'Zermatt');
    const fetchedAt = new Date('2026-11-17T06:00:00Z');
    await db.pool.query('UPDATE locations SET forecast_fetched_at = $1, marine_fetched_at = $1', [
      fetchedAt,
    ]);

    const renamed = { ...zermatt, name: 'Zermatt VS', elevationM: 1610 };
    await repo.save(renamed, 'Zermatt');

    expect(await repo.findByLookup('Zermatt')).toEqual(renamed);
    const { rows } = await db.pool.query(
      'SELECT forecast_fetched_at, marine_fetched_at FROM locations',
    );
    expect(rows).toEqual([{ forecast_fetched_at: fetchedAt, marine_fetched_at: fetchedAt }]);
  });

  it('points an existing lookup at the location saved last', async () => {
    const other = { ...zermatt, id: 1, name: 'Somewhere else' };
    await repo.save(zermatt, 'Zermatt');
    await repo.save(other, 'Zermatt');

    expect(await repo.findByLookup('Zermatt')).toEqual(other);
  });
});
