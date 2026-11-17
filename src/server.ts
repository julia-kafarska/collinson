import { Logger } from '@graphql-hive/logger';
import { PinoLogWriter } from '@graphql-hive/logger/writers/pino';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { BODY_LIMIT_BYTES, UPSTREAM_BUDGET } from './const/limits.js';
import { HEALTH_PATH } from './const/server.js';
import { createForecastService } from './forecast/forecast-service.js';
import { createGraphQL } from './graphql/graphql.js';
import { registerProtection, trustProxy } from './http/protection.js';
import { createUpstreamBudget } from './open-meteo/budget.js';
import { geocode } from './open-meteo/geocoding.js';
import { fetchForecast } from './open-meteo/forecast.js';
import type { Fetch } from './open-meteo/http.js';
import { fetchMarine } from './open-meteo/marine.js';
import { SCORERS } from './scoring/scorers.js';
import { createLocationRepo } from './storage/location-repo.js';
import { createWeatherRepo } from './storage/weather-repo.js';

export interface AppDeps {
  logger: boolean;
  pool: Pool;
  /** The fetch used for every Open-Meteo call. */
  fetch: Fetch;
  now: () => Date;
  /** How long stored weather counts as fresh. */
  ttlMs: number;
}

/** Builds the app without listening or connecting, so tests can drive it with `inject`. */
export async function buildApp({
  logger,
  pool,
  fetch,
  now,
  ttlMs,
}: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger, trustProxy, bodyLimit: BODY_LIMIT_BYTES });
  // Before any route, so the rate limit covers them all (PRD §10).
  await registerProtection(app);

  // One budget for all three Open-Meteo APIs, so the shared free-tier quota is never exceeded.
  const upstream = createUpstreamBudget({ ...UPSTREAM_BUDGET, now }).wrap(fetch);
  const forecasts = createForecastService({
    locations: createLocationRepo(pool),
    weather: createWeatherRepo(pool),
    geocode: (place, countryCode) => geocode(upstream, place, countryCode),
    fetchForecast: (location) => fetchForecast(upstream, location),
    fetchMarine: (location) => fetchMarine(upstream, location),
    now,
    ttlMs,
    log: app.log,
  });

  const yoga = createGraphQL({
    forecasts,
    scorers: SCORERS,
    // Route Yoga's own logs (including masked errors) through Fastify's JSON logger.
    logging: new Logger({ writers: [new PinoLogWriter(app.log)] }),
  });

  app.get(HEALTH_PATH, { config: { rateLimit: false } }, async () => ({ status: 'ok' }));

  app.route({
    url: yoga.graphqlEndpoint,
    method: ['GET', 'POST', 'OPTIONS'],
    handler: async (req, reply) => {
      const response = await yoga.handleNodeRequestAndResponse(req, reply);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.status(response.status);
      reply.send(response.body);
      return reply;
    },
  });

  return app;
}
