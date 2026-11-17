import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { ERROR_CODES, USER_MESSAGES } from '../const/errors.js';
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
    .min(1, USER_MESSAGES.placeEmpty)
    .max(MAX_PLACE_LENGTH, USER_MESSAGES.placeTooLong(MAX_PLACE_LENGTH)),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/, USER_MESSAGES.countryCodeInvalid)
    .nullish()
    .transform((code) => code ?? undefined),
});

/** The one place where domain errors become GraphQL error codes (PRD §6). */
function toGraphQLError(error: unknown): unknown {
  if (error instanceof LocationNotFoundError) {
    return new GraphQLError(error.message, {
      extensions: { code: ERROR_CODES.LOCATION_NOT_FOUND },
    });
  }
  if (error instanceof UpstreamUnavailableError) {
    // No originalError: Yoga masks any error whose cause isn't a GraphQLError. ForecastService
    // has already logged the upstream failure.
    return new GraphQLError(USER_MESSAGES.upstreamUnavailable, {
      extensions: { code: ERROR_CODES.UPSTREAM_UNAVAILABLE },
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
            extensions: { code: ERROR_CODES.BAD_USER_INPUT },
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
