// WMO weather codes, as Open-Meteo reports them. Quality is how good the weather is to be out
// in, from 0 to 1. Typed rather than `as const`, since `includes` on literal codes rejects a
// plain number.

export const THUNDERSTORM_CODES: readonly number[] = [95, 96, 97, 98, 99];

export const WEATHER_CODES: ReadonlyArray<{
  codes: readonly number[];
  description: string;
  quality: number;
}> = [
  { codes: [0], description: 'clear', quality: 1 },
  { codes: [1], description: 'mainly clear', quality: 0.9 },
  { codes: [2], description: 'partly cloudy', quality: 0.75 },
  { codes: [3], description: 'overcast', quality: 0.55 },
  { codes: [45, 48], description: 'fog', quality: 0.3 },
  { codes: [51, 52, 53, 54, 55, 56, 57], description: 'drizzle', quality: 0.4 },
  { codes: [61, 80], description: 'light rain', quality: 0.35 },
  { codes: [63, 81], description: 'rain', quality: 0.25 },
  { codes: [65, 82], description: 'heavy rain', quality: 0.1 },
  { codes: [66, 67], description: 'freezing rain', quality: 0.05 },
  { codes: [71, 85], description: 'light snow', quality: 0.45 },
  { codes: [73], description: 'snow', quality: 0.3 },
  { codes: [75, 86], description: 'heavy snow', quality: 0.15 },
  { codes: [77], description: 'snow grains', quality: 0.4 },
  { codes: THUNDERSTORM_CODES, description: 'thunderstorm', quality: 0 },
];

/** For any code not in WEATHER_CODES. */
export const UNKNOWN_WEATHER = { description: 'unknown', quality: 0.5 } as const;
