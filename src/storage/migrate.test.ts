import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../test/helpers/db.js';
import { migrate } from './migrate.js';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
});
afterEach(async () => {
  await db.drop();
});

async function tables(): Promise<string[]> {
  const { rows } = await db.pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
    [db.schema],
  );
  return rows.map((row) => row.table_name);
}

describe('migrate', () => {
  it('creates the schema from migrations/ and is idempotent', async () => {
    const first = await migrate(db.pool);
    const second = await migrate(db.pool);

    expect(first).toEqual(['001_init.sql']);
    expect(second).toEqual([]);
    expect(await tables()).toEqual([
      'daily_marine',
      'daily_weather',
      'locations',
      'place_lookups',
      'schema_migrations',
    ]);
  });

  it('rolls back a broken migration and stops', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'migrations-'));
    await writeFile(join(dir, '001_ok.sql'), 'CREATE TABLE ok (id int);');
    await writeFile(join(dir, '002_broken.sql'), 'CREATE TABLE half (id int); SELECT * FROM nope;');

    await expect(migrate(db.pool, pathToFileURL(`${dir}/`))).rejects.toThrow(/002_broken\.sql/);

    expect(await tables()).toEqual(['ok', 'schema_migrations']);
    const { rows } = await db.pool.query('SELECT name FROM schema_migrations');
    expect(rows).toEqual([{ name: '001_ok.sql' }]);
  });
});
