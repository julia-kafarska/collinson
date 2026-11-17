import { USER_MESSAGES } from './const/errors.js';

/** No place matched the query. Mapped to LOCATION_NOT_FOUND in the GraphQL layer. */
export class LocationNotFoundError extends Error {
  constructor(place: string) {
    super(USER_MESSAGES.locationNotFound(place));
    this.name = 'LocationNotFoundError';
  }
}

/** Open-Meteo failed, timed out or sent something unexpected. Mapped to UPSTREAM_UNAVAILABLE. */
export class UpstreamUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UpstreamUnavailableError';
  }
}
