import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from '../../src/storage/migrate.js';

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://weather:weather@localhost:5433/weather';

export interface TestDb {
  pool: pg.Pool;
  schema: string;
  drop: () => Promise<void>;
}

/** A fresh, empty schema per test file, so integration tests can run in parallel. */
export async function createTestDb(): Promise<TestDb> {
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({
    connectionString: TEST_DATABASE_URL,
    max: 5,
    options: `-c search_path=${schema}`,
  });
  return {
    pool,
    schema,
    drop: async () => {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}

/** A fresh schema with every migration applied. */
export async function createMigratedTestDb(): Promise<TestDb> {
  const db = await createTestDb();
  await migrate(db.pool);
  return db;
}
