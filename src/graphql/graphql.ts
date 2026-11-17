import type { Logger } from '@graphql-hive/logger';
import { createSchema, createYoga } from 'graphql-yoga';
import { EXAMPLE_QUERY } from '../const/server.js';
import { graphqlLimitPlugins } from './limits.js';
import { createResolvers, type ResolverDeps } from './resolvers.js';
import { typeDefs } from './schema.js';

export interface GraphQLDeps extends ResolverDeps {
  logging: Logger | boolean;
}

export function createGraphQL({ logging, ...deps }: GraphQLDeps) {
  return createYoga({
    schema: createSchema({ typeDefs, resolvers: createResolvers(deps) }),
    logging,
    // Never put stack traces or messages of unexpected errors in a response, whatever NODE_ENV says.
    maskedErrors: { isDev: false },
    // Alias, depth and token limits, so one request can't fan out into many Open-Meteo calls.
    plugins: graphqlLimitPlugins(),
    graphiql: { defaultQuery: EXAMPLE_QUERY },
  });
}
