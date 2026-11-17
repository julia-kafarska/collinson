import { MAX_SCORE } from '../const/scoring.js';

/**
 * The weighted mean of the factor values as an integer score from 0 to 100. Each value is
 * clamped to 0–1 first, e.g. the output of `band`.
 */
export function weightedScore(
  factors: ReadonlyArray<readonly [weight: number, value: number]>,
): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [weight, value] of factors) {
    totalWeight += weight;
    weightedSum += weight * clamp(value, 0, 1);
  }
  if (!(totalWeight > 0)) {
    throw new RangeError(`Factor weights must add up to more than 0, got ${totalWeight}`);
  }
  return clamp(Math.round((MAX_SCORE * weightedSum) / totalWeight), 0, MAX_SCORE);
}

/** A hard cap from PRD §9, e.g. a thunderstorm caps outdoor sightseeing at 20. */
export function capScore(score: number, max: number): number {
  return Math.min(score, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
