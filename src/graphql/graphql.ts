import type { Logger } from '@graphql-hive/logger';
import { createSchema, createYoga } from 'graphql-yoga';
import { createResolvers, type ResolverDeps } from './resolvers.js';
import { typeDefs } from './schema.js';

// Pre-filled in GraphiQL, so a reviewer can press run straight away.
export const EXAMPLE_QUERY = `query Zermatt {
  activityForecast(place: "Zermatt") {
    location { name country timezone }
    fetchedAt
    stale
    activities { activity rank score bestDay days { date score reasons } }
  }
}
`;

export interface GraphQLDeps extends ResolverDeps {
  logging: Logger | boolean;
}

export function createGraphQL({ logging, ...deps }: GraphQLDeps) {
  return createYoga({
    schema: createSchema({ typeDefs, resolvers: createResolvers(deps) }),
    logging,
    // Never put stack traces or messages of unexpected errors in a response, whatever NODE_ENV says.
    maskedErrors: { isDev: false },
    graphiql: { defaultQuery: EXAMPLE_QUERY },
  });
}
