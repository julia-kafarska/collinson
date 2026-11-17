import { readFileSync } from 'node:fs';
import { getIntrospectionQuery } from 'graphql';
import { createSchema, createYoga } from 'graphql-yoga';
import { describe, expect, it, vi } from 'vitest';
import { graphqlLimitPlugins } from './limits.js';

const typeDefs = readFileSync(new URL('./schema.graphql', import.meta.url), 'utf8');

interface GraphQLBody {
  data?: unknown;
  errors?: { message: string }[];
}

/** A Yoga on the real schema with the limits on, and a stub resolver that counts its calls. */
function setup() {
  const activityForecast = vi.fn(() => ({ stale: false }));
  const yoga = createYoga({
    schema: createSchema({ typeDefs, resolvers: { Query: { activityForecast } } }),
    plugins: graphqlLimitPlugins(),
    logging: false,
  });
  const run = async (query: string): Promise<GraphQLBody> => {
    const response = await yoga.fetch('http://test/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return (await response.json()) as GraphQLBody;
  };
  return { run, activityForecast };
}

const aliasedForecasts = (count: number) =>
  `{ ${Array.from({ length: count }, (_, i) => `p${i}: activityForecast(place: "Place ${i}") { stale }`).join(' ')} }`;

describe('graphqlLimitPlugins', () => {
  it('rejects 4 aliased activityForecast fields without resolving any', async () => {
    const { run, activityForecast } = setup();
    const body = await run(aliasedForecasts(4));

    expect(body.errors?.[0]?.message).toMatch(/Aliases limit of 3 exceeded/);
    expect(body.data).toBeUndefined();
    expect(activityForecast).not.toHaveBeenCalled();
  });

  it('accepts 3 aliased activityForecast fields', async () => {
    const { run, activityForecast } = setup();
    const body = await run(aliasedForecasts(3));

    expect(body.errors).toBeUndefined();
    expect(activityForecast).toHaveBeenCalledTimes(3);
  });

  it('rejects a query deeper than 6 levels', async () => {
    const { run, activityForecast } = setup();
    // The schema is only 4 levels deep, so inline fragments make up the rest: this one is 7.
    const fragments = 3;
    const body = await run(
      `{ activityForecast(place: "Zermatt") { ${'... on ActivityForecast { '.repeat(fragments)}` +
        `activities { days { reasons } } ${'} '.repeat(fragments)}} }`,
    );

    expect(body.errors?.[0]?.message).toMatch(/depth limit of 6 exceeded/);
    expect(activityForecast).not.toHaveBeenCalled();
  });

  it('rejects a query of more than 1,000 tokens', async () => {
    const { run, activityForecast } = setup();
    const body = await run(`{ activityForecast(place: "Zermatt") { ${'stale '.repeat(1000)}} }`);

    expect(body.errors?.[0]?.message).toMatch(/Token limit of 1000 exceeded/);
    expect(activityForecast).not.toHaveBeenCalled();
  });

  it('accepts the introspection query GraphiQL sends', async () => {
    const { run } = setup();
    const body = await run(getIntrospectionQuery());

    expect(body.errors).toBeUndefined();
    expect(body.data).toHaveProperty('__schema.queryType.name', 'Query');
  });
});
