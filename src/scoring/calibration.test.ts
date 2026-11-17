import { describe, expect, it } from 'vitest';
import { jsonResponse, loadFixture } from '../../test/helpers/fixtures.js';
import type { Activity, DailyWeather } from '../domain.js';
import { fetchForecast } from '../open-meteo/forecast.js';
import type { Fetch } from '../open-meteo/http.js';
import { fetchMarine } from '../open-meteo/marine.js';
import { rankActivities } from './rank.js';
import { SCORERS } from './scorers.js';

// Real weeks, recorded on 2026-11-17 with the exact URLs fetchForecast and fetchMarine build.
const WEEKS: { place: string; fixture: string; winner: Activity }[] = [
  // 13 cm of snow, then a storm adds 84 cm and shuts the lifts for two days; 1–1.3 m after it.
  { place: 'Olympic Valley', fixture: 'olympic-valley', winner: 'SKIING' },
  // Waves of 0.8–2.3 m, the last three days at 13 s; one day of heavy rain.
  { place: 'Malibu', fixture: 'malibu', winner: 'SURFING' },
  // Four wet days (2–24 mm) with gusts up to 76 km/h, then three cold, mostly dry ones.
  { place: 'Brussels', fixture: 'brussels', winner: 'INDOOR_SIGHTSEEING' },
  // Dry and mostly sunny, feeling like 19–27 °C.
  { place: 'Málaga', fixture: 'malaga', winner: 'OUTDOOR_SIGHTSEEING' },
];

/** Answers every request with a recorded response. */
const serve =
  (name: string): Fetch =>
  async () =>
    jsonResponse(loadFixture(name));

/** The week as ForecastService builds it: each forecast day with its marine day, or null. */
async function loadWeek(fixture: string): Promise<DailyWeather[]> {
  // The location only shapes the URL, which `serve` ignores.
  const location = { latitude: 0, longitude: 0, timezone: 'UTC' };
  const forecast = await fetchForecast(serve(`week-${fixture}-forecast.json`), location);
  const marine = await fetchMarine(serve(`week-${fixture}-marine.json`), location);
  const marineByDate = new Map(marine.map((day) => [day.date, day]));
  return forecast.map((day) => ({ ...day, marine: marineByDate.get(day.date) ?? null }));
}

describe('ranking calibration against real weeks', () => {
  it.each(WEEKS)('ranks $winner first in $place', async ({ fixture, winner }) => {
    const ranking = rankActivities(await loadWeek(fixture), SCORERS);
    const summary = ranking.map(({ activity, score }) => `${activity} ${score}`).join(' > ');

    expect(ranking[0]?.activity, summary).toBe(winner);
  });

  it('gives every day of every week an integer score from 0 to 100 with a reason', async () => {
    for (const { fixture } of WEEKS) {
      for (const { days } of rankActivities(await loadWeek(fixture), SCORERS)) {
        expect(days).toHaveLength(7);
        for (const { score, reasons } of days) {
          expect(Number.isInteger(score)).toBe(true);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          expect(reasons.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
