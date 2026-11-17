export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

/**
 * Days from today in the location's timezone: what forecast and marine requests ask for, and the
 * week ForecastService serves. One number, so stored rows always cover the week it checks for.
 */
export const FORECAST_DAYS = 7;
// Yesterday is fetched only to give the first day its fresh snow (DECISIONS D6).
export const PAST_DAYS = 1;

export const GEOCODING_LANGUAGE = 'en';
// Open-Meteo ranks matches by relevance and population, so the first is the answer (PRD Q2).
export const GEOCODING_MAX_MATCHES = 1;
