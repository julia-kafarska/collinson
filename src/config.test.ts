import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5433/db';

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      PORT: 8080,
      DATABASE_URL,
      FORECAST_TTL_MINUTES: 180,
    });
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => loadConfig({ DATABASE_URL, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('requires DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });
});
