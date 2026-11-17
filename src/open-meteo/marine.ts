import { z } from 'zod';
import { FORECAST_DAYS, MARINE_URL } from '../const/open-meteo.js';
import type { Location, MarineDay } from '../domain.js';
import { getJson, type Fetch } from './http.js';

const values = z.array(z.number().nullable()).length(FORECAST_DAYS);

const dailySchema = z.object({
  time: z.array(z.iso.date()).length(FORECAST_DAYS),
  wave_height_max: values,
  swell_wave_height_max: values,
  swell_wave_period_max: values,
});
const responseSchema = z.object({ daily: dailySchema });

// Derived from the schema, so the request always asks for exactly what is validated.
const DAILY_FIELDS = Object.keys(dailySchema.shape).filter((field) => field !== 'time');

/**
 * Returns [] when there is no sea nearby: inland, Open-Meteo answers HTTP 200 with every value
 * null. A failed request throws instead, so the caller can tell the two apart.
 */
export async function fetchMarine(
  fetchFn: Fetch,
  location: Pick<Location, 'latitude' | 'longitude' | 'timezone'>,
): Promise<MarineDay[]> {
  const url = new URL(MARINE_URL);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
    forecast_days: String(FORECAST_DAYS),
    daily: DAILY_FIELDS.join(','),
  }).toString();
  const { daily } = await getJson(fetchFn, url, responseSchema);
  const { time, ...fields } = daily;
  const noSea = Object.values(fields).every((column) => column.every((value) => value === null));
  if (noSea) return [];
  return time.map((date, day) => ({
    date,
    waveHeightMaxM: fields.wave_height_max[day] ?? null,
    swellWaveHeightMaxM: fields.swell_wave_height_max[day] ?? null,
    swellWavePeriodMaxS: fields.swell_wave_period_max[day] ?? null,
  }));
}
