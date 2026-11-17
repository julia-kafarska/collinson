import { loadConfig } from './config.js';
import { buildApp } from './server.js';
import { createPool } from './storage/db.js';
import { migrate } from './storage/migrate.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const applied = await migrate(pool);

const app = await buildApp({
  logger: true,
  pool,
  fetch: globalThis.fetch,
  now: () => new Date(),
  ttlMs: config.FORECAST_TTL_MINUTES * 60_000,
});
app.log.info({ applied, node: process.version }, 'migrations done');
app.addHook('onClose', () => pool.end());

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close().then(() => process.exit(0)));
}

// 0.0.0.0, not localhost: inside a container, localhost can't be reached (DECISIONS D9).
await app.listen({ port: config.PORT, host: '0.0.0.0' });
