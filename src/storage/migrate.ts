import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

// Resolves to <repo>/migrations from both src/storage and dist/storage.
const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url);

/**
 * Applies new `*.sql` files in name order, each in its own transaction, and returns their names.
 * shortcut: no lock against two instances migrating at once; fine while max_instances is 1 (PRD §13).
 */
export async function migrate(pool: Pool, dir: URL = MIGRATIONS_DIR): Promise<string[]> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.name));
  const pending = (await readdir(dir)).filter((f) => f.endsWith('.sql') && !applied.has(f)).sort();

  for (const file of pending) {
    const sql = await readFile(new URL(file, dir), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed`, { cause: error });
    } finally {
      client.release();
    }
  }
  return pending;
}
