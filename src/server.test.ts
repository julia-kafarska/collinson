import { describe, expect, it } from 'vitest';
import { buildApp } from './server.js';

describe('server', () => {
  it('answers /health', async () => {
    const app = buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('serves GraphQL at /graphql', async () => {
    const app = buildApp({ logger: false });
    const res = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query: '{ __typename }' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { __typename: 'Query' } });
    await app.close();
  });
});
