import { describe, expect, it } from 'vitest';
import { capScore, weightedScore } from './score.js';

describe('weightedScore', () => {
  it('is the weighted mean of the values, out of 100', () => {
    expect(
      weightedScore([
        [0.75, 1],
        [0.25, 0],
      ]),
    ).toBe(75);
    expect(
      weightedScore([
        [0.4, 1],
        [0.3, 0.5],
        [0.2, 0],
        [0.1, 1],
      ]),
    ).toBe(65);
  });

  it('does not need the weights to add up to 1', () => {
    expect(
      weightedScore([
        [3, 1],
        [1, 0],
      ]),
    ).toBe(75);
  });

  it('rounds to the nearest integer, halves up', () => {
    expect(weightedScore([[1, 0.334]])).toBe(33);
    expect(weightedScore([[1, 0.336]])).toBe(34);
    expect(weightedScore([[1, 0.125]])).toBe(13);
  });

  it('clamps each value to 0–1', () => {
    expect(
      weightedScore([
        [1, 2],
        [1, 0],
      ]),
    ).toBe(50);
    expect(
      weightedScore([
        [1, -1],
        [1, 1],
      ]),
    ).toBe(50);
  });

  it('clamps the result to 0–100', () => {
    expect(
      weightedScore([
        [1, 1],
        [-0.5, 0],
      ]),
    ).toBe(100);
    expect(
      weightedScore([
        [1, 0],
        [-0.5, 1],
      ]),
    ).toBe(0);
  });

  it('throws when the weights add up to 0 or less', () => {
    expect(() => weightedScore([])).toThrow(RangeError);
    expect(() => weightedScore([[0, 1]])).toThrow(RangeError);
  });
});

describe('capScore', () => {
  it('lowers a score above the cap to the cap', () => {
    expect(capScore(80, 30)).toBe(30);
  });

  it('keeps a score at or below the cap', () => {
    expect(capScore(20, 30)).toBe(20);
    expect(capScore(30, 30)).toBe(30);
  });
});
