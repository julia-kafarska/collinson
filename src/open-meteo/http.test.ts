import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { UpstreamUnavailableError } from '../errors.js';
import { getJson, type Fetch } from './http.js';

const url = new URL('https://api.example.test/v1/thing');
const schema = z.object({ value: z.number() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('getJson', () => {
  it('returns the validated body', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(json({ value: 1 }));
    await expect(getJson(fetch, url, schema)).resolves.toEqual({ value: 1 });
  });

  it('sends a timeout signal', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(json({ value: 1 }));
    await getJson(fetch, url, schema);
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('retries once after a 5xx', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ value: 2 }));
    await expect(getJson(fetch, url, schema)).resolves.toEqual({ value: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries once after a network error', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(json({ value: 3 }));
    await expect(getJson(fetch, url, schema)).resolves.toEqual({ value: 3 });
  });

  it('does not retry a call refused before it was sent, e.g. by the call cap', async () => {
    const refused = new UpstreamUnavailableError('Open-Meteo call budget used up');
    const fetch = vi.fn<Fetch>().mockRejectedValue(refused);
    await expect(getJson(fetch, url, schema)).rejects.toBe(refused);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after two failed attempts', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(json({}, 502));
    await expect(getJson(fetch, url, schema)).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 4xx', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(json({ reason: 'bad' }, 400));
    await expect(getJson(fetch, url, schema)).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a body that does not match the schema', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(json({ value: 'nope' }));
    await expect(getJson(fetch, url, schema)).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('rejects malformed JSON', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValueOnce(new Response('<html>', { status: 200 }));
    await expect(getJson(fetch, url, schema)).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});
