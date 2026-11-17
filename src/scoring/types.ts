import type { Activity, DailyWeather } from '../domain.js';

/** One day scored for one activity. `score` is an integer from 0 to 100. */
export interface Score {
  score: number;
  reasons: string[];
}

export type Scorer = (day: DailyWeather) => Score;

/** A day's score, keyed by the location-local date (YYYY-MM-DD). */
export interface DayScore extends Score {
  date: string;
}

export interface ActivityRanking {
  activity: Activity;
  rank: number;
  score: number;
  bestDay: string | null;
  days: DayScore[];
}
