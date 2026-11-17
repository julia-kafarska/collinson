import { ACTIVITIES, type Activity, type DailyWeather } from '../domain.js';
import type { ActivityRanking, DayScore, Scorer } from './types.js';

/**
 * Scores every day for every activity and ranks the activities (PRD Q1, Q5, §9). Activities are
 * sorted by weekly score, then by their best day's score, then in ACTIVITIES order.
 */
export function rankActivities(
  days: DailyWeather[],
  scorers: Record<Activity, Scorer>,
): ActivityRanking[] {
  const scored = ACTIVITIES.map((activity) => {
    const dayScores = days.map((day): DayScore => ({ date: day.date, ...scorers[activity](day) }));
    return { activity, score: roundedMean(dayScores), best: bestOf(dayScores), days: dayScores };
  });
  // toSorted is stable, so activities still tied keep ACTIVITIES order.
  return scored
    .toSorted((a, b) => b.score - a.score || (b.best?.score ?? 0) - (a.best?.score ?? 0))
    .map(({ best, ...ranking }, index) => ({
      ...ranking,
      rank: index + 1,
      bestDay: best?.date ?? null,
    }));
}

/** The weekly score: 0 with no days. */
function roundedMean(days: DayScore[]): number {
  if (days.length === 0) return 0;
  return Math.round(days.reduce((sum, { score }) => sum + score, 0) / days.length);
}

/** The highest-scoring day, the earlier date on a tie (YYYY-MM-DD sorts as text). */
function bestOf(days: DayScore[]): DayScore | undefined {
  return days.toSorted((a, b) => b.score - a.score || a.date.localeCompare(b.date))[0];
}
