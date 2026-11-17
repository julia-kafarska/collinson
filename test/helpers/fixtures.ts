import { readFileSync } from 'node:fs';

/** Reads a recorded API response from test/fixtures. */
export function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
}

/** A fetch Response carrying `body` as JSON. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
