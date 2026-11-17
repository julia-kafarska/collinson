import { SURFING_REASONS } from '../const/reasons.js';
import { SURFING } from '../const/scoring.js';
import { band } from './band.js';
import { capScore, weightedScore } from './score.js';
import type { Scorer } from './types.js';
import { describeWeather, isThunderstorm, weatherQuality } from './weather-code.js';

const { weights, bands, caps } = SURFING;

/** PRD §9 and Q3. Inland, where the Marine API has no waves (T02), the score is 0. */
export const scoreSurfing: Scorer = ({ marine, windSpeedMaxKmh, weatherCode }) => {
  if (marine === null || marine.waveHeightMaxM === null) {
    return { score: 0, reasons: [SURFING_REASONS.noMarineData] };
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
    ? [SURFING_REASONS.thunderstorm, ...sea]
    : [...sea, SURFING_REASONS.weather(describeWeather(weatherCode))];
  return { score, reasons };
};

function describeWaves(heightM: number): string {
  if (heightM < caps.flat.belowM) return SURFING_REASONS.wavesFlat(heightM);
  if (heightM < bands.waveHeightM.idealMin) return SURFING_REASONS.wavesSmall(heightM);
  if (heightM <= bands.waveHeightM.idealMax) return SURFING_REASONS.wavesGoodSize(heightM);
  if (heightM < bands.waveHeightM.zeroAbove) return SURFING_REASONS.wavesBig(heightM);
  return SURFING_REASONS.wavesTooBig(heightM);
}

function describePeriod(periodS: number | null): string {
  if (periodS === null) return SURFING_REASONS.periodUnknown;
  if (periodS <= bands.swellPeriodS.zeroBelow) return SURFING_REASONS.periodWindChop(periodS);
  if (periodS < bands.swellPeriodS.idealMin) return SURFING_REASONS.periodWeak(periodS);
  return SURFING_REASONS.periodClean(periodS);
}

function describeWind(speedKmh: number): string {
  if (speedKmh <= bands.windKmh.idealMax) return SURFING_REASONS.windLight(speedKmh);
  if (speedKmh < bands.windKmh.zeroAbove) return SURFING_REASONS.windChoppy(speedKmh);
  return SURFING_REASONS.windBlownOut(speedKmh);
}
