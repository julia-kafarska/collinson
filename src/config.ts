import { z } from 'zod';
import { STARTUP_MESSAGES } from './const/errors.js';
import { DEFAULT_FORECAST_TTL_MINUTES } from './const/limits.js';
import { DEFAULT_PORT } from './const/server.js';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
  DATABASE_URL: z.string().min(1),
  FORECAST_TTL_MINUTES: z.coerce.number().int().positive().default(DEFAULT_FORECAST_TTL_MINUTES),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(STARTUP_MESSAGES.invalidEnv(z.prettifyError(result.error)));
  }
  return result.data;
}
