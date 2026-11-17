import { INDOOR_SIGHTSEEING_REASONS, OUTDOOR_SIGHTSEEING_REASONS } from '../const/reasons.js';
import { INDOOR_SIGHTSEEING, MAX_SCORE, OUTDOOR_SIGHTSEEING } from '../const/scoring.js';
import type { DailyWeather } from '../domain.js';
import { band } from './band.js';
import { capScore, weightedScore } from './score.js';
import type { Scorer } from './types.js';
import { describeWeather, isThunderstorm, weatherQuality } from './weather-code.js';

const { weights, bands, caps, rainLikelyPct } = OUTDOOR_SIGHTSEEING;

/** Outdoor sightseeing (PRD §9): mild, dry, sunny and calm is best. */
export const scoreOutdoorSightseeing: Scorer = (day) => {
  const conditions = assess(day);
  let score = weightedScore([
    [weights.feelsLike, conditions.feelsLike],
    [weights.rain, conditions.rain],
    [weights.sun, conditions.sunShare],
    [weights.gusts, conditions.gusts],
    [weights.weather, weatherQuality(day.weatherCode)],
  ]);
  if (conditions.thunderstorm) score = capScore(score, caps.thunderstorm.maxScore);
  if (conditions.heavyRain) score = capScore(score, caps.heavyRain.maxScore);
  return {
    score,
    reasons: [
      conditions.thunderstorm
        ? OUTDOOR_SIGHTSEEING_REASONS.thunderstorm
        : OUTDOOR_SIGHTSEEING_REASONS.weather(describeWeather(day.weatherCode)),
      feelsLike(day),
      conditions.rain === 1
        ? OUTDOOR_SIGHTSEEING_REASONS.dry(day.precipitationProbabilityPct)
        : OUTDOOR_SIGHTSEEING_REASONS.rain(rainOutlook(day), rainFigures(day)),
      conditions.polarNight
        ? OUTDOOR_SIGHTSEEING_REASONS.polarNight
        : OUTDOOR_SIGHTSEEING_REASONS.sun(Math.round(conditions.sunShare * 100)),
      gusts(day),
    ],
  };
};

/**
 * Indoor sightseeing is the fallback when outdoors is poor: 100 − outdoor (DECISIONS D7), at most
 * 65. The cap never changes which sightseeing wins a day, since it only bites when outdoors is
 * under 35, but a storm day no longer outweighs the good ski or surf days around it (T15).
 */
export const scoreIndoorSightseeing: Scorer = (day) => {
  const outdoor = scoreOutdoorSightseeing(day).score;
  const reasons = outdoor >= INDOOR_SIGHTSEEING.goodOutdoorScore ? [] : reasonsToStayIn(day);
  return {
    score: capScore(MAX_SCORE - outdoor, INDOOR_SIGHTSEEING.maxScore),
    reasons: reasons.length > 0 ? reasons : [INDOOR_SIGHTSEEING_REASONS.goodWeather],
  };
};

/** Each condition as a 0–1 factor, except the flags. */
function assess(day: DailyWeather) {
  // Polar night: Open-Meteo sends 0 s of daylight (T02).
  const polarNight = day.daylightSeconds <= 0;
  return {
    thunderstorm: isThunderstorm(day.weatherCode),
    heavyRain:
      day.precipitationProbabilityPct >= rainLikelyPct &&
      day.precipitationMm >= bands.rainMm.zeroAbove,
    polarNight,
    feelsLike: band(day.apparentTempMaxC, bands.feelsLikeC),
    // Mean, not min: the probability is the day's highest hourly chance, so a passing shower can
    // read 80%; the amount tempers it, and the other way round.
    rain:
      (band(day.precipitationProbabilityPct, bands.rainProbabilityPct) +
        band(day.precipitationMm, bands.rainMm)) /
      2,
    sunShare: polarNight ? 0 : day.sunshineSeconds / day.daylightSeconds,
    gusts: band(day.windGustsMaxKmh, bands.gustsKmh),
  };
}

function reasonsToStayIn(day: DailyWeather): string[] {
  const conditions = assess(day);
  return [
    conditions.thunderstorm && INDOOR_SIGHTSEEING_REASONS.thunderstorm,
    conditions.rain < 1 && INDOOR_SIGHTSEEING_REASONS.rain(rainOutlook(day), rainFigures(day)),
    conditions.feelsLike < 1 && INDOOR_SIGHTSEEING_REASONS.outdoors(feelsLike(day)),
    conditions.gusts < 1 && INDOOR_SIGHTSEEING_REASONS.outdoors(gusts(day)),
    conditions.polarNight && INDOOR_SIGHTSEEING_REASONS.polarNight,
  ].filter((reason) => reason !== false);
}

function feelsLike(day: DailyWeather): string {
  return OUTDOOR_SIGHTSEEING_REASONS.feelsLike(Math.round(day.apparentTempMaxC));
}

function gusts(day: DailyWeather): string {
  return OUTDOOR_SIGHTSEEING_REASONS.gusts(Math.round(day.windGustsMaxKmh));
}

/** E.g. "Rain likely" or "Rain or snow possible". */
function rainOutlook(day: DailyWeather): string {
  // Open-Meteo's precipitation includes snow, so a snowy day must not say only "rain".
  const { rain, rainOrSnow } = OUTDOOR_SIGHTSEEING_REASONS.rainOutlook;
  const outlook = day.snowfallCm > 0 ? rainOrSnow : rain;
  return day.precipitationProbabilityPct >= rainLikelyPct ? outlook.likely : outlook.possible;
}

/** E.g. "80%, 6.3 mm". */
function rainFigures(day: DailyWeather): string {
  const mm = Math.round(day.precipitationMm * 10) / 10;
  return OUTDOOR_SIGHTSEEING_REASONS.rainFigures(day.precipitationProbabilityPct, mm);
}
