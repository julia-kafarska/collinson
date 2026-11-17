import type { Pool } from 'pg';
import type { Location } from '../domain.js';

export interface LocationRepo {
  /** The location cached for this place query, or null on a miss. */
  findByLookup(query: string, countryCode?: string): Promise<Location | null>;
  /** Upserts the location and points the lookup at it. The fetch times are left alone. */
  save(location: Location, query: string, countryCode?: string): Promise<void>;
}

// "No country" is '' because primary-key columns can't be NULL.
function lookupKey(query: string, countryCode = ''): [string, string] {
  return [query.trim().toLowerCase(), countryCode.toUpperCase()];
}

export function createLocationRepo(pool: Pool): LocationRepo {
  return {
    async findByLookup(query, countryCode) {
      const { rows } = await pool.query<Omit<Location, 'id'> & { id: string }>(
        `SELECT l.id, l.name, l.country, l.region, l.latitude, l.longitude,
                l.elevation AS "elevationM", l.timezone
         FROM place_lookups p JOIN locations l ON l.id = p.location_id
         WHERE p.query_normalised = $1 AND p.country_code = $2`,
        lookupKey(query, countryCode),
      );
      const row = rows[0];
      // pg returns bigint as a string; GeoNames ids are well inside the safe-integer range.
      return row ? { ...row, id: Number(row.id) } : null;
    },

    async save(location, query, countryCode) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO locations (id, name, country, region, latitude, longitude, elevation, timezone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, country = EXCLUDED.country, region = EXCLUDED.region,
             latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
             elevation = EXCLUDED.elevation, timezone = EXCLUDED.timezone`,
          [
            location.id,
            location.name,
            location.country,
            location.region,
            location.latitude,
            location.longitude,
            location.elevationM,
            location.timezone,
          ],
        );
        await client.query(
          `INSERT INTO place_lookups (query_normalised, country_code, location_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (query_normalised, country_code) DO UPDATE SET location_id = EXCLUDED.location_id`,
          [...lookupKey(query, countryCode), location.id],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
