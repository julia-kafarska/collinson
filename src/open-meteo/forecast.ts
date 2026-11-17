import { z } from 'zod';
import type { ForecastDay, Location } from '../domain.js';
import { getJson, type Fetch } from './http.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 7;
// Yesterday is fetched only to give the first day its fresh snow (DECISIONS D6).
const PAST_DAYS = 1;
const RESPONSE_DAYS = PAST_DAYS + FORECAST_DAYS;

// Unlike marine data, a null here means a broken forecast, so it fails validation.
const values = z.array(z.number()).length(RESPONSE_DAYS);

const dailySchema = z.object({
  time: z.array(z.iso.date()).length(RESPONSE_DAYS),
  temperature_2m_max: values,
  temperature_2m_min: values,
  apparent_temperature_max: values,
  precipitation_sum: values,
  precipitation_probability_max: values,
  snowfall_sum: values,
  snow_depth_max: values,
  weather_code: values,
  wind_speed_10m_max: values,
  wind_gusts_10m_max: values,
  sunshine_duration: values,
  daylight_duration: values,
});
const responseSchema = z.object({ daily: dailySchema });

type Daily = z.infer<typeof dailySchema>;

// Derived from the schema, so the request always asks for exactly what is validated.
const DAILY_FIELDS = Object.keys(dailySchema.shape).filter((field) => field !== 'time');

export async function fetchForecast(
  fetchFn: Fetch,
  location: Pick<Location, 'latitude' | 'longitude' | 'timezone'>,
): Promise<ForecastDay[]> {
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
    forecast_days: String(FORECAST_DAYS),
    past_days: String(PAST_DAYS),
    daily: DAILY_FIELDS.join(','),
  }).toString();
  const { daily } = await getJson(fetchFn, url, responseSchema);
  return toForecastDays(daily);
}

function toForecastDays(daily: Daily): ForecastDay[] {
  // The schema checked that every field has a value for every day.
  const value = (field: Exclude<keyof Daily, 'time'>, day: number) => daily[field][day]!;
  return daily.time.slice(PAST_DAYS).map((date, index) => {
    const day = index + PAST_DAYS;
    return {
      date,
      tempMaxC: value('temperature_2m_max', day),
      tempMinC: value('temperature_2m_min', day),
      apparentTempMaxC: value('apparent_temperature_max', day),
      precipitationMm: value('precipitation_sum', day),
      precipitationProbabilityPct: value('precipitation_probability_max', day),
      snowfallCm: value('snowfall_sum', day),
      freshSnowCm: value('snowfall_sum', day - 1),
      // Metres to cm, rounded to 0.1 cm: a plain * 100 turns 0.29 m into 28.999999999999996.
      snowDepthMaxCm: Math.round(value('snow_depth_max', day) * 1000) / 10,
      weatherCode: value('weather_code', day),
      windSpeedMaxKmh: value('wind_speed_10m_max', day),
      windGustsMaxKmh: value('wind_gusts_10m_max', day),
      sunshineSeconds: value('sunshine_duration', day),
      daylightSeconds: value('daylight_duration', day),
    };
  });
}
