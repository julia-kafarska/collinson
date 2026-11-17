import { THUNDERSTORM_CODES, UNKNOWN_WEATHER, WEATHER_CODES } from '../const/weather-codes.js';

function lookup(code: number): { description: string; quality: number } {
  return WEATHER_CODES.find(({ codes }) => codes.includes(code)) ?? UNKNOWN_WEATHER;
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
