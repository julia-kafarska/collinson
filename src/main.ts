import { loadConfig } from './config.js';
import { buildApp } from './server.js';

const config = loadConfig();
const app = buildApp({ logger: true });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close().then(() => process.exit(0)));
}

// 0.0.0.0, not localhost: inside a container, localhost can't be reached (DECISIONS D9).
await app.listen({ port: config.PORT, host: '0.0.0.0' });
