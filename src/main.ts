import { loadConfig } from './config.js';
import { buildApp } from './server.js';
import { createPool } from './storage/db.js';
import { migrate } from './storage/migrate.js';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);
const applied = await migrate(pool);

const app = buildApp({ logger: true });
app.log.info({ applied }, 'migrations done');
app.addHook('onClose', () => pool.end());

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close().then(() => process.exit(0)));
}

// 0.0.0.0, not localhost: inside a container, localhost can't be reached (DECISIONS D9).
await app.listen({ port: config.PORT, host: '0.0.0.0' });
