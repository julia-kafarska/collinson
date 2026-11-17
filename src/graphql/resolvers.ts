import { GraphQLError } from 'graphql';
import { z } from 'zod';
import type { Activity } from '../domain.js';
import { LocationNotFoundError, UpstreamUnavailableError } from '../errors.js';
import type { ForecastService } from '../forecast/forecast-service.js';
import { rankActivities } from '../scoring/rank.js';
import type { Scorer } from '../scoring/types.js';

export interface ResolverDeps {
  forecasts: Pick<ForecastService, 'getWeek'>;
  scorers: Record<Activity, Scorer>;
}

const MAX_PLACE_LENGTH = 100;

const inputSchema = z.object({
  place: z
    .string()
    .trim()
    .min(1, 'place must not be empty')
    .max(MAX_PLACE_LENGTH, `place must be at most ${MAX_PLACE_LENGTH} characters`),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/, 'countryCode must be a two-letter ISO 3166-1 code, e.g. "FR"')
    .nullish()
    .transform((code) => code ?? undefined),
});

/** The one place where domain errors become GraphQL error codes (PRD §6). */
function toGraphQLError(error: unknown): unknown {
  if (error instanceof LocationNotFoundError) {
    return new GraphQLError(error.message, { extensions: { code: 'LOCATION_NOT_FOUND' } });
  }
  if (error instanceof UpstreamUnavailableError) {
    // No originalError: Yoga masks any error whose cause isn't a GraphQLError. ForecastService
    // has already logged the upstream failure.
    return new GraphQLError('Weather data is unavailable right now. Please try again later.', {
      extensions: { code: 'UPSTREAM_UNAVAILABLE' },
    });
  }
  // Anything else is unexpected: Yoga masks it as "Unexpected error." and logs the original.
  return error;
}

export function createResolvers({ forecasts, scorers }: ResolverDeps) {
  return {
    Query: {
      async activityForecast(
        _parent: unknown,
        args: { place: string; countryCode?: string | null },
      ) {
        const input = inputSchema.safeParse(args);
        if (!input.success) {
          throw new GraphQLError(input.error.issues.map((issue) => issue.message).join('; '), {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        try {
          const week = await forecasts.getWeek(input.data.place, input.data.countryCode);
          const { elevationM, ...location } = week.location;
          return {
            location: { ...location, elevation: elevationM },
            fetchedAt: week.fetchedAt.toISOString(),
            stale: week.stale,
            activities: rankActivities(week.days, scorers),
          };
        } catch (error) {
          throw toGraphQLError(error);
        }
      },
    },
  };
}
