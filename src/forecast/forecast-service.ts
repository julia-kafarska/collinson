import { UPSTREAM_MESSAGES } from '../const/errors.js';
import { LOG_MESSAGES } from '../const/log-messages.js';
import { FORECAST_DAYS } from '../const/open-meteo.js';
import type { DailyWeather, ForecastDay, Location, MarineDay } from '../domain.js';
import { LocationNotFoundError, UpstreamUnavailableError } from '../errors.js';
import type { LocationRepo } from '../storage/location-repo.js';
import type { StoredWeather, WeatherRepo } from '../storage/weather-repo.js';
import { addDays, localDate } from './dates.js';

export interface Logger {
  info(details: object, message: string): void;
  warn(details: object, message: string): void;
}

export interface ForecastServiceDeps {
  locations: LocationRepo;
  weather: WeatherRepo;
  geocode(place: string, countryCode?: string): Promise<Location | null>;
  fetchForecast(location: Location): Promise<ForecastDay[]>;
  fetchMarine(location: Location): Promise<MarineDay[]>;
  now(): Date;
  /** How long fetched data counts as fresh (PRD Q6). */
  ttlMs: number;
  log: Logger;
}

export interface Week {
  location: Location;
  /** Up to 7 days from today in the location's timezone, each with its marine data or null. */
  days: DailyWeather[];
  /** When the forecast behind `days` was fetched. */
  fetchedAt: Date;
  /** True when a refresh failed and older stored data is being served (FR6). */
  stale: boolean;
}

export interface ForecastService {
  getWeek(place: string, countryCode?: string): Promise<Week>;
}

type Source = 'forecast' | 'marine';

/** Read-through cache over Open-Meteo: serves stored weather, refreshing each stale source (PRD §8). */
export function createForecastService(deps: ForecastServiceDeps): ForecastService {
  const { locations, weather, now, ttlMs, log } = deps;
  // shortcut: single-flight lives in this process, correct while max_instances is 1 (PRD §13).
  const inFlight = new Map<number, Promise<void>>();

  async function resolve(place: string, countryCode?: string): Promise<Location> {
    const cached = await locations.findByLookup(place, countryCode);
    if (cached) return cached;
    const found = await deps.geocode(place, countryCode);
    if (!found) throw new LocationNotFoundError(place);
    await locations.save(found, place, countryCode);
    return found;
  }

  function withinTtl(fetchedAt: Date | null): boolean {
    return fetchedAt !== null && now().getTime() - fetchedAt.getTime() < ttlMs;
  }

  // Rows are read from today, so they cover the week when the last one reaches today + 6.
  function coversWeek(days: { date: string }[], today: string): boolean {
    const last = days.at(-1);
    return (
      days[0]?.date === today &&
      last !== undefined &&
      last.date >= addDays(today, FORECAST_DAYS - 1)
    );
  }

  function staleSources(stored: StoredWeather, today: string): Source[] {
    const stale: Source[] = [];
    if (!withinTtl(stored.forecastFetchedAt) || !coversWeek(stored.forecast, today)) {
      stale.push('forecast');
    }
    // No marine rows inside the TTL means the last fetch found no sea nearby.
    const marineCovered = stored.marine.length === 0 || coversWeek(stored.marine, today);
    if (!withinTtl(stored.marineFetchedAt) || !marineCovered) stale.push('marine');
    return stale;
  }

  async function refreshSource(location: Location, source: Source): Promise<void> {
    const started = performance.now();
    try {
      if (source === 'forecast') {
        await weather.replaceForecast(location.id, await deps.fetchForecast(location), now());
      } else {
        await weather.replaceMarine(location.id, await deps.fetchMarine(location), now());
      }
      log.info(
        { source, locationId: location.id, ms: Math.round(performance.now() - started) },
        LOG_MESSAGES.refreshed,
      );
    } catch (error) {
      // The caller re-reads the stored rows and serves them as stale (FR6, FR7).
      log.warn({ source, locationId: location.id, err: error }, LOG_MESSAGES.refreshFailed);
    }
  }

  function refreshOnce(location: Location, sources: Source[]): Promise<void> {
    const running = inFlight.get(location.id);
    if (running) return running;
    const flight = Promise.all(sources.map((source) => refreshSource(location, source)))
      .then(() => undefined)
      .finally(() => inFlight.delete(location.id));
    inFlight.set(location.id, flight);
    return flight;
  }

  return {
    async getWeek(place, countryCode) {
      const location = await resolve(place, countryCode);
      const today = localDate(now(), location.timezone);
      let stored = await weather.read(location.id, today);

      const stale = staleSources(stored, today);
      log.info(
        { locationId: location.id, refresh: stale },
        stale.length ? LOG_MESSAGES.cacheMiss : LOG_MESSAGES.cacheHit,
      );
      if (stale.length > 0) {
        await refreshOnce(location, stale);
        stored = await weather.read(location.id, today);
      }

      const { forecast, marine, forecastFetchedAt } = stored;
      if (forecast.length === 0 || forecastFetchedAt === null) {
        throw new UpstreamUnavailableError(UPSTREAM_MESSAGES.noForecast(location.name));
      }
      const stillStale = staleSources(stored, today);
      const marineByDate = new Map(marine.map((day) => [day.date, day]));
      return {
        location,
        days: forecast
          .slice(0, FORECAST_DAYS)
          .map((day) => ({ ...day, marine: marineByDate.get(day.date) ?? null })),
        fetchedAt: forecastFetchedAt,
        // Missing marine data is not stale data, so only stored marine rows can make it stale.
        stale:
          stillStale.includes('forecast') || (stillStale.includes('marine') && marine.length > 0),
      };
    },
  };
}
