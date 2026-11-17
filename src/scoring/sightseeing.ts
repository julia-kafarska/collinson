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
        ? 'Thunderstorm: stay inside'
        : `Weather: ${describeWeather(day.weatherCode)}`,
      feelsLike(day),
      conditions.rain === 1
        ? `Dry: ${day.precipitationProbabilityPct}% chance of rain`
        : `${rainOutlook(day)}: ${rainFigures(day)}`,
      conditions.polarNight
        ? 'No daylight (polar night)'
        : `Sun for ${Math.round(conditions.sunShare * 100)}% of daylight`,
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
    reasons: reasons.length > 0 ? reasons : ['Good weather outside: indoor sightseeing can wait'],
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
    conditions.thunderstorm && 'Thunderstorm outside',
    conditions.rain < 1 && `${rainOutlook(day)} outdoors (${rainFigures(day)})`,
    conditions.feelsLike < 1 && `${feelsLike(day)} outdoors`,
    conditions.gusts < 1 && `${gusts(day)} outdoors`,
    conditions.polarNight && 'No daylight outdoors (polar night)',
  ].filter((reason) => reason !== false);
}

function feelsLike(day: DailyWeather): string {
  return `Feels like ${Math.round(day.apparentTempMaxC)} °C`;
}

function gusts(day: DailyWeather): string {
  return `Gusts up to ${Math.round(day.windGustsMaxKmh)} km/h`;
}

/** E.g. "Rain likely" or "Rain or snow possible". */
function rainOutlook(day: DailyWeather): string {
  // Open-Meteo's precipitation includes snow, so a snowy day must not say only "rain".
  const kind = day.snowfallCm > 0 ? 'Rain or snow' : 'Rain';
  return `${kind} ${day.precipitationProbabilityPct >= rainLikelyPct ? 'likely' : 'possible'}`;
}

/** E.g. "80%, 6.3 mm". */
function rainFigures(day: DailyWeather): string {
  return `${day.precipitationProbabilityPct}%, ${Math.round(day.precipitationMm * 10) / 10} mm`;
}
