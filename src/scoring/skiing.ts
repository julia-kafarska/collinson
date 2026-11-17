import { SKIING } from '../const/scoring.js';
import { band } from './band.js';
import { capScore, weightedScore } from './score.js';
import type { Scorer } from './types.js';
import { describeWeather, weatherQuality } from './weather-code.js';

const { weights, bands, caps, weakBelow, maxReasons } = SKIING;

interface Factor {
  weight: number;
  value: number;
  reason: string;
}

export const scoreSkiing: Scorer = (day) => {
  const factors: Factor[] = [
    {
      weight: weights.snowDepth,
      value: band(day.snowDepthMaxCm, bands.snowDepthCm),
      reason: `Snow depth ${day.snowDepthMaxCm} cm`,
    },
    {
      weight: weights.freshSnow,
      value: band(day.freshSnowCm, bands.freshSnowCm),
      // "From yesterday", so a day with snow falling doesn't read as snowless (DECISIONS D6).
      reason:
        day.freshSnowCm > 0 ? `Fresh snow ${day.freshSnowCm} cm` : 'No fresh snow from yesterday',
    },
    {
      weight: weights.tempMax,
      value: band(day.tempMaxC, bands.tempMaxC),
      reason: tempMaxReason(day.tempMaxC),
    },
    {
      weight: weights.gusts,
      value: band(day.windGustsMaxKmh, bands.gustsKmh),
      reason: `Gusts ${day.windGustsMaxKmh} km/h`,
    },
    {
      weight: weights.weather,
      value: weatherQuality(day.weatherCode),
      reason: `Weather: ${describeWeather(day.weatherCode)}`,
    },
  ];
  let score = weightedScore(factors.map(({ weight, value }) => [weight, value] as const));

  // A cap rules the day out, so its reason stands alone.
  const capReasons: string[] = [];
  if (day.snowDepthMaxCm < caps.thinSnow.belowCm) {
    score = capScore(score, caps.thinSnow.maxScore);
    capReasons.push(
      day.snowDepthMaxCm > 0
        ? `Thin snow: ${day.snowDepthMaxCm} cm, little to ski on`
        : 'No snow on the ground',
    );
  }
  if (day.windGustsMaxKmh > caps.liftsClosed.aboveKmh) {
    score = capScore(score, caps.liftsClosed.maxScore);
    capReasons.push(`Gusts ${day.windGustsMaxKmh} km/h: lifts likely closed`);
  }
  return { score, reasons: capReasons.length > 0 ? capReasons : explain(factors) };
};

function tempMaxReason(tempMaxC: number): string {
  if (tempMaxC > bands.tempMaxC.idealMax) return `Max ${tempMaxC} °C: soft, slushy snow`;
  if (tempMaxC < bands.tempMaxC.idealMin) return `Max ${tempMaxC} °C: very cold`;
  return `Max ${tempMaxC} °C`;
}

function explain(factors: Factor[]): string[] {
  const lost = ({ weight, value }: Factor) => weight * (1 - value);
  const earned = ({ weight, value }: Factor) => weight * value;
  const weak = factors
    .filter(({ value }) => value < weakBelow)
    .toSorted((a, b) => lost(b) - lost(a));
  const strong = factors
    .filter(({ value }) => value >= weakBelow)
    .toSorted((a, b) => earned(b) - earned(a));
  return [...weak, ...strong].slice(0, maxReasons).map(({ reason }) => reason);
}
