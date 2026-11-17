import { describe, expect, it } from 'vitest';
import type { DailyWeather } from '../domain.js';
import { scoreSkiing } from './skiing.js';

/** A cold, calm, clear day on a deep base with fresh snow: about as good as skiing gets. */
function day(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return {
    date: '2026-01-15',
    tempMaxC: -5,
    tempMinC: -12,
    apparentTempMaxC: -9,
    precipitationMm: 0,
    precipitationProbabilityPct: 0,
    snowfallCm: 0,
    freshSnowCm: 20,
    snowDepthMaxCm: 120,
    weatherCode: 0,
    windSpeedMaxKmh: 8,
    windGustsMaxKmh: 15,
    sunshineSeconds: 28_000,
    daylightSeconds: 32_000,
    marine: null,
    ...overrides,
  };
}

// DECISIONS D6: snow falling today only hurts visibility; it is fresh snow the day after.
const DEEP_COLD_AND_CALM = { snowDepthMaxCm: 120, tempMaxC: -5, windGustsMaxKmh: 15 };
const BLIZZARD = day({
  ...DEEP_COLD_AND_CALM,
  weatherCode: 75,
  snowfallCm: 30,
  freshSnowCm: 0,
  precipitationMm: 30,
  precipitationProbabilityPct: 100,
  sunshineSeconds: 0,
});
const DAY_AFTER = day({ ...DEEP_COLD_AND_CALM, weatherCode: 0, snowfallCm: 0, freshSnowCm: 30 });

describe('scoreSkiing', () => {
  it('scores a day with no snow 10 or less', () => {
    expect(scoreSkiing(day({ snowDepthMaxCm: 0, freshSnowCm: 0 })).score).toBeLessThanOrEqual(10);
  });

  it('scores deep snow, fresh snow, cold and calm 80 or more', () => {
    const powder = day({ snowDepthMaxCm: 150, freshSnowCm: 25, tempMaxC: -6, windGustsMaxKmh: 10 });
    expect(scoreSkiing(powder).score).toBeGreaterThanOrEqual(80);
  });

  it('scores gusts of 65 km/h 30 or less', () => {
    expect(scoreSkiing(day({ windGustsMaxKmh: 65 })).score).toBeLessThanOrEqual(30);
  });

  it('scores a day at +8 °C lower than the same day at −5 °C', () => {
    expect(scoreSkiing(day({ tempMaxC: 8 })).score).toBeLessThan(
      scoreSkiing(day({ tempMaxC: -5 })).score,
    );
  });

  it('caps only under 10 cm of snow and over 60 km/h of gusts', () => {
    expect(scoreSkiing(day({ snowDepthMaxCm: 10 })).score).toBeGreaterThan(10);
    expect(scoreSkiing(day({ windGustsMaxKmh: 60 })).score).toBeGreaterThan(30);
  });

  it('does not let a blizzard beat the clear day after it (DECISIONS D6)', () => {
    expect(scoreSkiing(BLIZZARD).score).toBeLessThan(scoreSkiing(DAY_AFTER).score);
  });

  it('mentions the cap, and only the cap, when one applies', () => {
    expect(scoreSkiing(day({ snowDepthMaxCm: 0, freshSnowCm: 0 })).reasons).toEqual([
      'No snow on the ground',
    ]);
    expect(scoreSkiing(day({ snowDepthMaxCm: 6 })).reasons).toEqual([
      'Thin snow: 6 cm, little to ski on',
    ]);
    expect(scoreSkiing(day({ windGustsMaxKmh: 70 })).reasons).toEqual([
      'Gusts 70 km/h: lifts likely closed',
    ]);
    expect(scoreSkiing(day({ snowDepthMaxCm: 6, windGustsMaxKmh: 70 })).reasons).toEqual([
      'Thin snow: 6 cm, little to ski on',
      'Gusts 70 km/h: lifts likely closed',
    ]);
  });

  it('explains the score by its weakest factors first, then its strongest, three at most', () => {
    expect(scoreSkiing(BLIZZARD).reasons).toEqual([
      'No fresh snow from yesterday',
      'Weather: heavy snow',
      'Snow depth 120 cm',
    ]);
    expect(scoreSkiing(DAY_AFTER).reasons).toEqual([
      'Snow depth 120 cm',
      'Fresh snow 30 cm',
      'Max -5 °C',
    ]);
    expect(scoreSkiing(day({ tempMaxC: 8, freshSnowCm: 0 })).reasons).toEqual([
      'No fresh snow from yesterday',
      'Max 8 °C: soft, slushy snow',
      'Snow depth 120 cm',
    ]);
    expect(scoreSkiing(day({ tempMaxC: -20 })).reasons).toEqual([
      'Max -20 °C: very cold',
      'Snow depth 120 cm',
      'Fresh snow 20 cm',
    ]);
  });

  it.each<{ name: string; weather: Partial<DailyWeather> }>([
    { name: 'an ideal day', weather: {} },
    {
      name: 'no snow in a hot thunderstorm',
      weather: {
        snowDepthMaxCm: 0,
        freshSnowCm: 0,
        tempMaxC: 35,
        windGustsMaxKmh: 150,
        weatherCode: 95,
      },
    },
    {
      name: 'a polar blizzard',
      weather: {
        snowDepthMaxCm: 400,
        freshSnowCm: 90,
        tempMaxC: -45,
        windGustsMaxKmh: 120,
        weatherCode: 75,
      },
    },
    {
      name: 'every value on a limit',
      weather: {
        snowDepthMaxCm: 10,
        freshSnowCm: 10,
        tempMaxC: 0,
        windGustsMaxKmh: 60,
        weatherCode: 3,
      },
    },
    { name: 'an unknown weather code', weather: { weatherCode: 42 } },
  ])('gives an integer score from 0 to 100 and at least one reason: $name', ({ weather }) => {
    const { score, reasons } = scoreSkiing(day(weather));
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(reasons.length).toBeGreaterThan(0);
  });
});
