import { SURFING } from '../const/scoring.js';
import { band } from './band.js';
import { capScore, weightedScore } from './score.js';
import type { Scorer } from './types.js';
import { describeWeather, isThunderstorm, weatherQuality } from './weather-code.js';

const { weights, bands, caps } = SURFING;

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
    [weights.waveHeight, band(waveHeightM, bands.waveHeightM)],
    // An unknown period gets no credit, so missing data never outscores a known, mediocre swell.
    [weights.swellPeriod, periodS === null ? 0 : band(periodS, bands.swellPeriodS)],
    [weights.wind, band(windSpeedMaxKmh, bands.windKmh)],
    [weights.weather, weatherQuality(weatherCode)],
  ]);
  if (thunderstorm) score = capScore(score, caps.thunderstorm.maxScore);
  if (waveHeightM < caps.flat.belowM) score = capScore(score, caps.flat.maxScore);
  if (waveHeightM >= caps.tooBig.fromM) score = capScore(score, caps.tooBig.maxScore);

  const sea = [describeWaves(waveHeightM), describePeriod(periodS), describeWind(windSpeedMaxKmh)];
  // A storm rules the day out, so it leads; other weather weighs least, so it comes last.
  const reasons = thunderstorm
    ? [THUNDERSTORM, ...sea]
    : [...sea, `Weather: ${describeWeather(weatherCode)}`];
  return { score, reasons };
};

function describeWaves(heightM: number): string {
  if (heightM < caps.flat.belowM) return `Flat: waves ${heightM} m`;
  const waves = `Waves ${heightM} m`;
  if (heightM < bands.waveHeightM.idealMin) return `${waves}: small`;
  if (heightM <= bands.waveHeightM.idealMax) return `${waves}: a good size`;
  if (heightM < bands.waveHeightM.zeroAbove) return `${waves}: big, for experienced surfers`;
  return `${waves}: too big for most surfers`;
}

function describePeriod(periodS: number | null): string {
  if (periodS === null) return 'Swell period unknown: assumed poor';
  const period = `Swell period ${periodS} s`;
  if (periodS <= bands.swellPeriodS.zeroBelow) return `${period}: wind chop`;
  if (periodS < bands.swellPeriodS.idealMin) return `${period}: weaker waves`;
  return `${period}: clean, powerful waves`;
}

function describeWind(speedKmh: number): string {
  const wind = `Wind ${speedKmh} km/h`;
  if (speedKmh <= bands.windKmh.idealMax) return `${wind}: light`;
  if (speedKmh < bands.windKmh.zeroAbove) return `${wind}: choppy`;
  return `${wind}: blown out`;
}
