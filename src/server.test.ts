import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMigratedTestDb, type TestDb } from '../test/helpers/db.js';
import { jsonResponse, loadFixture } from '../test/helpers/fixtures.js';
import type { Fetch } from './open-meteo/http.js';
import { buildApp } from './server.js';

// The recorded Zermatt forecast starts on 2026-11-16 (past_days=1), so "today" is the 17th.
const NOW = new Date('2026-11-17T09:00:00Z');
const TTL_MS = 3 * 60 * 60 * 1000;

/** Answers like Open-Meteo, from recorded responses. Zermatt is inland, so marine is all null. */
function fakeOpenMeteo({ forecastDown = false } = {}) {
  return vi.fn<Fetch>(async (input) => {
    const url = new URL(String(input));
    switch (url.host) {
      case 'geocoding-api.open-meteo.com':
        return jsonResponse(
          loadFixture(
            url.searchParams.get('name') === 'Zermatt'
              ? 'geocoding-zermatt.json'
              : 'geocoding-not-found.json',
          ),
        );
      case 'api.open-meteo.com':
        return forecastDown
          ? jsonResponse({ error: true }, 503)
          : jsonResponse(loadFixture('forecast-zermatt.json'));
      case 'marine-api.open-meteo.com':
        return jsonResponse(loadFixture('marine-madrid.json'));
      default:
        throw new Error(`Unexpected request to ${url.host}`);
    }
  });
}

const QUERY = `query ($place: String!) {
  activityForecast(place: $place) {
    location { name timezone }
    stale
    activities { activity rank score bestDay days { date score reasons } }
  }
}`;

let db: TestDb;
beforeEach(async () => {
  db = await createMigratedTestDb();
});
afterEach(async () => {
  await db.drop();
});

async function appWith(fetch: Fetch) {
  return buildApp({ logger: false, pool: db.pool, fetch, now: () => NOW, ttlMs: TTL_MS });
}

async function ask(app: Awaited<ReturnType<typeof appWith>>, place: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query: QUERY, variables: { place } },
  });
  return res.json() as {
    data?: {
      activityForecast: {
        location: { name: string };
        activities: {
          activity: string;
          rank: number;
          score: number;
          days: { score: number; reasons: string[] }[];
        }[];
      };
    };
    errors?: { extensions?: { code?: string } }[];
  };
}

describe('server', () => {
  it('answers /health', async () => {
    const app = await appWith(fakeOpenMeteo());
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('serves GraphiQL with the example query', async () => {
    const app = await appWith(fakeOpenMeteo());
    const res = await app.inject({
      method: 'GET',
      url: '/graphql',
      headers: { accept: 'text/html' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Zermatt');
    await app.close();
  });

  it('ranks all four activities for Zermatt, end to end', async () => {
    const app = await appWith(fakeOpenMeteo());
    const result = (await ask(app, 'Zermatt')).data?.activityForecast;
    expect(result?.location.name).toBe('Zermatt');
    expect(result?.activities.map((a) => a.rank)).toEqual([1, 2, 3, 4]);
    for (const activity of result?.activities ?? []) {
      expect(activity.days).toHaveLength(7);
      for (const day of activity.days) {
        expect(Number.isInteger(day.score) && day.score >= 0 && day.score <= 100).toBe(true);
        expect(day.reasons.length).toBeGreaterThan(0);
      }
    }
    const surfing = result?.activities.find((a) => a.activity === 'SURFING');
    expect(surfing?.score).toBe(0);
    expect(surfing?.days[0]?.reasons).toContain('No marine data for this location');
    await app.close();
  });

  it('persists the weather: a second request makes no Open-Meteo call', async () => {
    const fetch = fakeOpenMeteo();
    const app = await appWith(fetch);
    await ask(app, 'Zermatt');
    const callsAfterFirst = fetch.mock.calls.length;
    await ask(app, 'Zermatt');
    expect(callsAfterFirst).toBe(3); // geocoding, forecast, marine
    expect(fetch).toHaveBeenCalledTimes(3);
    await app.close();
  });

  it('answers LOCATION_NOT_FOUND for an unknown place', async () => {
    const app = await appWith(fakeOpenMeteo());
    expect((await ask(app, 'Xyzxyzq')).errors?.[0]?.extensions?.code).toBe('LOCATION_NOT_FOUND');
    await app.close();
  });

  it('answers UPSTREAM_UNAVAILABLE when Open-Meteo is down and nothing is stored', async () => {
    const app = await appWith(fakeOpenMeteo({ forecastDown: true }));
    expect((await ask(app, 'Zermatt')).errors?.[0]?.extensions?.code).toBe('UPSTREAM_UNAVAILABLE');
    await app.close();
  });
});
