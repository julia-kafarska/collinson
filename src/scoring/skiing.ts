import { band, type Band } from './band.js';
import { capScore, weightedScore } from './score.js';
import type { Scorer } from './types.js';
import { describeWeather, weatherQuality } from './weather-code.js';

// PRD §9 sets the weights, the ideal ranges and the caps. The zero limits are ours, for T15 to tune.
const WEIGHTS = { snowDepth: 0.4, freshSnow: 0.25, tempMax: 0.15, gusts: 0.1, weather: 0.1 };

const SNOW_DEPTH_CM: Band = {
  zeroBelow: 0, // Counts from bare ground up; the thin-snow cap already rules out the first 10 cm.
  idealMin: 50,
  idealMax: Infinity,
  zeroAbove: Infinity,
};
const FRESH_SNOW_CM: Band = {
  zeroBelow: 0, // Even a dusting freshens the pistes, so the first centimetre counts.
  idealMin: 10,
  idealMax: Infinity,
  zeroAbove: Infinity,
};
const TEMP_MAX_C: Band = {
  zeroBelow: -25, // Colder, and frostbite comes fast on an open chairlift.
  idealMin: -10,
  idealMax: 0,
  zeroAbove: 8, // Warmer, and the snow turns to slush.
};
const GUSTS_KMH: Band = {
  zeroBelow: -Infinity,
  idealMin: -Infinity,
  idealMax: 30,
  zeroAbove: 60, // Most lifts stop in gusts this strong.
};

const THIN_SNOW_BELOW_CM = 10;
const THIN_SNOW_MAX_SCORE = 10;
const LIFTS_CLOSED_ABOVE_KMH = 60;
const LIFTS_CLOSED_MAX_SCORE = 30;

// Under half marks, a factor costs the day more than it adds, so it is named before the strengths.
const WEAK_BELOW = 0.5;
// Enough to explain a day without listing every factor.
const MAX_REASONS = 3;

interface Factor {
  weight: number;
  value: number;
  reason: string;
}

export const scoreSkiing: Scorer = (day) => {
  const factors: Factor[] = [
    {
      weight: WEIGHTS.snowDepth,
      value: band(day.snowDepthMaxCm, SNOW_DEPTH_CM),
      reason: `Snow depth ${day.snowDepthMaxCm} cm`,
    },
    {
      weight: WEIGHTS.freshSnow,
      value: band(day.freshSnowCm, FRESH_SNOW_CM),
      // "From yesterday", so a day with snow falling doesn't read as snowless (DECISIONS D6).
      reason:
        day.freshSnowCm > 0 ? `Fresh snow ${day.freshSnowCm} cm` : 'No fresh snow from yesterday',
    },
    {
      weight: WEIGHTS.tempMax,
      value: band(day.tempMaxC, TEMP_MAX_C),
      reason: tempMaxReason(day.tempMaxC),
    },
    {
      weight: WEIGHTS.gusts,
      value: band(day.windGustsMaxKmh, GUSTS_KMH),
      reason: `Gusts ${day.windGustsMaxKmh} km/h`,
    },
    {
      weight: WEIGHTS.weather,
      value: weatherQuality(day.weatherCode),
      reason: `Weather: ${describeWeather(day.weatherCode)}`,
    },
  ];
  let score = weightedScore(factors.map(({ weight, value }) => [weight, value] as const));

  // A cap rules the day out, so its reason stands alone.
  const capReasons: string[] = [];
  if (day.snowDepthMaxCm < THIN_SNOW_BELOW_CM) {
    score = capScore(score, THIN_SNOW_MAX_SCORE);
    capReasons.push(
      day.snowDepthMaxCm > 0
        ? `Thin snow: ${day.snowDepthMaxCm} cm, little to ski on`
        : 'No snow on the ground',
    );
  }
  if (day.windGustsMaxKmh > LIFTS_CLOSED_ABOVE_KMH) {
    score = capScore(score, LIFTS_CLOSED_MAX_SCORE);
    capReasons.push(`Gusts ${day.windGustsMaxKmh} km/h: lifts likely closed`);
  }
  return { score, reasons: capReasons.length > 0 ? capReasons : explain(factors) };
};

function tempMaxReason(tempMaxC: number): string {
  if (tempMaxC > TEMP_MAX_C.idealMax) return `Max ${tempMaxC} °C: soft, slushy snow`;
  if (tempMaxC < TEMP_MAX_C.idealMin) return `Max ${tempMaxC} °C: very cold`;
  return `Max ${tempMaxC} °C`;
}

function explain(factors: Factor[]): string[] {
  const lost = ({ weight, value }: Factor) => weight * (1 - value);
  const earned = ({ weight, value }: Factor) => weight * value;
  const weak = factors
    .filter(({ value }) => value < WEAK_BELOW)
    .toSorted((a, b) => lost(b) - lost(a));
  const strong = factors
    .filter(({ value }) => value >= WEAK_BELOW)
    .toSorted((a, b) => earned(b) - earned(a));
  return [...weak, ...strong].slice(0, MAX_REASONS).map(({ reason }) => reason);
}
