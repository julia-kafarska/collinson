/** GraphQL `extensions.code` values (PRD §6). */
export const ERROR_CODES = {
  BAD_USER_INPUT: 'BAD_USER_INPUT',
  LOCATION_NOT_FOUND: 'LOCATION_NOT_FOUND',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
} as const;

/** Messages the API client sees. */
export const USER_MESSAGES = {
  placeEmpty: 'place must not be empty',
  placeTooLong: (max: number) => `place must be at most ${max} characters`,
  countryCodeInvalid: 'countryCode must be a two-letter ISO 3166-1 code, e.g. "FR"',
  locationNotFound: (place: string) => `No location found for "${place}"`,
  upstreamUnavailable: 'Weather data is unavailable right now. Please try again later.',
} as const;

/** Why Open-Meteo or a refresh failed. Never sent to the client, which gets `upstreamUnavailable`. */
export const UPSTREAM_MESSAGES = {
  httpStatus: (host: string, status: number) => `${host} answered HTTP ${status}`,
  serverError: (status: number) => `HTTP ${status}`,
  invalidJson: (host: string) => `${host} sent invalid JSON`,
  unexpectedResponse: (host: string) => `${host} sent an unexpected response`,
  hostUnreachable: (host: string) => `${host} is unreachable`,
  budgetUsedUp: (cap: number, per: string) =>
    `Open-Meteo budget of ${cap} calls a ${per} is used up`,
  noForecast: (name: string) => `No forecast is available for ${name} right now`,
} as const;

/** Why the process could not start. */
export const STARTUP_MESSAGES = {
  invalidEnv: (details: string) => `Invalid environment variables:\n${details}`,
  migrationFailed: (file: string) => `Migration ${file} failed`,
} as const;
