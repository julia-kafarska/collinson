import { describe, expect, it } from 'vitest';
import { addDays, localDate } from './dates.js';

describe('localDate', () => {
  it('is already tomorrow in Auckland at 23:30 UTC', () => {
    expect(localDate(new Date('2026-11-17T23:30:00Z'), 'Pacific/Auckland')).toBe('2026-11-18');
  });

  it('is still today in London at 23:30 UTC', () => {
    expect(localDate(new Date('2026-11-17T23:30:00Z'), 'Europe/London')).toBe('2026-11-17');
  });

  it('is still yesterday in Los Angeles at 05:00 UTC', () => {
    expect(localDate(new Date('2026-11-18T05:00:00Z'), 'America/Los_Angeles')).toBe('2026-11-17');
  });
});

describe('addDays', () => {
  it('adds days across a month and a year end', () => {
    expect(addDays('2026-11-17', 6)).toBe('2026-11-23');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
