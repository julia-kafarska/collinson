import { z } from 'zod';
import { GEOCODING_LANGUAGE, GEOCODING_MAX_MATCHES, GEOCODING_URL } from '../const/open-meteo.js';
import type { Location } from '../domain.js';
import { getJson, type Fetch } from './http.js';

// Open-Meteo leaves out keys it has no value for, and the whole `results` key when nothing matches.
const searchResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        elevation: z.number().optional(),
        timezone: z.string(),
      }),
    )
    .optional(),
});

export async function geocode(
  fetch: Fetch,
  place: string,
  countryCode?: string,
): Promise<Location | null> {
  const params = new URLSearchParams({
    name: place,
    count: String(GEOCODING_MAX_MATCHES),
    language: GEOCODING_LANGUAGE,
    format: 'json',
  });
  if (countryCode) params.set('countryCode', countryCode);

  const url = new URL(`${GEOCODING_URL}?${params}`);
  const { results } = await getJson(fetch, url, searchResponseSchema);
  const top = results?.[0];
  if (!top) return null;
  return {
    id: top.id,
    name: top.name,
    country: top.country ?? null,
    region: top.admin1 ?? null,
    latitude: top.latitude,
    longitude: top.longitude,
    elevationM: top.elevation ?? null,
    timezone: top.timezone,
  };
}
