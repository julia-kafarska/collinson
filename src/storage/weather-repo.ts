import type { Pool, PoolClient } from 'pg';
import type { ForecastDay, MarineDay } from '../domain.js';

export interface StoredWeather {
  forecast: ForecastDay[];
  marine: MarineDay[];
  /** Null until the first fetch. */
  forecastFetchedAt: Date | null;
  marineFetchedAt: Date | null;
}

export interface WeatherRepo {
  /** Swaps the location's forecast rows for `days` and sets its forecast fetch time, atomically. */
  replaceForecast(locationId: number, days: ForecastDay[], fetchedAt: Date): Promise<void>;
  /** The same for marine rows. No days (no sea nearby) clears them and still sets the fetch time. */
  replaceMarine(locationId: number, days: MarineDay[], fetchedAt: Date): Promise<void>;
  /** Rows from `today` (YYYY-MM-DD) onwards, in date order, with both fetch times. */
  read(locationId: number, today: string): Promise<StoredWeather>;
}

async function inTransaction(
  pool: Pool,
  work: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await work(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function createWeatherRepo(pool: Pool): WeatherRepo {
  return {
    // Each replace sets its fetch time first. That locks the location row, so two replaces of one
    // location queue up instead of colliding on the primary key.
    replaceForecast(locationId, days, fetchedAt) {
      return inTransaction(pool, async (client) => {
        await client.query('UPDATE locations SET forecast_fetched_at = $2 WHERE id = $1', [
          locationId,
          fetchedAt,
        ]);
        await client.query('DELETE FROM daily_weather WHERE location_id = $1', [locationId]);
        await client.query(
          `INSERT INTO daily_weather (location_id, date, temp_max, temp_min, apparent_temp_max,
             precipitation_sum, precipitation_probability_max, snowfall_sum, fresh_snow_cm,
             snow_depth_max, weather_code, wind_speed_max, wind_gusts_max, sunshine_duration,
             daylight_duration)
           SELECT $1, * FROM unnest($2::date[], $3::real[], $4::real[], $5::real[], $6::real[],
             $7::smallint[], $8::real[], $9::real[], $10::real[], $11::smallint[], $12::real[],
             $13::real[], $14::real[], $15::real[])`,
          [
            locationId,
            days.map((d) => d.date),
            days.map((d) => d.tempMaxC),
            days.map((d) => d.tempMinC),
            days.map((d) => d.apparentTempMaxC),
            days.map((d) => d.precipitationMm),
            days.map((d) => d.precipitationProbabilityPct),
            days.map((d) => d.snowfallCm),
            days.map((d) => d.freshSnowCm),
            days.map((d) => d.snowDepthMaxCm),
            days.map((d) => d.weatherCode),
            days.map((d) => d.windSpeedMaxKmh),
            days.map((d) => d.windGustsMaxKmh),
            days.map((d) => d.sunshineSeconds),
            days.map((d) => d.daylightSeconds),
          ],
        );
      });
    },

    replaceMarine(locationId, days, fetchedAt) {
      return inTransaction(pool, async (client) => {
        await client.query('UPDATE locations SET marine_fetched_at = $2 WHERE id = $1', [
          locationId,
          fetchedAt,
        ]);
        await client.query('DELETE FROM daily_marine WHERE location_id = $1', [locationId]);
        await client.query(
          `INSERT INTO daily_marine (location_id, date, wave_height_max, swell_wave_height_max,
             swell_wave_period_max)
           SELECT $1, * FROM unnest($2::date[], $3::real[], $4::real[], $5::real[])`,
          [
            locationId,
            days.map((d) => d.date),
            days.map((d) => d.waveHeightMaxM),
            days.map((d) => d.swellWaveHeightMaxM),
            days.map((d) => d.swellWavePeriodMaxS),
          ],
        );
      });
    },

    async read(locationId, today) {
      // Fetch times first, so a replace committing in between can only pair new rows with the old
      // time (at worst an extra refresh), never old rows with the new time.
      const {
        rows: [times],
      } = await pool.query<Pick<StoredWeather, 'forecastFetchedAt' | 'marineFetchedAt'>>(
        `SELECT forecast_fetched_at AS "forecastFetchedAt", marine_fetched_at AS "marineFetchedAt"
         FROM locations WHERE id = $1`,
        [locationId],
      );
      // date::text keeps YYYY-MM-DD: pg would make a JS Date at local midnight, which shifts days.
      const { rows: forecast } = await pool.query<ForecastDay>(
        `SELECT date::text AS date, temp_max AS "tempMaxC", temp_min AS "tempMinC",
           apparent_temp_max AS "apparentTempMaxC", precipitation_sum AS "precipitationMm",
           precipitation_probability_max AS "precipitationProbabilityPct",
           snowfall_sum AS "snowfallCm", fresh_snow_cm AS "freshSnowCm",
           snow_depth_max AS "snowDepthMaxCm", weather_code AS "weatherCode",
           wind_speed_max AS "windSpeedMaxKmh", wind_gusts_max AS "windGustsMaxKmh",
           sunshine_duration AS "sunshineSeconds", daylight_duration AS "daylightSeconds"
         FROM daily_weather WHERE location_id = $1 AND date >= $2 ORDER BY date`,
        [locationId, today],
      );
      const { rows: marine } = await pool.query<MarineDay>(
        `SELECT date::text AS date, wave_height_max AS "waveHeightMaxM",
           swell_wave_height_max AS "swellWaveHeightMaxM",
           swell_wave_period_max AS "swellWavePeriodMaxS"
         FROM daily_marine WHERE location_id = $1 AND date >= $2 ORDER BY date`,
        [locationId, today],
      );
      return {
        forecast,
        marine,
        forecastFetchedAt: times?.forecastFetchedAt ?? null,
        marineFetchedAt: times?.marineFetchedAt ?? null,
      };
    },
  };
}
