import { EnvelopArmorPlugin } from '@escape.tech/graphql-armor';

/** PRD §10. Three aliases plus one unaliased field let a request resolve at most 4 places. */
export const GRAPHQL_LIMITS = { maxAliases: 3, maxDepth: 6, maxTokens: 1000 } as const;

/**
 * GraphQL Armor with the limits above. Its other protections keep their defaults, and GraphiQL
 * still works: depth and cost skip `__schema`, and its introspection query is under 200 tokens.
 * Batching stays off because Yoga ships it off.
 */
export function graphqlLimitPlugins() {
  // Return type inferred: Armor types its plugin for envelop 5, which doesn't match Yoga 6's
  // envelop 6 `Plugin` type, though Yoga accepts and runs it (limits.test.ts).
  return [
    EnvelopArmorPlugin({
      maxAliases: { n: GRAPHQL_LIMITS.maxAliases },
      maxDepth: { n: GRAPHQL_LIMITS.maxDepth },
      maxTokens: { n: GRAPHQL_LIMITS.maxTokens },
    }),
  ];
}
