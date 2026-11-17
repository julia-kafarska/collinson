/** The limits of a comfort band (PRD §9). An open end puts both of its limits at ±Infinity. */
export interface Band {
  zeroBelow: number;
  idealMin: number;
  idealMax: number;
  zeroAbove: number;
}

/**
 * Maps a value to 0–1: 1 inside [idealMin, idealMax], 0 at or beyond zeroBelow and zeroAbove,
 * linear in between. Where an ideal limit meets a zero limit, the ideal wins, so a band starting
 * at 0 km/h still scores calm air as 1. NaN gives 0.
 */
export function band(value: number, { zeroBelow, idealMin, idealMax, zeroAbove }: Band): number {
  const inOrder = zeroBelow <= idealMin && idealMin <= idealMax && idealMax <= zeroAbove;
  // A slope with one infinite end would divide Infinity by Infinity.
  const finiteSlopes = idealMin - zeroBelow !== Infinity && zeroAbove - idealMax !== Infinity;
  if (!inOrder || !finiteSlopes) {
    throw new RangeError(
      `Inconsistent band: zeroBelow ${zeroBelow}, idealMin ${idealMin}, idealMax ${idealMax}, zeroAbove ${zeroAbove}`,
    );
  }
  if (value >= idealMin && value <= idealMax) return 1;
  if (value > zeroBelow && value < idealMin) return (value - zeroBelow) / (idealMin - zeroBelow);
  if (value > idealMax && value < zeroAbove) return (zeroAbove - value) / (zeroAbove - idealMax);
  return 0;
}
