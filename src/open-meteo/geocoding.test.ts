import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, loadFixture } from '../../test/helpers/fixtures.js';
import { UpstreamUnavailableError } from '../errors.js';
import { geocode } from './geocoding.js';
import type { Fetch } from './http.js';

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const recorded = (file: string) => jsonResponse(loadFixture(file));

describe('geocode', () => {
  it('finds Paris, France for "Paris"', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(recorded('geocoding-paris.json'));
    await expect(geocode(fetch, 'Paris')).resolves.toEqual({
      id: 2988507,
      name: 'Paris',
      country: 'France',
      region: 'Île-de-France Region',
      latitude: 48.85341,
      longitude: 2.3488,
      elevationM: 42,
      timezone: 'Europe/Paris',
    });
  });

  it('finds Paris, Texas when narrowed to the US', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(recorded('geocoding-paris-us.json'));
    await expect(geocode(fetch, 'Paris', 'US')).resolves.toMatchObject({
      id: 4717560,
      country: 'United States',
      region: 'Texas',
    });
  });

  it('returns null for an unknown name, whose response has no results key', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(recorded('geocoding-not-found.json'));
    await expect(geocode(fetch, 'xyzxyzq')).resolves.toBeNull();
  });

  it('sends countryCode only when one is given', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(recorded('geocoding-paris.json'))
      .mockResolvedValueOnce(recorded('geocoding-paris-us.json'));
    await geocode(fetch, 'Paris');
    await geocode(fetch, 'Paris', 'US');
    // The exact URLs the fixtures were recorded from.
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      `${SEARCH_URL}?name=Paris&count=1&language=en&format=json`,
      `${SEARCH_URL}?name=Paris&count=1&language=en&format=json&countryCode=US`,
    ]);
  });

  it('URL-encodes the place, so it cannot inject query parameters', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(recorded('geocoding-not-found.json'));
    await geocode(fetch, 'Paris&count=100');
    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(url.searchParams.get('name')).toBe('Paris&count=100');
    expect(url.searchParams.getAll('count')).toEqual(['1']);
  });

  it('rejects malformed JSON with UpstreamUnavailableError', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(new Response('{"results":['));
    await expect(geocode(fetch, 'Paris')).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('retries once after a 503 and then succeeds', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(recorded('geocoding-paris.json'));
    await expect(geocode(fetch, 'Paris')).resolves.toMatchObject({ id: 2988507 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
