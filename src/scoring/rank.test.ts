import { describe, expect, it } from 'vitest';
import type { Activity, DailyWeather } from '../domain.js';
import { rankActivities } from './rank.js';
import type { ActivityRanking, Scorer } from './types.js';

const DATES = ['2026-11-17', '2026-11-18', '2026-11-19'];

function day(date: string): DailyWeather {
  return {
    date,
    tempMaxC: 12,
    tempMinC: 4,
    apparentTempMaxC: 11,
    precipitationMm: 0,
    precipitationProbabilityPct: 10,
    snowfallCm: 0,
    freshSnowCm: 0,
    snowDepthMaxCm: 0,
    weatherCode: 2,
    windSpeedMaxKmh: 10,
    windGustsMaxKmh: 20,
    sunshineSeconds: 18_000,
    daylightSeconds: 32_000,
    marine: null,
  };
}

const WEEK = DATES.map(day);

/** A fake scorer that gives the n-th date in DATES the n-th score. */
function perDay(...scores: number[]): Scorer {
  return ({ date }) => {
    const score = scores[DATES.indexOf(date)] ?? 0;
    return { score, reasons: [`scored ${score}`] };
  };
}

const ZERO = perDay(0, 0, 0);

const find = (rankings: ActivityRanking[], activity: Activity) =>
  rankings.find((ranking) => ranking.activity === activity);

describe('rankActivities', () => {
  it('scores every day with every scorer', () => {
    const rankings = rankActivities(WEEK, {
      SKIING: perDay(70, 90, 80),
      SURFING: perDay(60, 50, 40),
      OUTDOOR_SIGHTSEEING: perDay(30, 20, 10),
      INDOOR_SIGHTSEEING: perDay(5, 5, 5),
    });
    expect(rankings[0]).toEqual({
      activity: 'SKIING',
      rank: 1,
      score: 80,
      bestDay: '2026-11-18',
      days: [
        { date: '2026-11-17', score: 70, reasons: ['scored 70'] },
        { date: '2026-11-18', score: 90, reasons: ['scored 90'] },
        { date: '2026-11-19', score: 80, reasons: ['scored 80'] },
      ],
    });
    expect(rankings.map((ranking) => ranking.days.map((d) => d.score))).toEqual([
      [70, 90, 80],
      [60, 50, 40],
      [30, 20, 10],
      [5, 5, 5],
    ]);
  });

  it('sorts activities by weekly score, highest first, with ranks 1 to n', () => {
    const rankings = rankActivities(WEEK, {
      SKIING: perDay(10, 10, 10),
      SURFING: perDay(70, 80, 90),
      OUTDOOR_SIGHTSEEING: perDay(50, 50, 50),
      INDOOR_SIGHTSEEING: perDay(30, 40, 50),
    });
    expect(rankings.map(({ activity, rank, score }) => ({ activity, rank, score }))).toEqual([
      { activity: 'SURFING', rank: 1, score: 80 },
      { activity: 'OUTDOOR_SIGHTSEEING', rank: 2, score: 50 },
      { activity: 'INDOOR_SIGHTSEEING', rank: 3, score: 40 },
      { activity: 'SKIING', rank: 4, score: 10 },
    ]);
  });

  it('rounds the mean of the daily scores to the nearest integer, halves up', () => {
    const rankings = rankActivities(WEEK, {
      SKIING: perDay(70, 70, 71),
      SURFING: perDay(70, 71, 71),
      OUTDOOR_SIGHTSEEING: ZERO,
      INDOOR_SIGHTSEEING: ZERO,
    });
    expect(find(rankings, 'SKIING')?.score).toBe(70);
    expect(find(rankings, 'SURFING')?.score).toBe(71);

    const twoDays = rankActivities(WEEK.slice(0, 2), {
      SKIING: perDay(70, 71),
      SURFING: ZERO,
      OUTDOOR_SIGHTSEEING: ZERO,
      INDOOR_SIGHTSEEING: ZERO,
    });
    expect(find(twoDays, 'SKIING')?.score).toBe(71);
  });

  it("breaks a tie on weekly score by the best day's score", () => {
    const rankings = rankActivities(WEEK, {
      SKIING: perDay(60, 60, 60),
      SURFING: perDay(30, 60, 90),
      OUTDOOR_SIGHTSEEING: ZERO,
      INDOOR_SIGHTSEEING: ZERO,
    });
    expect(rankings.map((ranking) => ranking.activity)).toEqual([
      'SURFING',
      'SKIING',
      'OUTDOOR_SIGHTSEEING',
      'INDOOR_SIGHTSEEING',
    ]);
  });

  it('keeps ACTIVITIES order when the weekly and best-day scores both tie', () => {
    const rankings = rankActivities(WEEK, {
      SKIING: perDay(50, 50, 50),
      SURFING: perDay(50, 50, 50),
      OUTDOOR_SIGHTSEEING: perDay(60, 50, 40),
      INDOOR_SIGHTSEEING: perDay(40, 50, 60),
    });
    expect(rankings.map(({ activity, rank }) => ({ activity, rank }))).toEqual([
      { activity: 'OUTDOOR_SIGHTSEEING', rank: 1 },
      { activity: 'INDOOR_SIGHTSEEING', rank: 2 },
      { activity: 'SKIING', rank: 3 },
      { activity: 'SURFING', rank: 4 },
    ]);
  });

  it('takes the earlier date as bestDay when days tie, whatever the input order', () => {
    const scorers = {
      SKIING: perDay(50, 90, 90),
      SURFING: ZERO,
      OUTDOOR_SIGHTSEEING: ZERO,
      INDOOR_SIGHTSEEING: ZERO,
    };
    expect(find(rankActivities(WEEK, scorers), 'SKIING')?.bestDay).toBe('2026-11-18');
    expect(find(rankActivities(WEEK.toReversed(), scorers), 'SKIING')?.bestDay).toBe('2026-11-18');
  });

  it('gives a weekly score of 0 and a null bestDay when there are no days', () => {
    const rankings = rankActivities([], {
      SKIING: ZERO,
      SURFING: ZERO,
      OUTDOOR_SIGHTSEEING: ZERO,
      INDOOR_SIGHTSEEING: ZERO,
    });
    expect(rankings).toEqual([
      { activity: 'SKIING', rank: 1, score: 0, bestDay: null, days: [] },
      { activity: 'SURFING', rank: 2, score: 0, bestDay: null, days: [] },
      { activity: 'OUTDOOR_SIGHTSEEING', rank: 3, score: 0, bestDay: null, days: [] },
      { activity: 'INDOOR_SIGHTSEEING', rank: 4, score: 0, bestDay: null, days: [] },
    ]);
  });
});
