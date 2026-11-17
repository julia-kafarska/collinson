import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { describe, expect, it } from 'vitest';
import { BODY_LIMIT_BYTES, registerProtection, trustProxy } from './protection.js';

const TEST_MAX = 3;
const PROXY_IP = '10.0.0.1';
const CLIENT_IP = '5.6.7.8';
const OTHER_CLIENT_IP = '6.7.8.9';
const SPOOFED_IP = '1.1.1.1';
const PINO_WARN = 40;

async function buildTestApp(logger: FastifyServerOptions['logger'] = false) {
  const app = Fastify({ trustProxy, bodyLimit: BODY_LIMIT_BYTES, logger });
  await registerProtection(app, { max: TEST_MAX, timeWindow: '1 minute' });
  app.post('/echo', async (request) => request.body);
  app.get('/health', { config: { rateLimit: false } }, async () => ({ status: 'ok' }));
  return app;
}

// As in production, each request comes from the proxy, which appended the address it saw.
function postEcho(app: FastifyInstance, forwardedFor: string) {
  return app.inject({
    method: 'POST',
    url: '/echo',
    remoteAddress: PROXY_IP,
    headers: { 'x-forwarded-for': forwardedFor },
    payload: { hello: 'world' },
  });
}

async function postAll(app: FastifyInstance, forwardedFors: string[]): Promise<number[]> {
  const statusCodes: number[] = [];
  for (const forwardedFor of forwardedFors) {
    statusCodes.push((await postEcho(app, forwardedFor)).statusCode);
  }
  return statusCodes;
}

describe('HTTP protection', () => {
  it('allows 60 requests per minute by default', async () => {
    const app = Fastify();
    await registerProtection(app);
    app.get('/', async () => 'ok');
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.headers['x-ratelimit-limit']).toBe('60');
    expect(res.headers['x-ratelimit-reset']).toBe('60');
    await app.close();
  });

  it('answers the request over the limit with 429 and Retry-After', async () => {
    const app = await buildTestApp();
    expect(await postAll(app, [CLIENT_IP, CLIENT_IP, CLIENT_IP])).toEqual([200, 200, 200]);
    const res = await postEcho(app, CLIENT_IP);
    expect(res.statusCode).toBe(429);
    expect(res.headers['retry-after']).toBe('60');
    await app.close();
  });

  it('keys clients by the last X-Forwarded-For entry, so two clients have separate limits', async () => {
    const app = await buildTestApp();
    // Both share the first entry, so only the last one tells them apart.
    const client = `9.9.9.9, ${CLIENT_IP}`;
    const otherClient = `9.9.9.9, ${OTHER_CLIENT_IP}`;
    expect(await postAll(app, [client, client, client, client, otherClient])).toEqual([
      200, 200, 200, 429, 200,
    ]);
    await app.close();
  });

  it('keeps the limit when a client changes its own part of X-Forwarded-For', async () => {
    const app = await buildTestApp();
    const spoofed = ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4'].map((ip) => `${ip}, ${CLIENT_IP}`);
    expect(await postAll(app, spoofed)).toEqual([200, 200, 200, 429]);
    await app.close();
  });

  it('never limits /health', async () => {
    const app = await buildTestApp();
    for (let i = 0; i <= TEST_MAX; i++) {
      expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    }
    await app.close();
  });

  it('rejects a 20 KB body with 413 and accepts a small one', async () => {
    const app = await buildTestApp();
    const big = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { data: 'x'.repeat(20 * 1024) },
    });
    expect(big.statusCode).toBe(413);
    const small = await app.inject({ method: 'POST', url: '/echo', payload: { hello: 'world' } });
    expect(small.statusCode).toBe(200);
    expect(small.json()).toEqual({ hello: 'world' });
    await app.close();
  });

  it('logs a warning with the client IP, not the client-made header, on a rejection', async () => {
    const lines: string[] = [];
    const app = await buildTestApp({
      level: 'warn',
      stream: { write: (line: string) => lines.push(line) },
    });
    const forwardedFor = `${SPOOFED_IP}, ${CLIENT_IP}`;
    await postAll(app, [forwardedFor, forwardedFor, forwardedFor, forwardedFor]);
    expect(lines.map((line) => JSON.parse(line))).toEqual([
      expect.objectContaining({ level: PINO_WARN, msg: 'rate limit exceeded', ip: CLIENT_IP }),
    ]);
    expect(lines.join('')).not.toContain(SPOOFED_IP);
    await app.close();
  });
});
