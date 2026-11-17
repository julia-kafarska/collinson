import { describe, expect, it } from 'vitest';
import type { DailyWeather } from '../domain.js';
import { scoreSurfing } from './surfing.js';

const NO_MARINE_DATA = 'No marine data for this location';

interface Conditions {
  waveHeightMaxM?: number | null;
  swellWavePeriodMaxS?: number | null;
  windSpeedMaxKmh?: number;
  weatherCode?: number;
}

/** A good surf day (1.5 m waves at 12 s, 8 km/h of wind, clear sky), with any condition changed. */
function surfDay({
  waveHeightMaxM = 1.5,
  swellWavePeriodMaxS = 12,
  windSpeedMaxKmh = 8,
  weatherCode = 0,
}: Conditions = {}): DailyWeather {
  return {
    date: '2026-11-17',
    tempMaxC: 16,
    tempMinC: 10,
    apparentTempMaxC: 15,
    precipitationMm: 0,
    precipitationProbabilityPct: 5,
    snowfallCm: 0,
    freshSnowCm: 0,
    snowDepthMaxCm: 0,
    weatherCode,
    windSpeedMaxKmh,
    windGustsMaxKmh: 20,
    sunshineSeconds: 25_000,
    daylightSeconds: 34_000,
    marine: {
      date: '2026-11-17',
      waveHeightMaxM,
      swellWaveHeightMaxM: waveHeightMaxM,
      swellWavePeriodMaxS,
    },
  };
}

describe('scoreSurfing', () => {
  it('gives 0 with a reason when there is no marine data, as inland', () => {
    expect(scoreSurfing({ ...surfDay(), marine: null })).toEqual({
      score: 0,
      reasons: [NO_MARINE_DATA],
    });
  });

  it('gives 0 with the same reason when the wave height is null', () => {
    expect(scoreSurfing(surfDay({ waveHeightMaxM: null }))).toEqual({
      score: 0,
      reasons: [NO_MARINE_DATA],
    });
  });

  it('caps a flat sea of 0.2 m waves at 10', () => {
    const { score, reasons } = scoreSurfing(surfDay({ waveHeightMaxM: 0.2 }));
    expect(score).toBeLessThanOrEqual(10);
    expect(reasons[0]).toBe('Flat: waves 0.2 m');
  });

  it('scores 1.5 m waves at 12 s in light wind 70 or more', () => {
    const { score, reasons } = scoreSurfing(
      surfDay({ waveHeightMaxM: 1.5, swellWavePeriodMaxS: 12, windSpeedMaxKmh: 8 }),
    );
    expect(score).toBeGreaterThanOrEqual(70);
    expect(reasons).toEqual([
      'Waves 1.5 m: a good size',
      'Swell period 12 s: clean, powerful waves',
      'Wind 8 km/h: light',
      'Weather: clear',
    ]);
  });

  it.each([95, 99])('caps a thunderstorm (code %i) at 10', (weatherCode) => {
    const { score, reasons } = scoreSurfing(surfDay({ weatherCode }));
    expect(score).toBeLessThanOrEqual(10);
    expect(reasons[0]).toBe('Thunderstorm: stay out of the water');
  });

  it('caps waves of 4 m or more at 30, even at 12 s in light wind, and says why', () => {
    for (const waveHeightMaxM of [4, 4.2, 5.4]) {
      const { score, reasons } = scoreSurfing(surfDay({ waveHeightMaxM }));
      expect(score).toBeLessThanOrEqual(30);
      expect(reasons[0]).toBe(`Waves ${waveHeightMaxM} m: too big for most surfers`);
    }
    expect(scoreSurfing(surfDay({ waveHeightMaxM: 3.9 })).score).toBeGreaterThan(30);
  });

  it('scores 5.5 m waves lower than 2 m waves, all else equal', () => {
    const huge = scoreSurfing(surfDay({ waveHeightMaxM: 5.5 }));
    expect(huge.score).toBeLessThan(scoreSurfing(surfDay({ waveHeightMaxM: 2 })).score);
    expect(huge.reasons).toContain('Waves 5.5 m: too big for most surfers');
  });

  it('counts an unknown swell period like wind chop, and says so', () => {
    const unknown = scoreSurfing(surfDay({ swellWavePeriodMaxS: null }));
    expect(unknown.score).toBe(scoreSurfing(surfDay({ swellWavePeriodMaxS: 5 })).score);
    expect(unknown.reasons).toContain('Swell period unknown: assumed poor');
  });

  it.each<{ conditions: Conditions; reason: string }>([
    { conditions: { waveHeightMaxM: 0.6 }, reason: 'Waves 0.6 m: small' },
    { conditions: { waveHeightMaxM: 3.5 }, reason: 'Waves 3.5 m: big, for experienced surfers' },
    { conditions: { swellWavePeriodMaxS: 4 }, reason: 'Swell period 4 s: wind chop' },
    { conditions: { swellWavePeriodMaxS: 8 }, reason: 'Swell period 8 s: weaker waves' },
    { conditions: { windSpeedMaxKmh: 35 }, reason: 'Wind 35 km/h: choppy' },
    { conditions: { windSpeedMaxKmh: 45 }, reason: 'Wind 45 km/h: blown out' },
    { conditions: { weatherCode: 63 }, reason: 'Weather: rain' },
  ])('says "$reason"', ({ conditions, reason }) => {
    expect(scoreSurfing(surfDay(conditions)).reasons).toContain(reason);
  });

  it('always gives an integer score from 0 to 100, with at least one reason', () => {
    for (const waveHeightMaxM of [null, 0, 0.2, 0.3, 1, 2.5, 4, 5, 9]) {
      for (const swellWavePeriodMaxS of [null, 0, 5, 8, 10, 20]) {
        for (const windSpeedMaxKmh of [0, 15, 30, 40, 90]) {
          for (const weatherCode of [0, 3, 63, 95, 42]) {
            const { score, reasons } = scoreSurfing(
              surfDay({ waveHeightMaxM, swellWavePeriodMaxS, windSpeedMaxKmh, weatherCode }),
            );
            expect(Number.isInteger(score)).toBe(true);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            expect(reasons.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
