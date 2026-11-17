// Shared domain types. Units follow PRD §8; field names carry the unit.

export const ACTIVITIES = [
  'SKIING',
  'SURFING',
  'OUTDOOR_SIGHTSEEING',
  'INDOOR_SIGHTSEEING',
] as const;
export type Activity = (typeof ACTIVITIES)[number];

export interface Location {
  /** GeoNames id from Open-Meteo geocoding. */
  id: number;
  name: string;
  country: string | null;
  /** First-level region, e.g. a state or province (Open-Meteo's `admin1`). */
  region: string | null;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  /** IANA timezone, e.g. Europe/Zurich. */
  timezone: string;
}

/** One forecast day. `date` is YYYY-MM-DD in the location's timezone. */
export interface ForecastDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  apparentTempMaxC: number;
  precipitationMm: number;
  precipitationProbabilityPct: number;
  snowfallCm: number;
  /** The previous day's snowfall (DECISIONS D6). */
  freshSnowCm: number;
  snowDepthMaxCm: number;
  /** WMO weather code. */
  weatherCode: number;
  windSpeedMaxKmh: number;
  windGustsMaxKmh: number;
  sunshineSeconds: number;
  daylightSeconds: number;
}

/** One marine day. A value is null where Open-Meteo has none. */
export interface MarineDay {
  date: string;
  waveHeightMaxM: number | null;
  swellWaveHeightMaxM: number | null;
  swellWavePeriodMaxS: number | null;
}

/** What a scorer sees: the forecast day plus that day's marine data, or null when there is none. */
export interface DailyWeather extends ForecastDay {
  marine: MarineDay | null;
}
