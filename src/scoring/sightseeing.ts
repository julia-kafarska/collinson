import type { DailyWeather } from '../domain.js';
import { band, type Band } from './band.js';
import { capScore, weightedScore } from './score.js';
import type { Scorer } from './types.js';
import { describeWeather, isThunderstorm, weatherQuality } from './weather-code.js';

const MAX_SCORE = 100;

// The weights, the ideal feels-like range and the thunderstorm cap are from PRD §9.
const WEIGHTS = { feelsLike: 0.3, rain: 0.35, sun: 0.15, gusts: 0.1, weather: 0.1 };
const THUNDERSTORM_MAX_SCORE = 20;

const FEELS_LIKE_C: Band = {
  // At freezing, a day on foot stops being pleasant for most visitors.
  zeroBelow: 0,
  idealMin: 16,
  idealMax: 26,
  // A feels-like 38 °C brings heat stress to anyone walking for hours.
  zeroAbove: 38,
};

const RAIN_PROBABILITY_PCT: Band = {
  zeroBelow: -Infinity,
  idealMin: -Infinity,
  // A one-in-five chance rarely changes anyone's plans.
  idealMax: 20,
  // At 90%, rain is all but certain.
  zeroAbove: 90,
};

const RAIN_MM: Band = {
  zeroBelow: -Infinity,
  idealMin: -Infinity,
  // Half a millimetre is a passing drizzle.
  idealMax: 0.5,
  // 10 mm in a day soaks through a jacket and umbrella.
  zeroAbove: 10,
};

const GUSTS_KMH: Band = {
  zeroBelow: -Infinity,
  idealMin: -Infinity,
  // Below 25 km/h (Beaufort 4), gusts barely register on foot.
  idealMax: 25,
  // 70 km/h is a gale (Beaufort 8): walking is seriously impeded.
  zeroAbove: 70,
};

// "Likely" means more often than not.
const RAIN_LIKELY_PCT = 50;

// Ideal feels-like, rain and gusts alone score 75, so a lower score always has a reason to list.
const GOOD_OUTDOOR_SCORE = 75;

/** Outdoor sightseeing (PRD §9): mild, dry, sunny and calm is best. */
export const scoreOutdoorSightseeing: Scorer = (day) => {
  const conditions = assess(day);
  const score = weightedScore([
    [WEIGHTS.feelsLike, conditions.feelsLike],
    [WEIGHTS.rain, conditions.rain],
    [WEIGHTS.sun, conditions.sunShare],
    [WEIGHTS.gusts, conditions.gusts],
    [WEIGHTS.weather, weatherQuality(day.weatherCode)],
  ]);
  return {
    score: conditions.thunderstorm ? capScore(score, THUNDERSTORM_MAX_SCORE) : score,
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

/** Indoor sightseeing is the fallback when outdoors is poor: 100 − outdoor (DECISIONS D7). */
export const scoreIndoorSightseeing: Scorer = (day) => {
  const outdoor = scoreOutdoorSightseeing(day).score;
  const reasons = outdoor >= GOOD_OUTDOOR_SCORE ? [] : reasonsToStayIn(day);
  return {
    score: MAX_SCORE - outdoor,
    reasons: reasons.length > 0 ? reasons : ['Good weather outside: indoor sightseeing can wait'],
  };
};

/** Each condition as a 0–1 factor, except the flags. */
function assess(day: DailyWeather) {
  // Polar night: Open-Meteo sends 0 s of daylight (T02).
  const polarNight = day.daylightSeconds <= 0;
  return {
    thunderstorm: isThunderstorm(day.weatherCode),
    polarNight,
    feelsLike: band(day.apparentTempMaxC, FEELS_LIKE_C),
    // Mean, not min: the probability is the day's highest hourly chance, so a passing shower can
    // read 80%; the amount tempers it, and the other way round.
    rain:
      (band(day.precipitationProbabilityPct, RAIN_PROBABILITY_PCT) +
        band(day.precipitationMm, RAIN_MM)) /
      2,
    sunShare: polarNight ? 0 : day.sunshineSeconds / day.daylightSeconds,
    gusts: band(day.windGustsMaxKmh, GUSTS_KMH),
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
  return `${kind} ${day.precipitationProbabilityPct >= RAIN_LIKELY_PCT ? 'likely' : 'possible'}`;
}

/** E.g. "80%, 6.3 mm". */
function rainFigures(day: DailyWeather): string {
  return `${day.precipitationProbabilityPct}%, ${Math.round(day.precipitationMm * 10) / 10} mm`;
}
