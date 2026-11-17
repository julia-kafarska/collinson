import pg from 'pg';
import { DB_POOL_SIZE } from '../const/limits.js';

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: DB_POOL_SIZE });
}
