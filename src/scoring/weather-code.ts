// WMO weather codes, as Open-Meteo reports them. Quality is how good the weather is to be out
// in, from 0 to 1.

const THUNDERSTORM_CODES = [95, 96, 97, 98, 99];

const WEATHER = [
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

const UNKNOWN = { description: 'unknown', quality: 0.5 };

function lookup(code: number): { description: string; quality: number } {
  return WEATHER.find(({ codes }) => codes.includes(code)) ?? UNKNOWN;
}

export function isThunderstorm(code: number): boolean {
  return THUNDERSTORM_CODES.includes(code);
}

/** From 0 (thunderstorm) to 1 (clear). An unknown code gives 0.5. */
export function weatherQuality(code: number): number {
  return lookup(code).quality;
}

/** A short description for reasons, e.g. "heavy rain". An unknown code gives "unknown". */
export function describeWeather(code: number): string {
  return lookup(code).description;
}
