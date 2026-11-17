import { band, type Band } from './band.js';
import { capScore, weightedScore } from './score.js';
import type { Scorer } from './types.js';
import { describeWeather, isThunderstorm, weatherQuality } from './weather-code.js';

// Weights and caps from PRD §9.
const WAVE_HEIGHT_WEIGHT = 0.4;
const SWELL_PERIOD_WEIGHT = 0.3;
const WIND_WEIGHT = 0.2;
const WEATHER_WEIGHT = 0.1;
const FLAT_BELOW_M = 0.3;
const MAX_SCORE_WHEN_FLAT = 10;
const MAX_SCORE_IN_THUNDERSTORM = 10;

// From 4 m most breaks close out, yet period and wind alone still gave such a day 50–60 (T15).
const TOO_BIG_FROM_M = 4;
// Ruled out for most surfers, though experts may still find a sheltered break.
const MAX_SCORE_WHEN_TOO_BIG = 30;

// The ideal ranges are PRD §9's. The zero limits are ours, checked against real weeks in T15.
const WAVE_HEIGHT_BAND_M: Band = {
  // Under 0.3 m there is nothing to ride, which is also where the flat cap starts.
  zeroBelow: FLAT_BELOW_M,
  idealMin: 1,
  idealMax: 2.5,
  // Too big and dangerous for most surfers, which is also where the too-big cap starts.
  zeroAbove: TOO_BIG_FROM_M,
};
const SWELL_PERIOD_BAND_S: Band = {
  // At 5 s or less the waves are local wind chop, not swell.
  zeroBelow: 5,
  idealMin: 10,
  idealMax: Infinity,
  zeroAbove: Infinity,
};
const WIND_BAND_KMH: Band = {
  zeroBelow: -Infinity,
  idealMin: -Infinity,
  idealMax: 15,
  // By 40 km/h the wind has blown the waves out.
  zeroAbove: 40,
};

const NO_MARINE_DATA = 'No marine data for this location';
const THUNDERSTORM = 'Thunderstorm: stay out of the water';

/** PRD §9 and Q3. Inland, where the Marine API has no waves (T02), the score is 0. */
export const scoreSurfing: Scorer = ({ marine, windSpeedMaxKmh, weatherCode }) => {
  if (marine === null || marine.waveHeightMaxM === null) {
    return { score: 0, reasons: [NO_MARINE_DATA] };
  }
  const waveHeightM = marine.waveHeightMaxM;
  const periodS = marine.swellWavePeriodMaxS;
  const thunderstorm = isThunderstorm(weatherCode);

  let score = weightedScore([
    [WAVE_HEIGHT_WEIGHT, band(waveHeightM, WAVE_HEIGHT_BAND_M)],
    // An unknown period gets no credit, so missing data never outscores a known, mediocre swell.
    [SWELL_PERIOD_WEIGHT, periodS === null ? 0 : band(periodS, SWELL_PERIOD_BAND_S)],
    [WIND_WEIGHT, band(windSpeedMaxKmh, WIND_BAND_KMH)],
    [WEATHER_WEIGHT, weatherQuality(weatherCode)],
  ]);
  if (thunderstorm) score = capScore(score, MAX_SCORE_IN_THUNDERSTORM);
  if (waveHeightM < FLAT_BELOW_M) score = capScore(score, MAX_SCORE_WHEN_FLAT);
  if (waveHeightM >= TOO_BIG_FROM_M) score = capScore(score, MAX_SCORE_WHEN_TOO_BIG);

  const sea = [describeWaves(waveHeightM), describePeriod(periodS), describeWind(windSpeedMaxKmh)];
  // A storm rules the day out, so it leads; other weather weighs least, so it comes last.
  const reasons = thunderstorm
    ? [THUNDERSTORM, ...sea]
    : [...sea, `Weather: ${describeWeather(weatherCode)}`];
  return { score, reasons };
};

function describeWaves(heightM: number): string {
  if (heightM < FLAT_BELOW_M) return `Flat: waves ${heightM} m`;
  const waves = `Waves ${heightM} m`;
  if (heightM < WAVE_HEIGHT_BAND_M.idealMin) return `${waves}: small`;
  if (heightM <= WAVE_HEIGHT_BAND_M.idealMax) return `${waves}: a good size`;
  if (heightM < WAVE_HEIGHT_BAND_M.zeroAbove) return `${waves}: big, for experienced surfers`;
  return `${waves}: too big for most surfers`;
}

function describePeriod(periodS: number | null): string {
  if (periodS === null) return 'Swell period unknown: assumed poor';
  const period = `Swell period ${periodS} s`;
  if (periodS <= SWELL_PERIOD_BAND_S.zeroBelow) return `${period}: wind chop`;
  if (periodS < SWELL_PERIOD_BAND_S.idealMin) return `${period}: weaker waves`;
  return `${period}: clean, powerful waves`;
}

function describeWind(speedKmh: number): string {
  const wind = `Wind ${speedKmh} km/h`;
  if (speedKmh <= WIND_BAND_KMH.idealMax) return `${wind}: light`;
  if (speedKmh < WIND_BAND_KMH.zeroAbove) return `${wind}: choppy`;
  return `${wind}: blown out`;
}
