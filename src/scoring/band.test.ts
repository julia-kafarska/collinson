import { describe, expect, it } from 'vitest';
import { band, type Band } from './band.js';

const MILD: Band = { zeroBelow: 0, idealMin: 10, idealMax: 20, zeroAbove: 40 };

describe('band', () => {
  it('is 1 inside the ideal range', () => {
    expect(band(15, MILD)).toBe(1);
  });

  it('is 1 at each ideal limit', () => {
    expect(band(10, MILD)).toBe(1);
    expect(band(20, MILD)).toBe(1);
  });

  it('is 0 at each zero limit', () => {
    expect(band(0, MILD)).toBe(0);
    expect(band(40, MILD)).toBe(0);
  });

  it('is 0 beyond each zero limit', () => {
    expect(band(-5, MILD)).toBe(0);
    expect(band(100, MILD)).toBe(0);
  });

  it('is linear between a zero limit and the ideal range', () => {
    expect(band(5, MILD)).toBe(0.5);
    expect(band(30, MILD)).toBe(0.5);
    expect(band(2.5, MILD)).toBe(0.25);
    expect(band(35, MILD)).toBe(0.25);
  });

  it('supports an open upper end, e.g. 50 cm of snow or more is ideal', () => {
    const deep: Band = { zeroBelow: 10, idealMin: 50, idealMax: Infinity, zeroAbove: Infinity };
    expect(band(10, deep)).toBe(0);
    expect(band(30, deep)).toBe(0.5);
    expect(band(50, deep)).toBe(1);
    expect(band(400, deep)).toBe(1);
  });

  it('supports an open lower end, e.g. gusts under 30 km/h are ideal', () => {
    const calm: Band = { zeroBelow: -Infinity, idealMin: -Infinity, idealMax: 30, zeroAbove: 60 };
    expect(band(0, calm)).toBe(1);
    expect(band(45, calm)).toBe(0.5);
    expect(band(60, calm)).toBe(0);
  });

  it('gives 1, not 0, where an ideal limit meets a zero limit', () => {
    const noWindIsIdeal: Band = { zeroBelow: 0, idealMin: 0, idealMax: 15, zeroAbove: 40 };
    expect(band(0, noWindIsIdeal)).toBe(1);
    expect(band(-1, noWindIsIdeal)).toBe(0);
  });

  it('gives 0 for NaN, never 1', () => {
    expect(band(NaN, MILD)).toBe(0);
  });

  it('throws when the limits are out of order', () => {
    expect(() => band(15, { zeroBelow: 12, idealMin: 10, idealMax: 20, zeroAbove: 40 })).toThrow(
      RangeError,
    );
    expect(() => band(15, { zeroBelow: 0, idealMin: 20, idealMax: 10, zeroAbove: 40 })).toThrow(
      RangeError,
    );
    expect(() => band(15, { zeroBelow: 0, idealMin: 10, idealMax: 20, zeroAbove: 18 })).toThrow(
      RangeError,
    );
    expect(() => band(15, { zeroBelow: NaN, idealMin: 10, idealMax: 20, zeroAbove: 40 })).toThrow(
      RangeError,
    );
  });

  it('throws when only one limit of an open end is infinite', () => {
    expect(() =>
      band(15, { zeroBelow: -Infinity, idealMin: 10, idealMax: 20, zeroAbove: 40 }),
    ).toThrow(RangeError);
    expect(() =>
      band(15, { zeroBelow: 0, idealMin: 10, idealMax: 20, zeroAbove: Infinity }),
    ).toThrow(RangeError);
  });
});
