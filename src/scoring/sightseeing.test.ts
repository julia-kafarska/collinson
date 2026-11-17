import { describe, expect, it } from 'vitest';
import type { DailyWeather } from '../domain.js';
import { scoreIndoorSightseeing, scoreOutdoorSightseeing } from './sightseeing.js';

/** A mild, sunny, dry and calm summer day, with `overrides` applied. */
function day(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return {
    date: '2026-06-17',
    tempMaxC: 23,
    tempMinC: 14,
    apparentTempMaxC: 22,
    precipitationMm: 0,
    precipitationProbabilityPct: 5,
    snowfallCm: 0,
    freshSnowCm: 0,
    snowDepthMaxCm: 0,
    weatherCode: 0,
    windSpeedMaxKmh: 8,
    windGustsMaxKmh: 15,
    sunshineSeconds: 50_000,
    daylightSeconds: 57_000,
    marine: null,
    ...overrides,
  };
}

const MILD_SUNNY = day();

// Cold and gusty, like London in November: a warm, calm downpour still scores about 40.
const HEAVY_RAIN = day({
  apparentTempMaxC: 8,
  precipitationProbabilityPct: 95,
  precipitationMm: 18,
  weatherCode: 65,
  windGustsMaxKmh: 45,
  sunshineSeconds: 0,
  daylightSeconds: 30_000,
});

// Warm and fairly dry, so only the cap keeps it at 20 or less.
const THUNDERSTORM = day({
  apparentTempMaxC: 24,
  precipitationProbabilityPct: 30,
  precipitationMm: 2,
  weatherCode: 95,
  windGustsMaxKmh: 30,
  sunshineSeconds: 30_000,
});

// Longyearbyen in December: Open-Meteo sends 0 s of daylight and of sunshine (T02).
const POLAR_NIGHT = day({
  apparentTempMaxC: -14,
  precipitationProbabilityPct: 10,
  weatherCode: 3,
  windGustsMaxKmh: 20,
  sunshineSeconds: 0,
  daylightSeconds: 0,
});

const SNOWY = day({
  apparentTempMaxC: -3,
  precipitationProbabilityPct: 90,
  precipitationMm: 6,
  snowfallCm: 4,
  weatherCode: 73,
});

const DAYS = [
  MILD_SUNNY,
  HEAVY_RAIN,
  THUNDERSTORM,
  POLAR_NIGHT,
  SNOWY,
  day({ apparentTempMaxC: 45 }),
  day({ apparentTempMaxC: -40, windGustsMaxKmh: 150 }),
  day({ precipitationProbabilityPct: 100, precipitationMm: 80 }),
  day({ weatherCode: 42 }),
];

const SCORERS = [
  { name: 'outdoor', scorer: scoreOutdoorSightseeing },
  { name: 'indoor', scorer: scoreIndoorSightseeing },
];

describe('scoreOutdoorSightseeing', () => {
  it('scores a mild, sunny, dry, calm day 80 or more', () => {
    const { score, reasons } = scoreOutdoorSightseeing(MILD_SUNNY);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(reasons).toEqual([
      'Weather: clear',
      'Feels like 22 °C',
      'Dry: 5% chance of rain',
      'Sun for 88% of daylight',
      'Gusts up to 15 km/h',
    ]);
  });

  it('scores heavy rain 30 or less', () => {
    const { score, reasons } = scoreOutdoorSightseeing(HEAVY_RAIN);
    expect(score).toBeLessThanOrEqual(30);
    expect(reasons).toContain('Rain likely: 95%, 18 mm');
  });

  it('scores a thunderstorm 20 or less, even on a warm day', () => {
    const { score, reasons } = scoreOutdoorSightseeing(THUNDERSTORM);
    expect(score).toBeLessThanOrEqual(20);
    expect(reasons).toContain('Thunderstorm: stay inside');
  });

  it('says rain or snow on a snowy day, since the amount includes snow', () => {
    expect(scoreOutdoorSightseeing(SNOWY).reasons).toContain('Rain or snow likely: 90%, 6 mm');
  });
});

describe('scoreIndoorSightseeing', () => {
  it('is 100 − outdoor, at most 65, so it moves the opposite way', () => {
    for (const weather of DAYS) {
      expect(scoreIndoorSightseeing(weather).score).toBe(
        Math.min(100 - scoreOutdoorSightseeing(weather).score, 65),
      );
    }
  });

  it('caps the worst day at 65, yet still beats outdoors whenever outdoors scores under 50', () => {
    expect(scoreIndoorSightseeing(THUNDERSTORM).score).toBe(65);
    for (const weather of DAYS) {
      const outdoor = scoreOutdoorSightseeing(weather).score;
      if (outdoor < 50) expect(scoreIndoorSightseeing(weather).score).toBeGreaterThan(outdoor);
    }
  });

  it('names the weather outside that makes indoors the better choice', () => {
    expect(scoreIndoorSightseeing(HEAVY_RAIN).reasons).toEqual([
      'Rain likely outdoors (95%, 18 mm)',
      'Feels like 8 °C outdoors',
      'Gusts up to 45 km/h outdoors',
    ]);
    expect(scoreIndoorSightseeing(THUNDERSTORM).reasons).toEqual([
      'Thunderstorm outside',
      'Rain possible outdoors (30%, 2 mm)',
      'Gusts up to 30 km/h outdoors',
    ]);
  });

  it('says indoor sightseeing can wait when the weather outside is good', () => {
    expect(scoreIndoorSightseeing(MILD_SUNNY).reasons).toEqual([
      'Good weather outside: indoor sightseeing can wait',
    ]);
  });
});

describe('both sightseeing scorers', () => {
  it.each(SCORERS)(
    '$name gives an integer score in polar night (0 s of daylight), with a polar-night reason',
    ({ scorer }) => {
      const { score, reasons } = scorer(POLAR_NIGHT);
      expect(Number.isInteger(score)).toBe(true);
      expect(reasons).toContainEqual(expect.stringContaining('polar night'));
      expect(reasons.join(' ')).not.toContain('NaN');
    },
  );

  it.each(SCORERS)(
    '$name always gives an integer from 0 to 100, with at least one reason',
    ({ scorer }) => {
      for (const weather of DAYS) {
        const { score, reasons } = scorer(weather);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(reasons.length).toBeGreaterThan(0);
      }
    },
  );
});
